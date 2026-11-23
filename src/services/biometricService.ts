import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = '@automaroc_biometric_enabled';

/**
 * Vérifie si le téléphone possède du matériel biométrique (capteur d'empreinte, Face ID…).
 */
export const hasBiometricHardware = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    return await LocalAuthentication.hasHardwareAsync();
  } catch {
    return false;
  }
};

/**
 * Vérifie si l'utilisateur a enregistré au moins une empreinte / visage sur le téléphone.
 */
export const isBiometricEnrolled = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
};

/**
 * Vérifie si la biométrie est disponible ET configurée sur le téléphone.
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const hasHardware = await hasBiometricHardware();
  const isEnrolled = await isBiometricEnrolled();
  return hasHardware && isEnrolled;
};

/**
 * Lit la préférence utilisateur : a-t-il activé le verrouillage biométrique ?
 * Cette valeur persiste entre les redémarrages du téléphone.
 */
export const isBiometricLockEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

/**
 * Active ou désactive le verrouillage biométrique (préférence utilisateur).
 */
export const setBiometricLockEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('[Biometric] Erreur sauvegarde préférence:', err);
  }
};

/**
 * Lance le prompt biométrique natif du téléphone.
 *
 * - `disableDeviceFallback: false` → si la biométrie échoue, Android/iOS proposent
 *   automatiquement le code PIN / schéma / mot de passe du téléphone.
 * - Aucune empreinte n'est stockée dans l'application : seul le résultat OK/KO
 *   est retourné par l'API native.
 */
export const authenticateWithBiometric = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouillez AutoMaroc',
      cancelLabel: 'Annuler',
      fallbackLabel: 'Utiliser le code',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Authentification annulée.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur biométrique.',
    };
  }
};

/**
 * Réinitialise la préférence biométrique (utilisé lors de la déconnexion).
 */
export const clearBiometricPreference = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  } catch {
    // silencieux
  }
};
