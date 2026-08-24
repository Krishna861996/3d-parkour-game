import React from 'react';
import { PRESET_LEVELS } from '../game/constants';
import { LevelConfig, HighScoreRecord } from '../types';
import { X, Play, Trophy, Sparkles, Clock } from 'lucide-react';

interface LevelSelectModalProps {
  currentLevelId: string;
  onSelectLevel: (level: LevelConfig) => void;
  onClose: () => void;
  onSelectEndless: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  onSelectLevel,
  onClose,
  onSelectEndless,
}) => {
  const getRecord = (levelId: string): HighScoreRecord | null => {
    const data = localStorage.getItem(`parkour_best_${levelId}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] relative">
        {/* Dot grid */}
        <div className="absolute inset-0 bg-matrix-dots opacity-20 pointer-events-none rounded-2xl"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-mono mb-0.5">
              Sector Directory // Procedural Tracks
            </div>
            <h2 className="text-xl sm:text-2xl font-light tracking-wide text-white uppercase flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">02.</span>
              <span>SELECT COURSE</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Level List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 relative z-10">
          {/* Endless Gauntlet Banner */}
          <div
            onClick={onSelectEndless}
            className="group relative overflow-hidden bg-black/60 hover:bg-black/80 border border-cyan-500/40 rounded-xl p-4 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-medium text-white group-hover:text-cyan-400 transition-colors">
                      Endless Skyway Run
                    </h3>
                    <span className="text-[9px] font-mono tracking-widest uppercase bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded-sm border border-cyan-500/30">
                      INFINITE SEED
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    Infinitely synthesizing gauntlet with accelerating velocity curve.
                  </p>
                </div>
              </div>
              <Play className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Standard Levels */}
          {PRESET_LEVELS.map((lvl) => {
            const record = getRecord(lvl.id);
            const isSelected = lvl.id === currentLevelId;

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  onSelectLevel(lvl);
                  onClose();
                }}
                className={`group relative bg-black/40 hover:bg-black/60 border ${
                  isSelected ? 'border-cyan-400 bg-cyan-950/10' : 'border-white/10'
                } rounded-xl p-4 transition-all cursor-pointer flex items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-colors">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {lvl.name}
                      </h4>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-sm bg-white/5 border border-white/10 text-white/60">
                        {lvl.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                      {lvl.description}
                    </p>
                    {/* Records & Targets */}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-white/40 mt-1.5">
                      {record ? (
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PB: {formatTime(record.bestTime)}
                        </span>
                      ) : (
                        <span className="text-white/20">No time recorded</span>
                      )}
                      {lvl.goldTimeSeconds && (
                        <span>• Target: <strong className="text-amber-300/90">{formatTime(lvl.goldTimeSeconds)}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-full border border-white/20 group-hover:border-cyan-400 group-hover:bg-cyan-500 text-white/70 group-hover:text-black flex items-center justify-center transition-all">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Micro footer */}
        <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-white/30 relative z-10">
          <span>SEED RANDOMIZER ENGINE // ACTIVE</span>
          <span>SELECT TO LOAD SECTOR</span>
        </div>
      </div>
    </div>
  );
};

