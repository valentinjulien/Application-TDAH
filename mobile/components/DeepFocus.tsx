import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  BackHandler,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';
import useTimer, { TimerMode } from '../hooks/useTimer';
import ConfettiCannon from './ConfettiCannon';
import { supabase, createDailyLog } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TIMER_SIZE = Math.min(SCREEN_WIDTH * 0.75, 320);

// ============================================
// CONFIGURATION
// ============================================

// Messages bienveillants TDAH pour les notifications de rappel
const DISTRACTION_MESSAGES = [
  {
    title: "Hé, on s'égare ? 🌟",
    body: "Reviens, on finit cette étape ensemble !",
  },
  {
    title: "Le plus dur est fait 💪",
    body: "Ne laisse pas une distraction gâcher ton élan.",
  },
  {
    title: "Pause respiratoire 🌬️",
    body: "Prends une grande inspiration. Reviens juste 2 minutes.",
  },
  {
    title: "Ton focus t'attend 🎯",
    body: "La tâche est toujours là, et toi tu es capable.",
  },
  {
    title: "Petit rappel bienveillant 🤗",
    body: "C'est normal de se distraire. L'important c'est de revenir.",
  },
  {
    title: "Le Flow est fragile ✨",
    body: "Reviens maintenant pour ne pas perdre le rythme.",
  },
  {
    title: "Tu y étais presque ! 🚀",
    body: "Quelques minutes de plus et tu auras fini.",
  },
  {
    title: "TDAH challenge 🧠",
    body: "La distraction a gagné une bataille, pas la guerre !",
  },
  {
    title: "Retour au cocon 🛸",
    body: "Ton espace de focus sécurisé t'attend.",
  },
  {
    title: "Mission en cours 🎮",
    body: "Ne laisse pas le boss final t'échapper !",
  },
];

// Messages de retour (sans jugement)
const WELCOME_BACK_MESSAGES = [
  "Heureux de te revoir ! On reprend là où on en était ? 🙌",
  "Te revoilà ! Le timer t'attendait patiemment ⏱️",
  "Super que tu sois revenu(e) ! On continue ensemble 💪",
  "Bienvenue de retour ! Ton focus est toujours intact ✨",
  "Hey ! Content de te revoir dans la zone 🎯",
];

const FOCUS_MODES = [
  { 
    id: 'quick', 
    minutes: 15, 
    label: 'Démarrage Rapide', 
    emoji: '⚡',
    description: 'Anti-procrastination',
    color: Colors.accent[500],
  },
  { 
    id: 'pomodoro', 
    minutes: 25, 
    label: 'Classique', 
    emoji: '🍅',
    description: 'Pomodoro',
    color: Colors.primary[500],
  },
  { 
    id: 'deep', 
    minutes: 50, 
    label: 'Immersion', 
    emoji: '🧘',
    description: 'Hyperfocus',
    color: '#10B981',
  },
];

const AMBIENT_SOUNDS = [
  { 
    id: 'rain', 
    label: 'Pluie', 
    emoji: '🌧️',
    // Using a public domain rain sound URL - in production, bundle locally
    uri: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c6ccf3232f.mp3',
  },
  { 
    id: 'brown', 
    label: 'Bruit Brun', 
    emoji: '🔊',
    uri: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946e83f46f.mp3',
  },
  { 
    id: 'cafe', 
    label: 'Café', 
    emoji: '☕',
    uri: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_c8f6c18b6a.mp3',
  },
];

// ============================================
// COMPONENT
// ============================================

interface DeepFocusProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  currentTaskText?: string;
}

