import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../App';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Zap,
  Volume2,
  VolumeX,
  CheckCircle,
  Flame,
  X,
  CloudRain,
  Music,
  Wind,
  Target,
  Clock,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

// Messages bienveillants TDAH pour les rappels
const DISTRACTION_MESSAGES = [
  { title: "Hé, on s'égare ? 🌟", body: "Reviens, on finit cette étape ensemble !" },
  { title: "Le plus dur est fait 💪", body: "Ne laisse pas une distraction gâcher ton élan." },
  { title: "Pause respiratoire 🌬️", body: "Prends une grande inspiration. Reviens juste 2 minutes." },
  { title: "Ton focus t'attend 🎯", body: "La tâche est toujours là, et toi tu es capable." },
  { title: "Petit rappel bienveillant 🤗", body: "C'est normal de se distraire. L'important c'est de revenir." },
  { title: "Le Flow est fragile ✨", body: "Reviens maintenant pour ne pas perdre le rythme." },
  { title: "Tu y étais presque ! 🚀", body: "Quelques minutes de plus et tu auras fini." },
  { title: "TDAH challenge 🧠", body: "La distraction a gagné une bataille, pas la guerre !" },
];

const WELCOME_BACK_MESSAGES = [
  "Heureux de te revoir ! On reprend là où on en était ? 🙌",
  "Te revoilà ! Le timer t'attendait patiemment ⏱️",
  "Super que tu sois revenu(e) ! On continue ensemble 💪",
  "Bienvenue de retour ! Ton focus est toujours intact ✨",
];

// Modes de focus
const FOCUS_MODES = [
  { id: 'quick', minutes: 15, label: 'Démarrage Rapide', emoji: '⚡', description: 'Parfait pour vaincre la procrastination', color: 'emerald' },
  { id: 'classic', minutes: 25, label: 'Pomodoro Classique', emoji: '🍅', description: 'La méthode éprouvée', color: 'red' },
  { id: 'deep', minutes: 50, label: 'Immersion Profonde', emoji: '🧘', description: 'Pour l\'hyperfocus', color: 'indigo' },
];

// Sons ambiants
const AMBIENT_SOUNDS = [
  { id: 'rain', label: 'Pluie', emoji: '🌧️', icon: CloudRain, url: 'https://assets.mixkit.co/sfx/preview/mixkit-light-rain-2847.mp3' },
  { id: 'cafe', label: 'Café', emoji: '☕', icon: Music, url: 'https://assets.mixkit.co/sfx/preview/mixkit-restaurant-crowd-talking-ambience-444.mp3' },
  { id: 'wind', label: 'Vent', emoji: '🌬️', icon: Wind, url: 'https://assets.mixkit.co/sfx/preview/mixkit-blizzard-cold-winds-1153.mp3' },
];

