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
import { supabase, Task, getTasks } from '../../lib/supabase';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../constants/theme';
import { formatDuration } from '../../services/timeBlockingService';
import TaskCard from '../../components/TaskCard';
import QuickCaptureButton from '../../components/QuickCaptureButton';

interface DayGroup {
  date: Date;
  label: string;
  tasks: Task[];
}

export default function ScheduleScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'scheduled' | 'unscheduled'>('scheduled');

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  // Group scheduled tasks by day
  const getScheduledGroups = (): DayGroup[] => {
    const scheduledTasks = tasks.filter(t => t.scheduled_at && !t.completed);
    
    // Sort by scheduled time
    const sorted = scheduledTasks.sort((a, b) => 
      new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()
    );

    // Group by day
    const groups: Map<string, Task[]> = new Map();
    sorted.forEach(task => {
      const date = new Date(task.scheduled_at!);
      const key = date.toDateString();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(task);
    });

    // Convert to array with labels
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Array.from(groups.entries()).map(([key, dayTasks]) => {
      const date = new Date(key);
      let label: string;

      if (date.toDateString() === today.toDateString()) {
        label = "Aujourd'hui";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        label = 'Demain';
      } else {
        label = date.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        });
      }

      return { date, label, tasks: dayTasks };
    });
  };

  // Get unscheduled tasks
  const getUnscheduledTasks = (): Task[] => {
    return tasks.filter(t => !t.scheduled_at && !t.completed);
  };

  const scheduledGroups = getScheduledGroups();
  const unscheduledTasks = getUnscheduledTasks();

  const getEnergyInfo = (energy?: 'low' | 'medium' | 'high') => {
    switch (energy) {
      case 'low':
        return { emoji: '⚡', color: Colors.accent[500] };
      case 'medium':
        return { emoji: '⚡⚡', color: Colors.warning[500] };
      case 'high':
        return { emoji: '⚡⚡⚡', color: Colors.danger[500] };
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

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
          <Text style={styles.title}>📅 Planning</Text>
          <Text style={styles.subtitle}>
            {scheduledGroups.reduce((acc, g) => acc + g.tasks.length, 0)} tâches planifiées
          </Text>
        </View>

        {/* View Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'scheduled' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setViewMode('scheduled');
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'scheduled' && styles.toggleTextActive,
              ]}
            >
              📅 Planifiées ({scheduledGroups.reduce((acc, g) => acc + g.tasks.length, 0)})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'unscheduled' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setViewMode('unscheduled');
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'unscheduled' && styles.toggleTextActive,
              ]}
            >
              📋 À planifier ({unscheduledTasks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'scheduled' ? (
          <>
            {/* Scheduled Tasks by Day */}
            {scheduledGroups.length > 0 ? (
              scheduledGroups.map((group, groupIndex) => (
                <View key={groupIndex} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayIndicator} />
                    <Text style={styles.dayLabel}>{group.label}</Text>
                    <Text style={styles.dayDate}>
                      {group.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>

                  <View style={styles.timeline}>
                    {group.tasks.map((task, taskIndex) => {
                      const scheduledDate = new Date(task.scheduled_at!);
                      const energyInfo = getEnergyInfo(task.energy_required);

                      return (
                        <View key={task.id} style={styles.timelineItem}>
                          {/* Time indicator */}
                          <View style={styles.timeColumn}>
                            <Text style={styles.timeText}>
                              {formatTime(scheduledDate)}
                            </Text>
                            {task.estimated_total_minutes && (
                              <Text style={styles.durationText}>
                                {formatDuration(task.estimated_total_minutes)}
                              </Text>
                            )}
                          </View>

                          {/* Timeline dot and line */}
                          <View style={styles.timelineConnector}>
                            <View 
                              style={[
                                styles.timelineDot,
                                { backgroundColor: energyInfo?.color || Colors.primary[500] }
                              ]} 
                            />
                            {taskIndex < group.tasks.length - 1 && (
                              <View style={styles.timelineLine} />
                            )}
                          </View>

                          {/* Task card */}
                          <View style={styles.taskContainer}>
                            <View style={styles.scheduledTaskCard}>
                              <View style={styles.taskHeader}>
                                <Text style={styles.taskText} numberOfLines={2}>
                                  {task.text}
                                </Text>
                                {energyInfo && (
                                  <Text style={[styles.energyEmoji, { color: energyInfo.color }]}>
                                    {energyInfo.emoji}
                                  </Text>
                                )}
                              </View>
                              
                              {task.hidden_subtasks && task.hidden_subtasks.length > 0 && (
                                <View style={styles.subtasksPreview}>
                                  <Text style={styles.subtasksCount}>
                                    +{task.hidden_subtasks.length} sous-tâches incluses
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyTitle}>Aucune tâche planifiée</Text>
                <Text style={styles.emptyText}>
                  Ouvrez une tâche et appuyez sur "Planifier" pour l'ajouter à votre emploi du temps
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Unscheduled Tasks */}
            {unscheduledTasks.length > 0 ? (
              <View style={styles.unscheduledList}>
                <Text style={styles.unscheduledHint}>
                  💡 Ces tâches n'ont pas encore été planifiées. Appuyez sur "Planifier" pour les ajouter à votre calendrier.
                </Text>
                {unscheduledTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={() => {}}
                    onUpdate={fetchTasks}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyTitle}>Tout est planifié !</Text>
                <Text style={styles.emptyText}>
                  Toutes vos tâches ont un créneau dans votre emploi du temps
                </Text>
              </View>
            )}
          </>
        )}
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary[600],
  },
  toggleText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.neutral[400],
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  dayGroup: {
    marginBottom: Spacing.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayIndicator: {
    width: 4,
    height: 24,
    backgroundColor: Colors.primary[500],
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  dayLabel: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text.dark,
    flex: 1,
  },
  dayDate: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
  },
  timeline: {
    paddingLeft: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timeColumn: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
  },
  timeText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  durationText: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  timelineConnector: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.neutral[700],
    marginTop: 4,
  },
  taskContainer: {
    flex: 1,
    paddingLeft: Spacing.sm,
  },
  scheduledTaskCard: {
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[800],
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text.dark,
    lineHeight: FontSizes.md * 1.4,
  },
  energyEmoji: {
    fontSize: FontSizes.sm,
    marginLeft: Spacing.sm,
  },
  subtasksPreview: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[800],
  },
  subtasksCount: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
    fontStyle: 'italic',
  },
  unscheduledList: {
    gap: Spacing.md,
  },
  unscheduledHint: {
    fontSize: FontSizes.sm,
    color: Colors.primary[400],
    backgroundColor: Colors.primary[900] + '30',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    lineHeight: FontSizes.sm * 1.5,
  },
  emptyState: {
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
    lineHeight: FontSizes.md * 1.5,
  },
});
