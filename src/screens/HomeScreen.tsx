import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let _Haptics: any;
function getHaptics() {
  if (!_Haptics) _Haptics = require('expo-haptics');
  return _Haptics;
}
let _Clipboard: any;
function getClipboard() {
  if (!_Clipboard) _Clipboard = require('expo-clipboard');
  return _Clipboard;
}

import {
  Delete02Icon, Flag02Icon, Fire02Icon, Clock01Icon, Refresh01Icon,
  WifiOff01Icon, Alert02Icon, HandshakeIcon,
  Sad01Icon, LaughingIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { fetchPosts, fetchPostById, toggleLike, toggleNotAlone, toggleSad, toggleFunny, deletePost, updatePost, reportPost, blockGhost, fetchBlockedGhosts, Post, PAGE_SIZE } from '../lib/api';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/BottomNav';
import { PostSkeleton } from '../components/Skeletons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  refreshKey: number;
  focusPostId?: string | null;
  onFocusHandled?: () => void;
  onNavigateToPost: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToNotifications?: () => void;
}



// ── Swipeable post row ───────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 72;

interface SwipeablePostProps {
  post: Post;
  isOwner: boolean;
  isDeleting: boolean;
  canEdit: boolean;
  liked: boolean;
  notAlone: boolean;
  sad: boolean;
  funny: boolean;
  isFocused: boolean;
  onLike: () => void;
  onNotAlone: () => void;
  onSad: () => void;
  onFunny: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
  onBlock: () => void;
  onCopy: () => void;
  surfaceColor: string;
}

