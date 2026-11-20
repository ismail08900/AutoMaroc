
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
import { useLocalSearchParams, router } from 'expo-router';

import {
  signIn,
  signUp,
  resetPassword,
  signInWithGoogle,
} from '../services/authService';
import { supabase, clearAuthStorage } from '../lib/supabase';

export default function Index() {
  const params = useLocalSearchParams();
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    if (params.confirmed === 'true') {
      setIsLogin(true);
      return;
    }

    const checkExistingSession = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
          router.replace('/home');
        } else if (error) {
          await supabase.auth.signOut().catch(() => {});
          await clearAuthStorage();
        }
      } catch {
        await clearAuthStorage();
      }
    };
    checkExistingSession();
  }, [params.confirmed]);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  // Connexion avec Email et Password
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      setLoading(true);

      const data = await signIn(email.trim(), password);

      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Inscription
  const handleRegister = async () => {
    if (
      !nom.trim() ||
      !prenom.trim() ||
      !telephone.trim() ||
      !adresse.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Erreur',
        'Le mot de passe doit contenir au moins 6 caractères.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      setLoading(true);

      const data = await signUp(email.trim(), password, {
        nom: nom.trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim(),
        adresse: adresse.trim(),
      });

      if (data.session) {
        router.replace('/home');
      } else {
        Alert.alert(
          'Inscription réussie',
          'Vérifiez votre email pour confirmer votre compte.'
        );
      }
    } catch (error: any) {
      Alert.alert("Erreur d'inscription", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mot de passe oublié
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Erreur',
        'Veuillez saisir votre adresse email.'
      );
      return;
    }

    try {
      setLoading(true);

      await resetPassword(email.trim());

      Alert.alert(
        'Succès',
        'Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.'
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Connexion et Inscription avec Google
  const handleGoogleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);

      await signInWithGoogle();

      if (Platform.OS === 'web') {
        router.replace('/home');
      }
    } catch (error: any) {
      Alert.alert(
        'Erreur Google',
        error.message || 'Une erreur est survenue.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Gestion du formulaire
  const handleSubmit = () => {
    if (loading) return;

    if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  // Champ réutilisable
  const renderInput = (
    label: string,
    placeholder: string,
    value: string,
    onChangeText: (value: string) => void,
    props: any = {}
  ) => (
    <>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </>
  );

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

          <Text style={styles.subtitle}>
            Bienvenue sur AutoMaroc
          </Text>
        </View>

        <View style={styles.card}>
          {params.confirmed === 'true' && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>
                ✓ Votre compte a été confirmé avec succès ! Vous pouvez vous connecter.
              </Text>
            </View>
          )}

          <Text style={styles.title}>
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </Text>

          <Text style={styles.description}>
            {isLogin
              ? 'Connectez-vous à votre compte'
              : 'Inscrivez-vous pour commencer'}
          </Text>

          {!isLogin && (
            <>
              {renderInput(
                'Nom',
                'Votre nom',
                nom,
                setNom
              )}

              {renderInput(
                'Prénom',
                'Votre prénom',
                prenom,
                setPrenom
              )}

              {renderInput(
                'Téléphone',
                '06XXXXXXXX',
                telephone,
                setTelephone,
                { keyboardType: 'phone-pad' }
              )}

              {renderInput(
                'Adresse',
                'Votre adresse',
                adresse,
                setAdresse
              )}
            </>
          )}

          {renderInput(
            'Email',
            'exemple@email.com',
            email,
            setEmail,
            {
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              autoCorrect: false,
            }
          )}

          {renderInput(
            'Mot de passe',
            'Votre mot de passe',
            password,
            setPassword,
            { secureTextEntry: true }
          )}

          {isLogin && (
            <Pressable
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>
                Mot de passe oublié ?
              </Text>
            </Pressable>
          )}

          {!isLogin &&
            renderInput(
              'Confirmer le mot de passe',
              'Confirmez votre mot de passe',
              confirmPassword,
              setConfirmPassword,
              { secureTextEntry: true }
            )}

          <Pressable
            style={[
              styles.mainButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Se connecter' : "S'inscrire"}
              </Text>
            )}
          </Pressable>

          <View style={styles.separator}>
            <View style={styles.line} />

            <Text style={styles.or}>OU</Text>

            <View style={styles.line} />
          </View>

          <Pressable
            style={[
              styles.googleButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#176B52" />
            ) : (
              <Text style={styles.googleText}>
                {isLogin ? 'Continuer avec Google' : "S'inscrire avec Google"}
              </Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isLogin
                ? "Vous n'avez pas de compte ? "
                : 'Vous avez déjà un compte ? '}
            </Text>

            <Pressable
              disabled={loading}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.link}>
                {isLogin ? "S'inscrire" : 'Se connecter'}
              </Text>
            </Pressable>
          </View>
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

  successBanner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },

  successBannerText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  title: {
    fontSize: 25,
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

  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 20,
  },

  forgotPasswordText: {
    color: '#176B52',
    fontWeight: '600',
    fontSize: 14,
  },

  mainButton: {
    backgroundColor: '#176B52',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  or: {
    marginHorizontal: 12,
    color: '#94A3B8',
  },

  googleButton: {
    borderWidth: 1,
    borderColor: '#DCE3EA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },

  googleText: {
    fontWeight: '600',
    color: '#334155',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    flexWrap: 'wrap',
  },

  footerText: {
    color: '#64748B',
  },

  link: {
    color: '#176B52',
    fontWeight: 'bold',
  },
});
