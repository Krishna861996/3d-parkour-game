import * as THREE from 'three';
import { GhostFrame, HighScoreRecord } from '../types';

export class GhostSystem {
  private recordingFrames: GhostFrame[] = [];
  private playbackFrames: GhostFrame[] = [];
  private sampleTimer = 0;
  private sampleInterval = 0.08; // ~12 samples per second

  private ghostMesh: THREE.Group | null = null;
  private scene: THREE.Scene | null = null;

  public init(scene: THREE.Scene) {
    this.scene = scene;
    this.createGhostMesh();
  }

  private createGhostMesh() {
    this.ghostMesh = new THREE.Group();

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.35), ghostMat);
    torso.position.y = 0.9;
    this.ghostMesh.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), ghostMat);
    head.position.y = 1.5;
    this.ghostMesh.add(head);

    this.ghostMesh.visible = false;
    if (this.scene) {
      this.scene.add(this.ghostMesh);
    }
  }

  public startRecording(levelId: string) {
    this.recordingFrames = [];
    this.sampleTimer = 0;
    this.loadGhostForLevel(levelId);
  }

  public recordFrame(
    time: number,
    position: THREE.Vector3,
    yaw: number,
    pitch: number,
    roll: number,
    state: 'run' | 'jump' | 'wallrun' | 'slide' | 'dash',
    delta: number
  ) {
    this.sampleTimer += delta;
    if (this.sampleTimer >= this.sampleInterval) {
      this.sampleTimer = 0;
      this.recordingFrames.push({
        time,
        position: [position.x, position.y, position.z],
        rotation: [pitch, yaw, roll],
        state,
      });
    }
  }

  public updatePlayback(currentTime: number, showGhost: boolean) {
    if (!this.ghostMesh) return;

    if (!showGhost || this.playbackFrames.length < 2) {
      this.ghostMesh.visible = false;
      return;
    }

    this.ghostMesh.visible = true;

    // Find interpolation bracket
    let idx = 0;
    while (idx < this.playbackFrames.length - 1 && this.playbackFrames[idx + 1].time < currentTime) {
      idx++;
    }

    if (idx >= this.playbackFrames.length - 1) {
      // Reached end of recorded ghost
      const last = this.playbackFrames[this.playbackFrames.length - 1];
      this.ghostMesh.position.set(last.position[0], last.position[1], last.position[2]);
      this.ghostMesh.rotation.y = last.rotation[1];
      return;
    }

    const f1 = this.playbackFrames[idx];
    const f2 = this.playbackFrames[idx + 1];
    const span = f2.time - f1.time;
    const progress = span > 0 ? (currentTime - f1.time) / span : 0;
    const alpha = Math.max(0, Math.min(1, progress));

    this.ghostMesh.position.set(
      THREE.MathUtils.lerp(f1.position[0], f2.position[0], alpha),
      THREE.MathUtils.lerp(f1.position[1], f2.position[1], alpha),
      THREE.MathUtils.lerp(f1.position[2], f2.position[2], alpha)
    );
    this.ghostMesh.rotation.y = THREE.MathUtils.lerp(f1.rotation[1], f2.rotation[1], alpha);
  }

  public saveRunIfBest(levelId: string, finalTime: number, finalScore: number): boolean {
    const key = `parkour_best_${levelId}`;
    const existingStr = localStorage.getItem(key);
    let isNewBest = false;

    if (existingStr) {
      try {
        const existing: HighScoreRecord = JSON.parse(existingStr);
        if (finalTime < existing.bestTime) {
          isNewBest = true;
        }
      } catch {
        isNewBest = true;
      }
    } else {
      isNewBest = true;
    }

    if (isNewBest) {
      const record: HighScoreRecord = {
        levelId,
        bestTime: finalTime,
        bestScore: finalScore,
        date: new Date().toISOString(),
        ghostData: this.recordingFrames,
      };
      localStorage.setItem(key, JSON.stringify(record));
    }

    return isNewBest;
  }

  public getBestRecord(levelId: string): HighScoreRecord | null {
    const key = `parkour_best_${levelId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  public loadGhostForLevel(levelId: string) {
    const record = this.getBestRecord(levelId);
    if (record && record.ghostData && record.ghostData.length > 0) {
      this.playbackFrames = record.ghostData;
    } else {
      this.playbackFrames = [];
    }
  }

  public cleanup() {
    if (this.ghostMesh && this.scene) {
      this.scene.remove(this.ghostMesh);
    }
  }
}
