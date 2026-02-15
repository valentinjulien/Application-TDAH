import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase, Task, getTasks, updateTask } from '../../lib/supabase';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../../constants/theme';
import TaskCard from '../../components/TaskCard';
import QuickCaptureButton from '../../components/QuickCaptureButton';

export default function NowScreen() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      const tasks = await getTasks(user.id);
      setAllTasks(tasks);

      // Get the most urgent incomplete task (quadrant 1 first, then by date)
      const incompleteTasks = tasks.filter(t => !t.completed);
      const sortedTasks = incompleteTasks.sort((a, b) => {
        if (a.quadrant !== b.quadrant) return a.quadrant - b.quadrant;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setCurrentTask(sortedTasks[0] || null);
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

  const handleCompleteTask = async () => {
    if (!currentTask) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await updateTask(currentTask.id, { completed: true });
      // Refresh to get next task
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

  const getQuadrantLabel = (quadrant: number) => {
    switch (quadrant) {
      case 1: return 'Urgent & Important';
      case 2: return 'Important';
      case 3: return 'Urgent';
      case 4: return 'À déléguer';
      default: return '';
    }
  };

  const incompleteTasks = allTasks.filter(t => !t.completed);
  const completedToday = allTasks.filter(t => {
    if (!t.completed) return false;
    const today = new Date().toDateString();
    const taskDate = new Date(t.created_at).toDateString();
    return today === taskDate;
  }).length;

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
          <Text style={styles.greeting}>Focus sur l'essentiel</Text>
          <Text style={styles.stats}>
            {completedToday} terminée{completedToday > 1 ? 's' : ''} aujourd'hui
          </Text>
        </View>

        {/* Current Task */}
        <View style={styles.taskSection}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Chargement...</Text>
            </View>
          ) : currentTask ? (
            <>
              <Text style={styles.sectionLabel}>
                {getQuadrantLabel(currentTask.quadrant)}
              </Text>
              <TaskCard
                task={currentTask}
                onComplete={handleCompleteTask}
                onUpdate={fetchTasks}
                isHighlighted
              />
              {incompleteTasks.length > 1 && (
                <Text style={styles.queueInfo}>
                  +{incompleteTasks.length - 1} tâche{incompleteTasks.length > 2 ? 's' : ''} en attente
                </Text>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>Tout est fait !</Text>
              <Text style={styles.emptyText}>
                Profitez de ce moment ou ajoutez une nouvelle tâche
              </Text>
            </View>
          )}
        </View>
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
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: Spacing.xs,
  },
  stats: {
    fontSize: FontSizes.md,
    color: Colors.neutral[400],
  },
  taskSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  queueInfo: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    color: Colors.text.dark,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[400],
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