function SwipeablePost({
  post, isOwner, isDeleting, canEdit, liked, notAlone, sad, funny, isFocused, surfaceColor,
  onLike, onNotAlone, onSad, onFunny, onDelete, onEdit, onReport, onBlock, onCopy,
}: SwipeablePostProps) {
  const { colors, theme } = useTheme();
  const revealWidth = isOwner ? (canEdit ? ACTION_WIDTH * 2 : ACTION_WIDTH) : ACTION_WIDTH * 2;
  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const revealWidthRef = useRef(revealWidth);
  revealWidthRef.current = revealWidth;
  const highlightAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.delay(1200),
        Animated.timing(highlightAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    }
  }, [isFocused]);

  const highlightColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [surfaceColor, theme === 'dark' ? '#2A2A2A' : '#D4ECD4'],
  });

  const springTo = (toValue: number) => {
    Animated.spring(translateX, { toValue, useNativeDriver: true, bounciness: 4 })
      .start(() => { currentX.current = toValue; });
  };

  const close = () => { springTo(0); };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => { translateX.stopAnimation(); translateX.setValue(currentX.current); },
      onPanResponderMove: (_, g) => {
        const rw = revealWidthRef.current;
        const next = currentX.current + g.dx;
        translateX.setValue(Math.min(0, Math.max(-rw - 10, next)));
      },
      onPanResponderRelease: (_, g) => {
        const rw = revealWidthRef.current;
        const landed = currentX.current + g.dx;
        if (landed < -SWIPE_THRESHOLD) {
          getHaptics().impactAsync(getHaptics().ImpactFeedbackStyle.Light);
          springTo(-rw);
        } else {
          springTo(0);
        }
      },
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  return (
    <View style={swipeStyles.wrapper}>
      <View style={[swipeStyles.actionContainer, { width: revealWidth }]}>
        {isOwner ? (
          <>
            {canEdit && (
              <TouchableOpacity style={[swipeStyles.actionBtn, swipeStyles.editAction]} onPress={() => { close(); onEdit(); }} activeOpacity={0.8}>
                <Text style={swipeStyles.actionLabel}>EDIT</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[swipeStyles.actionBtn, swipeStyles.deleteAction]} onPress={() => { close(); onDelete(); }} activeOpacity={0.8}>
              {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : (
                <><HugeiconsIcon icon={Delete02Icon} size={18} color="#fff" /><Text style={swipeStyles.actionLabel}>DELETE</Text></>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[swipeStyles.actionBtn, swipeStyles.blockAction]} onPress={() => { close(); onBlock(); }} activeOpacity={0.8}>
              <HugeiconsIcon icon={Alert02Icon} size={18} color="#fff" />
              <Text style={swipeStyles.actionLabel}>BLOCK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[swipeStyles.actionBtn, swipeStyles.reportAction]} onPress={() => { close(); onReport(); }} activeOpacity={0.8}>
              <HugeiconsIcon icon={Flag02Icon} size={18} color="#fff" />
              <Text style={swipeStyles.actionLabel}>REPORT</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Animated.View
        style={[swipeStyles.card, { transform: [{ translateX }], backgroundColor: highlightColor }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.postPadding}>
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postHeaderLeft}>
                <Text style={[styles.postTag, { color: colors.text }]}>{post.ghost_tag?.replace('@', '')}</Text>
                <Text style={[styles.postTime, { color: colors.textMuted }]}>
                  {(() => {
                    const diff = Date.now() - new Date(post.created_at).getTime();
                    const mins = Math.floor(diff / (1000 * 60));
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    if (mins < 1) return 'just now';
                    if (mins < 60) return `${mins}m ago`;
                    return `${hours}h ago`;
                  })()}
                </Text>
                {post.edited_at && <Text style={[styles.editedLabel, { color: colors.textMuted }]}>edited</Text>}
              </View>
              {post.tag && (
                <View style={styles.postHeaderRight}>
                  <Text style={styles.postTagLabel}>{post.tag}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity activeOpacity={1} delayLongPress={400} onLongPress={onCopy} onPress={() => {}}>
              <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>
            </TouchableOpacity>

            <View style={styles.reactionsRow}>
              <TouchableOpacity activeOpacity={0.6} onPress={onLike} style={styles.reactionBtn}>
                <HugeiconsIcon icon={Fire02Icon} size={18} color={liked ? '#E83D3D' : '#8B8B8B'} />
                <Text style={[styles.reactionCount, liked && { color: '#E83D3D' }]}>{post.like_count ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.6} onPress={onNotAlone} style={styles.reactionBtn}>
                <HugeiconsIcon icon={HandshakeIcon} size={18} color={notAlone ? '#2E7D6E' : '#8B8B8B'} />
                <Text style={[styles.reactionCount, notAlone && { color: '#2E7D6E' }]}>{post.not_alone_count ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.6} onPress={onSad} style={styles.reactionBtn}>
                <HugeiconsIcon icon={Sad01Icon} size={18} color={sad ? '#9B59B6' : '#8B8B8B'} />
                <Text style={[styles.reactionCount, sad && { color: '#9B59B6' }]}>{post.sad_count ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.6} onPress={onFunny} style={styles.reactionBtn}>
                <HugeiconsIcon icon={LaughingIcon} size={18} color={funny ? '#E67E22' : '#8B8B8B'} />
                <Text style={[styles.reactionCount, funny && { color: '#E67E22' }]}>{post.funny_count ?? 0}</Text>
              </TouchableOpacity>
              <View style={styles.expiryRow}>
                <HugeiconsIcon icon={Clock01Icon} size={12} color="#8B8B8B" />
                <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                  {(() => {
                    const remaining = new Date(post.expires_at).getTime() - Date.now();
                    if (remaining <= 0) return 'expiring...';
                    const hours = Math.floor(remaining / (1000 * 60 * 60));
                    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    if (hours === 0) return `${mins}m`;
                    return `${hours}h ${mins}m`;
                  })()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  card: {},
  actionContainer: { position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row' },
  editAction: { backgroundColor: '#4A7A6A', flex: 1, height: '100%' },
  deleteAction: { backgroundColor: '#C0392B', flex: 1, height: '100%' },
  blockAction: { backgroundColor: '#A04030', flex: 1, height: '100%' },
  reportAction: { backgroundColor: '#2E4A3E', flex: 1, height: '100%' },
  actionBtn: { justifyContent: 'center', alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 1.5 },
});

const TAGS = ['WORK', 'RELATIONSHIPS', 'FAMILY', 'MENTAL HEALTH', 'MONEY', 'SECRET', 'REGRET', 'OTHER'];
const REPORT_REASONS = ['Spam or fake', 'Harassment or bullying', 'Hate speech', 'Self-harm or suicide', 'Misinformation', 'Other'];

// ── Main component ───────────────────────────────────────────────────────────

export default function HomeScreen({
  refreshKey, focusPostId, onFocusHandled,
  onNavigateToPost, onNavigateToProfile, onNavigateToSettings, onNavigateToNotifications,
}: Props) {
  const { colors, theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const postYPositions = useRef<Record<string, number>>({});
  const userIdRef = useRef<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [notAlonePosts, setNotAlonePosts] = useState<Set<string>>(new Set());
  const [sadPosts, setSadPosts] = useState<Set<string>>(new Set());
  const [funnyPosts, setFunnyPosts] = useState<Set<string>>(new Set());
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingPost, setEditingPost] = useState<{ id: string; content: string } | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data?.session?.user?.id ?? null;
      setUserId(uid);
      userIdRef.current = uid;
      if (uid) fetchBlockedGhosts(uid).then(blocks => setBlockedUserIds(new Set(blocks.map(b => b.blocked_user_id)))).catch(() => {});
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('defaultTag').then(tag => {
      if (tag && tag !== 'ALL') setActiveTag(tag);
    });
  }, []);

  useEffect(() => { loadPosts(); }, [refreshKey, userId]);

  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusPostId) return;
    const thisPostId = focusPostId;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    setActiveTag(null);
    setHighlightedPostId(thisPostId);
    fetchPostById(thisPostId).then(focused => {
      if (focused) {
        setPosts(prev => {
          if (prev.some(p => p.id === focused.id)) return prev;
          return [focused, ...prev];
        });
        const scrollTimer = setTimeout(() => {
          const y = postYPositions.current[thisPostId];
          if (y !== undefined) {
            scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
          }
        }, 800);
        timeouts.push(scrollTimer);
      }
      const clearTimer = setTimeout(() => {
        setHighlightedPostId(null);
        onFocusHandled?.();
      }, 2500);
      timeouts.push(clearTimer);
    }).catch(e => {
      console.error('fetchPostById error:', e);
      setHighlightedPostId(null);
      onFocusHandled?.();
    });
    return () => { timeouts.forEach(clearTimeout); };
  }, [focusPostId]);



  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        if (payload.new?.user_id === userIdRef.current) return;
        setNewPostsCount(prev => prev + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications:' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => setUnreadNotifications(true))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'not_alone' }, () => setUnreadNotifications(true))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sads' }, () => setUnreadNotifications(true))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'funnies' }, () => setUnreadNotifications(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPosts(prev => {
        const hasExpired = prev.some(p => !p.justExpired && !p.pending && new Date(p.expires_at).getTime() <= now);
        if (!hasExpired) return prev;
        return prev.map(p =>
          !p.justExpired && !p.pending && new Date(p.expires_at).getTime() <= now ? { ...p, justExpired: true } : p
        );
      });
      setTimeout(() => { setPosts(prev => prev.filter(p => !p.justExpired)); }, 5000);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function classifyError(e: unknown): 'offline' | 'server' {
    if (typeof e === 'object' && e !== null && 'message' in e) {
      const msg = (e as { message: string }).message ?? '';
      if (msg === 'Network request failed' || msg === 'Failed to fetch') return 'offline';
    }
    return 'server';
  }

  async function loadPosts() {
    setLoading(true);
    setIsOffline(false);
    setServerError(false);
    try {
      const showExpired = (await AsyncStorage.getItem('showExpired')) === 'true';
      const { posts: fetchedPosts, likedPostIds, notAlonePostIds, sadPostIds, funnyPostIds, hasMore: more } = await fetchPosts(userId, 0, showExpired);
      setPosts(fetchedPosts);
      setLikedPosts(new Set(likedPostIds));
      setNotAlonePosts(new Set(notAlonePostIds));
      setSadPosts(new Set(sadPostIds));
      setFunnyPosts(new Set(funnyPostIds));
      setOffset(fetchedPosts.length);
      setHasMore(more);
      setNewPostsCount(0);
    } catch (e) {
      classifyError(e) === 'offline' ? setIsOffline(true) : (setServerError(true), setPosts([]));
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setIsOffline(false);
    setServerError(false);
    try {
      const showExpired = (await AsyncStorage.getItem('showExpired')) === 'true';
      const { posts: fetchedPosts, likedPostIds, notAlonePostIds, sadPostIds, funnyPostIds, hasMore: more } = await fetchPosts(userId, 0, showExpired);
      setPosts(fetchedPosts);
      setLikedPosts(new Set(likedPostIds));
      setNotAlonePosts(new Set(notAlonePostIds));
      setSadPosts(new Set(sadPostIds));
      setFunnyPosts(new Set(funnyPostIds));
      setOffset(fetchedPosts.length);
      setHasMore(more);
      setNewPostsCount(0);
    } catch (e) {
      classifyError(e) === 'offline' ? setIsOffline(true) : setServerError(true);
    } finally {
      setRefreshing(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const showExpired = (await AsyncStorage.getItem('showExpired')) === 'true';
      const { posts: morePosts, likedPostIds, notAlonePostIds, sadPostIds, funnyPostIds, hasMore: more } = await fetchPosts(userId, offset, showExpired);
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        return [...prev, ...morePosts.filter(p => !existingIds.has(p.id))];
      });
      setLikedPosts(prev => new Set([...prev, ...likedPostIds]));
      setNotAlonePosts(prev => new Set([...prev, ...notAlonePostIds]));
      setSadPosts(prev => new Set([...prev, ...sadPostIds]));
      setFunnyPosts(prev => new Set([...prev, ...funnyPostIds]));
      setOffset(prev => prev + morePosts.length);
      setHasMore(more);
    } catch { } finally {
      setLoadingMore(false);
    }
  }

  async function handleLike(postId: string) {
    const liked = likedPosts.has(postId);
    liked ? await getHaptics().selectionAsync() : await getHaptics().impactAsync(getHaptics().ImpactFeedbackStyle.Light);
    setLikedPosts(prev => { const n = new Set(prev); liked ? n.delete(postId) : n.add(postId); return n; });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) + (liked ? -1 : 1)) } : p));
    try {
      await toggleLike(postId, liked);
    } catch {
      setLikedPosts(prev => { const n = new Set(prev); liked ? n.add(postId) : n.delete(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) + (liked ? 1 : -1)) } : p));
    }
  }

  async function handleNotAlone(postId: string) {
    const reacted = notAlonePosts.has(postId);
    reacted ? await getHaptics().selectionAsync() : await getHaptics().impactAsync(getHaptics().ImpactFeedbackStyle.Medium);
    setNotAlonePosts(prev => { const n = new Set(prev); reacted ? n.delete(postId) : n.add(postId); return n; });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, not_alone_count: Math.max(0, (p.not_alone_count ?? 0) + (reacted ? -1 : 1)) } : p));
    try {
      await toggleNotAlone(postId, reacted);
    } catch {
      setNotAlonePosts(prev => { const n = new Set(prev); reacted ? n.add(postId) : n.delete(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, not_alone_count: Math.max(0, (p.not_alone_count ?? 0) + (reacted ? 1 : -1)) } : p));
    }
  }

  async function handleSad(postId: string) {
    const reacted = sadPosts.has(postId);
    reacted ? await getHaptics().selectionAsync() : await getHaptics().impactAsync(getHaptics().ImpactFeedbackStyle.Light);
    setSadPosts(prev => { const n = new Set(prev); reacted ? n.delete(postId) : n.add(postId); return n; });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, sad_count: Math.max(0, (p.sad_count ?? 0) + (reacted ? -1 : 1)) } : p));
    try {
      await toggleSad(postId, reacted);
    } catch {
      setSadPosts(prev => { const n = new Set(prev); reacted ? n.add(postId) : n.delete(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, sad_count: Math.max(0, (p.sad_count ?? 0) + (reacted ? 1 : -1)) } : p));
    }
  }

  async function handleFunny(postId: string) {
    const reacted = funnyPosts.has(postId);
    reacted ? await getHaptics().selectionAsync() : await getHaptics().impactAsync(getHaptics().ImpactFeedbackStyle.Light);
    setFunnyPosts(prev => { const n = new Set(prev); reacted ? n.delete(postId) : n.add(postId); return n; });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, funny_count: Math.max(0, (p.funny_count ?? 0) + (reacted ? -1 : 1)) } : p));
    try {
      await toggleFunny(postId, reacted);
    } catch {
      setFunnyPosts(prev => { const n = new Set(prev); reacted ? n.add(postId) : n.delete(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, funny_count: Math.max(0, (p.funny_count ?? 0) + (reacted ? 1 : -1)) } : p));
    }
  }

  function handleDeletePress(postId: string) {
    Alert.alert('Delete confession', 'This cannot be undone. Your confession will be gone forever.', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'DELETE', style: 'destructive',
        onPress: async () => {
          setDeletingPost(postId);
          setPosts(prev => prev.filter(p => p.id !== postId));
          try { await deletePost(postId); } catch { loadPosts(); } finally { setDeletingPost(null); }
        },
      },
    ], { cancelable: true });
  }

  function handleEdit(post: Post) {
    setEditText(post.content);
    setEditingPost({ id: post.id, content: post.content });
  }

  async function handleSaveEdit() {
    if (!editingPost || !editText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await updatePost(editingPost.id, editText.trim());
      setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, content: updated.content, edited_at: updated.edited_at } : p));
      setEditingPost(null);
    } catch {
      Alert.alert('Error', 'Failed to save edit. Try again.');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleReport(postId: string) {
    Alert.alert('Report confession', 'Why are you reporting this?', [
      ...REPORT_REASONS.map(reason => ({
        text: reason,
        onPress: async () => {
          try { await reportPost(postId, reason); } catch { } finally {
            setReportedPosts(prev => new Set([...prev, postId]));
            Alert.alert('Reported', 'Thanks for flagging this. The confession has been hidden from your feed.', [{ text: 'OK' }]);
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ], { cancelable: true });
  }

  function handleBlock(post: Post) {
    const tag = post.ghost_tag?.replace('@', '');
    Alert.alert('Block @' + tag, 'Posts from this account will no longer appear in your feed. You can manage blocked accounts in Settings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'BLOCK',
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          setBlockedUserIds(prev => new Set([...prev, post.user_id]));
          try { await blockGhost(userId, post.user_id, post.ghost_tag); } catch { /* ignore */ }
        },
      },
    ]);
  }

  function handleNavigateToNotifications() {
    setUnreadNotifications(false);
    onNavigateToNotifications?.();
  }

  const showSkeletons = loading && posts.length === 0;
  const filteredPosts = posts
    .filter(p => !reportedPosts.has(p.id))
    .filter(p => !blockedUserIds.has(p.user_id))
    .filter(p => activeTag ? p.tag === activeTag : true);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={styles.topBar}>
        <Text style={[styles.logo, { color: colors.text }]}>MURK<Text style={[styles.logoAccent, { color: colors.accentMuted }]}>D</Text></Text>
        <View style={[styles.chip, { backgroundColor: colors.text }]}>
          <Text style={[styles.chipText, { color: colors.bg }]}>POST VANISHES IN 48H</Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.navBorder }]} />

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.navBorder }]}
        contentContainerStyle={styles.filterBarInner}
      >
        <TouchableOpacity
          style={[styles.filterPill, { borderColor: colors.navBorder }, activeTag === null && { backgroundColor: colors.text, borderColor: colors.text }]}
          onPress={() => setActiveTag(null)} activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, { color: colors.textMuted }, activeTag === null && { color: colors.bg }]}>ALL</Text>
        </TouchableOpacity>
        {TAGS.map(tag => (
          <TouchableOpacity
            key={tag}
            style={[styles.filterPill, { borderColor: colors.navBorder }, activeTag === tag && { backgroundColor: colors.text, borderColor: colors.text }]}
            onPress={() => setActiveTag(activeTag === tag ? null : tag)} activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, { color: colors.textMuted }, activeTag === tag && { color: colors.bg }]}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {newPostsCount > 0 && (
        <TouchableOpacity style={[styles.newPostsBanner, { backgroundColor: colors.text }]} onPress={handleRefresh} activeOpacity={0.85}>
          <View style={[styles.newPostsDot, { backgroundColor: colors.accentMuted }]} />
          <Text style={[styles.newPostsText, { color: colors.bg }]}>
            {newPostsCount} NEW {newPostsCount === 1 ? 'CONFESSION' : 'CONFESSIONS'} — TAP TO LOAD
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 300) loadMore();
        }}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} colors={[colors.text]} />}
      >
        {isOffline && (
          <View style={styles.offlineBanner}>
            <HugeiconsIcon icon={WifiOff01Icon} size={16} color="#B4B2A9" />
            <View style={styles.bannerText}>
              <Text style={styles.offlineBannerTitle}>YOU'RE OFFLINE</Text>
              <Text style={styles.offlineBannerSub}>No connection. Showing cached confessions.</Text>
            </View>
            <TouchableOpacity style={styles.offlineRetryBtn} onPress={handleRefresh} activeOpacity={0.7}>
              <Text style={styles.offlineRetryText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}

        {serverError && (
          <View style={styles.errorBanner}>
            <HugeiconsIcon icon={Alert02Icon} size={16} color="#F09595" />
            <View style={styles.bannerText}>
              <Text style={styles.errorBannerTitle}>COULDN'T LOAD</Text>
              <Text style={styles.errorBannerSub}>Something went wrong on our end.</Text>
            </View>
            <TouchableOpacity style={styles.errorRetryBtn} onPress={handleRefresh} activeOpacity={0.7}>
              <Text style={styles.errorRetryText}>TRY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {showSkeletons && [0, 1, 2, 3, 4].map(i => <PostSkeleton key={i} />)}

        {!loading && filteredPosts.length === 0 && !isOffline && !serverError && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTag ? `No ${activeTag.toLowerCase()} confessions yet.` : "Nothing's been dropped yet. Be first."}
            </Text>
          </View>
        )}

        {filteredPosts.map(post => (
          <View
            key={post.id}
            onLayout={e => { postYPositions.current[post.id] = e.nativeEvent.layout.y; }}
          >
            {post.justExpired ? (
              <View style={styles.tombstonePadding}>
                <View style={styles.tombstone}>
                  <Text style={styles.tombstoneTitle}>THIS CONFESSION JUST VANISHED</Text>
                  <Text style={styles.tombstoneSub}>Gone after 48h — as intended.</Text>
                </View>
              </View>
            ) : (
              <SwipeablePost
                post={post}
                isOwner={userId === post.user_id}
                isDeleting={deletingPost === post.id}
                canEdit={(Date.now() - new Date(post.created_at).getTime()) < 60 * 60 * 1000}
                liked={likedPosts.has(post.id)}
                notAlone={notAlonePosts.has(post.id)}
                sad={sadPosts.has(post.id)}
                funny={funnyPosts.has(post.id)}
                isFocused={highlightedPostId === post.id}
                surfaceColor={colors.surface}
                onLike={() => handleLike(post.id)}
                onNotAlone={() => handleNotAlone(post.id)}
                onSad={() => handleSad(post.id)}
                onFunny={() => handleFunny(post.id)}
                onDelete={() => handleDeletePress(post.id)}
                onEdit={() => handleEdit(post)}
                onReport={() => handleReport(post.id)}
                onBlock={() => handleBlock(post)}
                onCopy={() => { getClipboard().setStringAsync(post.content); getHaptics().notificationAsync(getHaptics().NotificationFeedbackType.Success); }}
              />
            )}
            <View style={styles.postDivider} />
          </View>
        ))}

        {loadingMore && (
          <View style={styles.loadMoreFooter}>
            <ActivityIndicator size="small" color="#2E4A3E" />
          </View>
        )}
      </ScrollView>

      <BottomNav
        activeTab="home"
        unreadNotifications={unreadNotifications}
        onPressPost={onNavigateToPost}
        onPressDrops={handleNavigateToNotifications}
        onPressProfile={onNavigateToProfile}
        onPressSettings={onNavigateToSettings}
      />

      <Modal visible={!!editingPost} transparent animationType="fade" onRequestClose={() => setEditingPost(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>EDIT CONFESSION</Text>
            <TextInput
              style={styles.modalInput}
              value={editText}
              onChangeText={t => t.length <= 280 && setEditText(t)}
              multiline autoFocus
              placeholderTextColor="rgba(46,74,62,0.35)"
              placeholder="What are you carrying today?"
            />
            <Text style={styles.modalCounter}>{280 - editText.length}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingPost(null)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, (!editText.trim() || savingEdit) && { opacity: 0.4 }]}
                onPress={handleSaveEdit} disabled={!editText.trim() || savingEdit} activeOpacity={0.8}
              >
                {savingEdit ? <ActivityIndicator size="small" color="#F0F5F0" /> : <Text style={styles.modalSaveText}>SAVE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDE8' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 32 },
  logo: { fontSize: 24, fontWeight: '900', color: '#2E4A3E', letterSpacing: 4 },
  logoAccent: { color: '#8FAF9F' },
  chip: { backgroundColor: '#2E4A3E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  chipText: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.1)' },
  newPostsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E4A3E', paddingVertical: 10 },
  newPostsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8FAF9F' },
  newPostsText: { fontSize: 10, color: '#F0F5F0', fontWeight: '700', letterSpacing: 1.5 },
  content: { flex: 1 },
  contentInner: { gap: 0 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2C2C2A', margin: 16, borderRadius: 8, padding: 14 },
  offlineBannerTitle: { fontSize: 11, fontWeight: '700', color: '#D3D1C7', letterSpacing: 1 },
  offlineBannerSub: { fontSize: 11, color: '#888780', marginTop: 2 },
  offlineRetryBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  offlineRetryText: { fontSize: 10, fontWeight: '700', color: '#D3D1C7', letterSpacing: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#791F1F', margin: 16, borderRadius: 8, padding: 14 },
  errorBannerTitle: { fontSize: 11, fontWeight: '700', color: '#F7C1C1', letterSpacing: 1 },
  errorBannerSub: { fontSize: 11, color: '#F09595', marginTop: 2 },
  errorRetryBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  errorRetryText: { fontSize: 10, fontWeight: '700', color: '#F7C1C1', letterSpacing: 1 },
  bannerText: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 13, color: '#8B8B8B', letterSpacing: 1, textAlign: 'center' },
  tombstonePadding: { paddingHorizontal: 32, paddingVertical: 14 },
  tombstone: { borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(46,74,62,0.25)', backgroundColor: 'rgba(46,74,62,0.05)', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  tombstoneTitle: { fontSize: 10, fontWeight: '700', color: 'rgba(46,74,62,0.4)', letterSpacing: 1.5, textAlign: 'center' },
  tombstoneSub: { fontSize: 10, color: 'rgba(46,74,62,0.3)', marginTop: 3, textAlign: 'center' },
  postCard: { gap: 12 },
  postPadding: { paddingHorizontal: 32, paddingVertical: 20 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postTag: { fontSize: 12, color: '#2E4A3E', fontWeight: '700', letterSpacing: 1 },
  postHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postTagLabel: { fontSize: 9, color: '#F0F5F0', letterSpacing: 1.5, fontWeight: '700', backgroundColor: '#2E4A3E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  postDivider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.1)' },
  postContent: { fontSize: 15, color: '#2E4A3E', lineHeight: 22 },
  postTime: { fontSize: 10, color: '#8B8B8B', letterSpacing: 0.5, marginTop: 1 },
  editedLabel: { fontSize: 9, color: '#8B8B8B', letterSpacing: 0.5, fontStyle: 'italic' },
  reactionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionCount: { fontSize: 14, color: '#8B8B8B', fontWeight: '600', letterSpacing: 0.5 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' as any },
  expiryText: { fontSize: 10, color: '#8B8B8B', letterSpacing: 0.5 },


  loadMoreFooter: { paddingVertical: 24, alignItems: 'center' },
  filterBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(46,74,62,0.1)' },
  filterBarInner: { paddingHorizontal: 20, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(46,74,62,0.2)', backgroundColor: 'transparent' },
  filterPillActive: { backgroundColor: '#2E4A3E', borderColor: '#2E4A3E' },
  filterPillText: { fontSize: 10, color: '#8B8B8B', fontWeight: '700', letterSpacing: 1 },
  filterPillTextActive: { color: '#F0F5F0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#E8EDE8', borderRadius: 12, padding: 24, width: '85%', gap: 16 },
  modalTitle: { fontSize: 11, fontWeight: '800', color: '#2E4A3E', letterSpacing: 2, textAlign: 'center' },
  modalInput: { fontSize: 15, color: '#2E4A3E', lineHeight: 22, borderWidth: 1, borderColor: 'rgba(46,74,62,0.2)', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top' },
  modalCounter: { fontSize: 11, color: '#8B8B8B', textAlign: 'right', letterSpacing: 0.5 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(46,74,62,0.2)', alignItems: 'center' },
  modalCancelText: { fontSize: 11, color: '#8B8B8B', fontWeight: '700', letterSpacing: 1.5 },
  modalSave: { flex: 1, paddingVertical: 12, borderRadius: 6, backgroundColor: '#2E4A3E', alignItems: 'center' },
  modalSaveText: { fontSize: 11, color: '#F0F5F0', fontWeight: '700', letterSpacing: 1.5 },
});