import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Task, updateTask } from '../lib/supabase';
import { breakdownTask, TaskStep } from '../services/aiService';
import TaskBreakdown from './TaskBreakdown';
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

  const getQuadrantColor = (quadrant: number) => {
    switch (quadrant) {
      case 1: return Colors.quadrant.urgent;
      case 2: return Colors.quadrant.important;
      case 3: return Colors.quadrant.delegate;
      case 4: return Colors.quadrant.eliminate;
      default: return Colors.neutral[500];
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

  const quadrantColor = getQuadrantColor(task.quadrant);
  const hasSteps = steps && steps.length > 0;
  const stepsProgress = hasSteps 
    ? Math.round((steps.filter(s => s.done).length / steps.length) * 100) 
    : 0;

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
  return (
    <View style={[
      styles.container, 
      isHighlighted && styles.highlightedContainer,
      task.completed && styles.completedContainer
    ]}>
      <View style={[styles.quadrantBar, { backgroundColor: quadrantColor }]} />
      
      <View style={styles.content}>
        <Text style={[styles.taskText, task.completed && styles.completedText]}>
          {task.text}
        </Text>
        
        <View style={styles.meta}>
          <View style={[styles.priorityBadge, { backgroundColor: quadrantColor + '20' }]}>
            <Text style={[styles.priorityText, { color: quadrantColor }]}>
              {getPriorityLabel(task.priority)}
            </Text>
          </View>
          
          {task.due_date && (
            <Text style={styles.dueDate}>
              📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
            </Text>
          )}

          {hasSteps && (
            <View style={[styles.stepsBadge, { backgroundColor: Colors.accent[600] + '20' }]}>
              <Text style={[styles.stepsText, { color: Colors.accent[400] }]}>
                {stepsProgress}% fait
              </Text>
            </View>
          )}
        </View>
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
  dueDate: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
  },
  actions: {
    gap: Spacing.sm,
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
