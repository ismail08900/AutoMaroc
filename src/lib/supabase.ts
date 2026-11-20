import 'react-native-url-polyfill/auto';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Supabase] Attention : EXPO_PUBLIC_SUPABASE_URL ou la clé publique Supabase est manquante dans votre environnement (.env).'
  );
}

const isServer = Platform.OS === 'web' && typeof window === 'undefined';

// React Native / Hermes can expose crypto.getRandomValues without crypto.subtle.
// Supabase JS then downgrades PKCE to "plain" which is rejected by Supabase auth.
// We supply SHA-256 digest from ExpoCrypto so PKCE code challenge uses S256.
const installNativeCryptoSupport = () => {
  if (Platform.OS === 'web') return;

  try {
    const existingCrypto = globalThis.crypto;
    const runtimeCrypto = (existingCrypto ?? {}) as Crypto;

    if (typeof runtimeCrypto.getRandomValues !== 'function') {
      try {
        Object.defineProperty(runtimeCrypto, 'getRandomValues', {
          configurable: true,
          value: <T extends ArrayBufferView>(array: T): T => {
            const randomBytes = ExpoCrypto.getRandomBytes(array.byteLength);
            new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(randomBytes);
            return array;
          },
        });
      } catch (e) {
        console.warn('[Supabase] Warning defining getRandomValues:', e);
      }
    }

    if (!runtimeCrypto.subtle) {
      try {
        Object.defineProperty(runtimeCrypto, 'subtle', {
          configurable: true,
          writable: true,
          value: {
            digest: (algorithm: AlgorithmIdentifier, data: BufferSource) => {
              const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
              if (name.toUpperCase().replace(/-/g, '') !== 'SHA256') {
                return Promise.reject(new Error(`Unsupported digest algorithm: ${name}`));
              }
              return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
            },
          },
        });
      } catch (e) {
        console.warn('[Supabase] Warning defining subtle:', e);
      }
    }

    if (!existingCrypto) {
      try {
        Object.defineProperty(globalThis, 'crypto', {
          configurable: true,
          writable: true,
          value: runtimeCrypto,
        });
      } catch (e) {
        console.warn('[Supabase] Warning defining globalThis.crypto:', e);
      }
    }
  } catch (err) {
    console.warn('[Supabase] Erreur installation support crypto natif:', err);
  }
};

installNativeCryptoSupport();

const safeStorage = {
  getItem: (key: string) => {
    if (isServer) return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (isServer) return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (isServer) return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

export const clearAuthStorage = async () => {
  if (isServer) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(
      (k) => k.startsWith('sb-') || k.includes('auth-token')
    );
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }
  } catch (err) {
    console.warn('[Supabase] Erreur nettoyage storage:', err);
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: safeStorage,
    flowType: 'pkce',
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

// Refresh tokens automatically when the mobile app enters foreground
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
