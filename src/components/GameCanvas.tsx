import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../game/playerController';
import { SceneManager } from '../game/sceneManager';
import { GhostSystem } from '../game/ghostSystem';
import { ProceduralCourseGenerator, ObstacleObject, GeneratedCourse } from '../game/proceduralGenerator';
import { GameSettings, LevelConfig, PlayerStats } from '../types';
import { HUD } from './HUD';
import { TouchControls } from './TouchControls';
import { sfx } from '../audio/soundEffects';
import { music } from '../audio/synthMusic';

interface GameCanvasProps {
  level: LevelConfig;
  settings: GameSettings;
  isPaused: boolean;
  onPauseToggle: () => void;
  onLevelComplete: (finalTime: number, finalScore: number, maxSpeed: number, isNewBest: boolean) => void;
  onUpdateSettings: (s: Partial<GameSettings>) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  settings,
  isPaused,
  onPauseToggle,
  onLevelComplete,
  onUpdateSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core game instances
  const sceneMgrRef = useRef<SceneManager | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const ghostRef = useRef<GhostSystem | null>(null);
  const currentCourseRef = useRef<GeneratedCourse | null>(null);

  // Input states
  const inputRef = useRef<PlayerInput>({
    forward: 0,
    right: 0,
    jump: false,
    slide: false,
    dash: false,
    resetToCheckpoint: false,
  });

  const [stats, setStats] = useState<PlayerStats>({
    speed: 0,
    maxSpeed: 0,
    isGrounded: true,
    isWallRunning: false,
    wallRunSide: null,
    isSliding: false,
    isDashing: false,
    isMantling: false,
    canDoubleJump: true,
    dashCooldown: 0,
    flowCombo: 1.0,
    flowTimer: 0,
    currentCheckpoint: 0,
    totalCheckpoints: 0,
    distanceTraveled: 0,
    score: 0,
    timeElapsed: 0,
    isDead: false,
    isCompleted: false,
    fps: 60,
  });

  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const bestRecordRef = useRef<number | undefined>(undefined);

  // Initialize Game World
  const loadLevel = useCallback(
    (lvl: LevelConfig) => {
      if (!sceneMgrRef.current || !playerRef.current || !ghostRef.current) return;

      const generator = new ProceduralCourseGenerator(lvl.seed, lvl.theme, lvl.difficulty);
      const course = generator.generateLevel(lvl.segmentCount);
      currentCourseRef.current = course;

      sceneMgrRef.current.applyTheme(lvl.theme);
      sceneMgrRef.current.loadCourse(course);

      playerRef.current.setStartCheckpoint(course.startPosition, course.checkpoints.length - 1);

      ghostRef.current.startRecording(lvl.id);
      const record = ghostRef.current.getBestRecord(lvl.id);
      bestRecordRef.current = record ? record.bestTime : undefined;
    },
    []
  );

  // Quick reset
  const handleReset = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.respawn();
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Init Audio
    sfx.init();
    sfx.setVolumes(settings.masterVolume, settings.sfxVolume);
    music.init();
    music.setVolume(settings.musicVolume);
    music.start();

    // 2. Init Three.js Scene & Player
    const sceneMgr = new SceneManager();
    sceneMgr.initRenderer(canvasRef.current);
    sceneMgrRef.current = sceneMgr;

    const player = new PlayerController();
    sceneMgr.scene.add(player.meshGroup);
    sceneMgr.scene.add(player.camera);
    playerRef.current = player;

    const ghost = new GhostSystem();
    ghost.init(sceneMgr.scene);
    ghostRef.current = ghost;

    loadLevel(level);

    // 3. Pointer Lock handling
    const canvas = canvasRef.current;
    const handleCanvasClick = () => {
      sfx.ensureContext();
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      setIsPointerLocked(locked);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas || !playerRef.current) return;
      const sens = settings.mouseSensitivity * 0.0022;
      const invert = settings.invertY ? -1 : 1;

