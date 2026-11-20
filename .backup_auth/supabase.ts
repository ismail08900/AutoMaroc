
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const isServer = Platform.OS === 'web' && typeof window === 'undefined';

// React Native can expose crypto.getRandomValues without crypto.subtle. Supabase
// then downgrades PKCE to "plain". Supply its required SHA-256 digest from Expo
// Crypto before any authentication flow starts; browsers keep native WebCrypto.
const installNativeCryptoSupport = () => {
  if (Platform.OS === 'web') return;

  const existingCrypto = globalThis.crypto;
  const runtimeCrypto = (existingCrypto ?? {}) as Crypto;

  if (typeof runtimeCrypto.getRandomValues !== 'function') {
    Object.defineProperty(runtimeCrypto, 'getRandomValues', {
      configurable: true,
      value: <T extends ArrayBufferView>(array: T): T => {
        const randomBytes = ExpoCrypto.getRandomBytes(array.byteLength);
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(randomBytes);
        return array;
      },
    });
  }

  if (!runtimeCrypto.subtle) {
    Object.defineProperty(runtimeCrypto, 'subtle', {
      configurable: true,
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
  }

  if (!existingCrypto) {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: runtimeCrypto,
    });
  }
};

installNativeCryptoSupport();

const safeStorage = {
  getItem: (key: string) => {
    if (isServer) return null;
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (isServer) return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (isServer) return;
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
    for (const key of authKeys) {
      await AsyncStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('[Supabase] Erreur nettoyage storage:', err);
  }
};

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: safeStorage,
      flowType: 'pkce',
      autoRefreshToken: !isServer,
      persistSession: !isServer,
      detectSessionInUrl: false,
    },
  }
);
