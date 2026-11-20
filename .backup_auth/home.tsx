import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { signOut } from '../services/authService';

export default function HomeScreen() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          await supabase.auth.signOut();
          router.replace('/');
          return;
        }

        setUserEmail(data.user.email || null);
        const name =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.nom ||
          data.user.user_metadata?.prenom
            ? `${data.user.user_metadata?.prenom || ''} ${data.user.user_metadata?.nom || ''}`.trim()
            : null;
        setUserName(name || data.user.user_metadata?.name || null);
      } catch (err) {
        await supabase.auth.signOut();
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de se déconnecter.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#176B52" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>AutoMaroc</Text>
        <Text style={styles.welcomeText}>Bienvenue sur votre espace !</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(userName || userEmail || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>

        {userName && <Text style={styles.name}>{userName}</Text>}
        <Text style={styles.email}>{userEmail}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✓ Compte vérifié et connecté</Text>
        </View>

        <Pressable
          style={[styles.logoutButton, loggingOut && styles.disabledButton]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FA',
    justifyContent: 'center',
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
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
  welcomeText: {
    color: '#64748B',
    marginTop: 8,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#176B52',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#172B4D',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 16,
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 30,
  },
  statusText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