export default function DeepFocus({ visible, onClose, userId, currentTaskText }: DeepFocusProps) {
  // State
  const [phase, setPhase] = useState<'select' | 'focus' | 'complete'>('select');
  const [selectedMode, setSelectedMode] = useState(FOCUS_MODES[1]); // Default: Pomodoro
  const [selectedSound, setSelectedSound] = useState<typeof AMBIENT_SOUNDS[0] | null>(null);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [showConfetti, setShowConfetti] = useState(false);
  const [exitWarningShown, setExitWarningShown] = useState(false);
  
  // Focus Protection State
  const [interruptionCount, setInterruptionCount] = useState(0);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [welcomeBackMessage, setWelcomeBackMessage] = useState('');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastBackgroundTimeRef = useRef<number | null>(null);

  // Audio
  const soundRef = useRef<Audio.Sound | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeBackAnim = useRef(new Animated.Value(0)).current;

  // Timer
  const handleTimerComplete = useCallback(async () => {
    setPhase('complete');
    setShowConfetti(true);
    
    // Fade out sound
    await fadeOutSound();
    
    // Disable keep awake
    deactivateKeepAwake();
    
    // Log session to Supabase
    if (userId) {
      try {
        await supabase.from('pomodoro_sessions').insert({
          user_id: userId,
          duration_minutes: selectedMode.minutes,
          break_minutes: 5,
          completed: true,
        });

        // Update daily log for streak
        await createDailyLog({
          user_id: userId,
          date: new Date().toISOString().split('T')[0],
          type: 'focus_session',
          content: {
            focus_completed: true,
            duration_minutes: selectedMode.minutes,
          },
        }).catch(() => {}); // Ignore if already exists
      } catch (e) {
        console.log('Could not save session:', e);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Auto close after celebration
    setTimeout(() => {
      handleClose();
    }, 4000);
  }, [userId, selectedMode]);

  const {
    formattedTime,
    isRunning,
    progress,
    start,
    pause,
    reset,
    setConfig,
  } = useTimer(handleTimerComplete);

  // ============================================
  // EFFECTS
  // ============================================

  // Handle back button (Android)
  useEffect(() => {
    if (phase === 'focus' && visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        showExitWarning();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [phase, visible]);

  // ============================================
  // FOCUS PROTECTION - Détection d'abandon
  // ============================================
  
  useEffect(() => {
    if (phase !== 'focus' || !isRunning) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // User is leaving the app (going to background)
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        lastBackgroundTimeRef.current = Date.now();
        
        // Increment interruption count
        setInterruptionCount(prev => prev + 1);
        
        // Send notification with random ADHD-friendly message
        const randomMessage = DISTRACTION_MESSAGES[
          Math.floor(Math.random() * DISTRACTION_MESSAGES.length)
        ];
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: randomMessage.title,
            body: randomMessage.body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: { seconds: 3 }, // Small delay for natural feel
        });
        
        // Log interruption to Supabase
        if (userId) {
          try {
            await createDailyLog({
              user_id: userId,
              date: new Date().toISOString().split('T')[0],
              type: 'focus_interruption',
              content: {
                interruption_count: interruptionCount + 1,
                session_mode: selectedMode.id,
                minutes_elapsed: Math.floor((selectedMode.minutes * 60 - progress * selectedMode.minutes * 60 / 100) / 60),
              },
            }).catch(() => {});
          } catch (e) {
            console.log('Could not log interruption:', e);
          }
        }
      }
      
      // User is coming back to the app
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        const timeAway = lastBackgroundTimeRef.current 
          ? Date.now() - lastBackgroundTimeRef.current 
          : 0;
        
        // Only show welcome back if away for more than 5 seconds
        if (timeAway > 5000) {
          const randomWelcome = WELCOME_BACK_MESSAGES[
            Math.floor(Math.random() * WELCOME_BACK_MESSAGES.length)
          ];
          setWelcomeBackMessage(randomWelcome);
          setShowWelcomeBack(true);
          
          // Animate welcome back message
          Animated.sequence([
            Animated.timing(welcomeBackAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(3000),
            Animated.timing(welcomeBackAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowWelcomeBack(false);
          });
          
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        lastBackgroundTimeRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [phase, isRunning, userId, interruptionCount, selectedMode, progress]);

  // Pulse animation for timer
  useEffect(() => {
    if (phase === 'focus' && isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase, isRunning]);

  // Glow animation
  useEffect(() => {
    if (phase === 'focus') {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: false,
          }),
        ])
      );
      glow.start();
      return () => glow.stop();
    }
  }, [phase]);

  // Fade in on phase change
  useEffect(() => {
    if (phase === 'focus') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [phase]);

  // ============================================
  // AUDIO FUNCTIONS
  // ============================================

  const loadAndPlaySound = async (sound: typeof AMBIENT_SOUNDS[0]) => {
    try {
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Load new sound
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.uri },
        { 
          shouldPlay: false, 
          isLooping: true,
          volume: 0,
        }
      );

      soundRef.current = audioSound;
      setSelectedSound(sound);

      // Fade in
      await audioSound.playAsync();
      fadeInSound();
    } catch (error) {
      console.error('Error loading sound:', error);
      Alert.alert('Erreur', 'Impossible de charger le son ambiant');
    }
  };

  const fadeInSound = () => {
    let currentVolume = 0;
    fadeIntervalRef.current = setInterval(async () => {
      currentVolume += 0.05;
      if (currentVolume >= soundVolume) {
        currentVolume = soundVolume;
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(currentVolume);
      }
    }, 100); // 2 seconds fade
  };

  const fadeOutSound = async () => {
    return new Promise<void>((resolve) => {
      if (!soundRef.current) {
        resolve();
        return;
      }

      let currentVolume = soundVolume;
      fadeIntervalRef.current = setInterval(async () => {
        currentVolume -= 0.05;
        if (currentVolume <= 0) {
          currentVolume = 0;
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          if (soundRef.current) {
            await soundRef.current.stopAsync();
          }
          resolve();
        }
        if (soundRef.current) {
          await soundRef.current.setVolumeAsync(Math.max(0, currentVolume));
        }
      }, 100);
    });
  };

  const stopSound = async () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setSelectedSound(null);
  };

  const adjustVolume = async (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, soundVolume + delta));
    setSoundVolume(newVolume);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(newVolume);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleSelectMode = (mode: typeof FOCUS_MODES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMode(mode);
    setConfig({ focusMinutes: mode.minutes });
  };

  const handleStartFocus = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Activate keep awake
    try {
      await activateKeepAwakeAsync('deep-focus');
    } catch (e) {
      console.log('Keep awake not available:', e);
    }

    // Set timer and start
    setConfig({ focusMinutes: selectedMode.minutes });
    setPhase('focus');
    
    // Small delay then start
    setTimeout(() => {
      start();
    }, 500);
  };

  const showExitWarning = () => {
    if (exitWarningShown) return;
    
    setExitWarningShown(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      '🎯 Le tunnel est toujours ouvert',
      'Ne laisse pas la distraction gagner ! Tu veux vraiment quitter ?',
      [
        {
          text: 'Continuer le focus',
          style: 'cancel',
          onPress: () => setExitWarningShown(false),
        },
        {
          text: 'Abandonner',
          style: 'destructive',
          onPress: handleClose,
        },
      ]
    );
  };

  const handleClose = async () => {
    // Clean up
    await stopSound();
    deactivateKeepAwake();
    pause();
    reset();
    
    // Reset state
    setPhase('select');
    setShowConfetti(false);
    setExitWarningShown(false);
    
    onClose();
  };

  // ============================================
  // RENDER: MODE SELECTOR
  // ============================================

  const renderModeSelector = () => (
    <View style={styles.selectorContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.selectorHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.selectorTitle}>Mode Focus</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Task Preview */}
      {currentTaskText && (
        <View style={styles.taskPreview}>
          <Text style={styles.taskPreviewLabel}>🎯 Objectif</Text>
          <Text style={styles.taskPreviewText} numberOfLines={2}>
            {currentTaskText}
          </Text>
        </View>
      )}

      {/* Duration Selector */}
      <Text style={styles.sectionTitle}>Choisis ta durée</Text>
      <View style={styles.modeGrid}>
        {FOCUS_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.modeCard,
              selectedMode.id === mode.id && styles.modeCardSelected,
              { borderColor: mode.color },
            ]}
            onPress={() => handleSelectMode(mode)}
            activeOpacity={0.7}
          >
            <Text style={styles.modeEmoji}>{mode.emoji}</Text>
            <Text style={styles.modeDuration}>{mode.minutes} min</Text>
            <Text style={styles.modeLabel}>{mode.label}</Text>
            <Text style={styles.modeDescription}>{mode.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sound Selector */}
      <Text style={styles.sectionTitle}>Son ambiant (optionnel)</Text>
      <View style={styles.soundRow}>
        {AMBIENT_SOUNDS.map((sound) => (
          <TouchableOpacity
            key={sound.id}
            style={[
              styles.soundChip,
              selectedSound?.id === sound.id && styles.soundChipSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (selectedSound?.id === sound.id) {
                stopSound();
              } else {
                loadAndPlaySound(sound);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.soundEmoji}>{sound.emoji}</Text>
            <Text style={styles.soundLabel}>{sound.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: selectedMode.color }]}
        onPress={handleStartFocus}
        activeOpacity={0.8}
      >
        <Text style={styles.startButtonText}>🚀 Entrer dans le tunnel</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        L'écran restera allumé pendant la session
      </Text>
    </View>
  );

  // ============================================
  // RENDER: FOCUS MODE (CINEMA)
  // ============================================

  const renderFocusMode = () => {
    const glowColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(99, 102, 241, 0.1)', 'rgba(99, 102, 241, 0.4)'],
    });

    return (
      <Animated.View style={[styles.focusContainer, { opacity: fadeAnim }]}>
        <StatusBar hidden />
        
        {/* Animated background glow */}
        <Animated.View
          style={[
            styles.backgroundGlow,
            { backgroundColor: glowColor },
          ]}
        />

        {/* Task Text */}
        {currentTaskText && (
          <View style={styles.focusTaskContainer}>
            <Text style={styles.focusTaskLabel}>🎯 Focus actuel</Text>
            <Text style={styles.focusTaskText} numberOfLines={2}>
              {currentTaskText}
            </Text>
          </View>
        )}

        {/* Timer Circle */}
        <Animated.View
          style={[
            styles.timerCircleContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {/* Progress ring */}
          <View style={styles.timerRing}>
            <View
              style={[
                styles.timerProgress,
                {
                  borderColor: selectedMode.color,
                  borderTopColor: 'transparent',
                  transform: [{ rotate: `${progress * 360}deg` }],
                },
              ]}
            />
          </View>
          
          {/* Inner circle */}
          <View style={styles.timerInner}>
            <Text style={styles.timerModeEmoji}>{selectedMode.emoji}</Text>
            <Text style={styles.timerTime}>{formattedTime}</Text>
            <Text style={styles.timerStatus}>
              {isRunning ? 'En immersion...' : 'Pause'}
            </Text>
          </View>
        </Animated.View>

        {/* Controls */}
        <View style={styles.focusControls}>
          <TouchableOpacity
            style={[styles.focusControlButton, { backgroundColor: selectedMode.color }]}
            onPress={isRunning ? pause : start}
            activeOpacity={0.8}
          >
            <Text style={styles.focusControlText}>
              {isRunning ? '⏸️ Pause' : '▶️ Reprendre'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sound Controls */}
        {selectedSound && (
          <View style={styles.soundControls}>
            <TouchableOpacity
              style={styles.volumeButton}
              onPress={() => adjustVolume(-0.1)}
              activeOpacity={0.7}
            >
              <Text style={styles.volumeText}>🔉</Text>
            </TouchableOpacity>
            <View style={styles.volumeBar}>
              <View 
                style={[
                  styles.volumeFill, 
                  { width: `${soundVolume * 100}%`, backgroundColor: selectedMode.color }
                ]} 
              />
            </View>
            <TouchableOpacity
              style={styles.volumeButton}
              onPress={() => adjustVolume(0.1)}
              activeOpacity={0.7}
            >
              <Text style={styles.volumeText}>🔊</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Exit hint */}
        <TouchableOpacity
          style={styles.exitHint}
          onPress={showExitWarning}
          activeOpacity={0.7}
        >
          <Text style={styles.exitHintText}>Quitter le tunnel</Text>
        </TouchableOpacity>

        {/* Interruption counter (subtle) */}
        {interruptionCount > 0 && (
          <View style={styles.interruptionBadge}>
            <Text style={styles.interruptionText}>
              {interruptionCount} pause{interruptionCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Welcome Back Overlay */}
        {showWelcomeBack && (
          <Animated.View 
            style={[
              styles.welcomeBackOverlay,
              { opacity: welcomeBackAnim }
            ]}
          >
            <View style={styles.welcomeBackCard}>
              <Text style={styles.welcomeBackEmoji}>👋</Text>
              <Text style={styles.welcomeBackText}>{welcomeBackMessage}</Text>
            </View>
          </Animated.View>
        )}

        {/* Confetti */}
        <ConfettiCannon active={showConfetti} count={100} />
      </Animated.View>
    );
  };

  // ============================================
  // RENDER: COMPLETE
  // ============================================

  const renderComplete = () => (
    <View style={styles.completeContainer}>
      <StatusBar barStyle="light-content" />
      
      <Text style={styles.completeEmoji}>🎉</Text>
      <Text style={styles.completeTitle}>Mission Accomplie !</Text>
      <Text style={styles.completeSubtitle}>
        {selectedMode.minutes} minutes de focus intense
      </Text>
      
      <View style={styles.completeStats}>
        <View style={styles.completeStat}>
          <Text style={styles.completeStatValue}>{selectedMode.emoji}</Text>
          <Text style={styles.completeStatLabel}>{selectedMode.label}</Text>
        </View>
        {interruptionCount > 0 && (
          <View style={styles.completeStat}>
            <Text style={styles.completeStatValue}>{interruptionCount}</Text>
            <Text style={styles.completeStatLabel}>
              {interruptionCount === 1 ? 'Distraction' : 'Distractions'}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.completeMessage}>
        {interruptionCount === 0 
          ? 'Focus parfait ! Tu as tenu sans distraction. 🌟'
          : interruptionCount <= 2
          ? 'Tu es revenu(e) à chaque fois, c\'est ça la vraie force ! 💪'
          : 'Malgré les distractions, tu as fini. C\'est une victoire ! 🏆'}
      </Text>

      <ConfettiCannon active={showConfetti} count={100} />
    </View>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={phase === 'focus' ? showExitWarning : handleClose}
    >
      <View style={styles.container}>
        {phase === 'select' && renderModeSelector()}
        {phase === 'focus' && renderFocusMode()}
        {phase === 'complete' && renderComplete()}
      </View>
    </Modal>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },

  // Selector Phase
  selectorContainer: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: FontSizes.lg,
    color: Colors.neutral[400],
  },
  selectorTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  taskPreview: {
    backgroundColor: Colors.neutral[900],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary[700] + '40',
  },
  taskPreviewLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary[400],
    marginBottom: Spacing.xs,
  },
  taskPreviewText: {
    fontSize: FontSizes.lg,
    color: Colors.text.dark,
    lineHeight: FontSizes.lg * 1.4,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.neutral[400],
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.neutral[900],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardSelected: {
    backgroundColor: Colors.neutral[800],
  },
  modeEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  modeDuration: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  modeLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.neutral[300],
    marginTop: Spacing.xs,
  },
  modeDescription: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  soundRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  soundChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[900],
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  soundChipSelected: {
    backgroundColor: Colors.primary[900],
    borderColor: Colors.primary[500],
  },
  soundEmoji: {
    fontSize: 16,
  },
  soundLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text.dark,
    fontWeight: '500',
  },
  startButton: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.large,
    marginBottom: Spacing.md,
  },
  startButtonText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[600],
    textAlign: 'center',
  },

  // Focus Phase (Cinema Mode)
  focusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  focusTaskContainer: {
    position: 'absolute',
    top: Spacing.xxl * 2,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
  },
  focusTaskLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginBottom: Spacing.xs,
  },
  focusTaskText: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text.dark,
    textAlign: 'center',
  },
  timerCircleContainer: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TIMER_SIZE / 2,
    borderWidth: 6,
    borderColor: Colors.neutral[800],
  },
  timerProgress: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TIMER_SIZE / 2,
    borderWidth: 6,
  },
  timerInner: {
    width: TIMER_SIZE - 40,
    height: TIMER_SIZE - 40,
    borderRadius: (TIMER_SIZE - 40) / 2,
    backgroundColor: Colors.neutral[900],
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerModeEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  timerTime: {
    fontSize: 56,
    fontWeight: '200',
    color: Colors.text.dark,
    fontVariant: ['tabular-nums'],
  },
  timerStatus: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
  focusControls: {
    position: 'absolute',
    bottom: 160,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  focusControlButton: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.comfortable,
  },
  focusControlText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  soundControls: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  volumeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeText: {
    fontSize: 20,
  },
  volumeBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.neutral[800],
    borderRadius: 4,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 4,
  },
  exitHint: {
    position: 'absolute',
    bottom: Spacing.xl,
    alignSelf: 'center',
    padding: Spacing.md,
  },
  exitHintText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[600],
  },
  
  // Focus Protection UI
  interruptionBadge: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.lg,
    backgroundColor: Colors.warning[900] + '60',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  interruptionText: {
    fontSize: FontSizes.xs,
    color: Colors.warning[400],
    fontWeight: '500',
  },
  welcomeBackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
  },
  welcomeBackCard: {
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginHorizontal: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary[700],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeBackEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  welcomeBackText: {
    fontSize: FontSizes.lg,
    color: Colors.text.dark,
    textAlign: 'center',
    lineHeight: FontSizes.lg * 1.5,
  },

  // Complete Phase
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: '#0a0a12',
  },
  completeEmoji: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  completeTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: Spacing.sm,
  },
  completeSubtitle: {
    fontSize: FontSizes.lg,
    color: Colors.neutral[400],
    marginBottom: Spacing.xl,
  },
  completeStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  completeStat: {
    alignItems: 'center',
    backgroundColor: Colors.neutral[900],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    minWidth: 100,
  },
  completeStatValue: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  completeStatLabel: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
  },
  completeMessage: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
