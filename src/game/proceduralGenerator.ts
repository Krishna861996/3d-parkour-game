import * as THREE from 'three';
import { GameTheme, Difficulty } from '../types';
import { THEMES } from './constants';

// Deterministic PRNG
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed ? Math.abs(seed) : 12345;
  }

  public next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  public chance(probability: number): boolean {
    return this.next() < probability;
  }
}

export interface ObstacleObject {
  id: string;
  type: 'platform' | 'wall' | 'hazard' | 'bounce_pad' | 'boost_ring' | 'checkpoint' | 'finish' | 'collectible' | 'sliding_bar';
  box: THREE.Box3;
  mesh: THREE.Object3D;
  isTrigger?: boolean;
  checkpointIndex?: number;
  hazardType?: 'laser' | 'spinner' | 'fall_void' | 'moving';
  bounceForce?: number;
  boostDirection?: THREE.Vector3;
  movementData?: {
    axis: 'x' | 'y' | 'z';
    min: number;
    max: number;
    speed: number;
    phase: number;
  };
  rotationData?: {
    axis: 'x' | 'y' | 'z';
    speed: number;
  };
}

export interface GeneratedCourse {
  objects: ObstacleObject[];
  checkpoints: {
    index: number;
    position: THREE.Vector3;
    rotation: number;
    box: THREE.Box3;
  }[];
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  totalLength: number;
}

export class ProceduralCourseGenerator {
  private rng: SeededRandom;
  private theme: GameTheme;
  private difficulty: Difficulty;

  constructor(seed: number, theme: GameTheme = 'cyberpunk', difficulty: Difficulty = 'medium') {
    this.rng = new SeededRandom(seed);
    this.theme = theme;
    this.difficulty = difficulty;
  }

  public generateLevel(segmentCount: number): GeneratedCourse {
    const objects: ObstacleObject[] = [];
    const checkpoints: GeneratedCourse['checkpoints'] = [];
    const themeColors = THEMES[this.theme];

    // Current generation cursor
    let currentPos = new THREE.Vector3(0, 0, 0);
    const startPosition = new THREE.Vector3(0, 2, 4);

    // 1. Initial Start Platform
    const startPlatform = this.createPlatform(
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(12, 1, 18),
      themeColors.groundPrimary,
      themeColors.groundAccent
    );
    objects.push(startPlatform);

    // Start checkpoint
    checkpoints.push({
      index: 0,
      position: new THREE.Vector3(0, 1.2, 0),
      rotation: 0,
      box: new THREE.Box3(
        new THREE.Vector3(-4, 0, -3),
        new THREE.Vector3(4, 5, 3)
      ),
    });

    currentPos.z -= 12;

    const segmentTypes: Array<
      'wall_run_chasm' | 'slide_lasers' | 'jump_pad_hops' | 'moving_hazards' | 'speed_tunnel' | 'spiral_climb' | 'zigzag_gap'
    > = ['wall_run_chasm', 'slide_lasers', 'jump_pad_hops', 'moving_hazards', 'speed_tunnel', 'spiral_climb', 'zigzag_gap'];

    let lastCheckpointZ = currentPos.z;
    let checkpointCounter = 1;

    for (let s = 0; s < segmentCount; s++) {
      const segType = this.rng.pick(segmentTypes);
      const isCheckPointDue = (s > 0 && s % 3 === 0) || (s === segmentCount - 1);

      switch (segType) {
        case 'wall_run_chasm':
          this.buildWallRunChasm(currentPos, objects);
          break;
        case 'slide_lasers':
          this.buildSlideObstacles(currentPos, objects);
          break;
        case 'jump_pad_hops':
          this.buildJumpPadHops(currentPos, objects);
          break;
        case 'moving_hazards':
          this.buildMovingHazards(currentPos, objects);
          break;
        case 'speed_tunnel':
          this.buildSpeedTunnel(currentPos, objects);
          break;
        case 'spiral_climb':
          this.buildSpiralClimb(currentPos, objects);
          break;
        case 'zigzag_gap':
          this.buildZigZagGaps(currentPos, objects);
          break;
      }

      // Add a rest / checkpoint platform every 3 segments
      if (isCheckPointDue && s < segmentCount - 1) {
        currentPos.z -= 6;
        const cpPlatform = this.createPlatform(
          new THREE.Vector3(currentPos.x, currentPos.y - 0.5, currentPos.z - 5),
          new THREE.Vector3(10, 1, 10),
          themeColors.groundPrimary,
          themeColors.checkpointGlow
        );
        objects.push(cpPlatform);

        const cpTrigger = this.createCheckpointTrigger(
          checkpointCounter,
          new THREE.Vector3(currentPos.x, currentPos.y + 1, currentPos.z - 5)
        );
        objects.push(cpTrigger.obj);
        checkpoints.push(cpTrigger.data);
        checkpointCounter++;

        currentPos.z -= 10;
        lastCheckpointZ = currentPos.z;
      }
    }

    // Finish Gate / Ending Arena
    currentPos.z -= 8;
    const endPosition = new THREE.Vector3(currentPos.x, currentPos.y + 1.5, currentPos.z - 10);
    const finishPlatform = this.createPlatform(
      new THREE.Vector3(currentPos.x, currentPos.y - 0.5, currentPos.z - 10),
      new THREE.Vector3(16, 1, 20),
      themeColors.groundPrimary,
      0xffffff
    );
    objects.push(finishPlatform);

    const finishTrigger = this.createFinishTrigger(
      new THREE.Vector3(currentPos.x, currentPos.y + 1.5, currentPos.z - 10)
    );
    objects.push(finishTrigger);

    return {
      objects,
      checkpoints,
      startPosition,
      endPosition,
      totalLength: Math.abs(currentPos.z),
    };
  }

