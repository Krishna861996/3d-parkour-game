import React, { useState, useRef, useCallback } from 'react';
import { PlayerInput } from '../game/playerController';
import { ArrowUp, CornerDownRight, Zap, RotateCcw } from 'lucide-react';

interface TouchControlsProps {
  onInputChange: (fn: (prev: PlayerInput) => PlayerInput) => void;
  onLookDelta: (dx: number, dy: number) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputChange,
  onLookDelta,
}) => {
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  // Joystick handlers
  const handleJoyStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;

    touchStartPos.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    setJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoyMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!joystickActive) return;
    const touch = e.touches[0];
    updateJoystick(touch.clientX, touch.clientY);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const maxRadius = 45;
    const dx = clientX - touchStartPos.current.x;
    const dy = clientY - touchStartPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampX = dx;
    let clampY = dy;
    if (dist > maxRadius) {
      clampX = (dx / dist) * maxRadius;
      clampY = (dy / dist) * maxRadius;
    }

    setStickPos({ x: clampX, y: clampY });

    const normX = clampX / maxRadius;
    const normY = -clampY / maxRadius; // inverted for forward = 1

    onInputChange((prev) => ({
      ...prev,
      right: normX,
      forward: normY,
    }));
  };

  const handleJoyEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setJoystickActive(false);
    setStickPos({ x: 0, y: 0 });
    onInputChange((prev) => ({
      ...prev,
      right: 0,
      forward: 0,
    }));
  };

  // Touch Look area on right side of screen
  const handleLookStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX > window.innerWidth * 0.4) {
        lookTouchId.current = t.identifier;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        break;
      }
    }
  };

  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        onLookDelta(dx * 0.005, dy * 0.005);
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  return (
    <div
      id="touch-controls-layer"
      className="absolute inset-0 pointer-events-auto select-none z-20 md:hidden"
      onTouchStart={handleLookStart}
      onTouchMove={handleLookMove}
      onTouchEnd={handleLookEnd}
      onTouchCancel={handleLookEnd}
    >
      {/* Left Bottom: Virtual Movement Joystick */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div
          ref={joystickRef}
          onTouchStart={handleJoyStart}
          onTouchMove={handleJoyMove}
          onTouchEnd={handleJoyEnd}
          className="relative w-28 h-28 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl"
        >
          {/* Joystick Nub */}
          <div
            className="w-12 h-12 rounded-full bg-cyan-500/90 border border-white shadow-[0_0_12px_#06b6d4] transition-transform duration-75"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Bottom: Action Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 pointer-events-auto items-end">
        {/* Top row: Dash & Reset */}
        <div className="flex gap-3">
          <button
            id="btn-touch-reset"
            onTouchStart={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, resetToCheckpoint: true }));
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, resetToCheckpoint: false }));
            }}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/70 active:bg-white/10 flex items-center justify-center shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-touch-dash"
            onTouchStart={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, dash: true }));
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, dash: false }));
            }}
            className="w-14 h-14 rounded-full bg-cyan-950/60 backdrop-blur-md border border-cyan-400 text-cyan-300 active:bg-cyan-500 active:text-black flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
          >
            <Zap className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom row: Slide & Jump */}
        <div className="flex gap-3">
          <button
            id="btn-touch-slide"
            onTouchStart={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, slide: true }));
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, slide: false }));
            }}
            className="w-16 h-16 rounded-xl bg-orange-950/50 backdrop-blur-md border border-orange-400 text-orange-300 active:bg-orange-500 active:text-black flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <CornerDownRight className="w-5 h-5" />
            <span className="text-[9px] font-mono font-bold mt-0.5 tracking-wider">SLIDE</span>
          </button>

          <button
            id="btn-touch-jump"
            onTouchStart={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, jump: true }));
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onInputChange((prev) => ({ ...prev, jump: false }));
            }}
            className="w-20 h-20 rounded-xl bg-white text-black active:bg-neutral-200 flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all"
          >
            <ArrowUp className="w-7 h-7" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};

