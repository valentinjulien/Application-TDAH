import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../App';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Zap,
  Settings,
  Volume2,
  VolumeX,
  CheckCircle,
  Flame
} from 'lucide-react';

const Pomodoro = () => {
  const { user } = useUser();
  const [mode, setMode] = useState('focus'); // focus, shortBreak, longBreak
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    focusTime: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsUntilLongBreak: 4
  });

  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const modes = {
    focus: {
      label: 'Focus',
      time: settings.focusTime * 60,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      icon: Zap
    },
    shortBreak: {
      label: 'Pause courte',
      time: settings.shortBreak * 60,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      icon: Coffee
    },
    longBreak: {
      label: 'Pause longue',
      time: settings.longBreak * 60,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      icon: Coffee
    }
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    if (soundEnabled) {
      // Play notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAkjTpfU7NCFeAAcU6Ps9/epWAAAGE+o8PryoFsAABZQpPH68qBbAAAWUKTx');
      audio.play().catch(() => {});
    }

    if (mode === 'focus') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      
      if (newSessions % settings.sessionsUntilLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreak * 60);
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreak * 60);
      }
    } else {
      setMode('focus');
      setTimeLeft(settings.focusTime * 60);
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(modes[mode].time);
  };

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(modes[newMode].time);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((modes[mode].time - timeLeft) / modes[mode].time) * 100;
  const ModeIcon = modes[mode].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">
            Mode Focus 🎯
          </h1>
          <p className="text-neutral-500">
            Technique Pomodoro adaptée TDAH
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 justify-center mb-8">
          {Object.entries(modes).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                mode === key
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
              data-testid={`pomodoro-mode-${key}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Timer Card */}
        <motion.div
          layout
          className={`card p-8 md:p-12 text-center ${modes[mode].bgColor}`}
        >
          {/* Progress Ring */}
          <div className="relative w-64 h-64 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                className="stroke-neutral-200 dark:stroke-neutral-700"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="128"
                cy="128"
                r="120"
                className={`stroke-current ${
                  mode === 'focus' ? 'text-red-500' :
                  mode === 'shortBreak' ? 'text-green-500' : 'text-blue-500'
                }`}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                initial={false}
                animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100) }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            
            {/* Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                key={timeLeft}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className={`text-6xl md:text-7xl font-bold font-display ${
                  isRunning ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
                }`}
              >
                {formatTime(timeLeft)}
              </motion.div>
              <div className="flex items-center gap-2 mt-2">
                <ModeIcon className={`w-5 h-5 ${
                  mode === 'focus' ? 'text-red-500' :
                  mode === 'shortBreak' ? 'text-green-500' : 'text-blue-500'
                }`} />
                <span className="text-neutral-500 font-medium">{modes[mode].label}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={resetTimer}
              className="btn-icon !p-3 bg-white dark:bg-neutral-800"
              title="Réinitialiser"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg bg-gradient-to-r ${modes[mode].color} ${
                isRunning ? 'timer-active' : ''
              }`}
              data-testid="pomodoro-toggle"
            >
              {isRunning ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-1" />
              )}
            </motion.button>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="btn-icon !p-3 bg-white dark:bg-neutral-800"
              title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8">
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
              {sessionsCompleted * settings.focusTime} min
            </p>
            <p className="text-xs text-neutral-500">Temps de focus</p>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 card p-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">💡 Astuce TDAH</h3>
          <p className="text-sm text-neutral-500">
            Si 25 minutes te semble trop long, commence par des sessions de 15 minutes. 
            L'important c'est de commencer, pas d'être parfait !
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Pomodoro;
