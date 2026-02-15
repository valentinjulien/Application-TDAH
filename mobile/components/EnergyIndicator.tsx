// Energy Indicator - Visual component for task energy levels
// Uses ADHD-friendly colors and animations

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

type EnergyLevel = 'low' | 'medium' | 'high';

interface EnergyIndicatorProps {
  level: EnergyLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}

const ENERGY_CONFIG = {
  low: {
    color: Colors.accent[500],
    bgColor: Colors.accent[900],
    label: 'Repos',
    description: 'Tâche légère',
    bars: 1,
    emoji: '🌿',
  },
  medium: {
    color: Colors.warning[500],
    bgColor: Colors.warning[900],
    label: 'Focus',
    description: 'Concentration standard',
    bars: 2,
    emoji: '⚡',
  },
  high: {
    color: Colors.danger[500],
    bgColor: Colors.danger[900],
    label: 'Deep Work',
    description: 'Haute concentration',
    bars: 3,
    emoji: '🔥',
  },
};

export default function EnergyIndicator({
  level,
  size = 'medium',
  showLabel = true,
  animated = true,
}: EnergyIndicatorProps) {
  const config = ENERGY_CONFIG[level];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated && level === 'high') {
      // Subtle pulse for high energy tasks
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [level, animated]);

  const sizeConfig = {
    small: {
      barWidth: 4,
      barHeight: [8, 12, 16],
      gap: 2,
      padding: Spacing.xs,
      fontSize: FontSizes.xs,
    },
    medium: {
      barWidth: 6,
      barHeight: [10, 16, 22],
      gap: 3,
      padding: Spacing.sm,
      fontSize: FontSizes.sm,
    },
    large: {
      barWidth: 8,
      barHeight: [14, 22, 30],
      gap: 4,
      padding: Spacing.md,
      fontSize: FontSizes.md,
    },
  }[size];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor + '40',
          paddingHorizontal: sizeConfig.padding,
          paddingVertical: sizeConfig.padding * 0.6,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Energy Bars */}
      <View style={[styles.barsContainer, { gap: sizeConfig.gap }]}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                width: sizeConfig.barWidth,
                height: sizeConfig.barHeight[index],
                backgroundColor:
                  index < config.bars ? config.color : Colors.neutral[700],
                borderRadius: sizeConfig.barWidth / 2,
              },
            ]}
          />
        ))}
      </View>

      {/* Label */}
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: config.color,
              fontSize: sizeConfig.fontSize,
            },
          ]}
        >
          {config.label}
        </Text>
      )}
    </Animated.View>
  );
}

// Compact version for badges
export function EnergyBadge({ level }: { level: EnergyLevel }) {
  const config = ENERGY_CONFIG[level];

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor + '60' }]}>
      <Text style={styles.badgeEmoji}>{config.emoji}</Text>
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

// Large card version with description
export function EnergyCard({ level }: { level: EnergyLevel }) {
  const config = ENERGY_CONFIG[level];

  return (
    <View style={[styles.card, { borderColor: config.color + '40' }]}>
      <View style={[styles.cardHeader, { backgroundColor: config.bgColor + '30' }]}>
        <Text style={styles.cardEmoji}>{config.emoji}</Text>
        <View>
          <Text style={[styles.cardTitle, { color: config.color }]}>
            {config.label}
          </Text>
          <Text style={styles.cardDescription}>{config.description}</Text>
        </View>
      </View>
      <View style={styles.cardBars}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.cardBar,
              {
                backgroundColor:
                  index < config.bars ? config.color : Colors.neutral[800],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    // Dynamic styles
  },
  label: {
    fontWeight: '600',
  },

  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },

  // Card styles
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: Colors.surface.dark,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
    marginTop: 2,
  },
  cardBars: {
    flexDirection: 'row',
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.xs,
  },
  cardBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
});
