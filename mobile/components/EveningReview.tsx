import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';
import { 
  generateEveningReview, 
  EveningReviewResult, 
  TaskForAI,
  getRandomEveningPrompt 
} from '../services/dailyAIService';
import { Task, createTask } from '../lib/supabase';
import { scheduleDailyMotivation } from '../hooks/useNotifications';

interface EveningReviewProps {
  visible: boolean;
  tasks: Task[];
  userId: string;
  onClose: () => void;
  onTasksCreated: () => void;
}

const REVIEW_KEY = 'evening_review_seen';

export default function EveningReview({ visible, tasks, userId, onClose, onTasksCreated }: EveningReviewProps) {
  const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
  const [userInput, setUserInput] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [result, setResult] = useState<EveningReviewResult | null>(null);
  const [creatingTasks, setCreatingTasks] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setCurrentPrompt(getRandomEveningPrompt());
      setStep('input');
      setUserInput('');
      setResult(null);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Start pulse animation for the moon
      startPulseAnimation();
    }
  }, [visible]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('processing');

    try {
      // Get tasks completed today
      const today = new Date().toDateString();
      const completedToday = tasks.filter(t => {
        if (!t.completed) return false;
        const taskDate = new Date(t.created_at).toDateString();
        return taskDate === today;
      });

      const completedForAI: TaskForAI[] = completedToday.map(t => ({
        id: t.id,
        text: t.text,
        priority: t.priority,
        quadrant: t.quadrant,
        completed: t.completed,
      }));

      const reviewResult = await generateEveningReview(userInput, completedForAI);
      setResult(reviewResult);
      setStep('result');

      // Mark as seen
      const todayStr = new Date().toDateString();
      await AsyncStorage.setItem(REVIEW_KEY, todayStr);
    } catch (error) {
      console.error('Error generating review:', error);
      // Show a calming fallback
      setResult({
        nouvelles_taches: [],
        notes_journal: userInput,
        celebration: "Tu as fait de ton mieux aujourd'hui.",
        message_nuit: 'Repose-toi bien. Demain est un nouveau jour. 🌙',
      });
      setStep('result');
    }
  };

  const handleCreateTasksAndClose = async () => {
    if (!result || result.nouvelles_taches.length === 0) {
      handleGoodnight();
      return;
    }

    setCreatingTasks(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Create all tasks for tomorrow
      for (const task of result.nouvelles_taches) {
        await createTask({
          user_id: userId,
          text: task.text,
          priority: task.priority,
          quadrant: (task.quadrant as 1 | 2 | 3 | 4) || 2,
          completed: false,
          source: 'evening_review',
        });
      }

      onTasksCreated();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error creating tasks:', error);
    } finally {
      setCreatingTasks(false);
      handleGoodnight();
    }
  };

  const handleGoodnight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Moon decoration */}
          <Animated.View style={[styles.moonContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.moonEmoji}>🌙</Text>
          </Animated.View>

          {step === 'input' && (
            <View style={styles.content}>
              <Text style={styles.title}>Revue du Soir</Text>
              <Text style={styles.prompt}>{currentPrompt}</Text>

              <TextInput
                style={styles.input}
                placeholder="Écris ici ce qui te traverse l'esprit..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={userInput}
                onChangeText={setUserInput}
                multiline
                autoFocus
                textAlignVertical="top"
              />

              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>Analyser mes pensées ✨</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Pas ce soir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={Colors.primary[400]} />
              <Text style={styles.processingText}>Je réfléchis pour toi...</Text>
              <Text style={styles.processingSubtext}>Transformons tes pensées en sérénité</Text>
            </View>
          )}

          {step === 'result' && result && (
            <ScrollView 
              style={styles.resultScroll}
              contentContainerStyle={styles.resultContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Celebration */}
              <View style={styles.celebrationCard}>
                <Text style={styles.celebrationLabel}>🌟 Fierté du jour</Text>
                <Text style={styles.celebrationText}>{result.celebration}</Text>
              </View>

              {/* New tasks for tomorrow */}
              {result.nouvelles_taches.length > 0 && (
                <View style={styles.tasksCard}>
                  <Text style={styles.tasksLabel}>📝 Pour demain</Text>
                  {result.nouvelles_taches.map((task, index) => (
                    <View key={index} style={styles.taskItem}>
                      <View style={styles.taskBullet} />
                      <Text style={styles.taskText}>{task.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Journal note */}
              {result.notes_journal && (
                <View style={styles.journalCard}>
                  <Text style={styles.journalLabel}>📖 Note du soir</Text>
                  <Text style={styles.journalText}>{result.notes_journal}</Text>
                </View>
              )}

              {/* Goodnight message */}
              <View style={styles.goodnightCard}>
                <Text style={styles.goodnightText}>{result.message_nuit}</Text>
              </View>

              {/* Final action */}
              <TouchableOpacity
                style={styles.goodnightButton}
                onPress={handleCreateTasksAndClose}
                disabled={creatingTasks}
                activeOpacity={0.8}
              >
                {creatingTasks ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <Text style={styles.goodnightButtonText}>
                    {result.nouvelles_taches.length > 0 
                      ? '✅ Tout est noté, dors bien'
                      : '😴 Bonne nuit'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// Check if should show evening review (21h - 23h)
export function shouldShowEveningReview(): boolean {
  const hour = new Date().getHours();
  return hour >= 21 && hour <= 23;
}

// Check if already seen today
export async function hasSeenEveningReviewToday(): Promise<boolean> {
  const today = new Date().toDateString();
  const lastSeen = await AsyncStorage.getItem(REVIEW_KEY);
  return lastSeen === today;
}

// Reset for testing
export async function resetEveningReviewForToday(): Promise<void> {
  await AsyncStorage.removeItem(REVIEW_KEY);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  container: {
    flex: 1,
  },
  moonContainer: {
    position: 'absolute',
    top: 60,
    right: 30,
    opacity: 0.6,
  },
  moonEmoji: {
    fontSize: 48,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    paddingTop: 120,
    gap: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  prompt: {
    fontSize: FontSizes.xl,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: FontSizes.xl * 1.4,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSizes.lg,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 150,
    maxHeight: 250,
  },
  inputActions: {
    gap: Spacing.md,
  },
  submitButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.comfortable,
  },
  submitButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  processingText: {
    fontSize: FontSizes.xl,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  processingSubtext: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    padding: Spacing.xl,
    paddingTop: 100,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  celebrationCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  celebrationLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  celebrationText: {
    fontSize: FontSizes.lg,
    color: '#FFFFFF',
    lineHeight: FontSizes.lg * 1.4,
  },
  tasksCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  tasksLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  taskBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[400],
    marginTop: 6,
  },
  taskText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
    lineHeight: FontSizes.md * 1.4,
  },
  journalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  journalLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  journalText: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: FontSizes.md * 1.5,
    fontStyle: 'italic',
  },
  goodnightCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  goodnightText: {
    fontSize: FontSizes.lg,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: FontSizes.lg * 1.5,
    fontStyle: 'italic',
  },
  goodnightButton: {
    backgroundColor: '#E0E7FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.comfortable,
    marginTop: Spacing.lg,
  },
  goodnightButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#0f172a',
  },
});
