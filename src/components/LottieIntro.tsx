import React, { useEffect, useRef, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import AutomotiveSplash from './AutomotiveSplash';

const { width } = Dimensions.get('window');

// Animation source (format JSON Lottie extrait de AutoMaroc_Night_Car_Logo_Reveal_v1.lottie)
const lottieSource = require('../../assets/animations/AutoMaroc_Night_Car_Logo_Reveal_v1.json');

interface LottieIntroProps {
  onFinish: () => void;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary pour basculer sur le fallback AutomotiveSplash si le player natif échoue
class LottieErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[LottieIntro] Erreur de chargement du module Lottie natif:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function LottiePlayerView({ onFinish }: LottieIntroProps) {
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const lottieRef = useRef<LottieView>(null);
  const hasFinishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Transition fluide de sortie en 350ms
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      onFinishRef.current();
    });
  }, [fadeAnim]);

  useEffect(() => {
    // Déclencheur de sécurité : la durée totale de l'animation est de 10s (300 frames à 30fps)
    // On ajoute une marge de sécurité à 10.5s pour ne jamais bloquer l'utilisateur
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 10500);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [handleFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar style="light" />

      {/* Animation Lottie centrée */}
      <View style={styles.animationWrapper}>
        <LottieView
          ref={lottieRef}
          source={lottieSource}
          autoPlay
          loop={false}
          speed={1.0}
          resizeMode="contain"
          style={styles.lottie}
          onAnimationFinish={(isCancelled) => {
            if (!isCancelled) {
              handleFinish();
            }
          }}
        />
      </View>

      {/* Bouton Skip interactif au-dessus du bouton de l'animation (coin inférieur droit) */}
      <Pressable
        style={styles.bottomSkipTouchArea}
        onPress={handleFinish}
        accessibilityLabel="Passer l'introduction"
      />

      {/* Bouton Skip natif discret et élégant en haut à droite */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.skipButtonPressed,
          ]}
          onPress={handleFinish}
          accessibilityRole="button"
          accessibilityLabel="Passer l'introduction"
        >
          <Text style={styles.skipButtonText}>Passer</Text>
          <Text style={styles.skipButtonChevron}>›</Text>
        </Pressable>
      </View>

      {/* Zone tactile globale de secours pour passer */}
      <Pressable
        style={styles.fullScreenTouchArea}
        onPress={handleFinish}
      />
    </Animated.View>
  );
}

export default function LottieIntro({ onFinish }: LottieIntroProps) {
  return (
    <LottieErrorBoundary fallback={<AutomotiveSplash onFinish={onFinish} />}>
      <LottiePlayerView onFinish={onFinish} />
    </LottieErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050812',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationWrapper: {
    width: Math.min(width, 500),
    height: Math.min(width, 500),
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 38,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  skipButtonPressed: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: '#10B981',
  },
  skipButtonText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  skipButtonChevron: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -2,
  },
  // Zone tactile invisible correspondant à la position du bouton Skip dans l'animation (440, 466)
  bottomSkipTouchArea: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 90,
    height: 44,
    zIndex: 10,
  },
  fullScreenTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
