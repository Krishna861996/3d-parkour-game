import * as THREE from 'three';
import { PHYSICS_CONFIG } from './constants';
import { ObstacleObject } from './proceduralGenerator';
import { PhysicsEngine } from './physics';
import { PlayerStats, GameSettings } from '../types';
import { sfx } from '../audio/soundEffects';

export interface PlayerInput {
  forward: number; // -1 to 1
  right: number;   // -1 to 1
  jump: boolean;
  slide: boolean;
  dash: boolean;
  resetToCheckpoint: boolean;
}

export class PlayerController {
  public position = new THREE.Vector3(0, 2, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public yaw = 0;
  public pitch = 0;
  public roll = 0;

  // Camera container and visual mesh
  public camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  public meshGroup = new THREE.Group();
  public ghostMesh: THREE.Group | null = null;

  // Parkour states
  public isGrounded = false;
  public isWallRunning = false;
  public wallRunSide: 'left' | 'right' | null = null;
  public isSliding = false;
  public isDashing = false;
  public isMantling = false;
  public canDoubleJump = true;
  public dashCooldown = 0; // 0 is ready
  public dashTimer = 0;
  public slideTimer = 0;
  public wallRunTimer = 0;
  public mantleProgress = 0;
  public mantleStartY = 0;
  public mantleTargetY = 0;

  // Flow & Score
  public flowCombo = 1.0;
  public flowTimer = 0;
  public score = 0;
  public timeElapsed = 0;
  public distanceTraveled = 0;
  public currentCheckpoint = 0;
  public totalCheckpoints = 0;
  public isDead = false;
  public isCompleted = false;
  public maxSpeedAchieved = 0;

  // Physics & Helpers
  private physics = new PhysicsEngine();
  private lastJumpPressed = false;
  private lastDashPressed = false;
  private lastSlidePressed = false;
  private footstepTimer = 0;
  private activeCheckpointPos = new THREE.Vector3(0, 2, 0);

  // Avatar visuals
  private bodyMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;
  private leftHandMesh!: THREE.Mesh;
  private rightHandMesh!: THREE.Mesh;

  constructor() {
    this.createPlayerModel();
  }

  private createPlayerModel() {
    // Cyberpunk Runner Mesh (visible in 3rd person or hands in 1st person)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f293d,
      roughness: 0.3,
      metalness: 0.8,
    });
    const neonMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
    });

    // Body Torso
    const torsoGeom = new THREE.BoxGeometry(0.55, 0.75, 0.35);
    this.bodyMesh = new THREE.Mesh(torsoGeom, bodyMat);
    this.bodyMesh.position.y = 0.9;
    this.bodyMesh.castShadow = true;
    this.meshGroup.add(this.bodyMesh);

    // Neon Spine Accent
    const spineGeom = new THREE.BoxGeometry(0.08, 0.65, 0.05);
    const spine = new THREE.Mesh(spineGeom, neonMat);
    spine.position.set(0, 0, -0.19);
    this.bodyMesh.add(spine);

    // Head / Helmet Visor
    const headGeom = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    this.headMesh = new THREE.Mesh(headGeom, bodyMat);
    this.headMesh.position.y = 1.5;
    this.meshGroup.add(this.headMesh);

    // Glowing Visor
    const visorGeom = new THREE.BoxGeometry(0.36, 0.12, 0.15);
    const visor = new THREE.Mesh(visorGeom, neonMat);
    visor.position.set(0, 0, -0.15);
    this.headMesh.add(visor);

    // Runner Hands
    const handGeom = new THREE.BoxGeometry(0.12, 0.12, 0.25);
    this.leftHandMesh = new THREE.Mesh(handGeom, bodyMat);
    this.rightHandMesh = new THREE.Mesh(handGeom, bodyMat);

    this.leftHandMesh.position.set(-0.35, 1.1, -0.2);
    this.rightHandMesh.position.set(0.35, 1.1, -0.2);

    this.meshGroup.add(this.leftHandMesh, this.rightHandMesh);
  }

  public respawn() {
    this.position.copy(this.activeCheckpointPos);
    this.velocity.set(0, 0, 0);
    this.isWallRunning = false;
    this.wallRunSide = null;
    this.isSliding = false;
    this.isDashing = false;
    this.isMantling = false;
    this.canDoubleJump = true;
    this.flowCombo = 1.0;
    this.flowTimer = 0;
    this.isDead = false;
    sfx.playRespawn();
  }

  public setStartCheckpoint(pos: THREE.Vector3, totalCps: number) {
    this.activeCheckpointPos.copy(pos);
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.currentCheckpoint = 0;
    this.totalCheckpoints = totalCps;
    this.score = 0;
    this.timeElapsed = 0;
    this.distanceTraveled = 0;
    this.isDead = false;
    this.isCompleted = false;
    this.flowCombo = 1.0;
  }

  public update(
    delta: number,
    input: PlayerInput,
    objects: ObstacleObject[],
    settings: GameSettings
  ) {
    if (this.isDead || this.isCompleted) return;

    // Cap delta to prevent tunneling
    const dt = Math.min(delta, 0.05);
    this.timeElapsed += dt;

    if (input.resetToCheckpoint) {
      this.respawn();
      return;
    }

    // 1. Dash Cooldown & Timer
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // 2. Dash Trigger
    if (input.dash && !this.lastDashPressed && this.dashCooldown <= 0 && !this.isMantling) {
      this.executeDash(input);
    }
    this.lastDashPressed = input.dash;

    // 3. Mantling Transition
    if (this.isMantling) {
      this.mantleProgress += dt * 3.5;
      this.position.y = THREE.MathUtils.lerp(this.mantleStartY, this.mantleTargetY + 0.1, this.mantleProgress);
      // Move slightly forward
      const fwd = this.getForwardVector().multiplyScalar(dt * 3);
      this.position.add(fwd);

      if (this.mantleProgress >= 1.0) {
        this.isMantling = false;
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
      }
      this.updateCamera(settings, dt);
      return;
    }

    // 4. Direction Vectors based on Yaw
    const forwardVec = this.getForwardVector();
    const rightVec = this.getRightVector();

    // Input Movement Vector (Horizontal)
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forwardVec, input.forward);
    moveDir.addScaledVector(rightVec, input.right);
    if (moveDir.lengthSq() > 0.001) {
      moveDir.normalize();
    }

    // 5. Sliding Mechanism
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (input.slide && !this.lastSlidePressed && this.isGrounded && speed > 5.0) {
      this.isSliding = true;
      this.slideTimer = PHYSICS_CONFIG.SLIDE_DURATION_MAX;
      // Boost velocity forward along move direction
      const slideDir = moveDir.lengthSq() > 0.1 ? moveDir : forwardVec;
      this.velocity.x = slideDir.x * PHYSICS_CONFIG.SLIDE_BOOST_SPEED;
      this.velocity.z = slideDir.z * PHYSICS_CONFIG.SLIDE_BOOST_SPEED;
      sfx.playSlide();
      this.addFlow(0.25);
    } else if (!input.slide && this.isSliding) {
      this.isSliding = false;
    }
    this.lastSlidePressed = input.slide;

    if (this.isSliding) {
      this.slideTimer -= dt;
      // Friction during slide
      this.velocity.x *= Math.pow(0.88, dt * 60);
      this.velocity.z *= Math.pow(0.88, dt * 60);
      if (this.slideTimer <= 0 || speed < 4.0) {
        this.isSliding = false;
      }
    }

    // 6. Wall Running Logic
    if (this.isWallRunning) {
      this.wallRunTimer += dt;
      // Lock forward speed & minimal gravity
      this.velocity.y = PHYSICS_CONFIG.WALLRUN_GRAVITY * dt;
      const wallFwd = forwardVec.clone().multiplyScalar(PHYSICS_CONFIG.WALLRUN_SPEED);
      this.velocity.x = wallFwd.x;
      this.velocity.z = wallFwd.z;

      // Camera roll tilt
      const targetRoll = this.wallRunSide === 'left' ? -0.22 : 0.22;
      this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, dt * 10);

      // Check for Wall Jump
      if (input.jump && !this.lastJumpPressed) {
        this.executeWallJump(rightVec);
      }

      if (this.wallRunTimer > 2.2) {
        // Wall run expires, slip off
        this.isWallRunning = false;
        this.wallRunSide = null;
      }
    } else {
      // Normal roll recovery
      this.roll = THREE.MathUtils.lerp(this.roll, 0, dt * 8);
    }

    // 7. Ground / Air Acceleration
    if (!this.isDashing && !this.isSliding && !this.isWallRunning) {
      const targetSpeed = input.slide ? PHYSICS_CONFIG.WALK_SPEED : PHYSICS_CONFIG.SPRINT_SPEED;
      const accelRate = this.isGrounded ? PHYSICS_CONFIG.ACCELERATION : PHYSICS_CONFIG.AIR_ACCELERATION;

      if (moveDir.lengthSq() > 0.01) {
        const targetVelX = moveDir.x * targetSpeed;
        const targetVelZ = moveDir.z * targetSpeed;

        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVelX, accelRate * dt * 0.1);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVelZ, accelRate * dt * 0.1);
      } else if (this.isGrounded) {
        // Ground deceleration / friction
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, PHYSICS_CONFIG.DECELERATION * dt * 0.15);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, PHYSICS_CONFIG.DECELERATION * dt * 0.15);
      }
    }

    // 8. Gravity application
    if (!this.isGrounded && !this.isWallRunning && !this.isDashing) {
      this.velocity.y += PHYSICS_CONFIG.GRAVITY * dt;
    }

    // 9. Jump & Double Jump
    if (input.jump && !this.lastJumpPressed) {
      if (this.isGrounded) {
        this.executeJump();
      } else if (this.canDoubleJump && !this.isWallRunning) {
        this.executeDoubleJump();
      }
    }
    this.lastJumpPressed = input.jump;

    // 10. Position Integration
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 11. Physics Collision Checks
    const col = this.physics.checkCollisions(
      this.position,
      this.velocity,
      this.isSliding,
      objects,
      forwardVec
    );

    // Handle Grounding
    if (col.isGrounded) {
      this.position.y = col.groundHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.canDoubleJump = true;
      this.isWallRunning = false;
      this.wallRunSide = null;

      // Footstep audio
      if (speed > 4.0) {
        this.footstepTimer += dt * speed * 0.45;
        if (this.footstepTimer > 1.0) {
          sfx.playFootstep();
          this.footstepTimer = 0;
        }
      }
    } else {
      this.isGrounded = false;

      // Check Wall Run entry
      if (!this.isWallRunning && this.velocity.y < 3.0 && speed > 5.0) {
        if (col.hitWallLeft) {
          this.startWallRun('left');
        } else if (col.hitWallRight) {
          this.startWallRun('right');
        }
      } else if (this.isWallRunning) {
        // Check if wall run still adjacent
        if (this.wallRunSide === 'left' && !col.hitWallLeft) {
          this.isWallRunning = false;
          this.wallRunSide = null;
        } else if (this.wallRunSide === 'right' && !col.hitWallRight) {
          this.isWallRunning = false;
          this.wallRunSide = null;
        }
      }

      // Check Ledge Mantling
      if (col.canMantle && !this.isWallRunning && !this.isDashing && input.forward > 0) {
        this.startMantle(col.mantleTargetY);
      }
    }

    // Handle Hazards
    if (col.hitHazard) {
      this.respawn();
      return;
    }

    // Handle Bounce Pad
    if (col.hitBouncePad) {
      this.velocity.y = col.hitBouncePad.bounceForce || PHYSICS_CONFIG.BOUNCE_PAD_FORCE;
      this.isGrounded = false;
      this.canDoubleJump = true;
      sfx.playBouncePad();
      this.addFlow(0.35);
    }

    // Handle Speed Boost Ring
    if (col.hitBoostRing) {
      this.velocity.addScaledVector(forwardVec, 14.0);
      sfx.playDash();
      this.addFlow(0.4);
    }

    // Handle Checkpoints
    if (col.hitCheckpoint && col.hitCheckpoint.checkpointIndex !== undefined) {
      const idx = col.hitCheckpoint.checkpointIndex;
      if (idx > this.currentCheckpoint) {
        this.currentCheckpoint = idx;
        this.activeCheckpointPos.copy(this.position);
        sfx.playCheckpoint();
        this.addFlow(0.5);
      }
    }

    // Handle Finish
    if (col.hitFinish) {
      this.isCompleted = true;
      sfx.playVictory();
      return;
    }

    // Void Fall check
    if (this.position.y < PHYSICS_CONFIG.VOID_FALL_LIMIT) {
      this.respawn();
      return;
    }

    // 12. Flow & Score Update
    this.updateFlow(dt, speed);

    // Update Speed Wind audio
    sfx.updateSpeedWind(speed / PHYSICS_CONFIG.SPRINT_SPEED);

    // Record Stats
    if (speed > this.maxSpeedAchieved) {
      this.maxSpeedAchieved = speed;
    }
    this.distanceTraveled += speed * dt;

    // 13. Camera & Model transforms
    this.updateCamera(settings, dt);
  }

  private executeJump() {
    this.velocity.y = PHYSICS_CONFIG.JUMP_FORCE;
    this.isGrounded = false;
    sfx.playJump();
    this.addFlow(0.15);
  }

  private executeDoubleJump() {
    this.velocity.y = PHYSICS_CONFIG.DOUBLE_JUMP_FORCE;
    this.canDoubleJump = false;
    sfx.playDoubleJump();
    this.addFlow(0.25);
  }

  private executeDash(input: PlayerInput) {
    this.isDashing = true;
    this.dashTimer = PHYSICS_CONFIG.DASH_DURATION;
    this.dashCooldown = PHYSICS_CONFIG.DASH_COOLDOWN;

    const fwd = this.getForwardVector();
    const right = this.getRightVector();
    const dashDir = new THREE.Vector3();
    dashDir.addScaledVector(fwd, input.forward || 1);
    dashDir.addScaledVector(right, input.right);
    dashDir.normalize();

    this.velocity.x = dashDir.x * PHYSICS_CONFIG.DASH_FORCE;
    this.velocity.z = dashDir.z * PHYSICS_CONFIG.DASH_FORCE;
    this.velocity.y = Math.max(this.velocity.y, 3.5);

    sfx.playDash();
    this.addFlow(0.35);
  }

  private startWallRun(side: 'left' | 'right') {
    this.isWallRunning = true;
    this.wallRunSide = side;
    this.wallRunTimer = 0;
    this.canDoubleJump = true; // reset double jump upon latching to wall!
    sfx.playWallRunStart();
    this.addFlow(0.3);
  }

  private executeWallJump(rightVec: THREE.Vector3) {
    const pushDir = this.wallRunSide === 'left' ? rightVec : rightVec.clone().negate();
    const fwd = this.getForwardVector();

    this.velocity.y = PHYSICS_CONFIG.WALL_JUMP_VERTICAL;
    this.velocity.x = (fwd.x * 0.7 + pushDir.x * 0.6) * PHYSICS_CONFIG.WALL_JUMP_HORIZONTAL;
    this.velocity.z = (fwd.z * 0.7 + pushDir.z * 0.6) * PHYSICS_CONFIG.WALL_JUMP_HORIZONTAL;

    this.isWallRunning = false;
    this.wallRunSide = null;
    this.canDoubleJump = true;

    sfx.playWallJump();
    this.addFlow(0.4);
  }

  private startMantle(targetY: number) {
    this.isMantling = true;
    this.mantleProgress = 0;
    this.mantleStartY = this.position.y;
    this.mantleTargetY = targetY;
    sfx.playMantle();
    this.addFlow(0.2);
  }

  private addFlow(amount: number) {
    this.flowCombo = Math.min(4.0, this.flowCombo + amount);
    this.flowTimer = 3.5; // Combo hold time
    if (this.flowCombo >= 2.5) {
      sfx.playFlowCombo();
    }
  }

  private updateFlow(dt: number, speed: number) {
    if (this.flowTimer > 0) {
      this.flowTimer -= dt;
      if (this.flowTimer <= 0) {
        this.flowCombo = Math.max(1.0, this.flowCombo - dt * 0.8);
      }
    }
    // Accumulate score based on flow and speed
    if (speed > 3.0) {
      this.score += Math.floor(speed * this.flowCombo * dt * 10);
    }
  }

  public updateCamera(settings: GameSettings, dt: number) {
    // Clamp Pitch
    this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));

    const eyeHeight = this.isSliding ? 0.75 : 1.65;
    const playerEyePos = new THREE.Vector3(this.position.x, this.position.y + eyeHeight, this.position.z);

    if (settings.cameraMode === 'first_person') {
      this.camera.position.copy(playerEyePos);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      this.camera.rotation.z = this.roll;

      // In 1st person, hide head & body from blocking view, show hands
      this.bodyMesh.visible = false;
      this.headMesh.visible = false;
      this.leftHandMesh.visible = true;
      this.rightHandMesh.visible = true;

      // Position hands dynamically
      const fwd = this.getForwardVector();
      const right = this.getRightVector();
      this.leftHandMesh.position.copy(playerEyePos).addScaledVector(fwd, 0.4).addScaledVector(right, -0.25).add(new THREE.Vector3(0, -0.2, 0));
      this.rightHandMesh.position.copy(playerEyePos).addScaledVector(fwd, 0.4).addScaledVector(right, 0.25).add(new THREE.Vector3(0, -0.2, 0));
    } else {
      // Third Person Camera with smooth chase
      this.bodyMesh.visible = true;
      this.headMesh.visible = true;
      this.leftHandMesh.visible = true;
      this.rightHandMesh.visible = true;

      const fwd = this.getForwardVector();
      const up = new THREE.Vector3(0, 1, 0);
      const camOffset = fwd.clone().multiplyScalar(-3.8).add(up.clone().multiplyScalar(1.6));
      const targetCamPos = playerEyePos.clone().add(camOffset);

      this.camera.position.lerp(targetCamPos, dt * 15);
      this.camera.lookAt(playerEyePos.clone().add(fwd.clone().multiplyScalar(4)));
    }

    // Dynamic FOV based on speed and dash
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    const speedFOVBonus = Math.min(22, (speed / PHYSICS_CONFIG.SPRINT_SPEED) * 12 + (this.isDashing ? 14 : 0));
    const targetFOV = settings.fov + speedFOVBonus;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 8);
    this.camera.updateProjectionMatrix();

    // Transform player mesh group
    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.y = this.yaw;
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  public getRightVector(): THREE.Vector3 {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  public getStats(fps: number): PlayerStats {
    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    return {
      speed: Math.round(horizontalSpeed * 3.6), // km/h
      maxSpeed: Math.round(this.maxSpeedAchieved * 3.6),
      isGrounded: this.isGrounded,
      isWallRunning: this.isWallRunning,
      wallRunSide: this.wallRunSide,
      isSliding: this.isSliding,
      isDashing: this.isDashing,
      isMantling: this.isMantling,
      canDoubleJump: this.canDoubleJump,
      dashCooldown: this.dashCooldown / PHYSICS_CONFIG.DASH_COOLDOWN,
      flowCombo: parseFloat(this.flowCombo.toFixed(1)),
      flowTimer: parseFloat(this.flowTimer.toFixed(1)),
      currentCheckpoint: this.currentCheckpoint,
      totalCheckpoints: this.totalCheckpoints,
      distanceTraveled: Math.round(this.distanceTraveled),
      score: this.score,
      timeElapsed: parseFloat(this.timeElapsed.toFixed(2)),
      isDead: this.isDead,
      isCompleted: this.isCompleted,
      fps: Math.round(fps),
    };
  }
}
