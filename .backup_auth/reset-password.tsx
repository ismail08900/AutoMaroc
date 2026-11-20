import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { updatePassword } from '../../services/authService';

export default function ResetPasswordScreen() {
  const localParams = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleRecoveryLink = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        let code = localParams.code as string | undefined;

        if (!code && initialUrl) {
          const parsed = Linking.parse(initialUrl);
          if (parsed.queryParams?.code) {
            code = String(parsed.queryParams.code);
          }
        }

        // 1. Si code PKCE est présent
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.warn('Code exchange warning:', error.message);
        }

        // 2. Si hash fragment (#access_token=...&refresh_token=...) est présent
        if (initialUrl && initialUrl.includes('#')) {
          const hash = initialUrl.split('#')[1];
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }

        // 3. Vérifier si une session est active
        const { data } = await supabase.auth.getSession();
        if (!data.session && !code) {
          // Si aucune session n'est détectée, avertir mais laisser l'utilisateur essayer
          console.log('Session non trouvée pour la réinitialisation');
        }
      } catch (err: any) {
        console.warn('Erreur lien de récupération:', err.message);
      } finally {
        if (isMounted) {
          setVerifyingSession(false);
        }
      }
    };

    handleRecoveryLink();

    // Écouter les changements d'état Auth Supabase (ex: PASSWORD_RECOVERY)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          if (isMounted) setVerifyingSession(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(newPassword);

      Alert.alert(
        'Succès',
        'Votre mot de passe a été mis à jour avec succès. Veuillez vous connecter.'
      );
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la mise à jour.');
    } finally {
      setLoading(false);
    }
  };

  if (verifyingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#176B52" />
        <Text style={styles.loadingText}>Vérification du lien de récupération...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>AutoMaroc</Text>
          <Text style={styles.subtitle}>Nouveau mot de passe</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Réinitialisation</Text>
          <Text style={styles.description}>
            Entrez votre nouveau mot de passe sécurisé.
          </Text>

          <Text style={styles.label}>Nouveau mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Nouveau mot de passe"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirmez votre nouveau mot de passe"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Pressable
            style={[styles.mainButton, loading && styles.disabledButton]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Enregistrer le mot de passe</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.replace('/')}
            disabled={loading}
          >
            <Text style={styles.cancelText}>Retour à la connexion</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#334155',
    fontWeight: '600',
    fontSize: 15,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#176B52',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 8,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 18,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#172B4D',
  },
  description: {
    color: '#64748B',
    marginTop: 8,
    marginBottom: 25,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DCE3EA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    fontSize: 15,
    backgroundColor: '#FAFCFE',
    color: '#1E293B',
  },
  mainButton: {
    backgroundColor: '#176B52',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '600',
  },
});
