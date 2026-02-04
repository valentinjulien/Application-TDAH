import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Task } from '../lib/supabase';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  isHighlighted?: boolean;
  compact?: boolean;
}

export default function TaskCard({ task, onComplete, isHighlighted = false, compact = false }: TaskCardProps) {
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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const quadrantColor = getQuadrantColor(task.quadrant);

  if (compact) {
    return (
      <View style={[styles.compactContainer, task.completed && styles.completedContainer]}>
        <View style={[styles.quadrantIndicator, { backgroundColor: quadrantColor }]} />
        <Text 
          style={[styles.compactText, task.completed && styles.completedText]} 
          numberOfLines={2}
        >
          {task.text}
        </Text>
        {!task.completed && (
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <Text style={styles.compactButtonText}>✓</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

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
        </View>
      </View>

      {!task.completed && (
        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: quadrantColor }]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.completeButtonText}>Terminé</Text>
        </TouchableOpacity>
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
    flexDirection: 'column',
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
    marginBottom: Spacing.xs,
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
  dueDate: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
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
  compactText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text.dark,
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