  // --- Segment Builders ---

  private buildWallRunChasm(cursor: THREE.Vector3, objects: ObstacleObject[]) {
    const themeColors = THEMES[this.theme];
    const chasmLength = this.rng.range(28, 42);
    const chasmWidth = this.rng.range(9, 12);
    const wallHeight = 8;
    const wallThickness = 0.8;

    // Platform at entry
    const entryPlat = this.createPlatform(
      new THREE.Vector3(cursor.x, cursor.y - 0.5, cursor.z - 4),
      new THREE.Vector3(8, 1, 8),
      themeColors.groundPrimary,
      themeColors.groundAccent
    );
    objects.push(entryPlat);
    cursor.z -= 8;

    // Left Wall
    const leftWallPos = new THREE.Vector3(cursor.x - chasmWidth / 2, cursor.y + wallHeight / 2 - 1, cursor.z - chasmLength / 2);
    const leftWall = this.createWall(
      leftWallPos,
      new THREE.Vector3(wallThickness, wallHeight, chasmLength),
      themeColors.wallColor,
      themeColors.groundAccent
    );
    objects.push(leftWall);

    // Right Wall
    const rightWallPos = new THREE.Vector3(cursor.x + chasmWidth / 2, cursor.y + wallHeight / 2 - 1, cursor.z - chasmLength / 2);
    const rightWall = this.createWall(
      rightWallPos,
      new THREE.Vector3(wallThickness, wallHeight, chasmLength),
      themeColors.wallColor,
      themeColors.groundAccent
    );
    objects.push(rightWall);

    // Optional stepping pillar or mid-chasm bounce pad
    if (this.difficulty !== 'easy' || this.rng.chance(0.5)) {
      const midPillarZ = cursor.z - chasmLength / 2;
      const pad = this.createBouncePad(
        new THREE.Vector3(cursor.x, cursor.y + 0.2, midPillarZ),
        new THREE.Vector3(3, 0.6, 3),
        themeColors.boostColor
      );
      objects.push(pad);
    }

    cursor.z -= chasmLength;

    // Exit platform
    const exitPlat = this.createPlatform(
      new THREE.Vector3(cursor.x, cursor.y - 0.5, cursor.z - 4),
      new THREE.Vector3(8, 1, 8),
      themeColors.groundPrimary,
      themeColors.groundAccent
    );
    objects.push(exitPlat);
    cursor.z -= 8;
  }

