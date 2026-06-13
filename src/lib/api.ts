import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

export interface Post {
  id: string;
  user_id: string;
  ghost_tag: string;
  tag: string | null;
  content: string;
  created_at: string;
  expires_at: string;
  edited_at: string | null;
  like_count: number;
  not_alone_count: number;
  pending?: boolean;
  failed?: boolean;
  justExpired?: boolean;
}

export interface NotificationPreferences {
  likes: boolean;
  handshakes: boolean;
  announcements: boolean;
}

export const PAGE_SIZE = 20;

export async function registerPushToken() {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, push_token: token, platform: Platform.OS },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('savePushToken: upsert error', error);
    }
  } catch (e) {
    console.error('registerForPushNotifications: error', e);
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();
  return data?.notification_preferences ?? { likes: true, handshakes: true, announcements: true };
}

export async function updateNotificationPreferences(userId: string, prefs: NotificationPreferences) {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: prefs })
    .eq('id', userId);
  if (error) console.error('updateNotificationPreferences: error', error);
}

export async function createPost(content: string, ghostTag: string, tag: string | null) {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
    method: 'POST',
    headers: { ...await getAuthHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      content,
      ghost_tag: ghostTag,
      tag,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }),
  });
  if (!res.ok) throw new Error('Failed to create post');
  const [post] = await res.json();
  return post as Post;
}

export async function deletePost(postId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}`,
    { method: 'DELETE', headers },
  );
  if (!res.ok) throw new Error('Failed to delete post');
}

export async function updatePost(postId: string, content: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ content, edited_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) throw new Error('Failed to update post');
  const json = await res.json();
  if (!json.length) throw new Error('Not authorised or post not found');
  return json[0] as Post;
}

export async function fetchPosts(userId?: string | null, offset = 0, showExpired = false) {
  const headers = await getAuthHeaders();
  const expiryFilter = showExpired ? '' : `&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?select=*${expiryFilter}&hidden=eq.false&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`,
    { headers },
  );
  if (!res.ok) throw new Error('Failed to fetch posts');
  const posts: Post[] = await res.json();

  let likedPostIds: string[] = [];
  let notAlonePostIds: string[] = [];

  if (userId) {
    const [lRes, nRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/likes?select=post_id&user_id=eq.${userId}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/not_alone?select=post_id&user_id=eq.${userId}`, { headers }),
    ]);
    if (lRes.ok) likedPostIds = (await lRes.json()).map((l: any) => l.post_id);
    if (nRes.ok) notAlonePostIds = (await nRes.json()).map((n: any) => n.post_id);
  }

  return { posts, likedPostIds, notAlonePostIds, hasMore: posts.length === PAGE_SIZE };
}

export async function toggleLike(postId: string, liked: boolean) {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const headers = await getAuthHeaders();

  if (liked) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/likes?post_id=eq.${postId}&user_id=eq.${userId}`,
      { method: 'DELETE', headers },
    );
    if (!res.ok) throw new Error(`Unlike failed: ${res.status}`);
  } else {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/likes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId, user_id: userId }),
    });
    if (!res.ok) throw new Error(`Like failed: ${res.status}`);

    fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}&select=user_id,content,ghost_tag`, { headers })
      .then(r => r.json())
      .then(async ([post]) => {
        if (post && post.user_id !== userId) {
          const prefs = await getNotificationPreferences(post.user_id);
          if (!prefs.likes) return;
          const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push', {
            body: {
              user_id: post.user_id,
              type: 'like',
              actor_ghost_tag: post.ghost_tag,
              post_preview: post.content.substring(0, 80),
              post_id: postId,
            },
          });
          if (pushError) {
            console.error('send-push invoke error', pushError);
          } else if (__DEV__ && pushResult?.expoResponses) {
            console.log('Expo push responses:', JSON.stringify(pushResult.expoResponses));
          }
        }
      })
      .catch(e => console.error('fetch post for push error', e));
  }
}

