import React from 'react';
import { GameSettings } from '../types';
import { X, Volume2, Eye, Monitor, Ghost } from 'lucide-react';
import { sfx } from '../audio/soundEffects';
import { music } from '../audio/synthMusic';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto relative">
        {/* Dot grid texture */}
        <div className="absolute inset-0 bg-matrix-dots opacity-20 pointer-events-none rounded-2xl"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-mono mb-0.5">
              Configuration // Telemetry Engine
            </div>
            <h2 className="text-xl sm:text-2xl font-light tracking-wide text-white uppercase flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">04.</span>
              <span>SYSTEM SETTINGS</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 py-4 relative z-10">
          {/* Camera View Mode */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>PERSPECTIVE MODE</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ cameraMode: 'first_person' })}
                className={`py-2.5 px-4 rounded-lg border text-xs font-mono tracking-wider transition-all cursor-pointer ${
                  settings.cameraMode === 'first_person'
                    ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'border-white/10 bg-black/40 text-white/40 hover:text-white/80'
                }`}
              >
                FIRST PERSON (FPS)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ cameraMode: 'third_person' })}
                className={`py-2.5 px-4 rounded-lg border text-xs font-mono tracking-wider transition-all cursor-pointer ${
                  settings.cameraMode === 'third_person'
                    ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'border-white/10 bg-black/40 text-white/40 hover:text-white/80'
                }`}
              >
                THIRD PERSON (CHASE)
              </button>
            </div>
          </div>

          {/* Field of View Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[10px] text-white/40 uppercase tracking-widest">FIELD OF VIEW (FOV)</span>
              <span className="text-cyan-400 font-bold">{settings.fov}°</span>
            </div>
            <input
              type="range"
              min="65"
              max="110"
              step="1"
              value={settings.fov}
              onChange={(e) => onUpdateSettings({ fov: parseInt(e.target.value) })}
              className="accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Mouse Sensitivity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[10px] text-white/40 uppercase tracking-widest">AIM SENSITIVITY</span>
              <span className="text-cyan-400 font-bold">{settings.mouseSensitivity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) => onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })}
              className="accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Audio Controls */}
          <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-orange-400" />
              <span>ACOUSTICS & SYNTH CHANNELS</span>
            </span>

            {/* SFX Volume */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[11px] text-white/60">SFX IMPACT & STEPPING</span>
                <span className="text-white/80">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  onUpdateSettings({ sfxVolume: vol });
                  sfx.setVolumes(settings.masterVolume, vol);
                }}
                className="accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Music Volume */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[11px] text-white/60">PROCEDURAL SYNTH ENGINE</span>
                <span className="text-white/80">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  onUpdateSettings({ musicVolume: vol });
                  music.setVolume(vol);
                }}
                className="accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Visual Effects & Ghost Runner Toggles */}
          <div className="border-t border-white/10 pt-4 flex flex-col gap-2.5">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>GRAPHICS & OVERLAYS</span>
            </span>

            <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-white">Speed Lines & Radial Tunnel</span>
                <span className="text-[10px] text-white/40">Visual lines triggered during hypersonic movement</span>
              </div>
              <input
                type="checkbox"
                checked={settings.motionBlurAndSpeedLines}
                onChange={(e) => onUpdateSettings({ motionBlurAndSpeedLines: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                <Ghost className="w-3.5 h-3.5 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-white">Personal Best Holographic Ghost</span>
                  <span className="text-[10px] text-white/40">Simulate previous record run in realtime</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showGhost}
                onChange={(e) => onUpdateSettings({ showGhost: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-white">Telemetry FPS Counter</span>
                <span className="text-[10px] text-white/40">Realtime render frame timing</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showFPS}
                onChange={(e) => onUpdateSettings({ showFPS: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full py-3.5 px-6 bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg transition-colors cursor-pointer relative z-10"
        >
          CONFIRM & APPLY
        </button>
      </div>
    </div>
  );
};