  private buildSlideObstacles(cursor: THREE.Vector3, objects: ObstacleObject[]) {
    const themeColors = THEMES[this.theme];
    const runwayLength = this.rng.range(30, 45);
    const runwayWidth = 8;

    // Continuous runway
    const runway = this.createPlatform(
      new THREE.Vector3(cursor.x, cursor.y - 0.5, cursor.z - runwayLength / 2),
      new THREE.Vector3(runwayWidth, 1, runwayLength),
      themeColors.groundPrimary,
      themeColors.gridLineColor
    );
    objects.push(runway);

    // Add 2-3 laser barriers that require sliding underneath
    const numBars = this.rng.rangeInt(2, 4);
    for (let i = 0; i < numBars; i++) {
      const barZ = cursor.z - (i + 1) * (runwayLength / (numBars + 1));
      
      // Top blocker beam positioned at head height (1.3m off ground) so player MUST slide
      const beamObj = this.createSlidingBar(
        new THREE.Vector3(cursor.x, cursor.y + 1.4, barZ),
        new THREE.Vector3(runwayWidth, 0.5, 0.6),
        themeColors.hazardColor
      );
      objects.push(beamObj);

      // Add speed booster pad right before the barrier to slide through in style!
      const booster = this.createSpeedBooster(
        new THREE.Vector3(cursor.x, cursor.y + 0.05, barZ + 4),
        new THREE.Vector3(4, 0.1, 3),
        themeColors.boostColor
      );
      objects.push(booster);
    }

    cursor.z -= runwayLength;
  }

  private buildJumpPadHops(cursor: THREE.Vector3, objects: ObstacleObject[]) {
    const themeColors = THEMES[this.theme];
    const hops = this.rng.rangeInt(3, 5);

    for (let i = 0; i < hops; i++) {
      const hopGap = this.rng.range(8, 14);
      const hopHeight = this.rng.range(-1, 3.5);
      const xOffset = this.rng.range(-3.5, 3.5);

      cursor.z -= hopGap;
      cursor.y += hopHeight;
      cursor.x += xOffset * 0.4;

      const platSize = this.rng.range(3.5, 5.5);
      const plat = this.createPlatform(
        new THREE.Vector3(cursor.x, cursor.y - 0.5, cursor.z),
        new THREE.Vector3(platSize, 1, platSize),
        themeColors.groundPrimary,
        themeColors.groundAccent
      );
      objects.push(plat);

      // Place bounce pad on one of the hops
      if (i === 1 || this.rng.chance(0.4)) {
        const pad = this.createBouncePad(
          new THREE.Vector3(cursor.x, cursor.y + 0.1, cursor.z),
          new THREE.Vector3(2.5, 0.3, 2.5),
          themeColors.boostColor
        );
        objects.push(pad);
      }
    }
  }

  private buildMovingHazards(cursor: THREE.Vector3, objects: ObstacleObject[]) {
    const themeColors = THEMES[this.theme];
    const segmentLen = this.rng.range(32, 45);

    // Main floor
    const floor = this.createPlatform(
      new THREE.Vector3(cursor.x, cursor.y - 0.5, cursor.z - segmentLen / 2),
      new THREE.Vector3(9, 1, segmentLen),
      themeColors.groundPrimary,
      themeColors.wallColor
    );
    objects.push(floor);

    // Moving laser bars
    const hazardCount = this.rng.rangeInt(2, 3);
    for (let i = 0; i < hazardCount; i++) {
      const hzZ = cursor.z - (i + 1) * (segmentLen / (hazardCount + 1));
      
      // Moving sweeping laser block or spinner
      const isSpinner = this.rng.chance(0.5);
      if (isSpinner) {
        const spinner = this.createLaserSpinner(
          new THREE.Vector3(cursor.x, cursor.y + 0.8, hzZ),
          7.5,
          themeColors.hazardColor
        );
        objects.push(spinner);
      } else {
        const movingBar = this.createMovingLaser(
          new THREE.Vector3(cursor.x, cursor.y + 0.8, hzZ),
          new THREE.Vector3(4, 0.6, 0.6),
          themeColors.hazardColor,
          cursor.x - 3,
          cursor.x + 3,
          this.rng.range(2.5, 4.5)
        );
        objects.push(movingBar);
      }
    }

    cursor.z -= segmentLen;
  }

