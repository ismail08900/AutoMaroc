import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { router } from 'expo-router';
import {
  authenticateWithBiometric,
  isBiometricAvailable,
} from '../services/biometricService';
import { supabase } from '../lib/supabase';

export default function LockScreen() {
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricReady, setBiometricReady] = useState(true);

  const triggerAuth = useCallback(async () => {
    if (authenticating) return;

    // Vérifier d'abord si la session Supabase est toujours valide
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      // Session expirée → retour à la page de connexion
      router.replace('/');
      return;
    }

    setAuthenticating(true);
    const result = await authenticateWithBiometric();

    if (result.success) {
      router.replace('/home');
    } else {
      // L'utilisateur a annulé ou l'authentification a échoué
      // On ne redirige pas — on reste sur l'écran de verrouillage
      setAuthenticating(false);
    }
  }, [authenticating]);

  useEffect(() => {
    // Vérifier si la biométrie est toujours disponible
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricReady(available);

      if (!available) {
        // Si la biométrie n'est plus disponible (désactivée dans les paramètres du tel),
        // laisser l'utilisateur accéder à l'app si sa session est valide
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          router.replace('/home');
        } else {
          router.replace('/');
        }
        return;
      }

      // Lancer l'authentification biométrique automatiquement au premier affichage
      triggerAuth();
    })();
  }, [triggerAuth]);

  // Relancer l'authentification biométrique quand l'app revient au premier plan
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active' && biometricReady) {
        triggerAuth();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [biometricReady, triggerAuth]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
      </View>

      <Text style={styles.title}>AutoMaroc</Text>
      <Text style={styles.subtitle}>
        {"Vérification d'identité requise"}
      </Text>

      {authenticating ? (
        <ActivityIndicator
          size="large"
          color="#176B52"
          style={styles.loader}
        />
      ) : (
        <Pressable style={styles.retryButton} onPress={triggerAuth}>
          <Text style={styles.retryText}>
            {biometricReady
              ? "Réessayer l'authentification"
              : 'Biométrie non disponible'}
          </Text>
        </Pressable>
      )}

      <Pressable
        style={styles.logoutLink}
        onPress={() => {
          Alert.alert(
            'Se déconnecter',
            'Voulez-vous vous déconnecter et utiliser un autre compte ?',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Se déconnecter',
                style: 'destructive',
                onPress: async () => {
                  await supabase.auth.signOut();
                  router.replace('/');
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.logoutText}>
          Utiliser un autre compte
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 44,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#176B52',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
  },
  loader: {
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#176B52',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutLink: {
    paddingVertical: 12,
  },
  logoutText: {
    color: '#64748B',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
