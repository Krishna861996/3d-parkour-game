import * as THREE from 'three';
import { GameTheme, GameSettings } from '../types';
import { THEMES } from './constants';
import { ObstacleObject, GeneratedCourse } from './proceduralGenerator';

export class SceneManager {
  public scene = new THREE.Scene();
  public renderer!: THREE.WebGLRenderer;
  private dirLight!: THREE.DirectionalLight;
  private ambLight!: THREE.AmbientLight;
  private cityGroup = new THREE.Group();
  private particlesGroup = new THREE.Group();
  private starsGroup = new THREE.Group();

  // Particle systems
  private sparkParticles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  constructor() {
    this.initLights();
    this.scene.add(this.cityGroup);
    this.scene.add(this.particlesGroup);
    this.scene.add(this.starsGroup);
  }

  public initRenderer(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
  }

  private initLights() {
    this.ambLight = new THREE.AmbientLight(0x221c38, 1.2);
    this.scene.add(this.ambLight);

    this.dirLight = new THREE.DirectionalLight(0x00f3ff, 2.0);
    this.dirLight.position.set(30, 60, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 200;
    this.dirLight.shadow.camera.left = -40;
    this.dirLight.shadow.camera.right = 40;
    this.dirLight.shadow.camera.top = 40;
    this.dirLight.shadow.camera.bottom = -40;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
  }

  public applyTheme(theme: GameTheme) {
    const t = THEMES[theme];
    this.scene.background = new THREE.Color(t.skyTop);
    this.scene.fog = new THREE.FogExp2(t.fogColor, 0.009);

    this.ambLight.color.set(t.lightAmbient);
    this.dirLight.color.set(t.lightPrimary);

    this.buildCitySkyline(t.wallColor, t.groundAccent);
    this.buildStarfield(t.skyBottom);
  }

  private buildCitySkyline(buildingColor: number, neonColor: number) {
    // Clear previous skyline
    while (this.cityGroup.children.length > 0) {
      this.cityGroup.remove(this.cityGroup.children[0]);
    }

    const bMat = new THREE.MeshStandardMaterial({
      color: buildingColor,
      roughness: 0.7,
      metalness: 0.3,
    });
    const neonMat = new THREE.MeshBasicMaterial({
      color: neonColor,
    });

    // Procedural skyscrapers around the chasm
    for (let i = 0; i < 40; i++) {
      const w = 15 + Math.random() * 20;
      const d = 15 + Math.random() * 20;
      const h = 40 + Math.random() * 120;
      const x = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 90);
      const z = -Math.random() * 450;
      const y = h / 2 - 50;

      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      tower.position.set(x, y, z);
      this.cityGroup.add(tower);

      // Neon antenna / roof trim
      if (Math.random() > 0.4) {
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.6, 15, 6), neonMat);
        spire.position.set(x, y + h / 2 + 7.5, z);
        this.cityGroup.add(spire);
      }
    }
  }

  private buildStarfield(horizonColor: string) {
    while (this.starsGroup.children.length > 0) {
      this.starsGroup.remove(this.starsGroup.children[0]);
    }

    const starCount = 300;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 1] = 40 + Math.random() * 300;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.8,
    });

    const points = new THREE.Points(geom, mat);
    this.starsGroup.add(points);
  }

  public loadCourse(course: GeneratedCourse) {
    // Clear old objects
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child.userData.isCourseObject) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((child) => this.scene.remove(child));

    // Add generated course objects
    course.objects.forEach((obj) => {
      obj.mesh.userData.isCourseObject = true;
      this.scene.add(obj.mesh);
    });
  }

  public spawnSparks(pos: THREE.Vector3, color: number, count = 8) {
    const sparkMat = new THREE.MeshBasicMaterial({ color });
    const sparkGeom = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeom, sparkMat);
      mesh.position.copy(pos);
      this.particlesGroup.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 6
      );

      this.sparkParticles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
      });
    }
  }

  public updateAnimatedObstacles(objects: ObstacleObject[], delta: number, totalTime: number) {
    for (const obj of objects) {
      // Rotation animation
      if (obj.rotationData) {
        if (obj.rotationData.axis === 'y') {
          obj.mesh.rotation.y += obj.rotationData.speed * delta;
        }
      }

      // Linear Movement animation
      if (obj.movementData) {
        const md = obj.movementData;
        const span = md.max - md.min;
        const currentOffset = Math.sin(totalTime * md.speed + md.phase) * (span / 2);
        const center = (md.max + md.min) / 2;
        const targetCoord = center + currentOffset;

        if (md.axis === 'x') {
          obj.mesh.position.x = targetCoord;
          // Update collision box
          const halfSizeX = (obj.box.max.x - obj.box.min.x) / 2;
          obj.box.min.x = targetCoord - halfSizeX;
          obj.box.max.x = targetCoord + halfSizeX;
        }
      }
    }

    // Update Particles
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.life += delta;
      p.velocity.y -= 15.0 * delta; // particle gravity
      p.mesh.position.addScaledVector(p.velocity, delta);

      const progress = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, 1.0 - progress));

      if (p.life >= p.maxLife) {
        this.particlesGroup.remove(p.mesh);
        this.sparkParticles.splice(i, 1);
      }
    }
  }

  public updateLightPosition(playerPosition: THREE.Vector3) {
    this.dirLight.position.set(playerPosition.x + 30, playerPosition.y + 60, playerPosition.z + 20);
    this.dirLight.target.position.copy(playerPosition);
    this.dirLight.target.updateMatrixWorld();
  }

  public handleResize() {
    if (!this.renderer) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}
