import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase, Task, getTasks, updateTask } from '../../lib/supabase';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../constants/theme';
import TaskCard from '../../components/TaskCard';
import QuickCaptureButton from '../../components/QuickCaptureButton';

const QUADRANTS = [
  { id: 1, title: 'Urgent & Important', color: Colors.quadrant.urgent, emoji: '🔥' },
  { id: 2, title: 'Important', color: Colors.quadrant.important, emoji: '⭐' },
  { id: 3, title: 'Urgent', color: Colors.quadrant.delegate, emoji: '⚡' },
  { id: 4, title: 'À déléguer', color: Colors.quadrant.eliminate, emoji: '📋' },
];

export default function MatrixScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      const fetchedTasks = await getTasks(user.id);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCompleteTask = async (taskId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await updateTask(taskId, { completed: true });
      await fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  const getTasksByQuadrant = (quadrantId: number) => {
    return tasks.filter(t => 
      t.quadrant === quadrantId && 
      (showCompleted ? true : !t.completed)
    );
  };

  const totalIncomplete = tasks.filter(t => !t.completed).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[400]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Matrice Eisenhower</Text>
          <Text style={styles.subtitle}>
            {totalIncomplete} tâche{totalIncomplete !== 1 ? 's' : ''} en cours
          </Text>
        </View>

        {/* Toggle completed */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCompleted(!showCompleted);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>
            {showCompleted ? '✓ Masquer terminées' : 'Voir terminées'}
          </Text>
        </TouchableOpacity>

        {/* Quadrants */}
        {QUADRANTS.map((quadrant) => {
          const quadrantTasks = getTasksByQuadrant(quadrant.id);
          
          return (
            <View key={quadrant.id} style={styles.quadrantSection}>
              <View style={styles.quadrantHeader}>
                <View style={[styles.quadrantIndicator, { backgroundColor: quadrant.color }]} />
                <Text style={styles.quadrantEmoji}>{quadrant.emoji}</Text>
                <Text style={styles.quadrantTitle}>{quadrant.title}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{quadrantTasks.length}</Text>
                </View>
              </View>

              {quadrantTasks.length > 0 ? (
                <View style={styles.taskList}>
                  {quadrantTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => handleCompleteTask(task.id)}
                      compact
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyQuadrant}>
                  <Text style={styles.emptyQuadrantText}>Aucune tâche</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Quick Capture FAB */}
      <QuickCaptureButton userId={userId} onTaskCreated={fetchTasks} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.dark,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.neutral[400],
  },
  toggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  toggleText: {
    fontSize: FontSizes.sm,
    color: Colors.primary[400],
    fontWeight: '500',
  },
  quadrantSection: {
    marginBottom: Spacing.xl,
  },
  quadrantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  quadrantIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  quadrantEmoji: {
    fontSize: FontSizes.lg,
    marginRight: Spacing.xs,
  },
  quadrantTitle: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  countBadge: {
    backgroundColor: Colors.neutral[700],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.neutral[300],
  },
  taskList: {
    gap: Spacing.sm,
  },
  emptyQuadrant: {
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[800],
    borderStyle: 'dashed',
  },
  emptyQuadrantText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
  },
});
