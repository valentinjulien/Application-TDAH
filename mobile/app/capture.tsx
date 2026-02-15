import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Keyboard,
  BackHandler,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { supabase, createTask } from '../lib/supabase';
import { processCapture } from '../services/captureService';
import { Colors, FontSizes, Spacing } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dynamic placeholders for ADHD-friendly UX
const PLACEHOLDERS = [
  'Vider l\'esprit...',
  'Une idée ?',
  'À faire...',
  'Note rapide...',
  'Capture...',
  'Pensée fugitive...',
  'Avant d\'oublier...',
];

type CaptureState = 'idle' | 'processing' | 'success' | 'error';

export default function CaptureScreen() {
  const [text, setText] = useState('');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [state, setState] = useState<CaptureState>('idle');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  
  const inputRef = useRef<TextInput>(null);

  // Initialize
  useEffect(() => {
    // Get user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-focus
    setTimeout(() => inputRef.current?.focus(), 100);

    // Random placeholder
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

    // Handle back button (Android)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Handle close/escape
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    });
  }, [fadeAnim, scaleAnim]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText || !userId || state === 'processing') return;

    setState('processing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    // Start glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    try {
      // Process with AI
      const result = await processCapture(trimmedText);

      // Save to Supabase
      await createTask({
        user_id: userId,
        text: result.text,
        priority: result.priority,
        quadrant: result.quadrant,
        completed: false,
        due_date: result.due_date || undefined,
        estimated_total_minutes: result.estimated_total_minutes,
        energy_required: result.energy_required,
      });

      // Success!
      setState('success');
      glowAnim.stopAnimation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Success animation
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ]).start(() => {
        handleClose();
      });

    } catch (error) {
      console.error('Capture error:', error);
      setState('error');
      glowAnim.stopAnimation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Reset after error
      setTimeout(() => {
        setState('idle');
        inputRef.current?.focus();
      }, 1500);
    }
  }, [text, userId, state, glowAnim, successAnim, handleClose]);

  // Handle key press (for external keyboards)
  const handleKeyPress = useCallback((e: any) => {
    if (e.nativeEvent.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Glow color interpolation
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const successScale = successAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Blur Background */}
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Dark Overlay */}
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]} 
      />

      {/* Main Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Processing Glow */}
        {state === 'processing' && (
          <Animated.View 
            style={[
              styles.glow,
              { opacity: glowOpacity }
            ]} 
          />
        )}

        {/* Processing Indicator with AI features */}
        {state === 'processing' && (
          <View style={styles.processingContainer}>
            <Animated.View style={[styles.processingGlow, { opacity: glowOpacity }]} />
            <Text style={styles.processingEmoji}>🧠</Text>
            <Text style={styles.processingTitle}>Analyse en cours...</Text>
            <View style={styles.processingFeatures}>
              <Text style={styles.processingFeature}>📊 Classification Eisenhower</Text>
              <Text style={styles.processingFeature}>⚡ Niveau d'énergie</Text>
              <Text style={styles.processingFeature}>⏱️ Estimation durée</Text>
              <Text style={styles.processingFeature}>📅 Extraction de date</Text>
            </View>
          </View>
        )}

        {/* Success Indicator */}
        {state === 'success' && (
          <Animated.View 
            style={[
              styles.successContainer,
              { transform: [{ scale: successScale }] }
            ]}
          >
            <Text style={styles.successEmoji}>✓</Text>
            <Text style={styles.successText}>Capturé</Text>
          </Animated.View>
        )}

        {/* Error Indicator */}
        {state === 'error' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>Erreur de sauvegarde</Text>
          </View>
        )}

        {/* Input Field - Only show when not success */}
        {state !== 'success' && (
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={Colors.neutral[600]}
            multiline
            autoFocus
            autoCorrect={false}
            autoCapitalize="sentences"
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSubmit}
            onKeyPress={handleKeyPress}
            editable={state === 'idle'}
            maxLength={500}
          />
        )}

        {/* Hint */}
        {state === 'idle' && text.length === 0 && (
          <Animated.View style={[styles.hint, { opacity: fadeAnim }]}>
            <Text style={styles.hintText}>
              Entrée pour capturer • Retour pour annuler
            </Text>
            <Text style={styles.hintSubtext}>
              L'IA organisera automatiquement ta pensée ✨
            </Text>
          </Animated.View>
        )}

        {/* AI Preview hint when typing */}
        {text.length > 10 && state === 'idle' && (
          <View style={styles.aiPreview}>
            <Text style={styles.aiPreviewText}>
              🧠 L'IA va analyser : priorité, énergie, durée
            </Text>
          </View>
        )}

        {/* Character count */}
        {text.length > 0 && state === 'idle' && (
          <Text style={styles.charCount}>{text.length}/500</Text>
        )}
      </Animated.View>

      {/* Tap outside to close */}
      {state === 'idle' && (
        <View 
          style={styles.tapZone}
          onTouchEnd={handleClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 18, 0.85)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: 100,
    backgroundColor: Colors.primary[500],
    borderRadius: 50,
    shadowColor: Colors.primary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  input: {
    width: '100%',
    maxWidth: 600,
    fontSize: FontSizes.xxl,
    fontWeight: '300',
    color: Colors.text.dark,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    lineHeight: FontSizes.xxl * 1.5,
    letterSpacing: 0.5,
  },
  hint: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.15,
  },
  hintText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    letterSpacing: 0.5,
  },
  charCount: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.1,
    fontSize: FontSizes.xs,
    color: Colors.neutral[600],
  },
  successContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  successEmoji: {
    fontSize: 64,
    color: Colors.accent[400],
  },
  successText: {
    fontSize: FontSizes.xl,
    fontWeight: '500',
    color: Colors.accent[400],
    letterSpacing: 1,
  },
  errorContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.danger[400],
  },
  tapZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
});
