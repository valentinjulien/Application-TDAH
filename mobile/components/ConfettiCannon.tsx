import { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPieceProps {
  delay: number;
  color: string;
}

const CONFETTI_COLORS = [
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#EC4899', // Pink
];

function ConfettiPiece({ delay, color }: ConfettiPieceProps) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const startX = Math.random() * SCREEN_WIDTH;
  const endX = startX + (Math.random() - 0.5) * 200;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT * 0.8,
          duration: 2500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: endX - startX,
          duration: 2500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 360 * (2 + Math.random() * 3),
          duration: 2500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2500,
          delay: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const isSquare = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: startX,
          backgroundColor: color,
          width: isSquare ? 10 : 8,
          height: isSquare ? 10 : 16,
          borderRadius: isSquare ? 2 : 4,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotateInterpolate },
          ],
        },
      ]}
    />
  );
}

interface ConfettiCannonProps {
  active: boolean;
  count?: number;
  onComplete?: () => void;
}

export default function ConfettiCannon({ active, count = 50, onComplete }: ConfettiCannonProps) {
  useEffect(() => {
    if (active && onComplete) {
      const timer = setTimeout(onComplete, 3500);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active) return null;

  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: Math.random() * 300,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} delay={piece.delay} color={piece.color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  confetti: {
    position: 'absolute',
    top: -20,
  },
});
