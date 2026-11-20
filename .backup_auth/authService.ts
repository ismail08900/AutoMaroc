import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

/** Existing redirect helper retained for email confirmation and recovery links. */
export const getAuthRedirectUri = (path: string = 'auth/callback') => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/${path}`;
    }
    return Linking.createURL(path);
  }

  if (__DEV__) {
    const rawHost =
      Constants.expoConfig?.hostUri ||
      Constants.expoGoConfig?.debuggerHost ||
      '192.168.1.13:8082';
    const cleanHost = rawHost.replace(/^[a-zA-Z0-9+.-]+:\/\//, '').replace(/\/$/, '');
    const expoUrl = `exp://${cleanHost}/--/${path}`;
    console.log('[Auth] Expo Go Redirect URI:', expoUrl);
    return expoUrl;
  }

  const nativeUrl = Linking.createURL(path, { scheme: 'automaroc' });
  console.log('[Auth] Native Redirect URI:', nativeUrl);
  return nativeUrl;
};

/** Google-only redirect: Expo Go and native builds use different link schemes. */
const getGoogleRedirectUri = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/auth/callback`;
    }
    return Linking.createURL('auth/callback');
  }

  // appOwnership is deprecated for broad checks, but still distinguishes Expo Go
  // from expo-dev-client (both report StoreClient in SDK 58).
  if (Constants.appOwnership === 'expo') {
    return Linking.createURL('auth/callback');
  }

  return Linking.createURL('auth/callback', { scheme: 'automaroc' });
};

// Inscription avec Email et Password
export const signUp = async (
  email: string,
  password: string,
  profile: {
    nom: string;
    prenom: string;
    telephone: string;
    adresse: string;
  }
) => {
  const redirectUrl = getAuthRedirectUri('auth/callback');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        nom: profile.nom,
        prenom: profile.prenom,
        telephone: profile.telephone,
        adresse: profile.adresse,
      },
    },
  });

  if (error) throw error;

  return data;
};

// Connexion
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
};

// Déconnexion
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
};

// Mot de passe oublié
export const resetPassword = async (email: string) => {
  const redirectTo = getAuthRedirectUri('auth/reset-password');
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw error;

  return data;
};

// Mettre à jour le mot de passe
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;

  return data;
};

// Connexion et Inscription avec Google
export const signInWithGoogle = async () => {
  const redirectTo = getGoogleRedirectUri();

  if (Platform.OS === 'web') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data.url) {
    throw new Error("Impossible d'ouvrir Google.");
  }

  if (Platform.OS === 'android') {
    await WebBrowser.warmUpAsync().catch(() => {});
  }

  try {
    // Expo Router receives this link; callback.tsx performs the PKCE exchange.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      return { type: 'success' as const };
    }

    // Closing the browser is a normal cancellation, not an authentication error.
    return { type: 'cancel' as const };
  } finally {
    if (Platform.OS === 'android') {
      await WebBrowser.coolDownAsync().catch(() => {});
    }
  }
};
