import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

interface AutomotiveSplashProps {
  onFinish: () => void;
}

export default function AutomotiveSplash({ onFinish }: AutomotiveSplashProps) {
  // Valeurs animées stables créées via useState paresseux (compatible React 19 et ESLint)
  const [carOpacity] = useState(() => new Animated.Value(0));
  const [carScale] = useState(() => new Animated.Value(0.9));
  const [headlightsGlow] = useState(() => new Animated.Value(0));
  const [beamsOpacity] = useState(() => new Animated.Value(0));
  const [beamsScale] = useState(() => new Animated.Value(0.2));
  const [textOpacity] = useState(() => new Animated.Value(0));
  const [textTranslateY] = useState(() => new Animated.Value(20));
  const [splashOpacity] = useState(() => new Animated.Value(1));
  const hasFinished = useRef(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const finish = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onFinishRef.current();
    });
  }, [splashOpacity]);

  useEffect(() => {
    // Séquence d'animation automobile haut de gamme
    const animation = Animated.sequence([
      // 1. Apparition progressive de la silhouette dans l'obscurité (0 à 500ms)
      Animated.parallel([
        Animated.timing(carOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(carScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 2. Allumage LED pulsé des phares (effet allumage feux de jour xénon/LED)
      Animated.sequence([
        Animated.timing(headlightsGlow, {
          toValue: 0.4,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(headlightsGlow, {
          toValue: 0.15,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(headlightsGlow, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),

      // 3. Projection des faisceaux lumineux + montée en puissance du logo AutoMaroc
      Animated.parallel([
        Animated.timing(beamsOpacity, {
          toValue: 0.85,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(beamsScale, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 4. Moment de pause pour apprécier le visuel (400ms)
      Animated.delay(450),

      // 5. Fondu de sortie fluide vers l'application
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      if (!hasFinished.current) {
        hasFinished.current = true;
        onFinishRef.current();
      }
    });

    // Sécurité : ne jamais bloquer l'utilisateur plus de 3.2 secondes
    const safetyTimer = setTimeout(() => {
      finish();
    }, 3200);

    return () => {
      clearTimeout(safetyTimer);
      animation.stop();
    };
  }, [
    beamsOpacity,
    beamsScale,
    carOpacity,
    carScale,
    finish,
    headlightsGlow,
    splashOpacity,
    textOpacity,
    textTranslateY,
  ]);

  return (
    <Animated.View style={[styles.container, { opacity: splashOpacity }]}>
      <StatusBar style="light" />

      {/* Clic n'importe où pour passer instantanément */}
      <Pressable style={styles.touchableArea} onPress={finish}>
        <View style={styles.centerContent}>
          {/* Ligne d'horizon / Ambiance nocturne */}
          <View style={styles.horizonGlow} />

          {/* Silhouette de la voiture de face */}
          <Animated.View
            style={[
              styles.carWrapper,
              {
                opacity: carOpacity,
                transform: [{ scale: carScale }],
              },
            ]}
          >
            {/* Toit et Pare-brise aérodynamique */}
            <View style={styles.windshieldOuter}>
              <View style={styles.windshieldGlass}>
                {/* Reflet lumineux sur le pare-brise */}
                <View style={styles.windshieldReflection} />
              </View>
            </View>

            {/* Rétroviseurs aérodynamiques */}
            <View style={styles.mirrorLeft} />
            <View style={styles.mirrorRight} />

            {/* Carrosserie principale / Capot musclé */}
            <View style={styles.carBody}>
              {/* Lignes de force du capot */}
              <View style={styles.hoodLineLeft} />
              <View style={styles.hoodLineRight} />

              {/* Emblème calandre */}
              <View style={styles.grilleBadge}>
                <View style={styles.badgeCore} />
              </View>

              {/* Phare LED Gauche */}
              <View style={styles.headlightHousingLeft}>
                {/* Bande LED DRL supérieure */}
                <Animated.View
                  style={[
                    styles.drlStripLeft,
                    {
                      opacity: headlightsGlow,
                      shadowOpacity: headlightsGlow,
                    },
                  ]}
                />
                {/* Projecteur central LED */}
                <Animated.View
                  style={[
                    styles.lensLed,
                    {
                      opacity: headlightsGlow,
                      transform: [{ scale: headlightsGlow }],
                    },
                  ]}
                />
                {/* Halo lumineux externe */}
                <Animated.View
                  style={[
                    styles.headlightAura,
                    {
                      opacity: headlightsGlow,
                      transform: [{ scale: headlightsGlow }],
                    },
                  ]}
                />
              </View>

              {/* Phare LED Droit */}
              <View style={styles.headlightHousingRight}>
                {/* Bande LED DRL supérieure */}
                <Animated.View
                  style={[
                    styles.drlStripRight,
                    {
                      opacity: headlightsGlow,
                      shadowOpacity: headlightsGlow,
                    },
                  ]}
                />
                {/* Projecteur central LED */}
                <Animated.View
                  style={[
                    styles.lensLed,
                    {
                      opacity: headlightsGlow,
                      transform: [{ scale: headlightsGlow }],
                    },
                  ]}
                />
                {/* Halo lumineux externe */}
                <Animated.View
                  style={[
                    styles.headlightAura,
                    {
                      opacity: headlightsGlow,
                      transform: [{ scale: headlightsGlow }],
                    },
                  ]}
                />
              </View>

              {/* Calandre sportive inférieure & Lame avant */}
              <View style={styles.lowerGrille} />
              <View style={styles.frontSplitter} />
            </View>

            {/* Faisceaux lumineux projetés vers l'avant */}
            <Animated.View
              style={[
                styles.lightBeamLeft,
                {
                  opacity: beamsOpacity,
                  transform: [{ scaleY: beamsScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.lightBeamRight,
                {
                  opacity: beamsOpacity,
                  transform: [{ scaleY: beamsScale }],
                },
              ]}
            />
          </Animated.View>

          {/* Logo et Typographie AutoMaroc */}
          <Animated.View
            style={[
              styles.brandingContainer,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <View style={styles.logoRow}>
              <View style={styles.brandAccentLine} />
              <Text style={styles.brandTitle}>AUTOMAROC</Text>
              <View style={styles.brandAccentLine} />
            </View>
            <Text style={styles.brandSubtitle}>L&apos;EXCELLENCE AUTOMOBILE</Text>
          </Animated.View>
        </View>

        {/* Indication discrète pour passer */}
        <Text style={styles.skipHint}>Appuyez pour passer</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#070A10',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 380,
  },

  // Halo d'horizon
  horizonGlow: {
    position: 'absolute',
    top: 130,
    width: width * 0.85,
    height: 1,
    backgroundColor: '#1E293B',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },

  // Conteneur de la voiture
  carWrapper: {
    width: 280,
    height: 170,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  // Pare-brise et toit
  windshieldOuter: {
    width: 140,
    height: 52,
    backgroundColor: '#0E1726',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
  },
  windshieldGlass: {
    width: 120,
    height: 44,
    marginTop: 4,
    backgroundColor: '#0A101D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  windshieldReflection: {
    width: 30,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '32deg' }, { translateX: 20 }],
  },

  // Rétroviseurs
  mirrorLeft: {
    position: 'absolute',
    top: 42,
    left: 54,
    width: 16,
    height: 7,
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: '#475569',
  },
  mirrorRight: {
    position: 'absolute',
    top: 42,
    right: 54,
    width: 16,
    height: 7,
    backgroundColor: '#1E293B',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 1,
    borderColor: '#475569',
  },

  // Corps du véhicule
  carBody: {
    width: 250,
    height: 64,
    backgroundColor: '#111827',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    marginTop: -2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  hoodLineLeft: {
    position: 'absolute',
    top: 4,
    left: 82,
    width: 1.5,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '12deg' }],
  },
  hoodLineRight: {
    position: 'absolute',
    top: 4,
    right: 82,
    width: 1.5,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '-12deg' }],
  },
  grilleBadge: {
    position: 'absolute',
    top: 14,
    left: 114,
    width: 22,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  badgeCore: {
    width: 10,
    height: 4,
    backgroundColor: '#10B981',
    borderRadius: 1,
  },

  // Logements des phares
  headlightHousingLeft: {
    position: 'absolute',
    top: 10,
    left: 12,
    width: 44,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headlightHousingRight: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 44,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // DRL Strips (LED Signature)
  drlStripLeft: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 38,
    height: 3.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 8,
  },
  drlStripRight: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 38,
    height: 3.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transform: [{ rotate: '6deg' }],
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 8,
  },

  // Lentille LED interne
  lensLed: {
    width: 10,
    height: 8,
    backgroundColor: '#E0F2FE',
    borderRadius: 4,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  headlightAura: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },

  // Calandre basse et spoiler
  lowerGrille: {
    position: 'absolute',
    bottom: 6,
    left: 60,
    right: 60,
    height: 12,
    backgroundColor: '#090D16',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  frontSplitter: {
    position: 'absolute',
    bottom: 0,
    left: 25,
    right: 25,
    height: 3,
    backgroundColor: '#10B981',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  // Faisceaux lumineux projetés au sol
  lightBeamLeft: {
    position: 'absolute',
    top: 86,
    left: 20,
    width: 80,
    height: 95,
    backgroundColor: 'rgba(224, 242, 254, 0.08)',
    transform: [{ skewX: '22deg' }],
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 20,
  },
  lightBeamRight: {
    position: 'absolute',
    top: 86,
    right: 20,
    width: 80,
    height: 95,
    backgroundColor: 'rgba(224, 242, 254, 0.08)',
    transform: [{ skewX: '-22deg' }],
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 20,
  },

  // Branding
  brandingContainer: {
    marginTop: 35,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandAccentLine: {
    width: 28,
    height: 2,
    backgroundColor: '#10B981',
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 7,
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '600',
    marginTop: 6,
  },

  // Bouton passer
  skipHint: {
    position: 'absolute',
    bottom: 40,
    color: '#475569',
    fontSize: 12,
    letterSpacing: 1,
  },
});