  private buildSpeedTunnel(cursor: THREE.Vector3, objects: ObstacleObject[]) {
    const themeColors = THEMES[this.theme];
    const tunnelLength = this.rng.range(40, 60);
    const tunnelWidth = 7;
    const tunnelHeight = 6;

    // Floor
    const floor = this.createPlatform(
      new THREE.Vector3(cursor.x, cursor.y - 0.5, cursor.z - tunnelLength / 2),
      new THREE.Vector3(tunnelWidth, 1, tunnelLength),
      themeColors.groundPrimary,
      themeColors.boostColor
    );
    objects.push(floor);

    // Boost rings along the tunnel
    const ringCount = Math.floor(tunnelLength / 14);
    for (let i = 0; i < ringCount; i++) {
      const ringZ = cursor.z - (i + 1) * 14;
      const ring = this.createBoostRing(
        new THREE.Vector3(cursor.x, cursor.y + 1.8, ringZ),
        3.8,
        themeColors.boostColor
      );
      objects.push(ring);
    }

    cursor.z -= tunnelLength;
  }

  private buildSpiralClimb(cursor: THREE.Vector3, objects: ObstacleObject[]) {
    const themeColors = THEMES[this.theme];
    const steps = 6;
    const radius = 6.5;

    const center = new THREE.Vector3(cursor.x, cursor.y, cursor.z - radius - 4);

    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 1.5;
      const stepX = center.x + Math.sin(angle) * radius;
      const stepZ = center.z - Math.cos(angle) * radius;
      const stepY = cursor.y + i * 1.8;

      const plat = this.createPlatform(
        new THREE.Vector3(stepX, stepY - 0.4, stepZ),
        new THREE.Vector3(4, 0.8, 4),
        themeColors.groundPrimary,
        themeColors.groundAccent
      );
      objects.push(plat);
    }

