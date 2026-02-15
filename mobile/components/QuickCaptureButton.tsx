import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Switch,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { createTask } from '../lib/supabase';
import { scheduleTaskReminder } from '../hooks/useNotifications';
import useSpeechToText from '../hooks/useSpeechToText';
import { breakdownTask } from '../services/aiService';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';

interface QuickCaptureButtonProps {
  userId: string | null;
  onTaskCreated: () => void;
}

const QUADRANT_OPTIONS = [
  { id: 1, label: '🔥 Urgent & Important', color: Colors.quadrant.urgent },
  { id: 2, label: '⭐ Important', color: Colors.quadrant.important },
  { id: 3, label: '⚡ Urgent', color: Colors.quadrant.delegate },
  { id: 4, label: '📋 À déléguer', color: Colors.quadrant.eliminate },
];

export default function QuickCaptureButton({ userId, onTaskCreated }: QuickCaptureButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<1 | 2 | 3 | 4>(2);
  const [loading, setLoading] = useState(false);
  const [wantsReminder, setWantsReminder] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState('30');
  const [wantsAIBreakdown, setWantsAIBreakdown] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const {
    isListening,
    isProcessing,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechToText();

  // Update task text when transcript changes
  useEffect(() => {
    if (transcript) {
      setTaskText(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript]);

  // Show speech error
  useEffect(() => {
    if (speechError) {
      Alert.alert('Erreur Micro', speechError);
    }
  }, [speechError]);

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const openModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  };

  const closeModal = () => {
    cancelListening();
    setModalVisible(false);
    setTaskText('');
    setSelectedQuadrant(2);
    setWantsReminder(false);
    setReminderMinutes('30');
    setWantsAIBreakdown(false);
  };

  const handleVoicePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const handleCreateTask = async () => {
    if (!taskText.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une tâche');
      return;
    }

    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const priority = selectedQuadrant <= 2 ? 'high' : selectedQuadrant === 3 ? 'medium' : 'low';
      
      // Optionally get AI breakdown
      let steps = undefined;
      if (wantsAIBreakdown) {
        try {
          const breakdown = await breakdownTask(taskText.trim());
          steps = breakdown.steps;
        } catch (e) {
          console.log('AI breakdown failed, continuing without steps');
        }
      }

      const newTask = await createTask({
        user_id: userId,
        text: taskText.trim(),
        priority: priority as 'high' | 'medium' | 'low',
        quadrant: selectedQuadrant,
        completed: false,
        source: 'mobile_quick_capture',
        steps,
      });

      // Schedule reminder if requested
      if (wantsReminder && newTask?.id) {
        const minutes = parseInt(reminderMinutes, 10) || 30;
        const reminderDate = new Date(Date.now() + minutes * 60 * 1000);
        await scheduleTaskReminder(
          newTask.id,
          taskText.trim(),
          reminderDate,
          selectedQuadrant
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', 'Impossible de créer la tâche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openModal}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push('/capture' as any);
        }}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Quick Capture Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouvelle tâche</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Voice Input Button */}
              <View style={styles.voiceSection}>
                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    isListening && styles.voiceButtonActive,
                  ]}
                  onPress={handleVoicePress}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.voiceIcon}>{isListening ? '⏹️' : '🎤'}</Text>
                    )}
                  </Animated.View>
                  <Text style={styles.voiceText}>
                    {isListening ? 'Arrêter' : isProcessing ? 'Transcription...' : 'Dicter'}
                  </Text>
                </TouchableOpacity>
                {isListening && (
                  <Text style={styles.listeningHint}>Parlez maintenant...</Text>
                )}
              </View>

              {/* Task Input */}
              <TextInput
                style={styles.input}
                placeholder="Qu'avez-vous en tête ?"
                placeholderTextColor={Colors.neutral[500]}
                value={taskText}
                onChangeText={setTaskText}
                multiline
                maxLength={200}
              />

              {/* Quadrant Selection */}
              <View style={styles.quadrantSection}>
                <Text style={styles.sectionLabel}>Catégorie</Text>
                <View style={styles.quadrantGrid}>
                  {QUADRANT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.quadrantOption,
                        selectedQuadrant === option.id && styles.quadrantSelected,
                        { borderColor: option.color },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedQuadrant(option.id as 1 | 2 | 3 | 4);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.quadrantLabel,
                        selectedQuadrant === option.id && { color: option.color },
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* AI Breakdown Toggle */}
              <View style={styles.toggleSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>✨ Décomposer avec IA</Text>
                  <Switch
                    value={wantsAIBreakdown}
                    onValueChange={setWantsAIBreakdown}
                    trackColor={{ false: Colors.neutral[700], true: Colors.primary[500] }}
                    thumbColor={wantsAIBreakdown ? Colors.primary[300] : Colors.neutral[400]}
                  />
                </View>
              </View>

              {/* Reminder Section */}
              <View style={styles.reminderSection}>
                <View style={styles.reminderToggle}>
                  <Text style={styles.reminderLabel}>🔔 Me rappeler</Text>
                  <Switch
                    value={wantsReminder}
                    onValueChange={setWantsReminder}
                    trackColor={{ false: Colors.neutral[700], true: Colors.primary[500] }}
                    thumbColor={wantsReminder ? Colors.primary[300] : Colors.neutral[400]}
                  />
                </View>
                {wantsReminder && (
                  <View style={styles.reminderTime}>
                    <Text style={styles.reminderTimeLabel}>Dans</Text>
                    <TextInput
                      style={styles.reminderInput}
                      value={reminderMinutes}
                      onChangeText={setReminderMinutes}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={styles.reminderTimeLabel}>minutes</Text>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleCreateTask}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {wantsAIBreakdown ? '✨ Créer et décomposer' : 'Ajouter la tâche'}
                  </Text>
                )}
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.lg,
    width: TouchTargets.large,
    height: TouchTargets.large,
    borderRadius: TouchTargets.large / 2,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: Colors.surface.dark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  closeButton: {
    fontSize: FontSizes.xl,
    color: Colors.neutral[400],
    padding: Spacing.sm,
  },
  voiceSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[800],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceButtonActive: {
    backgroundColor: Colors.danger[600],
    borderColor: Colors.danger[400],
  },
  voiceIcon: {
    fontSize: 24,
  },
  voiceText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  listeningHint: {
    fontSize: FontSizes.sm,
    color: Colors.danger[400],
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.lg,
    color: Colors.text.dark,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
  quadrantSection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.neutral[400],
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quadrantGrid: {
    gap: Spacing.sm,
  },
  quadrantOption: {
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quadrantSelected: {
    backgroundColor: Colors.neutral[700],
  },
  quadrantLabel: {
    fontSize: FontSizes.md,
    color: Colors.text.dark,
    fontWeight: '500',
  },
  toggleSection: {
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  toggleLabel: {
    fontSize: FontSizes.md,
    color: Colors.text.dark,
    fontWeight: '500',
  },
  reminderSection: {
    marginBottom: Spacing.lg,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  reminderLabel: {
    fontSize: FontSizes.md,
    color: Colors.text.dark,
    fontWeight: '500',
  },
  reminderTime: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  reminderTimeLabel: {
    fontSize: FontSizes.md,
    color: Colors.neutral[400],
  },
  reminderInput: {
    backgroundColor: Colors.neutral[700],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.lg,
    color: Colors.primary[400],
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.comfortable,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
