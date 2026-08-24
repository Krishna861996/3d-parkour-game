import React, { useEffect, useRef } from 'react';
import { PlayerStats, GameSettings } from '../types';
import { RotateCcw, Award } from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  settings: GameSettings;
  levelName: string;
  bestTime?: number;
  onReset: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  settings,
  levelName,
  bestTime,
  onReset,
  onPause,
}) => {
  const speedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Speed lines rendering on canvas
  useEffect(() => {
    if (!settings.motionBlurAndSpeedLines || !speedCanvasRef.current) return;
    const canvas = speedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const lines: { x: number; y: number; length: number; speed: number; angle: number }[] = [];

    const initLines = () => {
      lines.length = 0;
      for (let i = 0; i < 45; i++) {
        lines.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          length: 20 + Math.random() * 60,
          speed: 15 + Math.random() * 25,
          angle: Math.atan2(canvas.height / 2 - Math.random() * canvas.height, canvas.width / 2 - Math.random() * canvas.width),
        });
      }
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initLines();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only draw speed lines when speed > 40 km/h or during Dash
      const speedRatio = Math.min(1.0, Math.max(0, (stats.speed - 35) / 35));
      if (speedRatio > 0.05 || stats.isDashing) {
        const intensity = stats.isDashing ? 1.0 : speedRatio;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.strokeStyle = `rgba(6, 182, 212, ${intensity * 0.35})`;
        ctx.lineWidth = stats.isDashing ? 2 : 1;

        for (const line of lines) {
          const dx = line.x - cx;
          const dy = line.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Ray from outer inwards
          ctx.beginPath();
          ctx.moveTo(line.x, line.y);
          ctx.lineTo(
            line.x + Math.cos(line.angle) * line.length * intensity,
            line.y + Math.sin(line.angle) * line.length * intensity
          );
          ctx.stroke();

          // Move line
          line.x += Math.cos(line.angle) * line.speed * (intensity + 0.5);
          line.y += Math.sin(line.angle) * line.speed * (intensity + 0.5);

          if (dist < 80 || line.x < 0 || line.x > canvas.width || line.y < 0 || line.y > canvas.height) {
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) { line.x = Math.random() * canvas.width; line.y = 0; }
            else if (edge === 1) { line.x = canvas.width; line.y = Math.random() * canvas.height; }
            else if (edge === 2) { line.x = Math.random() * canvas.width; line.y = canvas.height; }
            else { line.x = 0; line.y = Math.random() * canvas.height; }
            line.angle = Math.atan2(cy - line.y, cx - line.x);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [settings.motionBlurAndSpeedLines, stats.speed, stats.isDashing]);

  // Format time (MM:SS.SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // State badge
  let activeStateText = '';
  if (stats.isDashing) {
    activeStateText = 'AIR DASH // ENGAGED';
  } else if (stats.isWallRunning) {
    activeStateText = `WALL RUN // ${stats.wallRunSide?.toUpperCase()}`;
  } else if (stats.isSliding) {
    activeStateText = 'SLIDE // MOMENTUM BOOST';
  } else if (stats.isMantling) {
    activeStateText = 'MANTLE // ASCENDING';
  } else if (!stats.isGrounded && !stats.canDoubleJump) {
    activeStateText = 'DOUBLE JUMP // ACTIVE';
  }

  // Momentum blocks calculation (out of 8)
  const dashReady = stats.dashCooldown <= 0;
  const speedRatio = Math.min(1, stats.speed / 75);
  const activeTicks = Math.min(8, Math.round(speedRatio * 8));

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between overflow-hidden">
      {/* Speed Lines overlay canvas */}
      <canvas
        ref={speedCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Top Header Bar - Elegant Dark Theme */}
      <div className="flex-none h-16 border-b border-white/10 px-4 sm:px-8 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-[11px] sm:text-xs tracking-[0.3em] font-bold text-white/60 uppercase">
            AERO-RUNNER // MK.IV
          </div>
          <div className="h-4 w-[1px] bg-white/20 hidden sm:block"></div>
          <div className="text-[11px] sm:text-xs tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>{levelName.toUpperCase()}</span>
          </div>
        </div>

        {/* Center Elapsed Time & PB */}
        <div className="flex items-center gap-6 sm:gap-12">
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Elapsed Time</div>
            <div className="text-lg sm:text-xl font-mono font-light text-white leading-none">
              {formatTime(stats.timeElapsed)}
            </div>
          </div>

          <div className="text-center hidden xs:block">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Best Record</div>
            <div className="text-lg sm:text-xl font-mono font-light text-white/40 leading-none">
              {bestTime !== undefined ? formatTime(bestTime) : '--:--.--'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <button
            id="hud-reset-btn"
            onClick={onReset}
            title="Quick Respawn (R)"
            className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 flex items-center justify-center text-[10px] font-mono text-white/70 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            id="hud-pause-btn"
            onClick={onPause}
            title="Pause Menu (ESC)"
            className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 flex items-center justify-center text-[10px] font-mono text-white/70 transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>
      </div>

      {/* Center Reticle / Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-cyan-400 shadow-[0_0_8px_#06b6d4] rounded-full" />
        </div>
      </div>

      {/* Active State Announcement Banner */}
      {activeStateText && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div className="bg-black/60 backdrop-blur-md border border-cyan-500/40 text-cyan-300 px-4 py-1.5 rounded-sm text-[11px] font-mono tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse">
            {activeStateText}
          </div>
        </div>
      )}

      {/* Main Playfield UI Body (Telemetry Left & Right) */}
      <div className="relative flex-1 flex justify-between items-center px-4 sm:px-8 pointer-events-none">
        {/* Left Telemetry Cluster */}
        <div className="flex flex-col gap-4 sm:gap-6 z-10">
          {/* Velocity Card */}
          <div className="bg-black/40 backdrop-blur-md border-l-2 border-cyan-500 p-3.5 sm:p-4 w-40 sm:w-48 shadow-lg">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Velocity</div>
            <div className="text-2xl sm:text-3xl font-light font-mono text-white flex items-baseline gap-1">
              {stats.speed} <span className="text-xs text-white/30 uppercase font-sans">km/h</span>
            </div>
            <div className="w-full h-1 bg-white/10 mt-2.5 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-75"
                style={{ width: `${Math.min(100, (stats.speed / 70) * 100)}%` }}
              />
            </div>
            <div className="text-[9px] text-white/30 font-mono mt-1.5 flex justify-between">
              <span>PEAK: {stats.maxSpeed}</span>
              <span>SCORE: {stats.score}</span>
            </div>
          </div>

          {/* Combo / Flow Card */}
          <div className="bg-black/40 backdrop-blur-md border-l-2 border-orange-400 p-3.5 sm:p-4 w-40 sm:w-48 shadow-lg">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Flow Combo</div>
            <div className="text-2xl sm:text-3xl font-light font-mono text-orange-400 flex items-baseline gap-1">
              x{stats.flowCombo.toFixed(1)}
            </div>
            <div className="w-full h-1 bg-white/10 mt-2.5 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-orange-400 shadow-[0_0_10px_#fb923c] transition-all duration-75"
                style={{ width: `${Math.min(100, (stats.flowTimer / 3.5) * 100)}%` }}
              />
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider mt-1.5">
              Streak Velocity
            </div>
          </div>
        </div>

        {/* Right Info Cluster */}
        <div className="flex flex-col gap-4 z-10">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-sm w-48 sm:w-56 shadow-lg">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 flex justify-between items-center">
              <span>Checkpoint</span>
              <span className="text-cyan-400 font-mono font-bold">
                {stats.currentCheckpoint} / {stats.totalCheckpoints}
              </span>
            </div>

            {/* Checkpoint Progress Track */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.max(1, stats.totalCheckpoints) }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-xs transition-all ${
                    idx < stats.currentCheckpoint
                      ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-white/40 font-mono">
              <span>AIR DASH</span>
              <span className={dashReady ? 'text-cyan-400 font-bold' : 'text-white/30'}>
                {dashReady ? 'READY' : `${Math.ceil(stats.dashCooldown * 10) / 10}S`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Momentum Threshold Bar & Keycaps */}
      <div className="flex flex-col items-center gap-3 z-10 pb-3 sm:pb-4 pointer-events-none">
        <div className="text-[10px] text-white/40 uppercase tracking-[0.4em]">Momentum Threshold</div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => {
            const isLit = i < activeTicks;
            return (
              <div
                key={i}
                className={`w-6 sm:w-8 h-2 transition-all duration-75 ${
                  isLit ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-white/10'
                }`}
              />
            );
          })}
        </div>

        {/* Micro Key Guides */}
        <div className="flex gap-2 sm:gap-4 mt-0.5">
          <div className="px-2.5 py-0.5 bg-white text-black text-[9px] font-bold uppercase tracking-wider rounded-xs">
            Shift // Slide
          </div>
          <div className="px-2.5 py-0.5 bg-white text-black text-[9px] font-bold uppercase tracking-wider rounded-xs">
            Space // Jump
          </div>
          <div className="px-2.5 py-0.5 bg-white text-black text-[9px] font-bold uppercase tracking-wider rounded-xs">
            Q/E // Dash
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="flex-none h-9 bg-black/90 border-t border-white/10 flex items-center justify-between px-4 sm:px-8 z-20">
        <div className="text-[9px] text-white/30 uppercase font-mono tracking-wider">
          STATUS: ACTIVE // SEED #{levelName}
        </div>
        <div className="text-[9px] text-white/30 uppercase font-mono tracking-wider">
          {settings.showFPS ? `FPS: ${stats.fps} | ` : ''}LATENCY: 12ms // BUFFER: OPTIMAL
        </div>
      </div>
    </div>
  );
};

