import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';
import { generateMorningBriefing, MorningBriefing, TaskForAI } from '../services/dailyAIService';
import { Task } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MorningGazetteProps {
  tasks: Task[];
  userName?: string;
  onStartTask: (taskId: string) => void;
  onDismiss: () => void;
}

const GAZETTE_KEY = 'morning_gazette_seen';

export default function MorningGazette({ tasks, userName, onStartTask, onDismiss }: MorningGazetteProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Check if gazette should be shown (7h - 10h window)
  const shouldShowGazette = useCallback(async () => {
    const hour = new Date().getHours();
    if (hour < 7 || hour > 10) return false;

    // Check if already seen today
    const today = new Date().toDateString();
    const lastSeen = await AsyncStorage.getItem(GAZETTE_KEY);
    
    if (lastSeen === today) return false;
    
    return true;
  }, []);

  useEffect(() => {
    const checkAndShow = async () => {
      const shouldShow = await shouldShowGazette();
      if (shouldShow) {
        setVisible(true);
        loadBriefing();
      }
    };

    checkAndShow();
  }, [shouldShowGazette]);

  const loadBriefing = async () => {
    setLoading(true);
    try {
      const tasksForAI: TaskForAI[] = tasks.map(t => ({
        id: t.id,
        text: t.text,
        priority: t.priority,
        quadrant: t.quadrant,
        due_date: t.due_date,
        completed: t.completed,
      }));

      const result = await generateMorningBriefing(tasksForAI, userName);
      setBriefing(result);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error loading briefing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEtapeZero = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mark as seen
    const today = new Date().toDateString();
    await AsyncStorage.setItem(GAZETTE_KEY, today);

    if (briefing?.victoire_du_jour.task_id) {
      onStartTask(briefing.victoire_du_jour.task_id);
    }
    
    handleClose();
  };

  const handleClose = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Mark as seen
    const today = new Date().toDateString();
    await AsyncStorage.setItem(GAZETTE_KEY, today);

    // Animate out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460', '#533483']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Préparation de ta gazette...</Text>
            </View>
          ) : briefing ? (
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.sunEmoji}>☀️</Text>
                <Text style={styles.salutation}>{briefing.salutation}</Text>
              </View>

              {/* Victoire du Jour */}
              <View style={styles.victoireCard}>
                <Text style={styles.victoireLabel}>🏆 Ta Victoire du Jour</Text>
                <Text style={styles.victoireTitre}>{briefing.victoire_du_jour.titre}</Text>
                <Text style={styles.victoireRaison}>{briefing.victoire_du_jour.raison}</Text>
              </View>

              {/* Étape 0 */}
              <View style={styles.etapeZeroCard}>
                <View style={styles.etapeZeroHeader}>
                  <Text style={styles.etapeZeroEmoji}>{briefing.etape_zero.emoji}</Text>
                  <Text style={styles.etapeZeroLabel}>Étape 0 - 30 secondes</Text>
                </View>
                <Text style={styles.etapeZeroAction}>{briefing.etape_zero.action}</Text>
              </View>

              {/* Encouragement */}
              <Text style={styles.encouragement}>{briefing.message_encouragement}</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStartEtapeZero}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startButtonText}>🚀 Lancer l'Étape 0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.laterButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.laterButtonText}>Plus tard</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : null}
        </LinearGradient>
      </View>
    </Modal>
  );
}

// Function to manually trigger the gazette (for testing or settings)
export async function resetGazetteForToday(): Promise<void> {
  await AsyncStorage.removeItem(GAZETTE_KEY);
}

export async function hasSeenGazetteToday(): Promise<boolean> {
  const today = new Date().toDateString();
  const lastSeen = await AsyncStorage.getItem(GAZETTE_KEY);
  return lastSeen === today;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSizes.lg,
    color: '#FFD700',
    fontWeight: '500',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sunEmoji: {
    fontSize: 64,
  },
  salutation: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  victoireCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  victoireLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  victoireTitre: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: FontSizes.xxl * 1.3,
  },
  victoireRaison: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  etapeZeroCard: {
    width: '100%',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  etapeZeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  etapeZeroEmoji: {
    fontSize: 24,
  },
  etapeZeroLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary[300],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  etapeZeroAction: {
    fontSize: FontSizes.lg,
    color: '#FFFFFF',
    lineHeight: FontSizes.lg * 1.4,
  },
  encouragement: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.lg,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  startButton: {
    backgroundColor: '#FFD700',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.comfortable,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  laterButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});
