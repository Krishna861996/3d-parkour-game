import React, { useState } from 'react';
import { GameTheme, Difficulty, LevelConfig } from '../types';
import { THEMES } from '../game/constants';
import { X, Dices, Play, Palette, Zap } from 'lucide-react';

interface CustomLevelModalProps {
  onGenerate: (config: LevelConfig) => void;
  onClose: () => void;
}

export const CustomLevelModal: React.FC<CustomLevelModalProps> = ({
  onGenerate,
  onClose,
}) => {
  const [seed, setSeed] = useState(Math.floor(Math.random() * 99999) + 1);
  const [theme, setTheme] = useState<GameTheme>('cyberpunk');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [segments, setSegments] = useState(12);

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 999999) + 1);
  };

  const handlePlay = (e: React.FormEvent) => {
    e.preventDefault();
    const config: LevelConfig = {
      id: `custom_${seed}`,
      name: `Custom Course #${seed}`,
      seed,
      theme,
      difficulty,
      segmentCount: segments,
      description: `Custom ${difficulty.toUpperCase()} course with ${segments} procedural sections.`,
    };
    onGenerate(config);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col relative max-h-[92vh] overflow-y-auto">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 bg-matrix-dots opacity-20 pointer-events-none rounded-2xl"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-mono mb-0.5">
              Procedural Synthesizer // Parameter Matrix
            </div>
            <h2 className="text-xl sm:text-2xl font-light tracking-wide text-white uppercase flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">03.</span>
              <span>SYNTHESIZE COURSE</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handlePlay} className="flex flex-col gap-4 py-4 relative z-10">
          {/* Seed Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
              GENERATION SEED
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 1)}
                className="flex-1 bg-black/60 border border-white/15 focus:border-cyan-400 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleRandomizeSeed}
                className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-lg flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer"
              >
                <Dices className="w-4 h-4 text-cyan-400" />
                <span>RNG</span>
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-cyan-400" />
              <span>ENVIRONMENT PALETTE</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(THEMES) as GameTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`p-2.5 rounded-lg border text-xs font-mono uppercase tracking-wider text-left transition-all cursor-pointer ${
                    theme === t
                      ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'border-white/10 bg-black/40 text-white/40 hover:text-white/80'
                  }`}
                >
                  {THEMES[t].name}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-orange-400" />
              <span>DIFFICULTY INTENSITY</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['easy', 'medium', 'hard', 'insane'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`p-2 rounded-lg border text-[11px] font-mono uppercase text-center transition-all cursor-pointer ${
                    difficulty === d
                      ? 'border-orange-400 bg-orange-950/30 text-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.2)]'
                      : 'border-white/10 bg-black/40 text-white/40 hover:text-white/80'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Length / Segment count */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-white/40 uppercase tracking-widest">COURSE LENGTH</span>
              <span className="text-cyan-400 font-bold">{segments} Segments</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={segments}
              onChange={(e) => setSegments(parseInt(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full mt-3 py-3.5 px-6 bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg flex items-center justify-center gap-2.5 transition-all transform active:scale-98 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>SYNTHESIZE & ENTER COURSE</span>
          </button>
        </form>
      </div>
    </div>
  );
};

