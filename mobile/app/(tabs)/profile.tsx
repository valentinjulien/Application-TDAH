import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase, Task, getTasks } from '../../lib/supabase';
import { Colors, Spacing, BorderRadius, FontSizes, TouchTargets } from '../../constants/theme';

export default function ProfileScreen() {
  const [email, setEmail] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    streak: 0,
  });
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      // Fetch tasks for stats
      const tasks = await getTasks(user.id);
      const completed = tasks.filter(t => t.completed).length;

      // Calculate streak (consecutive days with completed tasks)
      const streak = calculateStreak(tasks);

      setStats({
        total: tasks.length,
        completed,
        streak,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
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

    // Check if streak is active (today or yesterday)
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0;
    }

    // Count consecutive days
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

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Bientôt disponible', 'Les notifications seront disponibles dans une prochaine mise à jour.');
            }}
          >
            <Text style={styles.menuText}>🔔  Notifications</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Bientôt disponible', 'Le mode sombre est déjà activé par défaut pour le TDAH.');
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
