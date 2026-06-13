import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/config';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
  deleteAccount: async () => null,
  resetPassword: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(async () => {
      console.error('AuthProvider: invalid session, clearing storage');
      await AsyncStorage.removeItem('supabase.auth.token');
      await supabase.auth.signOut();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    return error?.message ?? null;
  };

  const signOut = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      const token = data?.session?.access_token;
      if (userId && token) {
        await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.error('signOut: error removing push token', e);
    }

    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'murkd://reset-password',
      });
      return error?.message ?? null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
    }
  };

  const deleteAccount = async (): Promise<string | null> => {
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      await AsyncStorage.clear();
      await supabase.auth.signOut();
      return null;
    } catch {
      await supabase.auth.signOut();
      return 'Something went wrong deleting your account.';
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut, deleteAccount, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);