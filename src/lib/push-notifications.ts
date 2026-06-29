import { supabase } from './supabase';

export async function setupNotificationHandler() {
  const mod = await import('expo-notifications');
  const Notifications = mod.default || mod;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Device = require('expo-device');
  if (!Device.isDevice) return null;

  const mod = await import('expo-notifications');
  const Notifications = mod.default || mod;
  const { Platform } = require('react-native');

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    const Constants = require('expo-constants');
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    return expoPushToken.data;
  } catch (e) {
    console.error('registerForPushNotifications: error getting token', e);
    return null;
  }
}

export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);
  } catch (e) {
    console.error('clearPushToken: error', e);
  }
}

export async function savePushToken(token: string): Promise<boolean> {
  try {
    const { Platform } = require('react-native');
    const { error } = await supabase.rpc('upsert_push_token', {
      p_push_token: token,
      p_platform: Platform.OS,
    });
    if (error) {
      console.error('savePushToken: upsert error', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('savePushToken: error', e);
    return false;
  }
}

export async function setupPushNotifications(): Promise<boolean> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return false;
  const saved = await savePushToken(token);
  return saved;
}
