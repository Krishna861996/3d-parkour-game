import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { CustomLevelModal } from './components/CustomLevelModal';
import { SettingsModal } from './components/SettingsModal';
import { ControlsGuide } from './components/ControlsGuide';
import { PRESET_LEVELS } from './game/constants';
import { LevelConfig, GameSettings } from './types';

const DEFAULT_SETTINGS: GameSettings = {
  fov: 82,
  mouseSensitivity: 1.0,
  invertY: false,
  cameraMode: 'first_person',
  masterVolume: 0.8,
  sfxVolume: 0.7,
  musicVolume: 0.45,
  motionBlurAndSpeedLines: true,
  shadows: true,
  bloomEffect: true,
  showFPS: false,
  showGhost: true,
};

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(PRESET_LEVELS[0]);
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('parkour_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Modal Dialog States
  const [isPaused, setIsPaused] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Victory Run Stats
  const [runResult, setRunResult] = useState<{
    finalTime: number;
    finalScore: number;
    maxSpeed: number;
    isNewBest: boolean;
  }>({
    finalTime: 0,
    finalScore: 0,
    maxSpeed: 0,
    isNewBest: false,
  });

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('parkour_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLevelComplete = (
    finalTime: number,
    finalScore: number,
    maxSpeed: number,
    isNewBest: boolean
  ) => {
    setRunResult({
      finalTime,
      finalScore,
      maxSpeed,
      isNewBest,
    });
    setShowGameOver(true);
  };

  const handleRestart = () => {
    setShowGameOver(false);
    setIsPaused(false);
    // Reload level with fresh key or reset
    setCurrentLevel((prev) => ({ ...prev, seed: prev.seed }));
  };

  const handleNextLevel = () => {
    const currentIndex = PRESET_LEVELS.findIndex((l) => l.id === currentLevel.id);
    if (currentIndex >= 0 && currentIndex < PRESET_LEVELS.length - 1) {
      setCurrentLevel(PRESET_LEVELS[currentIndex + 1]);
    } else {
      // Loop or go to custom
      setCurrentLevel(PRESET_LEVELS[0]);
    }
    setShowGameOver(false);
    setIsPaused(false);
  };

  const handleSelectEndless = () => {
    const endlessConfig: LevelConfig = {
      id: 'lvl_endless',
      name: 'Endless Skyway',
      seed: Math.floor(Math.random() * 99999) + 1,
      difficulty: 'hard',
      theme: 'vaporwave',
      segmentCount: 40,
      description: 'Massive endless course generated dynamically across the cyber skyline.',
    };
    setCurrentLevel(endlessConfig);
    setShowLevels(false);
    setIsPaused(false);
  };

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#080808] text-[#E0E0E0] font-sans select-none relative">
      {/* 3D Game Canvas */}
      <GameCanvas
        key={`${currentLevel.id}_${currentLevel.seed}`}
        level={currentLevel}
        settings={settings}
        isPaused={isPaused || showGameOver || showLevels || showCustom || showSettings || showControls}
        onPauseToggle={() => setIsPaused((prev) => !prev)}
        onLevelComplete={handleLevelComplete}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Pause Menu Modal */}
      {isPaused && !showLevels && !showCustom && !showSettings && !showControls && (
        <PauseMenu
          onResume={() => setIsPaused(false)}
          onRestart={handleRestart}
          onOpenLevels={() => setShowLevels(true)}
          onOpenCustom={() => setShowCustom(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenControls={() => setShowControls(true)}
        />
      )}

      {/* Level Finished Modal */}
      {showGameOver && (
        <GameOverModal
          level={currentLevel}
          finalTime={runResult.finalTime}
          finalScore={runResult.finalScore}
          maxSpeed={runResult.maxSpeed}
          isNewBest={runResult.isNewBest}
          onNextLevel={handleNextLevel}
          onRestart={handleRestart}
          onOpenLevels={() => {
            setShowGameOver(false);
            setShowLevels(true);
          }}
        />
      )}

      {/* Level Selector Modal */}
      {showLevels && (
        <LevelSelectModal
          currentLevelId={currentLevel.id}
          onSelectLevel={(lvl) => {
            setCurrentLevel(lvl);
            setShowLevels(false);
            setIsPaused(false);
          }}
          onClose={() => setShowLevels(false)}
          onSelectEndless={handleSelectEndless}
        />
      )}

      {/* Custom Procedural Course Builder Modal */}
      {showCustom && (
        <CustomLevelModal
          onGenerate={(config) => {
            setCurrentLevel(config);
            setShowCustom(false);
            setIsPaused(false);
          }}
          onClose={() => setShowCustom(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Controls Guide Modal */}
      {showControls && (
        <ControlsGuide onClose={() => setShowControls(false)} />
      )}
    </main>
  );
}