export async function toggleNotAlone(postId: string, reacted: boolean) {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const headers = await getAuthHeaders();

  if (reacted) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/not_alone?post_id=eq.${postId}&user_id=eq.${userId}`,
      { method: 'DELETE', headers },
    );
    if (!res.ok) throw new Error(`NotAlone remove failed: ${res.status}`);
  } else {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/not_alone`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_id: postId, user_id: userId }),
    });
    if (!res.ok) throw new Error(`NotAlone add failed: ${res.status}`);

    fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}&select=user_id,content,ghost_tag`, { headers })
      .then(r => r.json())
      .then(async ([post]) => {
        if (post && post.user_id !== userId) {
          const prefs = await getNotificationPreferences(post.user_id);
          if (!prefs.handshakes) return;
          const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push', {
            body: {
              user_id: post.user_id,
              type: 'handshake',
              actor_ghost_tag: post.ghost_tag,
              post_preview: post.content.substring(0, 80),
              post_id: postId,
            },
          });
          if (pushError) {
            console.error('send-push invoke error', pushError);
          } else if (__DEV__ && pushResult?.expoResponses) {
            console.log('Expo push responses:', JSON.stringify(pushResult.expoResponses));
          }
        }
      })
      .catch(e => console.error('fetch post for push error', e));
  }
}

export async function fetchUserStats(userId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?user_id=eq.${userId}&select=like_count`,
    { headers },
  );
  if (!res.ok) throw new Error('Failed to fetch user stats');
  const posts = await res.json();
  const postCount = posts.length;
  const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
  const resonance = postCount > 0 ? Math.min(Math.round((totalLikes / postCount) * 20), 100) : 0;
  return { postCount, totalLikes, resonance };
}

export async function fetchUserPosts(userId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?user_id=eq.${userId}&select=*&order=created_at.desc&limit=50`,
    { headers },
  );
  if (!res.ok) throw new Error('Failed to fetch user posts');
  return res.json();
}

export async function reportPost(postId: string, reason: string) {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ post_id: postId, user_id: userId, reason }),
  });
  if (!res.ok) throw new Error('Failed to report post');
}

export async function fetchPostById(postId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}&select=*`,
    { headers },
  );
  if (!res.ok) throw new Error('Failed to fetch post');
  const [post] = await res.json();
  return post as Post | null;
}

export async function fetchNotifications(userId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${userId}&order=created_at.desc&limit=50`,
    { headers },
  );
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationRead(notifId: string) {
  const headers = await getAuthHeaders();
  await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${notifId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ read: true }),
  });
}

export async function deleteNotification(notifId: string) {
  const headers = await getAuthHeaders();
  await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${notifId}`, {
    method: 'DELETE',
    headers,
  });
}

export function generateGhostTag(): string {
  const adjectives = ['Void', 'Shadow', 'Ghost', 'Null', 'Dark', 'Echo', 'Zero', 'Phantom'];
  const adjs2 = ['Faceless', 'Nameless', 'Silent', 'Cipher', 'Ghostly', 'Unseen', 'Hidden', 'Lost'];
  const num = Math.floor(Math.random() * 9999);
  const adj = Math.random() > 0.5
    ? adjectives[Math.floor(Math.random() * adjectives.length)]
    : adjs2[Math.floor(Math.random() * adjs2.length)];
  return `@${adj}${num}`;
}

export async function maybeRotateGhostTag(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const createdAt = user.user_metadata?.ghost_tag_created_at as string | undefined;
  if (!createdAt) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('freeze_ghost_tag')
    .eq('id', user.id)
    .single();
  if (profile?.freeze_ghost_tag) return;

  const created = new Date(createdAt).getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - created < thirtyDays) return;

  const newTag = generateGhostTag();
  const { error } = await supabase.auth.updateUser({
    data: {
      ghost_tag: newTag,
      ghost_tag_created_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('maybeRotateGhostTag: error', error);
  }
}

export async function fetchIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return !!data?.is_admin;
}

export async function fetchFreezeGhostTag(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('freeze_ghost_tag')
    .eq('id', user.id)
    .single();
  return !!data?.freeze_ghost_tag;
}
export async function markAllNotificationsRead(userId: string) {
  const headers = await getAuthHeaders();
  await fetch(`${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${userId}&read=eq.false`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ read: true }),
  });
}

export async function sendAnnouncement(title: string, body: string): Promise<{ ok: boolean; sent?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke('send-announcement', {
    body: { title, body },
  });
  if (error) return { ok: false, error: error.message };
  return data;
}

export async function fetchBlockedGhosts(userId: string): Promise<{ id: string; blocked_user_id: string; blocked_ghost_tag: string; created_at: string }[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blocked_ghosts?user_id=eq.${userId}&order=created_at.desc`,
    { headers },
  );
  if (!res.ok) throw new Error('Failed to fetch blocked ghosts');
  return res.json();
}

export async function blockGhost(userId: string, blockedUserId: string, ghostTag: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blocked_ghosts`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, blocked_user_id: blockedUserId, blocked_ghost_tag: ghostTag }),
  });
  return res.ok;
}

export async function unblockGhost(blockId: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blocked_ghosts?id=eq.${blockId}`, {
    method: 'DELETE',
    headers,
  });
  return res.ok;
}