export type GameMode = 'levels' | 'endless' | 'custom' | 'daily';

export type GameTheme = 'cyberpunk' | 'sunset' | 'vaporwave' | 'emerald' | 'scifi';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'insane';

export interface LevelConfig {
  id: string;
  name: string;
  seed: number;
  difficulty: Difficulty;
  theme: GameTheme;
  segmentCount: number;
  description: string;
  authorTimeSeconds?: number;
  goldTimeSeconds?: number;
  silverTimeSeconds?: number;
}

export interface PlayerStats {
  speed: number;
  maxSpeed: number;
  isGrounded: boolean;
  isWallRunning: boolean;
  wallRunSide: 'left' | 'right' | null;
  isSliding: boolean;
  isDashing: boolean;
  isMantling: boolean;
  canDoubleJump: boolean;
  dashCooldown: number; // 0 to 1
  flowCombo: number; // e.g. 1.0 to 4.0
  flowTimer: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  distanceTraveled: number;
  score: number;
  timeElapsed: number;
  isDead: boolean;
  isCompleted: boolean;
  fps: number;
}

export interface CheckpointData {
  index: number;
  position: [number, number, number];
  rotation: number;
  timeReached?: number;
  size: [number, number, number];
}

export interface CourseSegment {
  id: string;
  type: 'straight' | 'jump_pads' | 'wall_run_lanes' | 'moving_hazards' | 'laser_grid' | 'spiral_climb' | 'gap_vaults' | 'speed_tunnels' | 'floating_islands' | 'finish_line';
  startPos: [number, number, number];
  endPos: [number, number, number];
  difficulty: Difficulty;
  theme: GameTheme;
}

export interface GhostFrame {
  time: number;
  position: [number, number, number];
  rotation: [number, number, number];
  state: 'run' | 'jump' | 'wallrun' | 'slide' | 'dash';
}

export interface HighScoreRecord {
  levelId: string;
  bestTime: number;
  bestScore: number;
  date: string;
  ghostData?: GhostFrame[];
}

export interface GameSettings {
  fov: number;
  mouseSensitivity: number;
  invertY: boolean;
  cameraMode: 'first_person' | 'third_person';
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  motionBlurAndSpeedLines: boolean;
  shadows: boolean;
  bloomEffect: boolean;
  showFPS: boolean;
  showGhost: boolean;
}
