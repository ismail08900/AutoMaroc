import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import {
  isBiometricLockEnabled,
  isBiometricAvailable,
} from '../services/biometricService';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Au démarrage, vérifier session + préférence biométrique
    (async () => {
      try {
        // On ne fait ce check automatique que sur mobile
        if (Platform.OS === 'web') {
          setReady(true);
          return;
        }

        const { data } = await supabase.auth.getSession();
        const hasSession = !!data?.session;

        if (hasSession) {
          const bioEnabled = await isBiometricLockEnabled();
          const bioAvailable = await isBiometricAvailable();

          if (bioEnabled && bioAvailable) {
            // Session valide + biométrie activée → écran de verrouillage
            router.replace('/lock');
          } else {
            // Session valide, pas de biométrie → accès direct
            router.replace('/home');
          }
        }
        // Pas de session → l'écran index (login) est affiché par défaut
      } catch (err) {
        console.warn('[Layout] Erreur vérification initiale:', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Afficher un splash/loading tant que la vérification n'est pas terminée
  // pour éviter un flash de l'écran de login
  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#176B52" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Empêcher le retour par geste sur l'écran lock
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
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
  },
});
