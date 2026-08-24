import React from 'react';
import { Play, RotateCcw, Compass, Sliders, HelpCircle, Layers, Wrench, X } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenLevels: () => void;
  onOpenCustom: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onOpenLevels,
  onOpenCustom,
  onOpenSettings,
  onOpenControls,
}) => {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-4">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col relative">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-matrix-dots opacity-20 pointer-events-none rounded-2xl"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 relative z-10">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-mono mb-0.5">
              System // Standby
            </div>
            <h2 className="text-xl sm:text-2xl font-light tracking-wide text-white uppercase flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">01.</span>
              <span>PAUSE SEQUENCE</span>
            </h2>
          </div>
          <button
            onClick={onResume}
            className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buttons List */}
        <div className="flex flex-col gap-3 w-full relative z-10">
          <button
            id="pause-btn-resume"
            onClick={onResume}
            className="w-full py-3.5 px-5 bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg flex items-center justify-center gap-2.5 transition-all transform active:scale-98 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME RUN</span>
          </button>

          <button
            id="pause-btn-restart"
            onClick={onRestart}
            className="w-full py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2.5 transition-all transform active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-orange-400" />
            <span>RESTART COURSE (R)</span>
          </button>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              id="pause-btn-levels"
              onClick={onOpenLevels}
              className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>COURSES</span>
            </button>

            <button
              id="pause-btn-custom"
              onClick={onOpenCustom}
              className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>SYNTHESIZER</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="pause-btn-settings"
              onClick={onOpenSettings}
              className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>SETTINGS</span>
            </button>

            <button
              id="pause-btn-controls"
              onClick={onOpenControls}
              className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>CONTROLS</span>
            </button>
          </div>
        </div>

        {/* Micro Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center relative z-10">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            AERO-RUNNER // MK.IV STANDBY PROTOCOL
          </span>
        </div>
      </div>
    </div>
  );
};

