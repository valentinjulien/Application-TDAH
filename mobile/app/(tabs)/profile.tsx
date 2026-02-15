import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase, Task, getTasks, getDailyLogs, DailyLog } from '../../lib/supabase';
import useNotifications, {
  scheduleDailyMotivation,
  sendImmediateNotification,
  cancelAllNotifications,
  getScheduledNotifications,
} from '../../hooks/useNotifications';
import useDailyTriggers from '../../hooks/useDailyTriggers';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../../constants/theme';

export default function ProfileScreen() {
  const [email, setEmail] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    streak: 0,
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  
  const router = useRouter();
  const { expoPushToken, error: notificationError } = useNotifications();
  const { resetGazette, resetReview, morningWindow, eveningWindow } = useDailyTriggers();

  useEffect(() => {
    fetchUserData();
    checkNotificationStatus();
  }, []);

  useEffect(() => {
    if (expoPushToken) {
      setNotificationsEnabled(true);
    }
  }, [expoPushToken]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      // Fetch tasks for stats
      const tasks = await getTasks(user.id);
      const completed = tasks.filter(t => t.completed).length;
      const streak = calculateStreak(tasks);

      setStats({
        total: tasks.length,
        completed,
        streak,
      });

      // Fetch weekly logs
      try {
        const logs = await getDailyLogs(user.id, 7);
        setWeeklyLogs(logs);
      } catch (e) {
        // Table might not exist yet
        console.log('Daily logs not available');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const checkNotificationStatus = async () => {
    const scheduled = await getScheduledNotifications();
    setScheduledCount(scheduled.length);
    
    // Check if daily motivation is scheduled
    const hasDailyReminder = scheduled.some(n => 
      n.content.data?.action === 'daily_motivation'
    );
    setDailyReminderEnabled(hasDailyReminder);
  };

  const calculateStreak = (tasks: Task[]): number => {
    if (tasks.length === 0) return 0;

    const completedDates = tasks
      .filter(t => t.completed)
      .map(t => new Date(t.created_at).toDateString());

    const uniqueDates = [...new Set(completedDates)].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0;
    }

    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const expectedDate = new Date(Date.now() - (i * 86400000));

      if (currentDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const handleToggleDailyReminder = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (value) {
      try {
        await scheduleDailyMotivation(9, 0); // 9:00 AM
        setDailyReminderEnabled(true);
        Alert.alert('✅ Activé', 'Vous recevrez un message de motivation chaque matin à 9h !');
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d\'activer les rappels quotidiens');
      }
    } else {
      await cancelAllNotifications();
      setDailyReminderEnabled(false);
      checkNotificationStatus();
    }
  };

  const handleTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await sendImmediateNotification(
        '🎉 Test réussi !',
        'Les notifications fonctionnent parfaitement.',
        { action: 'test' }
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification test');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Jours d'affilée</Text>
            <Text style={styles.statEmoji}>🔥</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Tâches terminées</Text>
            <Text style={styles.statEmoji}>✓</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Taux de complétion</Text>
            <Text style={styles.statEmoji}>📊</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total - stats.completed}</Text>
            <Text style={styles.statLabel}>En cours</Text>
            <Text style={styles.statEmoji}>📝</Text>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>

          <View style={styles.notificationStatus}>
            <Text style={[
              styles.statusText,
              { color: notificationsEnabled ? Colors.accent[500] : Colors.danger[500] }
            ]}>
              {notificationsEnabled ? '✅ Notifications activées' : '❌ Notifications désactivées'}
            </Text>
            {notificationError && (
              <Text style={styles.errorText}>{notificationError}</Text>
            )}
            {scheduledCount > 0 && (
              <Text style={styles.scheduledText}>
                {scheduledCount} notification{scheduledCount > 1 ? 's' : ''} programmée{scheduledCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <View style={styles.menuItem}>
            <Text style={styles.menuText}>☀️  Rappel motivation quotidien</Text>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={handleToggleDailyReminder}
              trackColor={{ false: Colors.neutral[700], true: Colors.primary[500] }}
              thumbColor={dailyReminderEnabled ? Colors.primary[300] : Colors.neutral[400]}
            />
          </View>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>🧪  Tester les notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Mode sombre', 'Le mode sombre est activé par défaut pour le confort visuel TDAH.');
            }}
          >
            <Text style={styles.menuText}>🌙  Apparence</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('À propos', 'TDAH Focus v1.0.0\n\nConçu avec ❤️ pour vous aider à rester concentré.');
            }}
          >
            <Text style={styles.menuText}>ℹ️  À propos</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Rituals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Rituels Quotidiens</Text>
          
          <View style={styles.ritualsInfo}>
            <Text style={styles.ritualsInfoText}>
              {morningWindow ? '☀️ Fenêtre du matin active (7h-10h)' : 
               eveningWindow ? '🌙 Fenêtre du soir active (21h-23h)' :
               '💤 Hors des fenêtres de rituels'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.ritualButton}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              resetGazette();
              Alert.alert('✅ Réinitialisé', 'La Gazette du Matin sera affichée au prochain lancement (entre 7h et 10h).');
            }}
          >
            <Text style={styles.ritualButtonText}>☀️  Revoir la Gazette du Matin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ritualButton}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              resetReview();
              Alert.alert('✅ Réinitialisé', 'La Revue du Soir sera affichée au prochain lancement (entre 21h et 23h).');
            }}
          >
            <Text style={styles.ritualButtonText}>🌙  Revoir la Revue du Soir</Text>
          </TouchableOpacity>

          {weeklyLogs.length > 0 && (
            <View style={styles.weeklyStats}>
              <Text style={styles.weeklyStatsTitle}>📊 Cette semaine</Text>
              <Text style={styles.weeklyStatsText}>
                {weeklyLogs.filter(l => l.type === 'morning_gazette').length} Gazettes • {weeklyLogs.filter(l => l.type === 'evening_review').length} Revues
              </Text>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  email: {
    fontSize: FontSizes.lg,
    color: Colors.text.dark,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[800],
  },
  statValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.primary[400],
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statEmoji: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    fontSize: FontSizes.md,
    opacity: 0.5,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text.dark,
    marginBottom: Spacing.md,
  },
  notificationStatus: {
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[800],
  },
  statusText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.danger[400],
    marginTop: Spacing.xs,
  },
  scheduledText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
    marginTop: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface.dark,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    minHeight: TouchTargets.comfortable,
  },
  menuText: {
    fontSize: FontSizes.md,
    color: Colors.text.dark,
  },
  menuArrow: {
    fontSize: FontSizes.xl,
    color: Colors.neutral[500],
  },
  testButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  testButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: Colors.danger[600],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.comfortable,
  },
  logoutText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
