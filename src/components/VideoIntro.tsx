import React, { useEffect, useRef, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { StatusBar, setStatusBarHidden } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import AutomotiveSplash from './AutomotiveSplash';

// Source vidéo officielle AutoMaroc (format vertical 9:16 adapté mobile)
const videoSource = require('../../assets/videos/automaroc_intro_vertical.mp4');

interface VideoIntroProps {
  onFinish: () => void;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary de sécurité en cas d'erreur de rendu du player natif
class VideoErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[VideoIntro] Erreur de chargement du lecteur vidéo natif:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function VideoPlayerComponent({ onFinish }: VideoIntroProps) {
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const hasFinishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Restaurer immédiatement la Status Bar et la Navigation Bar Android
    setStatusBarHidden(false, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    }

    // Transition fluide de sortie en fondu (300ms)
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onFinishRef.current();
    });
  }, [fadeAnim]);

  // Masquer la Status Bar et Navigation Bar pendant l'intro, et restaurer au démontage
  useEffect(() => {
    setStatusBarHidden(true, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    }

    return () => {
      setStatusBarHidden(false, 'fade');
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    };
  }, []);

  // Initialisation du lecteur vidéo expo-video
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    // Écoute de la fin naturelle de la vidéo
    const endSubscription = player.addListener('playToEnd', () => {
      handleFinish();
    });

    // Écoute des erreurs de statut éventuelles
    const statusSubscription = player.addListener('statusChange', (payload) => {
      if (payload.status === 'error') {
        console.warn('[VideoIntro] Erreur de lecture vidéo:', payload.error);
        handleFinish();
      }
    });

    // Sécurité : la vidéo dure 10.02s, timeout de secours à 10.8s
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 10800);

    return () => {
      clearTimeout(safetyTimer);
      endSubscription.remove();
      statusSubscription.remove();
    };
  }, [player, handleFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden={true} />

      {/* Conteneur vidéo plein écran vertical 9:16 sans déformation ni bandes noires */}
      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="cover"
          style={styles.video}
          fullscreenOptions={{ enable: false }}
          showsTimecodes={false}
        />
      </View>

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

      {/* Zone tactile globale pour passer en touchant l'écran */}
      <Pressable
        style={styles.fullScreenTouchArea}
        onPress={handleFinish}
      />
    </Animated.View>
  );
}

export default function VideoIntro({ onFinish }: VideoIntroProps) {
  return (
    <VideoErrorBoundary fallback={<AutomotiveSplash onFinish={onFinish} />}>
      <VideoPlayerComponent onFinish={onFinish} />
    </VideoErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C3CE1',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C3CE1',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6C3CE1',
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  skipButtonPressed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#6C3CE1',
  },
  skipButtonText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  skipButtonChevron: {
    color: '#6C3CE1',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -2,
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