      playerRef.current.yaw -= e.movementX * sens;
      playerRef.current.pitch -= e.movementY * sens * invert;
    };

    canvas.addEventListener('click', handleCanvasClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    // 4. Keyboard Controls
    const keysPressed = new Set<string>();

    const updateKeyboardInputs = () => {
      let fwd = 0;
      let rgt = 0;
      if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) fwd += 1;
      if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) fwd -= 1;
      if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) rgt -= 1;
      if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) rgt += 1;

      inputRef.current.forward = fwd;
      inputRef.current.right = rgt;
      inputRef.current.jump = keysPressed.has('Space');
      inputRef.current.slide = keysPressed.has('KeyC') || keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight');
      inputRef.current.dash = keysPressed.has('KeyQ') || keysPressed.has('KeyE') || keysPressed.has('ShiftLeft');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      sfx.ensureContext();
      keysPressed.add(e.code);

      if (e.code === 'KeyR') {
        playerRef.current?.respawn();
      }
      if (e.code === 'KeyV') {
        // Toggle camera mode
        onUpdateSettings({
          cameraMode: settings.cameraMode === 'first_person' ? 'third_person' : 'first_person',
        });
      }
      if (e.code === 'Escape') {
        onPauseToggle();
      }

      updateKeyboardInputs();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      updateKeyboardInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 5. Window Resize
    const handleResize = () => {
      if (playerRef.current && sceneMgrRef.current) {
        playerRef.current.camera.aspect = window.innerWidth / window.innerHeight;
        playerRef.current.camera.updateProjectionMatrix();
        sceneMgrRef.current.handleResize();
      }
    };
    window.addEventListener('resize', handleResize);

    // 6. Main Game Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let currentFPS = 60;
    let animId: number;

    const gameLoop = (currentTime: number) => {
      animId = requestAnimationFrame(gameLoop);

      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // FPS tracking
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        currentFPS = Math.round((frameCount * 1000) / (currentTime - lastFpsTime));
        frameCount = 0;
        lastFpsTime = currentTime;
      }

      if (!isPaused && playerRef.current && sceneMgrRef.current && currentCourseRef.current) {
        const p = playerRef.current;
        const s = sceneMgrRef.current;
        const c = currentCourseRef.current;
        const g = ghostRef.current;

        // Update animated obstacles
        s.updateAnimatedObstacles(c.objects, delta, p.timeElapsed);

        // Update player physics & state
        p.update(delta, inputRef.current, c.objects, settings);

        // Update lights tracking player
        s.updateLightPosition(p.position);

        // Record & playback ghost
        if (g) {
          let st: 'run' | 'jump' | 'wallrun' | 'slide' | 'dash' = 'run';
          if (p.isDashing) st = 'dash';
          else if (p.isSliding) st = 'slide';
          else if (p.isWallRunning) st = 'wallrun';
          else if (!p.isGrounded) st = 'jump';

          g.recordFrame(p.timeElapsed, p.position, p.yaw, p.pitch, p.roll, st, delta);
          g.updatePlayback(p.timeElapsed, settings.showGhost);
        }

        // Music dynamic intensity
        const speed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
        music.setIntensity(1.0 + (speed / 16.0) * 0.8 + (p.flowCombo - 1) * 0.4);

        // Check level completion
        if (p.isCompleted) {
          const isNewBest = g ? g.saveRunIfBest(level.id, p.timeElapsed, p.score) : false;
          onLevelComplete(p.timeElapsed, p.score, p.maxSpeedAchieved, isNewBest);
        }

        // Render Three.js Scene
        s.renderer.render(s.scene, p.camera);

        // Emit stats
        setStats(p.getStats(currentFPS));
      }
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      music.stop();
      if (ghostRef.current) ghostRef.current.cleanup();
    };
  }, [level, isPaused, settings, onLevelComplete, onPauseToggle, onUpdateSettings, loadLevel]);

  // Touch look delta handler
  const handleTouchLookDelta = (dx: number, dy: number) => {
    if (!playerRef.current) return;
    const sens = settings.mouseSensitivity * 1.5;
    const invert = settings.invertY ? -1 : 1;
    playerRef.current.yaw -= dx * sens;
    playerRef.current.pitch -= dy * sens * invert;
  };

  return (
    <div id="game-container" className="relative w-full h-screen overflow-hidden bg-[#080808]">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

      {/* HUD Layer */}
      <HUD
        stats={stats}
        settings={settings}
        levelName={level.name}
        bestTime={bestRecordRef.current}
        onReset={handleReset}
        onPause={onPauseToggle}
      />

      {/* Touch Controls Layer (Mobile / Touch screens) */}
      <TouchControls
        onInputChange={(updater) => {
          inputRef.current = updater(inputRef.current);
        }}
        onLookDelta={handleTouchLookDelta}
      />

      {/* Pointer Lock Help Banner when unlocked */}
      {!isPointerLocked && !isPaused && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 border border-white/20 backdrop-blur-md px-5 py-2 rounded-full shadow-2xl z-30 pointer-events-none flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-white/90 font-mono text-[11px] uppercase tracking-widest">
            CLICK CANVAS TO ENGAGE MOUSE AIM
          </span>
        </div>
      )}
    </div>
  );
};