    cursor.x = center.x + Math.sin(Math.PI * 1.5) * radius;
    cursor.z = center.z - Math.cos(Math.PI * 1.5) * radius - 4;
    cursor.y += steps * 1.8;
  }

  private buildZigZagGaps(cursor: THREE.Vector3, objects: ObstacleObject[]) {
    const themeColors = THEMES[this.theme];
    const segments = 4;

    for (let i = 0; i < segments; i++) {
      const side = (i % 2 === 0 ? 1 : -1) * this.rng.range(3.5, 6);
      const platLength = this.rng.range(9, 14);

      cursor.z -= 4;
      const plat = this.createPlatform(
        new THREE.Vector3(cursor.x + side, cursor.y - 0.5, cursor.z - platLength / 2),
        new THREE.Vector3(3.8, 1, platLength),
        themeColors.groundPrimary,
        themeColors.groundAccent
      );
      objects.push(plat);

      cursor.z -= platLength;
      cursor.x += side * 0.3;
    }
  }

  // --- Primitive Factory Helpers ---

  private createPlatform(pos: THREE.Vector3, size: THREE.Vector3, mainColor: number, edgeColor: number): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Base body
    const bodyGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.35,
      metalness: 0.85,
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Glowing Neon Edge Inset
    const edgeGeom = new THREE.BoxGeometry(size.x * 0.94, 0.05, size.z * 0.94);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: edgeColor,
    });
    const edgeMesh = new THREE.Mesh(edgeGeom, edgeMat);
    edgeMesh.position.y = size.y / 2 + 0.03;
    group.add(edgeMesh);

    // Collision Box in World space
    const half = size.clone().multiplyScalar(0.5);
    const box = new THREE.Box3(pos.clone().sub(half), pos.clone().add(half));

    return {
      id: `plat_${Math.random().toString(36).substring(2, 8)}`,
      type: 'platform',
      box,
      mesh: group,
    };
  }

  private createWall(pos: THREE.Vector3, size: THREE.Vector3, wallColor: number, neonColor: number): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.2,
      metalness: 0.9,
    });
    const wallMesh = new THREE.Mesh(geom, mat);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);

    // Neon Wallrun Grid lines on inner face
    const lineGeom = new THREE.BoxGeometry(size.x + 0.05, 0.15, size.z * 0.9);
    const lineMat = new THREE.MeshBasicMaterial({
      color: neonColor,
    });
    const line1 = new THREE.Mesh(lineGeom, lineMat);
    line1.position.y = 0;
    group.add(line1);

    const line2 = new THREE.Mesh(lineGeom, lineMat);
    line2.position.y = size.y * 0.3;
    group.add(line2);

    const line3 = new THREE.Mesh(lineGeom, lineMat);
    line3.position.y = -size.y * 0.3;
    group.add(line3);

    const half = size.clone().multiplyScalar(0.5);
    const box = new THREE.Box3(pos.clone().sub(half), pos.clone().add(half));

    return {
      id: `wall_${Math.random().toString(36).substring(2, 8)}`,
      type: 'wall',
      box,
      mesh: group,
    };
  }

  private createBouncePad(pos: THREE.Vector3, size: THREE.Vector3, color: number): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Base Rim
    const baseGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.8,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    group.add(base);

    // Center Energy Pad
    const padGeom = new THREE.CylinderGeometry(size.x * 0.38, size.x * 0.38, 0.2, 16);
    const padMat = new THREE.MeshBasicMaterial({
      color,
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.y = size.y / 2 + 0.1;
    group.add(pad);

    const half = size.clone().multiplyScalar(0.5);
    const box = new THREE.Box3(pos.clone().sub(half), pos.clone().add(half));

    return {
      id: `bounce_${Math.random().toString(36).substring(2, 8)}`,
      type: 'bounce_pad',
      box,
      mesh: group,
      bounceForce: 24.0,
    };
  }

  private createSpeedBooster(pos: THREE.Vector3, size: THREE.Vector3, color: number): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    const geom = new THREE.PlaneGeometry(size.x, size.z);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);

    const half = size.clone().multiplyScalar(0.5);
    const box = new THREE.Box3(pos.clone().sub(half), pos.clone().add(half));

    return {
      id: `booster_${Math.random().toString(36).substring(2, 8)}`,
      type: 'boost_ring',
      box,
      mesh: group,
      isTrigger: true,
    };
  }

  private createSlidingBar(pos: THREE.Vector3, size: THREE.Vector3, color: number): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Horizontal warning laser beam
    const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      roughness: 0.1,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    group.add(mesh);

    const half = size.clone().multiplyScalar(0.5);
    const box = new THREE.Box3(pos.clone().sub(half), pos.clone().add(half));

    return {
      id: `slide_bar_${Math.random().toString(36).substring(2, 8)}`,
      type: 'sliding_bar',
      box,
      mesh: group,
      hazardType: 'laser',
    };
  }

  private createLaserSpinner(pos: THREE.Vector3, length: number, color: number): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Center Hub
    const hubGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
    const hub = new THREE.Mesh(hubGeom, hubMat);
    group.add(hub);

    // 2 Laser Blades
    const bladeGeom = new THREE.BoxGeometry(length, 0.3, 0.3);
    const bladeMat = new THREE.MeshBasicMaterial({ color });
    const blade = new THREE.Mesh(bladeGeom, bladeMat);
    blade.position.y = 0.2;
    group.add(blade);

    const box = new THREE.Box3(
      pos.clone().sub(new THREE.Vector3(length / 2, 0.5, length / 2)),
      pos.clone().add(new THREE.Vector3(length / 2, 1.0, length / 2))
    );

    return {
      id: `spinner_${Math.random().toString(36).substring(2, 8)}`,
      type: 'hazard',
      box,
      mesh: group,
      hazardType: 'spinner',
      rotationData: {
        axis: 'y',
        speed: 2.2,
      },
    };
  }

  private createMovingLaser(
    pos: THREE.Vector3,
    size: THREE.Vector3,
    color: number,
    minX: number,
    maxX: number,
    speed: number
  ): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    const half = size.clone().multiplyScalar(0.5);
    const box = new THREE.Box3(pos.clone().sub(half), pos.clone().add(half));

    return {
      id: `moving_hz_${Math.random().toString(36).substring(2, 8)}`,
      type: 'hazard',
      box,
      mesh: group,
      hazardType: 'moving',
      movementData: {
        axis: 'x',
        min: minX,
        max: maxX,
        speed,
        phase: Math.random() * Math.PI * 2,
      },
    };
  }

  private createBoostRing(pos: THREE.Vector3, radius: number, color: number): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    const geom = new THREE.TorusGeometry(radius * 0.5, 0.25, 8, 24);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    const box = new THREE.Box3(
      pos.clone().sub(new THREE.Vector3(radius * 0.5, radius * 0.5, 1)),
      pos.clone().add(new THREE.Vector3(radius * 0.5, radius * 0.5, 1))
    );

    return {
      id: `ring_${Math.random().toString(36).substring(2, 8)}`,
      type: 'boost_ring',
      box,
      mesh: group,
      isTrigger: true,
    };
  }

  private createCheckpointTrigger(index: number, pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Glowing Holographic Gate
    const archGeom = new THREE.BoxGeometry(6, 4.5, 0.4);
    const archMat = new THREE.MeshBasicMaterial({
      color: THEMES[this.theme].checkpointGlow,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
    const arch = new THREE.Mesh(archGeom, archMat);
    arch.position.y = 2;
    group.add(arch);

    // Pillars
    const pillarGeom = new THREE.CylinderGeometry(0.3, 0.3, 4.5, 12);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: THEMES[this.theme].checkpointGlow,
      emissiveIntensity: 0.8,
    });
    const p1 = new THREE.Mesh(pillarGeom, pillarMat);
    p1.position.set(-3, 2, 0);
    const p2 = new THREE.Mesh(pillarGeom, pillarMat);
    p2.position.set(3, 2, 0);
    group.add(p1, p2);

    const box = new THREE.Box3(
      pos.clone().sub(new THREE.Vector3(3.5, 1, 2)),
      pos.clone().add(new THREE.Vector3(3.5, 5, 2))
    );

    const obj: ObstacleObject = {
      id: `cp_${index}`,
      type: 'checkpoint',
      box,
      mesh: group,
      isTrigger: true,
      checkpointIndex: index,
    };

    return {
      obj,
      data: {
        index,
        position: pos.clone(),
        rotation: 0,
        box,
      },
    };
  }

  private createFinishTrigger(pos: THREE.Vector3): ObstacleObject {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Monumental Victory Arch
    const archGeom = new THREE.TorusGeometry(4.5, 0.5, 12, 32);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.9,
    });
    const arch = new THREE.Mesh(archGeom, archMat);
    arch.position.y = 3;
    group.add(arch);

    const box = new THREE.Box3(
      pos.clone().sub(new THREE.Vector3(5, 1, 3)),
      pos.clone().add(new THREE.Vector3(5, 7, 3))
    );

    return {
      id: 'finish_gate',
      type: 'finish',
      box,
      mesh: group,
      isTrigger: true,
    };
  }
}
