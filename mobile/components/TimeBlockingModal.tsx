import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../constants/theme';
import { Task, updateTask } from '../lib/supabase';
import {
  calculateTaskWeight,
  findOptimalSlot,
  formatTimeSlot,
  formatDuration,
  TaskWeight,
  TimeSlot,
} from '../services/timeBlockingService';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

interface TimeBlockingModalProps {
  visible: boolean;
  task: Task;
  onClose: () => void;
  onScheduled: (task: Task) => void;
}

export default function TimeBlockingModal({
  visible,
  task,
  onClose,
  onScheduled,
}: TimeBlockingModalProps) {
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState<TaskWeight | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(true);

  // Google Calendar hook
  const {
    isConnected: isCalendarConnected,
    isLoading: isCalendarLoading,
    userEmail,
    connect: connectCalendar,
    syncTaskToCalendar,
    fetchBusySlots,
  } = useGoogleCalendar();

  useEffect(() => {
    if (visible && task) {
      analyzeTask();
    }
  }, [visible, task]);

  const analyzeTask = async () => {
    setLoading(true);
    setWeight(null);
    setSlots([]);
    setSelectedSlot(null);

    try {
      // Calculate task weight using AI
      const taskWeight = await calculateTaskWeight(task.text);
      setWeight(taskWeight);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fetch busy slots from Google Calendar if connected
      let busySlots: { start: Date; end: Date }[] = [];
      if (isCalendarConnected) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        busySlots = await fetchBusySlots(now, nextWeek);
      }

      // Find optimal time slots (considering busy times)
      const optimalSlots = findOptimalSlot(
        taskWeight.energy_required,
        taskWeight.estimated_total_minutes,
        busySlots
      );
      setSlots(optimalSlots);
    } catch (error) {
      console.error('Error analyzing task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    Haptics.selectionAsync();
    setSelectedSlot(slot);
  };

  const handleSchedule = async () => {
    if (!selectedSlot || !weight) return;

    setScheduling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let calendarEventId: string | undefined;

      // Sync to Google Calendar if enabled and connected
      if (syncToCalendar && isCalendarConnected) {
        const eventId = await syncTaskToCalendar(
          task.text,
          selectedSlot.start,
          weight.estimated_total_minutes,
          weight.energy_required
        );
        if (eventId) {
          calendarEventId = eventId;
        }
      }

      // Update task with scheduling info
      const updatedTask = await updateTask(task.id, {
        estimated_total_minutes: weight.estimated_total_minutes,
        energy_required: weight.energy_required,
        scheduled_at: selectedSlot.start.toISOString(),
        hidden_subtasks: weight.hidden_subtasks,
        calendar_event_id: calendarEventId,
      } as any);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onScheduled(updatedTask);
      onClose();
    } catch (error) {
      console.error('Error scheduling task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScheduling(false);
    }
  };

  const getEnergyColor = (energy: 'low' | 'medium' | 'high') => {
    switch (energy) {
      case 'low':
        return Colors.accent[500];
      case 'medium':
        return Colors.warning[500];
      case 'high':
        return Colors.danger[500];
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📅 Planifier cette tâche</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Task Preview */}
          <View style={styles.taskPreview}>
            <Text style={styles.taskText} numberOfLines={2}>
              {task.text}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary[400]} />
              <Text style={styles.loadingText}>
                Analyse de la charge cognitive...
              </Text>
            </View>
          ) : weight ? (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Weight Analysis */}
              <View style={styles.weightSection}>
                <Text style={styles.sectionTitle}>⚡ Analyse énergétique</Text>

                <View style={styles.weightCard}>
                  {/* Duration */}
                  <View style={styles.weightRow}>
                    <Text style={styles.weightLabel}>Durée estimée</Text>
                    <View style={styles.weightValue}>
                      <Text style={styles.durationText}>
                        {formatDuration(weight.estimated_total_minutes)}
                      </Text>
                      <Text style={styles.marginText}>
                        (incl. +20% marge TDAH)
                      </Text>
                    </View>
                  </View>

                  {/* Energy Level */}
                  <View style={styles.weightRow}>
                    <Text style={styles.weightLabel}>Niveau d'énergie</Text>
                    <View
                      style={[
                        styles.energyBadge,
                        { backgroundColor: getEnergyColor(weight.energy_required) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.energyText,
                          { color: getEnergyColor(weight.energy_required) },
                        ]}
                      >
                        {weight.energy_emoji} {weight.energy_label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* AI Reasoning */}
                {weight.reasoning && (
                  <View style={styles.reasoningCard}>
                    <Text style={styles.reasoningLabel}>💡 Analyse IA</Text>
                    <Text style={styles.reasoningText}>{weight.reasoning}</Text>
                  </View>
                )}

                {/* Hidden Subtasks */}
                {weight.hidden_subtasks.length > 0 && (
                  <View style={styles.subtasksCard}>
                    <Text style={styles.subtasksLabel}>
                      🔍 Sous-tâches souvent oubliées
                    </Text>
                    {weight.hidden_subtasks.map((subtask, index) => (
                      <View key={index} style={styles.subtaskRow}>
                        <Text style={styles.subtaskBullet}>•</Text>
                        <Text style={styles.subtaskText}>{subtask}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Time Slots */}
              <View style={styles.slotsSection}>
                <Text style={styles.sectionTitle}>🕐 Créneaux suggérés</Text>
                <Text style={styles.slotsHint}>
                  {weight.energy_required === 'high'
                    ? 'Tâche Deep Work → Créneaux matinaux recommandés'
                    : weight.energy_required === 'low'
                    ? 'Tâche légère → Fin de journée idéale'
                    : 'Tâche standard → Horaires flexibles'}
                </Text>

                {isCalendarConnected && (
                  <Text style={styles.calendarConnectedHint}>
                    ✓ Créneaux occupés Google Calendar exclus
                  </Text>
                )}

                {slots.length > 0 ? (
                  <View style={styles.slotsList}>
                    {slots.map((slot, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.slotCard,
                          selectedSlot === slot && styles.slotCardSelected,
                        ]}
                        onPress={() => handleSelectSlot(slot)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.slotInfo}>
                          <Text
                            style={[
                              styles.slotTime,
                              selectedSlot === slot && styles.slotTimeSelected,
                            ]}
                          >
                            {formatTimeSlot(slot)}
                          </Text>
                          <Text
                            style={[
                              styles.slotLabel,
                              selectedSlot === slot && styles.slotLabelSelected,
                            ]}
                          >
                            {slot.label}
                          </Text>
                        </View>
                        {selectedSlot === slot && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noSlotsText}>
                    Aucun créneau disponible trouvé
                  </Text>
                )}
              </View>

              {/* Google Calendar Section */}
              <View style={styles.calendarSection}>
                <Text style={styles.sectionTitle}>📅 Google Calendar</Text>
                
                {isCalendarConnected ? (
                  <View style={styles.calendarConnected}>
                    <View style={styles.calendarStatus}>
                      <Text style={styles.calendarStatusIcon}>✓</Text>
                      <View style={styles.calendarStatusInfo}>
                        <Text style={styles.calendarStatusText}>Connecté</Text>
                        {userEmail && (
                          <Text style={styles.calendarEmail}>{userEmail}</Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.syncToggle}>
                      <Text style={styles.syncToggleLabel}>
                        Ajouter au calendrier
                      </Text>
                      <Switch
                        value={syncToCalendar}
                        onValueChange={setSyncToCalendar}
                        trackColor={{ 
                          false: Colors.neutral[700], 
                          true: Colors.primary[600] 
                        }}
                        thumbColor={syncToCalendar ? Colors.primary[300] : Colors.neutral[400]}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.connectCalendarButton}
                    onPress={connectCalendar}
                    disabled={isCalendarLoading}
                    activeOpacity={0.7}
                  >
                    {isCalendarLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary[400]} />
                    ) : (
                      <>
                        <Text style={styles.connectCalendarIcon}>🔗</Text>
                        <Text style={styles.connectCalendarText}>
                          Connecter Google Calendar
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.scheduleButton,
                (!selectedSlot || scheduling) && styles.scheduleButtonDisabled,
              ]}
              onPress={handleSchedule}
              disabled={!selectedSlot || scheduling}
              activeOpacity={0.8}
            >
              {scheduling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.scheduleButtonText}>
                  📅 Planifier
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface.dark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[800],
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[400],
  },
  taskPreview: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[800],
  },
  taskText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[400],
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  weightSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary[400],
    marginBottom: Spacing.md,
  },
  weightCard: {
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: FontSizes.md,
    color: Colors.neutral[300],
  },
  weightValue: {
    alignItems: 'flex-end',
  },
  durationText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  marginText: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  energyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  energyText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  reasoningCard: {
    backgroundColor: Colors.primary[900] + '40',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[500],
  },
  reasoningLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary[400],
    marginBottom: Spacing.xs,
  },
  reasoningText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[300],
    lineHeight: FontSizes.sm * 1.5,
  },
  subtasksCard: {
    backgroundColor: Colors.warning[700] + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning[500],
  },
  subtasksLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.warning[400],
    marginBottom: Spacing.sm,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  subtaskBullet: {
    fontSize: FontSizes.sm,
    color: Colors.warning[400],
    marginRight: Spacing.sm,
  },
  subtaskText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.neutral[300],
  },
  slotsSection: {
    marginBottom: Spacing.lg,
  },
  slotsHint: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  slotsList: {
    gap: Spacing.sm,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[900] + '40',
  },
  slotInfo: {
    flex: 1,
  },
  slotTime: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  slotTimeSelected: {
    color: Colors.primary[300],
  },
  slotLabel: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
    marginTop: 2,
  },
  slotLabelSelected: {
    color: Colors.primary[400],
  },
  checkmark: {
    fontSize: FontSizes.xl,
    color: Colors.primary[400],
    fontWeight: '700',
  },
  noSlotsText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    textAlign: 'center',
    padding: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[800],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.neutral[800],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTargets.comfortable,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.neutral[300],
  },
  scheduleButton: {
    flex: 2,
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTargets.comfortable,
  },
  scheduleButtonDisabled: {
    backgroundColor: Colors.neutral[700],
    opacity: 0.6,
  },
  scheduleButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
