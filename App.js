import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import PostScreen from './src/screens/PostScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SplashScreen from './src/screens/SplashScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { setupPushNotifications } from './src/lib/push-notifications';
import { maybeRotateGhostTag } from './src/lib/api';
import { supabase } from './src/lib/supabase';

export default function App() {
  const [screen, setScreen] = useState('splash');
  const [prevScreen, setPrevScreen] = useState('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusPostId, setFocusPostId] = useState(null);

  function parseRecoveryUrl(url) {
    const hash = url.split('#')[1];
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    if (params.get('type') !== 'recovery') return null;
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  }

  async function handleRecoveryUrl(url) {
    const tokens = parseRecoveryUrl(url);
    if (!tokens) return;
    const { error } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (!error) {
      setScreen('reset-password');
    }
  }

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleRecoveryUrl(url);
    });

    const linkListener = Linking.addEventListener('url', ({ url }) => {
      handleRecoveryUrl(url);
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setupPushNotifications(user.id);
        maybeRotateGhostTag();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setupPushNotifications(session.user.id);
        maybeRotateGhostTag();
      } else {
        Notifications.dismissAllNotificationsAsync();
        Notifications.setBadgeCountAsync(0);
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(async response => {
      const data = response.notification.request.content.data;
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data?.screen === 'notifications') {
        setScreen('notifications');
      }
    });

    return () => {
      subscription.unsubscribe();
      responseListener.remove();
      linkListener.remove();
    };
  }, []);

  function handleLoggedIn() {
    setScreen('home');
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {screen === 'splash' && (
            <SplashScreen onComplete={async () => {
              const done = await AsyncStorage.getItem('@onboarding_complete');
              setScreen(done === 'true' ? 'login' : 'onboarding');
            }} />
          )}
          {screen === 'onboarding' && (
            <>
              <StatusBar style="light" />
              <OnboardingScreen onComplete={async () => {
                await AsyncStorage.setItem('@onboarding_complete', 'true');
                setScreen('login');
              }} />
            </>
          )}
          {screen === 'login' && (
            <>
              <StatusBar style="light" />
              <LoginScreen
                onLogin={handleLoggedIn}
                onRegister={() => setScreen('register')}
                onForgotPassword={() => setScreen('forgot-password')}
              />
            </>
          )}
          {screen === 'forgot-password' && (
            <>
              <StatusBar style="light" />
              <ForgotPasswordScreen onBack={() => setScreen('login')} />
            </>
          )}
          {screen === 'reset-password' && (
            <>
              <StatusBar style="light" />
              <ResetPasswordScreen onDone={() => setScreen('login')} />
            </>
          )}
          {screen === 'register' && (
            <>
              <StatusBar style="light" />
              <RegisterScreen
                onRegister={handleLoggedIn}
                onLogin={() => setScreen('login')}
              />
            </>
          )}
          {screen === 'home' && (
            <>
              <StatusBar style="light" />
              <HomeScreen
                refreshKey={refreshKey}
                focusPostId={focusPostId}
                onFocusHandled={() => setFocusPostId(null)}
                onNavigateToPost={() => { setPrevScreen('home'); setScreen('post'); }}
                onNavigateToNotifications={() => setScreen('notifications')}
                onNavigateToProfile={() => setScreen('profile')}
                onNavigateToSettings={() => setScreen('settings')}
              />
            </>
          )}
          {screen === 'profile' && (
            <>
              <ProfileScreen
                onNavigateToHome={() => setScreen('home')}
                onNavigateToPost={() => { setPrevScreen('profile'); setScreen('post'); }}
                onNavigateToNotifications={() => setScreen('notifications')}
                onNavigateToSettings={() => setScreen('settings')}
              />
            </>
          )}
          {screen === 'settings' && (
            <>
              <StatusBar style="light" />
              <SettingsScreen
                onNavigateToHome={() => setScreen('home')}
                onNavigateToPost={() => { setPrevScreen('settings'); setScreen('post'); }}
                onNavigateToNotifications={() => setScreen('notifications')}
                onNavigateToProfile={() => { setPrevScreen('settings'); setScreen('profile'); }}
                onNavigateToLogin={() => setScreen('login')}
              />
            </>
          )}
          {screen === 'notifications' && (
            <>
              <StatusBar style="light" />
              <NotificationsScreen
                onNavigateToHome={() => setScreen('home')}
                onNavigateToPost={(postId) => {
                  if (postId) {
                    setFocusPostId(postId);
                    setScreen('home');
                  } else {
                    setPrevScreen('notifications');
                    setScreen('post');
                  }
                }}
                onNavigateToProfile={() => { setPrevScreen('notifications'); setScreen('profile'); }}
                onNavigateToSettings={() => { setPrevScreen('notifications'); setScreen('settings'); }}
              />
            </>
          )}
          {screen === 'post' && (
            <>
              <StatusBar style="light" />
              <PostScreen
                onBack={() => setScreen(prevScreen)}
                onPostDone={() => {
                  setRefreshKey(k => k + 1);
                  setScreen(prevScreen);
                }}
                onNavigateToProfile={() => { setPrevScreen('post'); setScreen('profile'); }}
                onNavigateToNotifications={() => { setPrevScreen('post'); setScreen('notifications'); }}
                onNavigateToSettings={() => { setPrevScreen('post'); setScreen('settings'); }}
              />
            </>
          )}
        </AuthProvider>
      </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}