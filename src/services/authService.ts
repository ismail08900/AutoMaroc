import { supabase, clearAuthStorage } from '../lib/supabase';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

/**
 * Construit dynamiquement l'URL de redirection d'authentification adaptée à chaque environnement :
 * - Web : http(s)://origin/path
 * - Expo Go (Android/iOS) : exp://<hostUri>/--/path (détecté dynamiquement sans IP codée en dur)
 * - Development Build / Standalone : automaroc://path
 */
export const getAuthRedirectUri = (path: string = 'auth/callback'): string => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/${path}`;
    }
    return Linking.createURL(path);
  }

  // Détection Expo Go (StoreClient)
  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (isExpoGo) {
    const expoGoUrl = Linking.createURL(path);
    console.log('[Auth] Expo Go Redirect URI générée:', expoGoUrl);
    return expoGoUrl;
  }

  // Development Build ou Standalone Android/iOS avec le scheme configuré
  const nativeUrl = Linking.createURL(path, { scheme: 'automaroc' });
  console.log('[Auth] Native Redirect URI générée:', nativeUrl);
  return nativeUrl;
};

/**
 * Découpe les paramètres d'une URL de retour OAuth qu'ils soient passés
 * sous forme de SearchParams (?code=...&error=...) ou de Hash fragment (#access_token=...).
 */
export const parseAuthUrlParams = (url: string): Record<string, string> => {
  const params: Record<string, string> = {};

  try {
    // 1. Paramètres de requête (?...)
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = url.slice(queryIndex + 1).split('#')[0];
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((val, key) => {
        params[key] = val;
      });
    }

    // 2. Fragment de hachage (#...)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashString = url.slice(hashIndex + 1);
      const hashParams = new URLSearchParams(hashString);
      hashParams.forEach((val, key) => {
        if (!params[key]) {
          params[key] = val;
        }
      });
    }
  } catch (err) {
    console.warn('[Auth] Erreur lors de l’analyse de l’URL:', err);
  }

  return params;
};

// Map de déduplication des échanges de code PKCE
const codeExchanges = new Map<string, Promise<{ session: any }>>();

/**
 * Échange un code d'autorisation PKCE contre une session Supabase de manière unique et sécurisée.
 */
export const exchangeCodeOnce = (code: string): Promise<{ session: any }> => {
  const existing = codeExchanges.get(code);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // Si le code a déjà été échangé par un autre gestionnaire, vérifier si la session existe
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          return { session: sessionData.session };
        }
        throw error;
      }
      return { session: data.session };
    } finally {
      // Nettoyage après 10s pour libérer la mémoire
      setTimeout(() => {
        codeExchanges.delete(code);
      }, 10000);
    }
  })();

  codeExchanges.set(code, promise);
  return promise;
};

/**
 * Traite une URL de callback (PKCE code ou jetons implicites) et met à jour la session Supabase.
 */
export const handleOAuthUrl = async (url: string) => {
  const params = parseAuthUrlParams(url);

  if (params.error) {
    const errorDesc = params.error_description || params.error;
    throw new Error(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
  }

  if (params.code) {
    const result = await exchangeCodeOnce(params.code);
    return result;
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return { session: data.session };
  }

  // Si aucun paramètre explicite, vérifier la session actuelle
  const { data: sessionData } = await supabase.auth.getSession();
  return { session: sessionData.session };
};

// Inscription avec Email et Mot de passe
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

// Connexion Email / Mot de passe
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
};

// Déconnexion complète
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  await clearAuthStorage();

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

// Connexion et Inscription Google OAuth
export const signInWithGoogle = async (): Promise<{
  type: 'success' | 'cancel';
  session?: any;
}> => {
  const redirectTo = getAuthRedirectUri('auth/callback');

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) throw error;
    return { type: 'success' };
  }

  // Sur plateforme native (Android / iOS)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data?.url) {
    throw new Error("Impossible d'obtenir l'URL d'authentification Google.");
  }

  if (Platform.OS === 'android') {
    await WebBrowser.warmUpAsync().catch(() => {});
  }

  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success' && result.url) {
      // Échange immédiat du code ou enregistrement de la session reçu via le redirect URL intercepté
      const authResult = await handleOAuthUrl(result.url);
      return { type: 'success', session: authResult?.session };
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { type: 'cancel' };
    }

    // Si le résultat est 'success' sans url directe (ex. intent géré par le système),
    // vérifier si la session a été initialisée en parallèle
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      return { type: 'success', session: sessionData.session };
    }

    return { type: 'cancel' };
  } finally {
    if (Platform.OS === 'android') {
      await WebBrowser.coolDownAsync().catch(() => {});
    }
  }
};
