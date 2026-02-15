import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';
import useTimer, { TimerMode } from '../hooks/useTimer';
import ConfettiCannon from './ConfettiCannon';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_SIZE = SCREEN_WIDTH * 0.7;

interface PomodoroTimerProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function PomodoroTimer({ visible, onClose, userId }: PomodoroTimerProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const handleComplete = async (mode: TimerMode, sessions: number) => {
    if (mode === 'focus') {
      setShowConfetti(true);
      
      // Save session to Supabase
      if (userId) {
        try {
          await supabase.from('pomodoro_sessions').insert({
            user_id: userId,
            duration_minutes: 25,
            break_minutes: 5,
            completed: true,
          });
        } catch (e) {
          console.log('Could not save session:', e);
        }
      }

      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const {
    formattedTime,
    isRunning,
    mode,
    sessionsCompleted,
    progress,
    start,
    pause,
    reset,
    skip,
  } = useTimer(handleComplete);

  // Pulse animation when running
  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning]);

  const getModeLabel = (): string => {
    switch (mode) {
      case 'focus': return '🎯 Focus';
      case 'break': return '☕ Pause';
      case 'longBreak': return '🧘 Longue pause';
    }
  };

  const getModeColor = (): string => {
    switch (mode) {
      case 'focus': return Colors.primary[500];
      case 'break': return Colors.accent[500];
      case 'longBreak': return '#10B981';
    }
  };

  // Calculate stroke dash for circular progress
  const circumference = 2 * Math.PI * (TIMER_SIZE / 2 - 15);
  const strokeDashoffset = circumference * (1 - progress);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pomodoro</Text>
          <View style={styles.sessionsContainer}>
            <Text style={styles.sessionsText}>🍅 {sessionsCompleted}</Text>
          </View>
        </View>

        {/* Timer Circle */}
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }] }]}>
            {/* Background circle */}
            <View style={[styles.timerCircle, { borderColor: Colors.neutral[800] }]}>
              {/* Progress SVG would go here - using View for simplicity */}
              <View 
                style={[
                  styles.progressRing,
                  { 
                    borderColor: getModeColor(),
                    borderTopColor: 'transparent',
                    borderRightColor: progress > 0.25 ? getModeColor() : 'transparent',
                    borderBottomColor: progress > 0.5 ? getModeColor() : 'transparent',
                    borderLeftColor: progress > 0.75 ? getModeColor() : 'transparent',
                    transform: [{ rotate: `${progress * 360}deg` }],
                  }
                ]}
              />
              
              {/* Time display */}
              <View style={styles.timeContent}>
                <Text style={[styles.modeLabel, { color: getModeColor() }]}>
                  {getModeLabel()}
                </Text>
                <Text style={styles.timeText}>{formattedTime}</Text>
                <Text style={styles.statusText}>
                  {isRunning ? 'En cours...' : 'Prêt'}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Main button */}
          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: getModeColor() }]}
            onPress={isRunning ? pause : start}
            activeOpacity={0.8}
          >
            <Text style={styles.mainButtonText}>
              {isRunning ? '⏸️ Pause' : '▶️ Démarrer'}
            </Text>
          </TouchableOpacity>

          {/* Secondary controls */}
          <View style={styles.secondaryControls}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={reset}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>🔄 Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={skip}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>⏭️ Passer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsText}>
            {mode === 'focus' 
              ? '💡 Concentre-toi sur une seule tâche'
              : '💡 Lève-toi, étire-toi, hydrate-toi'}
          </Text>
        </View>

        {/* Confetti */}
        <ConfettiCannon active={showConfetti} count={80} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
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
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  sessionsContainer: {
    backgroundColor: Colors.neutral[800],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  sessionsText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerWrapper: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
  },
  timerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: TIMER_SIZE / 2,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: TIMER_SIZE / 2,
    borderWidth: 8,
  },
  timeContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modeLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  timeText: {
    fontSize: 64,
    fontWeight: '200',
    color: Colors.text.dark,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
  },
  controls: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  mainButton: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.large,
  },
  mainButtonText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryControls: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: TouchTargets.comfortable,
  },
  secondaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text.dark,
  },
  tips: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  tipsText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
