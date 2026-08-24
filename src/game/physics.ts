import * as THREE from 'three';
import { ObstacleObject } from './proceduralGenerator';
import { PHYSICS_CONFIG } from './constants';

export interface CollisionResult {
  isGrounded: boolean;
  groundHeight: number;
  hitWallLeft: ObstacleObject | null;
  hitWallRight: ObstacleObject | null;
  hitHazard: ObstacleObject | null;
  hitBouncePad: ObstacleObject | null;
  hitBoostRing: ObstacleObject | null;
  hitCheckpoint: ObstacleObject | null;
  hitFinish: boolean;
  canMantle: boolean;
  mantleTargetY: number;
}

export class PhysicsEngine {
  private playerBox = new THREE.Box3();
  private raycaster = new THREE.Raycaster();

  public checkCollisions(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    isSliding: boolean,
    objects: ObstacleObject[],
    lookDirection: THREE.Vector3
  ): CollisionResult {
    const height = isSliding ? PHYSICS_CONFIG.PLAYER_HEIGHT_SLIDE : PHYSICS_CONFIG.PLAYER_HEIGHT_STAND;
    const radius = PHYSICS_CONFIG.PLAYER_RADIUS;

    // Build player bounding box in current frame
    const min = new THREE.Vector3(position.x - radius, position.y, position.z - radius);
    const max = new THREE.Vector3(position.x + radius, position.y + height, position.z + radius);
    this.playerBox.set(min, max);

    let isGrounded = false;
    let groundHeight = -9999;
    let hitWallLeft: ObstacleObject | null = null;
    let hitWallRight: ObstacleObject | null = null;
    let hitHazard: ObstacleObject | null = null;
    let hitBouncePad: ObstacleObject | null = null;
    let hitBoostRing: ObstacleObject | null = null;
    let hitCheckpoint: ObstacleObject | null = null;
    let hitFinish = false;
    let canMantle = false;
    let mantleTargetY = 0;

    // Calculate left and right directions from lookDirection for wall detection
    const rightVec = new THREE.Vector3(-lookDirection.z, 0, lookDirection.x).normalize();
    const leftVec = rightVec.clone().negate();

    const sideCheckDist = 1.15; // Wall detection reach

    for (const obj of objects) {
      if (!obj.box.intersectsBox(this.playerBox)) {
        // Not directly intersecting, check for side proximity (wall running) or triggers
        if (obj.type === 'wall') {
          // Check left distance
          const leftPoint = position.clone().addScaledVector(leftVec, sideCheckDist);
          leftPoint.y += height * 0.5;
          if (obj.box.containsPoint(leftPoint)) {
            hitWallLeft = obj;
          }

          // Check right distance
          const rightPoint = position.clone().addScaledVector(rightVec, sideCheckDist);
          rightPoint.y += height * 0.5;
          if (obj.box.containsPoint(rightPoint)) {
            hitWallRight = obj;
          }
        }
        continue;
      }

      // Intersecting handling
      if (obj.isTrigger) {
        if (obj.type === 'checkpoint') {
          hitCheckpoint = obj;
        } else if (obj.type === 'finish') {
          hitFinish = true;
        } else if (obj.type === 'boost_ring') {
          hitBoostRing = obj;
        }
        continue;
      }

      if (obj.type === 'hazard') {
        hitHazard = obj;
        continue;
      }

      if (obj.type === 'sliding_bar') {
        // If player is sliding, the lower bounding box might pass under, otherwise it hits!
        // Sliding bar top laser hits if player's head is high
        if (!isSliding || position.y + height > obj.box.min.y) {
          hitHazard = obj;
        }
        continue;
      }

      if (obj.type === 'bounce_pad') {
        hitBouncePad = obj;
      }

      if (obj.type === 'platform' || obj.type === 'bounce_pad') {
        // Check if player feet are near platform top
        const platTop = obj.box.max.y;
        if (position.y >= platTop - 0.45 && velocity.y <= 0.5) {
          if (platTop > groundHeight) {
            groundHeight = platTop;
            isGrounded = true;
          }
        } else if (position.y + height * 0.7 < platTop && velocity.y > 0) {
          // Hit bottom of platform
          velocity.y = Math.min(velocity.y, -1.0);
        } else {
          // Horizontal side push out
          this.resolveHorizontalCollision(position, this.playerBox, obj.box);

          // Check for Ledge Grab / Mantle
          const distToTop = platTop - (position.y + height * 0.6);
          if (distToTop > 0 && distToTop < 1.3 && velocity.y < 2.0) {
            canMantle = true;
            mantleTargetY = platTop;
          }
        }
      } else if (obj.type === 'wall') {
        this.resolveHorizontalCollision(position, this.playerBox, obj.box);
      }
    }

    return {
      isGrounded,
      groundHeight,
      hitWallLeft,
      hitWallRight,
      hitHazard,
      hitBouncePad,
      hitBoostRing,
      hitCheckpoint,
      hitFinish,
      canMantle,
      mantleTargetY,
    };
  }

  private resolveHorizontalCollision(pos: THREE.Vector3, playerBox: THREE.Box3, obstacleBox: THREE.Box3) {
    const overlapX1 = playerBox.max.x - obstacleBox.min.x;
    const overlapX2 = obstacleBox.max.x - playerBox.min.x;
    const overlapZ1 = playerBox.max.z - obstacleBox.min.z;
    const overlapZ2 = obstacleBox.max.z - playerBox.min.z;

    const minOverlapX = Math.min(overlapX1, overlapX2);
    const minOverlapZ = Math.min(overlapZ1, overlapZ2);

    if (minOverlapX < minOverlapZ) {
      if (overlapX1 < overlapX2) {
        pos.x -= overlapX1;
      } else {
        pos.x += overlapX2;
      }
    } else {
      if (overlapZ1 < overlapZ2) {
        pos.z -= overlapZ1;
      } else {
        pos.z += overlapZ2;
      }
    }
  }
}
