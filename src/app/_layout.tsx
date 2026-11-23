import { useEffect, useState, useCallback, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import {
  isBiometricLockEnabled,
  isBiometricAvailable,
} from '../services/biometricService';
import AutomotiveSplash from '../components/AutomotiveSplash';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);
  const targetRouteRef = useRef<'/home' | '/lock' | null>(null);
  const authCheckedRef = useRef(false);

  useEffect(() => {
    // Au démarrage, vérifier session + préférence biométrique en parallèle de l'animation
    (async () => {
      try {
        if (Platform.OS === 'web') {
          authCheckedRef.current = true;
          return;
        }

        const { data } = await supabase.auth.getSession();
        const hasSession = !!data?.session;

        if (hasSession) {
          const bioEnabled = await isBiometricLockEnabled();
          const bioAvailable = await isBiometricAvailable();

          if (bioEnabled && bioAvailable) {
            targetRouteRef.current = '/lock';
          } else {
            targetRouteRef.current = '/home';
          }
        } else {
          targetRouteRef.current = null;
        }
      } catch (err) {
        console.warn('[Layout] Erreur vérification initiale:', err);
        targetRouteRef.current = null;
      } finally {
        authCheckedRef.current = true;
      }
    })();
  }, []);

  const handleSplashFinish = useCallback(async () => {
    // Attendre que la vérification d'authentification soit terminée (avec timeout de sécurité)
    const startTime = Date.now();
    while (!authCheckedRef.current && Date.now() - startTime < 1500) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const target = targetRouteRef.current;
    if (target === '/lock') {
      router.replace('/lock');
    } else if (target === '/home') {
      router.replace('/home');
    }
    // Si target === null, on reste sur l'écran index (connexion)

    setSplashFinished(true);
  }, []);

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="lock"
          options={{
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen name="home" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/reset-password" />
      </Stack>

      {!splashFinished && (
        <AutomotiveSplash onFinish={handleSplashFinish} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
