import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';
import { TaskStep } from '../services/aiService';
import { updateTask, Task } from '../lib/supabase';

interface TaskBreakdownProps {
  task: Task;
  steps: TaskStep[];
  onStepsUpdate: (steps: TaskStep[]) => void;
  onComplete: () => void;
}

export default function TaskBreakdown({ task, steps, onStepsUpdate, onComplete }: TaskBreakdownProps) {
  const [localSteps, setLocalSteps] = useState<TaskStep[]>(steps);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const confettiShown = useRef(false);

  const completedCount = localSteps.filter(s => s.done).length;
  const totalCount = localSteps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Trigger celebration at 100%
  useEffect(() => {
    if (progress === 100 && !confettiShown.current && totalCount > 0) {
      confettiShown.current = true;
      triggerCelebration();
    }
  }, [progress, totalCount]);

  const triggerCelebration = async () => {
    // Haptic feedback pattern
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 200);
    } else {
      // Android vibration pattern
      Vibration.vibrate([0, 50, 30, 50, 30, 100]);
    }

    // Mark task as complete
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  const handleToggleStep = useCallback(async (stepId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updatedSteps = localSteps.map(step =>
      step.id === stepId ? { ...step, done: !step.done } : step
    );

    setLocalSteps(updatedSteps);
    onStepsUpdate(updatedSteps);

    // Persist to Supabase
    try {
      await updateTask(task.id, { steps: updatedSteps } as any);
    } catch (error) {
      console.error('Error updating steps:', error);
    }
  }, [localSteps, task.id, onStepsUpdate]);

  // Interpolate gradient colors based on progress
  const progressColor = progressAnim.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [Colors.primary[500], Colors.accent[500], '#10B981'], // Indigo -> Teal -> Emerald
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <Text style={styles.progressText}>
          {completedCount}/{totalCount} étapes
        </Text>
        <Text style={styles.percentText}>{Math.round(progress)}%</Text>
      </View>

      {/* Neon Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: progressColor,
            },
          ]}
        />
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.progressGlow,
            {
              width: progressWidth,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* Steps Checklist */}
      <View style={styles.stepsContainer}>
        {localSteps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={[
              styles.stepItem,
              step.done && styles.stepItemDone,
              index === 0 && !step.done && styles.stepItemFirst, // Highlight step 0
            ]}
            onPress={() => handleToggleStep(step.id)}
            activeOpacity={0.7}
          >
            {/* Checkbox */}
            <View style={[styles.checkbox, step.done && styles.checkboxDone]}>
              {step.done && <Text style={styles.checkmark}>✓</Text>}
            </View>

            {/* Step Text */}
            <View style={styles.stepContent}>
              {index === 0 && !step.done && (
                <Text style={styles.stepLabel}>⚡ COMMENCE ICI</Text>
              )}
              <Text style={[styles.stepText, step.done && styles.stepTextDone]}>
                {step.text}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Celebration Overlay */}
      {progress === 100 && (
        <View style={styles.celebrationOverlay}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationText}>Bravo ! Mission accomplie !</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[800],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
    fontWeight: '500',
  },
  percentText: {
    fontSize: FontSizes.lg,
    color: Colors.primary[400],
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.neutral[800],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressGlow: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.5,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  stepsContainer: {
    gap: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: TouchTargets.comfortable,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepItemDone: {
    backgroundColor: Colors.neutral[900],
    opacity: 0.7,
  },
  stepItemFirst: {
    borderColor: Colors.accent[500],
    backgroundColor: Colors.accent[900] + '30',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.neutral[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: Colors.accent[500],
    borderColor: Colors.accent[500],
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: FontSizes.xs,
    color: Colors.accent[400],
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  stepText: {
    fontSize: FontSizes.md,
    color: Colors.text.dark,
    lineHeight: FontSizes.md * 1.4,
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.neutral[500],
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  celebrationText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#10B981',
    textAlign: 'center',
  },
});
