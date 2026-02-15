// Focus Stats Banner - Shows daily focus statistics with ADHD-friendly encouragement
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { supabase } from '../lib/supabase';

interface FocusStats {
  sessionsToday: number;
  totalMinutesToday: number;
  interruptionsToday: number;
  streak: number;
}

interface FocusStatsBannerProps {
  userId: string | null;
  onStartFocus?: () => void;
}

export default function FocusStatsBanner({ userId, onStartFocus }: FocusStatsBannerProps) {
  const [stats, setStats] = useState<FocusStats>({
    sessionsToday: 0,
    totalMinutesToday: 0,
    interruptionsToday: 0,
    streak: 0,
  });
  const [expanded, setExpanded] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  
  const heightAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

  useEffect(() => {
    // Generate encouragement based on stats
    setEncouragement(getEncouragement(stats));
  }, [stats]);

  const fetchStats = async () => {
    if (!userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's focus sessions
      const { data: sessions } = await supabase
        .from('pomodoro_sessions')
        .select('duration_minutes, completed')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .eq('completed', true);

      // Get today's interruptions
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('content')
        .eq('user_id', userId)
        .eq('type', 'focus_interruption')
        .eq('date', today);

      // Calculate streak (consecutive days with completed sessions)
      const { data: recentSessions } = await supabase
        .from('pomodoro_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(30);

      let streak = 0;
      if (recentSessions && recentSessions.length > 0) {
        const dates = new Set(
          recentSessions.map(s => 
            new Date(s.created_at).toISOString().split('T')[0]
          )
        );
        
        const checkDate = new Date();
        while (dates.has(checkDate.toISOString().split('T')[0])) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      const totalInterruptions = logs?.reduce((acc, log) => {
        return acc + ((log.content as any)?.interruption_count || 0);
      }, 0) || 0;

      setStats({
        sessionsToday: sessions?.length || 0,
        totalMinutesToday: sessions?.reduce((acc, s) => acc + s.duration_minutes, 0) || 0,
        interruptionsToday: totalInterruptions,
        streak,
      });
    } catch (error) {
      console.error('Error fetching focus stats:', error);
    }
  };

  const getEncouragement = (s: FocusStats): string => {
    if (s.sessionsToday === 0) {
      if (s.streak > 0) {
        return `🔥 ${s.streak} jours de suite ! Continue ta série ?`;
      }
      return "🎯 Prêt(e) pour ta première session focus ?";
    }
    
    if (s.totalMinutesToday >= 120) {
      return "🏆 Plus de 2h de focus ! Tu es en feu aujourd'hui !";
    }
    
    if (s.totalMinutesToday >= 60) {
      return "💪 1h+ de concentration ! Excellent travail !";
    }
    
    if (s.interruptionsToday === 0 && s.sessionsToday > 0) {
      return "✨ Zéro distraction ! Focus parfait !";
    }
    
    if (s.interruptionsToday > 3) {
      return "🧘 Les distractions font partie du jeu. Tu reviens toujours !";
    }
    
    return `🚀 ${s.sessionsToday} session${s.sessionsToday > 1 ? 's' : ''} aujourd'hui. Continue !`;
  };

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
    
    Animated.spring(heightAnim, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: false,
      tension: 100,
      friction: 12,
    }).start();
  };

  const expandedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <View style={styles.container}>
      {/* Main Banner */}
      <TouchableOpacity 
        style={styles.banner}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{stats.streak}</Text>
          </View>
        </View>
        
        <View style={styles.bannerCenter}>
          <Text style={styles.encouragementText}>{encouragement}</Text>
        </View>
        
        <View style={styles.bannerRight}>
          <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Stats */}
      <Animated.View style={[styles.expandedContainer, { height: expandedHeight }]}>
        <View style={styles.statsGrid}>
          {/* Sessions */}
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.sessionsToday}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          
          {/* Minutes */}
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalMinutesToday}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          
          {/* Focus Score */}
          <View style={styles.statCard}>
            <Text style={[
              styles.statValue,
              stats.interruptionsToday === 0 ? styles.statValueGood : 
              stats.interruptionsToday <= 3 ? styles.statValueMedium : 
              styles.statValueLow
            ]}>
              {stats.interruptionsToday === 0 ? '💯' : 
               stats.interruptionsToday <= 3 ? '👍' : '🔄'}
            </Text>
            <Text style={styles.statLabel}>
              {stats.interruptionsToday} distraction{stats.interruptionsToday !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Quick Start Button */}
        {onStartFocus && (
          <TouchableOpacity
            style={styles.quickStartButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStartFocus();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.quickStartText}>⏱️ Démarrer une session</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface.dark,
    borderWidth: 1,
    borderColor: Colors.neutral[800],
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  bannerLeft: {
    flexShrink: 0,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning[900] + '40',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakNumber: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.warning[400],
  },
  bannerCenter: {
    flex: 1,
  },
  encouragementText: {
    fontSize: FontSizes.sm,
    color: Colors.text.dark,
    fontWeight: '500',
  },
  bannerRight: {
    flexShrink: 0,
  },
  expandIcon: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
  },
  expandedContainer: {
    overflow: 'hidden',
    paddingHorizontal: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[800],
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  statValueGood: {
    color: Colors.accent[400],
  },
  statValueMedium: {
    color: Colors.warning[400],
  },
  statValueLow: {
    color: Colors.neutral[400],
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  quickStartButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  quickStartText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
