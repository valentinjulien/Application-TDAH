import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Task, updateTask } from '../lib/supabase';
import { breakdownTask, TaskStep } from '../services/aiService';
import { formatDuration } from '../services/timeBlockingService';
import TaskBreakdown from './TaskBreakdown';
import TimeBlockingModal from './TimeBlockingModal';
import EnergyIndicator from './EnergyIndicator';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onUpdate?: () => void;
  isHighlighted?: boolean;
  compact?: boolean;
}

export default function TaskCard({ task, onComplete, onUpdate, isHighlighted = false, compact = false }: TaskCardProps) {
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [steps, setSteps] = useState<TaskStep[] | null>((task as any).steps || null);
  const [showBreakdown, setShowBreakdown] = useState(!!steps);
  const [showTimeBlocking, setShowTimeBlocking] = useState(false);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  // Highlight animation effect
  useEffect(() => {
    if (isHighlighted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(highlightAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isHighlighted]);

  const getQuadrantColor = (quadrant: number) => {
    switch (quadrant) {
      case 1: return Colors.quadrant.urgent;
      case 2: return Colors.quadrant.important;
      case 3: return Colors.quadrant.delegate;
      case 4: return Colors.quadrant.eliminate;
      default: return Colors.neutral[500];
    }
  };

  const getQuadrantLabel = (quadrant: number) => {
    switch (quadrant) {
      case 1: return '🔥 Urgent';
      case 2: return '⭐ Important';
      case 3: return '📤 Déléguer';
      case 4: return '🗑️ Éliminer';
      default: return '';
    }
  };

  const getEnergyInfo = (energy?: 'low' | 'medium' | 'high') => {
    switch (energy) {
      case 'low':
        return { emoji: '🌿', label: 'Repos', color: Colors.accent[500] };
      case 'medium':
        return { emoji: '⚡', label: 'Focus', color: Colors.warning[500] };
      case 'high':
        return { emoji: '🔥', label: 'Deep Work', color: Colors.danger[500] };
      default:
        return null;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return priority;
    }
  };

  const handleComplete = () => {
    // Satisfying press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const handleBreakdown = async () => {
    if (steps) {
      // Toggle visibility if already has steps
      setShowBreakdown(!showBreakdown);
      return;
    }

    setIsBreakingDown(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await breakdownTask(task.text);
      setSteps(result.steps);
      setShowBreakdown(true);

      // Save steps to database
      await updateTask(task.id, { steps: result.steps } as any);
      onUpdate?.();
    } catch (error) {
      console.error('Error breaking down task:', error);
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleStepsUpdate = (updatedSteps: TaskStep[]) => {
    setSteps(updatedSteps);
  };

  const handleBreakdownComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const handleOpenTimeBlocking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTimeBlocking(true);
  };

  const handleTaskScheduled = (updatedTask: Task) => {
    // Task was scheduled, refresh the parent
    onUpdate?.();
  };

  const quadrantColor = getQuadrantColor(task.quadrant);
  const hasSteps = steps && steps.length > 0;
  const stepsProgress = hasSteps 
    ? Math.round((steps.filter(s => s.done).length / steps.length) * 100) 
    : 0;
  
  // Time-blocking info
  const energyInfo = getEnergyInfo(task.energy_required);
  const isScheduled = !!task.scheduled_at;
  const scheduledDate = task.scheduled_at ? new Date(task.scheduled_at) : null;

  // Compact view for matrix
  if (compact) {
    return (
      <View style={[styles.compactContainer, task.completed && styles.completedContainer]}>
        <View style={[styles.quadrantIndicator, { backgroundColor: quadrantColor }]} />
        <View style={styles.compactContent}>
          <Text 
            style={[styles.compactText, task.completed && styles.completedText]} 
            numberOfLines={2}
          >
            {task.text}
          </Text>
          {hasSteps && (
            <View style={styles.compactProgress}>
              <View style={[styles.compactProgressBar, { width: `${stepsProgress}%`, backgroundColor: quadrantColor }]} />
            </View>
          )}
        </View>
        {!task.completed && (
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handleComplete}
            activeOpacity={0.7}
          >
            <Text style={styles.compactButtonText}>✓</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Full view
  const highlightBorderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.neutral[800], Colors.primary[500]],
  });

  return (
    <Animated.View style={[
      styles.container, 
      isHighlighted && styles.highlightedContainer,
      task.completed && styles.completedContainer,
      { transform: [{ scale: scaleAnim }] }
    ]}>
      {/* Animated highlight border for current task */}
      {isHighlighted && (
        <Animated.View 
          style={[
            styles.highlightBorder, 
            { borderColor: highlightBorderColor }
          ]} 
        />
      )}
      
      {/* Quadrant indicator with label */}
      <View style={styles.header}>
        <View style={[styles.quadrantBadge, { backgroundColor: quadrantColor + '20' }]}>
          <View style={[styles.quadrantDot, { backgroundColor: quadrantColor }]} />
          <Text style={[styles.quadrantLabel, { color: quadrantColor }]}>
            {getQuadrantLabel(task.quadrant)}
          </Text>
        </View>
        
        {/* Energy Indicator - only show if analyzed */}
        {task.energy_required && (
          <EnergyIndicator 
            level={task.energy_required} 
            size="small" 
            showLabel={true}
          />
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.taskText, task.completed && styles.completedText]}>
          {task.text}
        </Text>
        
        {/* Meta badges row */}
        <View style={styles.meta}>
          {/* Duration Badge */}
          {task.estimated_total_minutes && (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                ⏱️ {formatDuration(task.estimated_total_minutes)}
              </Text>
            </View>
          )}

          {/* Scheduled Badge */}
          {isScheduled && scheduledDate && (
            <View style={[styles.metaBadge, styles.scheduledBadge]}>
              <Text style={styles.scheduledText}>
                📅 {scheduledDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} à {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          
          {task.due_date && !isScheduled && (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar for steps */}
        {hasSteps && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${stepsProgress}%`, 
                    backgroundColor: stepsProgress === 100 ? Colors.accent[500] : quadrantColor 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {stepsProgress}% complété • {steps.filter(s => s.done).length}/{steps.length} étapes
            </Text>
          </View>
        )}
      </View>

      {/* Breakdown Section */}
      {showBreakdown && steps && (
        <TaskBreakdown
          task={task}
          steps={steps}
          onStepsUpdate={handleStepsUpdate}
          onComplete={handleBreakdownComplete}
        />
      )}

      {/* Action Buttons */}
      {!task.completed && (
        <View style={styles.actions}>
          {/* Time-Blocking Button */}
          {!isScheduled && (
            <TouchableOpacity
              style={styles.timeBlockButton}
              onPress={handleOpenTimeBlocking}
              activeOpacity={0.7}
            >
              <Text style={styles.timeBlockButtonText}>
                📅 Planifier
              </Text>
            </TouchableOpacity>
          )}

          {/* Breakdown Button */}
          <TouchableOpacity
            style={[styles.breakdownButton, hasSteps && styles.breakdownButtonActive]}
            onPress={handleBreakdown}
            disabled={isBreakingDown}
            activeOpacity={0.7}
          >
            {isBreakingDown ? (
              <ActivityIndicator size="small" color={Colors.primary[400]} />
            ) : (
              <Text style={styles.breakdownButtonText}>
                {hasSteps 
                  ? (showBreakdown ? '📋 Masquer' : '📋 Voir étapes') 
                  : '✨ Décomposer avec IA'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Complete Button */}
          {!showBreakdown && (
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: quadrantColor }]}
              onPress={handleComplete}
              activeOpacity={0.8}
            >
              <Text style={styles.completeButtonText}>Terminé</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Time-Blocking Modal */}
      <TimeBlockingModal
        visible={showTimeBlocking}
        task={task}
        onClose={() => setShowTimeBlocking(false)}
        onScheduled={handleTaskScheduled}
      />
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
    gap: Spacing.md,
  },
  highlightedContainer: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
  },
  completedContainer: {
    opacity: 0.6,
  },
  quadrantBar: {
    height: 4,
    borderRadius: 2,
  },
  content: {
    gap: Spacing.sm,
  },
  taskText: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text.dark,
    lineHeight: FontSizes.xl * 1.4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: Colors.neutral[500],
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  priorityText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  stepsText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  energyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  energyBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  durationBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  durationBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    color: Colors.neutral[300],
  },
  scheduledBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  scheduledText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  dueDate: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
  },
  actions: {
    gap: Spacing.sm,
  },
  timeBlockButton: {
    backgroundColor: Colors.primary[900] + '60',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTargets.minimum,
    borderWidth: 1,
    borderColor: Colors.primary[700],
  },
  timeBlockButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.primary[300],
  },
  breakdownButton: {
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTargets.minimum,
    borderWidth: 1,
    borderColor: Colors.neutral[700],
  },
  breakdownButtonActive: {
    borderColor: Colors.primary[600],
  },
  breakdownButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.primary[400],
  },
  completeButton: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTargets.comfortable,
  },
  completeButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutral[800],
  },
  quadrantIndicator: {
    width: 4,
    height: '100%',
    minHeight: 32,
    borderRadius: 2,
  },
  compactContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  compactText: {
    fontSize: FontSizes.md,
    color: Colors.text.dark,
  },
  compactProgress: {
    height: 3,
    backgroundColor: Colors.neutral[700],
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  compactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: FontSizes.lg,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
