import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, RotateCcw, ArrowRight, Compass, Flame, Gauge, Clock } from 'lucide-react';
import { LevelConfig } from '../types';

interface GameOverModalProps {
  level: LevelConfig;
  finalTime: number;
  finalScore: number;
  maxSpeed: number;
  isNewBest: boolean;
  bestTime?: number;
  onNextLevel?: () => void;
  onRestart: () => void;
  onOpenLevels: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  level,
  finalTime,
  finalScore,
  maxSpeed,
  isNewBest,
  bestTime,
  onNextLevel,
  onRestart,
  onOpenLevels,
}) => {
  // Trigger victory confetti
  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#ffffff', '#fb923c', '#38bdf8'],
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Determine Medal
  let medalTitle = 'Bronze Finisher';
  let medalColor = 'text-amber-500 border-amber-500/40 bg-amber-950/20';

  if (level.authorTimeSeconds && finalTime <= level.authorTimeSeconds) {
    medalTitle = '👑 AUTHOR SPEEDRUNNER';
    medalColor = 'text-cyan-300 border-cyan-400/50 bg-cyan-950/30';
  } else if (level.goldTimeSeconds && finalTime <= level.goldTimeSeconds) {
    medalTitle = '🥇 GOLD TROPHY';
    medalColor = 'text-amber-300 border-amber-400/50 bg-amber-950/30';
  } else if (level.silverTimeSeconds && finalTime <= level.silverTimeSeconds) {
    medalTitle = '🥈 SILVER MEDAL';
    medalColor = 'text-slate-300 border-white/30 bg-white/5';
  }

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col items-center text-center relative">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 bg-matrix-dots opacity-20 pointer-events-none rounded-2xl"></div>

        {/* Status Micro-Header */}
        <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-mono mb-2 relative z-10">
          Course Clearance Protocol // Complete
        </div>

        {/* Trophy icon */}
        <div className="w-14 h-14 rounded-full border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-center mb-3 relative z-10">
          <Trophy className="w-6 h-6 text-cyan-400" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-light tracking-[0.15em] text-white uppercase mb-1 relative z-10">
          COURSE COMPLETED
        </h2>
        <p className="text-xs font-mono text-cyan-400 tracking-wider mb-4 relative z-10">
          // {level.name.toUpperCase()}
        </p>

        {/* Medal Badge */}
        <div className={`px-4 py-1.5 rounded-full border text-[11px] font-mono tracking-widest uppercase mb-6 flex items-center gap-2 relative z-10 ${medalColor}`}>
          <Medal className="w-3.5 h-3.5" />
          <span>{medalTitle}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6 relative z-10">
          {/* Final Time */}
          <div className="bg-black/50 border-l-2 border-cyan-500 p-4 text-left">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>TIME ELAPSED</span>
            </div>
            <span className="text-2xl font-light font-mono text-white tracking-wider">
              {formatTime(finalTime)}
            </span>
            {isNewBest ? (
              <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider mt-1">
                ⭐ NEW RECORD
              </div>
            ) : (
              bestTime && (
                <div className="text-[9px] text-white/30 font-mono mt-1">
                  PB: {formatTime(bestTime)}
                </div>
              )
            )}
          </div>

          {/* Final Score & Speed */}
          <div className="bg-black/50 border-l-2 border-orange-400 p-4 text-left">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>SCORE</span>
            </div>
            <span className="text-2xl font-light font-mono text-orange-400 tracking-wider">
              {finalScore.toLocaleString()}
            </span>
            <div className="text-[9px] text-white/30 font-mono mt-1">
              PEAK: {maxSpeed} KM/H
            </div>
          </div>
        </div>

        {/* Target times */}
        {level.goldTimeSeconds && (
          <div className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 mb-6 flex justify-around text-xs font-mono text-white/60 relative z-10">
            <div>
              GOLD: <span className="text-amber-300 font-bold">{formatTime(level.goldTimeSeconds)}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div>
              SILVER: <span className="text-slate-300 font-bold">{formatTime(level.silverTimeSeconds || 0)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full relative z-10">
          {onNextLevel && (
            <button
              id="gameover-btn-next"
              onClick={onNextLevel}
              className="w-full py-3.5 px-6 bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg flex items-center justify-center gap-2.5 transition-all transform active:scale-98 cursor-pointer"
            >
              <span>PROCEED TO NEXT SECTOR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              id="gameover-btn-retry"
              onClick={onRestart}
              className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
              <span>RETRY COURSE</span>
            </button>

            <button
              id="gameover-btn-levels"
              onClick={onOpenLevels}
              className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>ALL COURSES</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

