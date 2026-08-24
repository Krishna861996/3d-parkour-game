import React from 'react';
import { X, Keyboard, Zap, CornerDownRight, ArrowUp, Move, RotateCcw, Eye } from 'lucide-react';

interface ControlsGuideProps {
  onClose: () => void;
}

export const ControlsGuide: React.FC<ControlsGuideProps> = ({ onClose }) => {
  const controls = [
    {
      icon: <Move className="w-4 h-4 text-cyan-400" />,
      title: 'Vector Movement & Strafe',
      keys: ['W', 'A', 'S', 'D'],
      desc: 'Navigate in 3D Euclidean space with progressive inertia curves.',
    },
    {
      icon: <ArrowUp className="w-4 h-4 text-white" />,
      title: 'Acrobatic Jump & Double Boost',
      keys: ['Spacebar'],
      desc: 'Ascend over chasms. Trigger again while airborne for secondary boost pulse.',
    },
    {
      icon: <Zap className="w-4 h-4 text-orange-400" />,
      title: 'Wall Running & Angle Kickoff',
      keys: ['Space into Wall'],
      desc: 'Approach illuminated wall surfaces while airborne. Kick off at 45° to multiply velocity.',
    },
    {
      icon: <CornerDownRight className="w-4 h-4 text-cyan-400" />,
      title: 'Low Friction Slide',
      keys: ['C', 'Left Shift'],
      desc: 'Slide under laser beams, down slopes, and retain kinetic momentum.',
    },
    {
      icon: <Zap className="w-4 h-4 text-cyan-300" />,
      title: 'Hypersonic Air Dash',
      keys: ['Shift', 'Q', 'E'],
      desc: 'Rapid directional propulsion burst with field-of-view warping.',
    },
    {
      icon: <ArrowUp className="w-4 h-4 text-white/70" />,
      title: 'Edge Ledge Mantle',
      keys: ['Auto (Reach rim)'],
      desc: 'Automatically hoist player capsule when reaching platform rims.',
    },
    {
      icon: <Eye className="w-4 h-4 text-white/70" />,
      title: 'Perspective Mode',
      keys: ['V'],
      desc: 'Toggle between First-Person (FPS) and Third-Person (Chase Cam).',
    },
    {
      icon: <RotateCcw className="w-4 h-4 text-orange-400" />,
      title: 'Instant Respawn',
      keys: ['R'],
      desc: 'Instant rollback to most recent active checkpoint.',
    },
  ];

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] relative">
        {/* Dot grid */}
        <div className="absolute inset-0 bg-matrix-dots opacity-20 pointer-events-none rounded-2xl"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-mono mb-0.5">
              Kinematics // Input Bindings
            </div>
            <h2 className="text-xl sm:text-2xl font-light tracking-wide text-white uppercase flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">05.</span>
              <span>MOVEMENT PROTOCOLS</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Grid */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1 relative z-10">
          {controls.map((ctrl, i) => (
            <div
              key={i}
              className="bg-black/40 border border-white/10 rounded-lg p-3 sm:p-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-white/5 border border-white/10 flex-shrink-0">
                  {ctrl.icon}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-white">{ctrl.title}</h4>
                  <p className="text-[11px] text-white/40 mt-0.5">{ctrl.desc}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-end flex-shrink-0">
                {ctrl.keys.map((k, ki) => (
                  <span
                    key={ki}
                    className="px-2.5 py-1 bg-white text-black font-mono text-[10px] font-bold uppercase tracking-wider rounded-xs shadow-sm"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pointer Lock hint */}
        <div className="bg-black/60 border border-cyan-500/30 rounded-lg p-2.5 text-[11px] text-cyan-300 text-center font-mono relative z-10">
          Click canvas to engage mouse lock. Press <strong>ESC</strong> to release cursor.
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-3.5 px-6 bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg transition-colors cursor-pointer relative z-10"
        >
          CONFIRM & RESUME
        </button>
      </div>
    </div>
  );
};

