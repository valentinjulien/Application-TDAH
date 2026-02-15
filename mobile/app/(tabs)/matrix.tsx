import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase, Task, getTasks, updateTask } from '../../lib/supabase';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../../constants/theme';
import TaskCard from '../../components/TaskCard';
import QuickCaptureButton from '../../components/QuickCaptureButton';
import DeepFocus from '../../components/DeepFocus';

const QUADRANTS = [
  { id: 1, title: 'Urgent & Important', subtitle: 'À faire maintenant', color: Colors.quadrant.urgent, emoji: '🔥' },
  { id: 2, title: 'Important', subtitle: 'À planifier', color: Colors.quadrant.important, emoji: '⭐' },
  { id: 3, title: 'Urgent', subtitle: 'À déléguer', color: Colors.quadrant.delegate, emoji: '⚡' },
  { id: 4, title: 'À déléguer', subtitle: 'À éliminer', color: Colors.quadrant.eliminate, emoji: '📋' },
];

export default function MatrixScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [movingTask, setMovingTask] = useState(false);
  const [showDeepFocus, setShowDeepFocus] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

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

    // Optimistic UI update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed: true } : t
    ));

    try {
      await updateTask(taskId, { completed: true });
    } catch (error) {
      console.error('Error completing task:', error);
      // Revert on error
      await fetchTasks();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleMoveTask = (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTask(task);
  };

  const handleSelectQuadrant = async (newQuadrant: 1 | 2 | 3 | 4) => {
    if (!selectedTask || selectedTask.quadrant === newQuadrant) {
      setSelectedTask(null);
      return;
    }

    setMovingTask(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic UI update
    setTasks(prev => prev.map(t => 
      t.id === selectedTask.id ? { ...t, quadrant: newQuadrant } : t
    ));

    try {
      const newPriority = newQuadrant <= 2 ? 'high' : newQuadrant === 3 ? 'medium' : 'low';
      await updateTask(selectedTask.id, { 
        quadrant: newQuadrant,
        priority: newPriority as 'high' | 'medium' | 'low',
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error moving task:', error);
      // Revert on error
      await fetchTasks();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', 'Impossible de déplacer la tâche');
    } finally {
      setMovingTask(false);
      setSelectedTask(null);
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
      {/* Move Task Modal Overlay */}
      {selectedTask && (
        <View style={styles.moveOverlay}>
          <View style={styles.moveContent}>
            <Text style={styles.moveTitle}>Déplacer vers :</Text>
            <Text style={styles.moveTaskText} numberOfLines={2}>
              "{selectedTask.text}"
            </Text>
            
            <View style={styles.quadrantButtons}>
              {QUADRANTS.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={[
                    styles.quadrantButton,
                    { borderColor: q.color },
                    selectedTask.quadrant === q.id && styles.quadrantButtonCurrent,
                  ]}
                  onPress={() => handleSelectQuadrant(q.id as 1 | 2 | 3 | 4)}
                  disabled={movingTask}
                  activeOpacity={0.7}
                >
                  {movingTask && selectedTask.quadrant !== q.id ? (
                    <ActivityIndicator size="small" color={q.color} />
                  ) : (
                    <>
                      <Text style={styles.quadrantButtonEmoji}>{q.emoji}</Text>
                      <Text style={[styles.quadrantButtonText, { color: q.color }]}>
                        {q.title}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSelectedTask(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Matrice Eisenhower</Text>
              <Text style={styles.subtitle}>
                {totalIncomplete} tâche{totalIncomplete !== 1 ? 's' : ''} en cours
              </Text>
            </View>
          </View>
        </View>

        {/* Deep Focus Card - More prominent */}
        <TouchableOpacity
          style={styles.deepFocusCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const urgentTask = tasks.filter(t => !t.completed).sort((a, b) => a.quadrant - b.quadrant)[0];
            setFocusTask(urgentTask || null);
            setShowDeepFocus(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.deepFocusLeft}>
            <Text style={styles.deepFocusEmoji}>🧘</Text>
          </View>
          <View style={styles.deepFocusCenter}>
            <Text style={styles.deepFocusTitle}>Deep Focus Mode</Text>
            <Text style={styles.deepFocusSubtitle}>15, 25 ou 50 min • Sons ambiants • Anti-distraction</Text>
          </View>
          <View style={styles.deepFocusRight}>
            <Text style={styles.deepFocusArrow}>→</Text>
          </View>
        </TouchableOpacity>

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

        {/* Hint for moving */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 Appuyez longuement sur une tâche pour la déplacer
          </Text>
        </View>

        {/* Quadrants */}
        {QUADRANTS.map((quadrant) => {
          const quadrantTasks = getTasksByQuadrant(quadrant.id);
          
          return (
            <View key={quadrant.id} style={styles.quadrantSection}>
              <View style={styles.quadrantHeader}>
                <View style={[styles.quadrantIndicator, { backgroundColor: quadrant.color }]} />
                <Text style={styles.quadrantEmoji}>{quadrant.emoji}</Text>
                <View style={styles.quadrantTitles}>
                  <Text style={styles.quadrantTitle}>{quadrant.title}</Text>
                  <Text style={styles.quadrantSubtitle}>{quadrant.subtitle}</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{quadrantTasks.length}</Text>
                </View>
              </View>

              {quadrantTasks.length > 0 ? (
                <View style={styles.taskList}>
                  {quadrantTasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      onLongPress={() => handleMoveTask(task)}
                      delayLongPress={300}
                      activeOpacity={0.9}
                    >
                      <TaskCard
                        task={task}
                        onComplete={() => handleCompleteTask(task.id)}
                        onUpdate={fetchTasks}
                        compact
                      />
                    </TouchableOpacity>
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

      {/* Deep Focus Modal */}
      <DeepFocus
        visible={showDeepFocus}
        onClose={() => {
          setShowDeepFocus(false);
          setFocusTask(null);
        }}
        userId={userId}
        currentTaskText={focusTask?.text}
      />
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
    marginBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  deepFocusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[900],
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary[700],
    gap: Spacing.md,
  },
  deepFocusLeft: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary[700] + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deepFocusEmoji: {
    fontSize: 24,
  },
  deepFocusCenter: {
    flex: 1,
  },
  deepFocusTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 2,
  },
  deepFocusSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.primary[300],
  },
  deepFocusRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  deepFocusArrow: {
    fontSize: FontSizes.lg,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pomodoroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger[600],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  pomodoroEmoji: {
    fontSize: 18,
  },
  pomodoroText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  toggleText: {
    fontSize: FontSizes.sm,
    color: Colors.primary[400],
    fontWeight: '500',
  },
  hintContainer: {
    backgroundColor: Colors.primary[900] + '30',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary[700] + '30',
  },
  hintText: {
    fontSize: FontSizes.sm,
    color: Colors.primary[400],
    textAlign: 'center',
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
    height: 32,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  quadrantEmoji: {
    fontSize: FontSizes.lg,
    marginRight: Spacing.xs,
  },
  quadrantTitles: {
    flex: 1,
  },
  quadrantTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  quadrantSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
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
  // Move overlay styles
  moveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  moveContent: {
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  moveTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  moveTaskText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[400],
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
  quadrantButtons: {
    gap: Spacing.sm,
  },
  quadrantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 2,
    minHeight: TouchTargets.comfortable,
  },
  quadrantButtonCurrent: {
    opacity: 0.4,
  },
  quadrantButtonEmoji: {
    fontSize: 20,
  },
  quadrantButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    fontWeight: '500',
  },
});
