import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

// A PKCE authorization code can only be exchanged once. Reuse the same promise
// if the deep link and Expo Router deliver the callback more than once.
const codeExchanges = new Map<string, Promise<void>>();

const exchangeCodeOnce = (code: string) => {
  const existingExchange = codeExchanges.get(code);
  if (existingExchange) return existingExchange;

  const exchange = supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
    if (error) throw error;
  });
  codeExchanges.set(code, exchange);
  return exchange;
};

const firstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default function AuthCallback() {
  const localParams = useLocalSearchParams();
  const codeParam = firstParam(localParams.code);
  const accessTokenParam = firstParam(localParams.access_token);
  const refreshTokenParam = firstParam(localParams.refresh_token);
  const typeParam = firstParam(localParams.type);
  const errorParam = firstParam(localParams.error);
  const errorDescriptionParam = firstParam(localParams.error_description);
  const [statusMessage, setStatusMessage] = useState('Connexion en cours...');

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        let code = codeParam;
        let accessToken = accessTokenParam;
        let refreshToken = refreshTokenParam;
        let type = typeParam;
        let authError = errorParam;
        let authErrorDescription = errorDescriptionParam;

        const callbackUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();

        if (callbackUrl) {
          const parsed = Linking.parse(callbackUrl);
          if (!code && parsed.queryParams?.code) code = String(parsed.queryParams.code);
          if (!accessToken && parsed.queryParams?.access_token) {
            accessToken = String(parsed.queryParams.access_token);
          }
          if (!refreshToken && parsed.queryParams?.refresh_token) {
            refreshToken = String(parsed.queryParams.refresh_token);
          }
          if (!type && parsed.queryParams?.type) type = String(parsed.queryParams.type);
          if (!authError && parsed.queryParams?.error) authError = String(parsed.queryParams.error);
          if (!authErrorDescription && parsed.queryParams?.error_description) {
            authErrorDescription = String(parsed.queryParams.error_description);
          }

          if (callbackUrl.includes('#')) {
            const hashParams = new URLSearchParams(callbackUrl.split('#')[1]);
            if (!code) code = hashParams.get('code') || undefined;
            if (!accessToken) accessToken = hashParams.get('access_token') || undefined;
            if (!refreshToken) refreshToken = hashParams.get('refresh_token') || undefined;
            if (!type) type = hashParams.get('type') || undefined;
            if (!authError) authError = hashParams.get('error') || undefined;
            if (!authErrorDescription) {
              authErrorDescription = hashParams.get('error_description') || undefined;
            }
          }
        }

        if (authError) throw new Error(authErrorDescription || authError);

        // This route is the only place that exchanges an OAuth PKCE code.
        if (code) {
          await exchangeCodeOnce(code);
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = sessionData.session;
        const isGoogleUser = session?.user?.app_metadata?.provider === 'google';

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

        if (isMounted) router.replace(session ? '/home' : '/');
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Impossible de finaliser la connexion.';
          setStatusMessage('La connexion a échoué.');
          Alert.alert('Erreur de connexion', message);
          router.replace('/');
        }
      }
    };

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [
    accessTokenParam,
    codeParam,
    errorDescriptionParam,
    errorParam,
    refreshTokenParam,
    typeParam,
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
