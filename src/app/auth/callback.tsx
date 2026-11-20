import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { handleOAuthUrl, parseAuthUrlParams } from '../../services/authService';

const firstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default function AuthCallback() {
  const localParams = useLocalSearchParams();
  const [statusMessage, setStatusMessage] = useState('Connexion en cours...');

  useEffect(() => {
    let isMounted = true;

    const processAuth = async (incomingUrl?: string | null) => {
      try {
        let urlToProcess = incomingUrl;

        if (!urlToProcess) {
          urlToProcess =
            Platform.OS === 'web' && typeof window !== 'undefined'
              ? window.location.href
              : await Linking.getInitialURL();
        }

        // Si aucune URL directe n'est disponible, reconstruire avec localParams
        const codeParam = firstParam(localParams.code);
        const accessTokenParam = firstParam(localParams.access_token);
        const refreshTokenParam = firstParam(localParams.refresh_token);
        const errorParam = firstParam(localParams.error);
        const errorDescriptionParam = firstParam(localParams.error_description);
        const typeParam = firstParam(localParams.type);

        if (!urlToProcess && (codeParam || accessTokenParam || errorParam)) {
          const query = new URLSearchParams();
          if (codeParam) query.append('code', codeParam);
          if (accessTokenParam) query.append('access_token', accessTokenParam);
          if (refreshTokenParam) query.append('refresh_token', refreshTokenParam);
          if (errorParam) query.append('error', errorParam);
          if (errorDescriptionParam) query.append('error_description', errorDescriptionParam);
          if (typeParam) query.append('type', typeParam);

          urlToProcess = `automaroc://auth/callback?${query.toString()}`;
        }

        if (!urlToProcess) {
          // Vérifier si une session active est déjà présente
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            if (isMounted) router.replace('/home');
            return;
          }
          throw new Error('Aucun paramètre d’authentification reçu.');
        }

        const params = parseAuthUrlParams(urlToProcess);
        const type = params.type || typeParam;

        if (type === 'recovery') {
          if (isMounted) {
            router.replace('/auth/reset-password');
          }
          return;
        }

        await handleOAuthUrl(urlToProcess);

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = sessionData.session;
        const isGoogleUser =
          session?.user?.app_metadata?.provider === 'google' ||
          session?.user?.identities?.some((i: any) => i.provider === 'google');

        if (isGoogleUser || (session && type !== 'signup')) {
          if (isMounted) {
            setStatusMessage('Connexion réussie ! Redirection...');
            router.replace('/home');
          }
          return;
        }

        if (type === 'signup') {
          await supabase.auth.signOut();
          if (isMounted) {
            Alert.alert(
              'Compte confirmé',
              'Votre compte a été vérifié avec succès. Vous pouvez maintenant vous connecter.'
            );
            router.replace({ pathname: '/', params: { confirmed: 'true' } });
          }
          return;
        }

        if (isMounted) {
          router.replace(session ? '/home' : '/');
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Impossible de finaliser la connexion.';
          setStatusMessage('La connexion a échoué.');
          Alert.alert('Erreur de connexion', message);
          router.replace('/');
        }
      }
    };

    void processAuth();

    // Écoute les deep links entrants si l'application était déjà en arrière-plan
    const subscription = Linking.addEventListener('url', (event) => {
      void processAuth(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [
    localParams.code,
    localParams.access_token,
    localParams.refresh_token,
    localParams.error,
    localParams.error_description,
    localParams.type,
  ]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#176B52" />
      <Text style={styles.text}>{statusMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    padding: 24,
  },
  text: {
    marginTop: 18,
    fontSize: 18,
    color: '#172B4D',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
});