const DeepFocusMode = () => {
  const { user } = useUser();
  
  // Phase: select, focus, complete
  const [phase, setPhase] = useState('select');
  const [selectedMode, setSelectedMode] = useState(FOCUS_MODES[1]);
  const [selectedSound, setSelectedSound] = useState(null);
  const [soundVolume, setSoundVolume] = useState(0.3);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  
  // Focus protection state
  const [interruptionCount, setInterruptionCount] = useState(0);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showExitWarning, setShowExitWarning] = useState(false);
  
  // Refs
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const lastHiddenTimeRef = useRef(null);
  
  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);
  
  // Visibility API - Détection d'abandon
  useEffect(() => {
    if (phase !== 'focus' || !isRunning) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User is leaving
        lastHiddenTimeRef.current = Date.now();
        setInterruptionCount(prev => prev + 1);
        
        // Send notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const msg = DISTRACTION_MESSAGES[Math.floor(Math.random() * DISTRACTION_MESSAGES.length)];
          new Notification(msg.title, { body: msg.body, icon: '🧘' });
        }
      } else {
        // User is back
        const timeAway = lastHiddenTimeRef.current ? Date.now() - lastHiddenTimeRef.current : 0;
        
        if (timeAway > 5000) {
          setWelcomeMessage(WELCOME_BACK_MESSAGES[Math.floor(Math.random() * WELCOME_BACK_MESSAGES.length)]);
          setShowWelcomeBack(true);
          setTimeout(() => setShowWelcomeBack(false), 4000);
        }
        
        lastHiddenTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase, isRunning]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sound management
  const playSound = useCallback(async (sound) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(sound.url);
      audioRef.current.loop = true;
      audioRef.current.volume = soundVolume;
      await audioRef.current.play();
      setSelectedSound(sound);
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  }, [soundVolume]);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSelectedSound(null);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = soundVolume;
    }
  }, [soundVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleTimerComplete = () => {
    setIsRunning(false);
    stopSound();
    setSessionsCompleted(prev => prev + 1);
    setPhase('complete');
    
    // Play completion sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAkjTpfU7NCFeAAcU6Ps9/epWAAAGE+o8PryoFsAABZQpPH68qBbAAAWUKTx');
    audio.play().catch(() => {});
  };

  const startFocus = () => {
    setTimeLeft(selectedMode.minutes * 60);
    setInterruptionCount(0);
    setPhase('focus');
    setTimeout(() => setIsRunning(true), 500);
  };

  const handleExit = () => {
    if (isRunning && timeLeft > 0) {
      setShowExitWarning(true);
    } else {
      resetToSelect();
    }
  };

  const confirmExit = () => {
    stopSound();
    setIsRunning(false);
    setShowExitWarning(false);
    resetToSelect();
  };

  const resetToSelect = () => {
    setPhase('select');
    setTimeLeft(selectedMode.minutes * 60);
    setInterruptionCount(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((selectedMode.minutes * 60 - timeLeft) / (selectedMode.minutes * 60)) * 100;

  // Render: Mode Selector
  const renderModeSelector = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">
          Deep Focus 🧘
        </h1>
        <p className="text-neutral-500">
          Choisis ta durée et entre dans le tunnel de concentration
        </p>
      </div>

      {/* Duration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {FOCUS_MODES.map((mode) => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMode(mode)}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              selectedMode.id === mode.id
                ? `border-${mode.color}-500 bg-${mode.color}-50 dark:bg-${mode.color}-900/20`
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
            }`}
            data-testid={`focus-mode-${mode.id}`}
          >
            <div className="text-3xl mb-2">{mode.emoji}</div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
              {mode.minutes} min
            </div>
            <div className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {mode.label}
            </div>
            <div className="text-sm text-neutral-500">
              {mode.description}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Ambient Sound */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Son ambiant (optionnel)
        </h3>
        <div className="flex gap-3 flex-wrap">
          {AMBIENT_SOUNDS.map((sound) => {
            const Icon = sound.icon;
            return (
              <button
                key={sound.id}
                onClick={() => selectedSound?.id === sound.id ? stopSound() : playSound(sound)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  selectedSound?.id === sound.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                }`}
              >
                <span>{sound.emoji}</span>
                <span className="text-sm font-medium">{sound.label}</span>
              </button>
            );
          })}
        </div>
        
        {selectedSound && (
          <div className="mt-4 flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-neutral-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
              className="flex-1 accent-primary-500"
            />
            <Volume2 className="w-4 h-4 text-neutral-400" />
          </div>
        )}
      </div>

      {/* Start Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={startFocus}
        className={`w-full py-4 rounded-xl font-semibold text-white text-lg bg-gradient-to-r from-${selectedMode.color}-500 to-${selectedMode.color}-600 shadow-lg`}
        data-testid="start-focus"
      >
        🚀 Entrer dans le tunnel
      </motion.button>

      <p className="text-center text-sm text-neutral-500 mt-4">
        L'écran restera actif • Notifications anti-distraction activées
      </p>
    </div>
  );

  // Render: Focus Mode
  const renderFocusMode = () => (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
      {/* Exit button */}
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors"
      >
        <X className="w-5 h-5 text-neutral-400" />
      </button>

      {/* Interruption badge */}
      {interruptionCount > 0 && (
        <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-900/30 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {interruptionCount} pause{interruptionCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Welcome back overlay */}
      <AnimatePresence>
        {showWelcomeBack && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <div className="bg-slate-800 rounded-2xl p-8 max-w-md text-center border border-primary-500/30">
              <div className="text-5xl mb-4">👋</div>
              <p className="text-xl text-white">{welcomeMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer */}
      <div className="relative w-72 h-72 mb-8">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="144"
            cy="144"
            r="130"
            className="stroke-slate-800"
            strokeWidth="12"
            fill="none"
          />
          <motion.circle
            cx="144"
            cy="144"
            r="130"
            className={`stroke-${selectedMode.color}-500`}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 130}
            strokeDashoffset={2 * Math.PI * 130 * (1 - progress / 100)}
            style={{
              filter: `drop-shadow(0 0 8px var(--${selectedMode.color}-500))`,
            }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            key={timeLeft}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-7xl font-bold text-white font-display"
          >
            {formatTime(timeLeft)}
          </motion.div>
          <div className="flex items-center gap-2 mt-2 text-slate-400">
            <Zap className="w-4 h-4" />
            <span>{selectedMode.label}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg bg-${selectedMode.color}-500 hover:bg-${selectedMode.color}-600 transition-colors`}
        >
          {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
        </button>
      </div>

      {/* Sound indicator */}
      {selectedSound && (
        <div className="mt-6 flex items-center gap-2 text-slate-500 text-sm">
          <Volume2 className="w-4 h-4" />
          {selectedSound.emoji} {selectedSound.label}
        </div>
      )}

      {/* Exit hint */}
      <button
        onClick={handleExit}
        className="absolute bottom-8 text-slate-600 hover:text-slate-400 text-sm transition-colors"
      >
        Quitter le tunnel
      </button>

      {/* Exit Warning Modal */}
      <AnimatePresence>
        {showExitWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4"
            >
              <h3 className="text-xl font-bold text-white mb-2">
                Le tunnel est toujours ouvert... 🛸
              </h3>
              <p className="text-slate-400 mb-6">
                Tu as encore du temps. Es-tu sûr(e) de vouloir quitter ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="flex-1 py-2 rounded-lg bg-primary-500 text-white font-medium"
                >
                  Continuer
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 font-medium"
                >
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Render: Complete
  const renderComplete = () => (
    <div className="max-w-md mx-auto text-center py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-7xl mb-6"
      >
        🎉
      </motion.div>
      
      <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
        Mission Accomplie !
      </h2>
      <p className="text-neutral-500 mb-8">
        {selectedMode.minutes} minutes de focus intense
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-2xl mb-1">{selectedMode.emoji}</div>
          <div className="font-semibold text-neutral-900 dark:text-white">{selectedMode.label}</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl mb-1">{interruptionCount}</div>
          <div className="font-semibold text-neutral-900 dark:text-white">
            Distraction{interruptionCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        {interruptionCount === 0 
          ? 'Focus parfait ! Tu as tenu sans distraction. 🌟'
          : interruptionCount <= 2
          ? 'Tu es revenu(e) à chaque fois, c\'est ça la vraie force ! 💪'
          : 'Malgré les distractions, tu as fini. C\'est une victoire ! 🏆'}
      </p>

      <div className="flex gap-3">
        <button
          onClick={resetToSelect}
          className="flex-1 btn btn-secondary"
        >
          Retour
        </button>
        <button
          onClick={() => {
            setSelectedMode(FOCUS_MODES[1]);
            startFocus();
          }}
          className="flex-1 btn btn-primary"
        >
          🔄 Encore une session
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      {phase === 'select' && renderModeSelector()}
      {phase === 'focus' && renderFocusMode()}
      {phase === 'complete' && renderComplete()}

      {/* Stats - only show in select phase */}
      {phase === 'select' && sessionsCompleted > 0 && (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {sessionsCompleted}
              </p>
              <p className="text-xs text-neutral-500">Sessions aujourd'hui</p>
            </div>
            
            <div className="card p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-accent-600" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {sessionsCompleted * selectedMode.minutes} min
              </p>
              <p className="text-xs text-neutral-500">Temps de focus</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DeepFocusMode;
