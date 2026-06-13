import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, PanResponder, RefreshControl, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Home01Icon, AddCircleIcon, BellIcon, UserCircleIcon, Settings01Icon, Fire02Icon, HandshakeIcon, Notification03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchNotifications, markNotificationRead, deleteNotification, markAllNotificationsRead } from '../lib/api';

interface Props {
  onNavigateToHome?: () => void;
  onNavigateToPost?: (postId?: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
}

interface NotificationItem {
  id: string;
  type: 'like' | 'handshake' | 'announcement';
  actor_ghost_tag: string;
  post_preview: string;
  created_at: string;
  read?: boolean;
  post_id?: string | null;
}

const SWIPE_THRESHOLD = -60;
const ACTION_WIDTH = 80;

function SwipeableNotif({
  item,
  onDismiss,
  onRead,
  onViewAnnouncement,
  isLast,
  onNavigateToPost,
  onNavigateToHome,
}: {
  item: NotificationItem;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
  onViewAnnouncement?: (item: NotificationItem) => void;
  isLast: boolean;
  onNavigateToPost?: (postId?: string) => void;
  onNavigateToHome?: () => void;
}) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);

  const isLike = item.type === 'like';
  const isAnnouncement = item.type === 'announcement';
  const iconColor = isLike ? '#E83D3D' : isAnnouncement ? '#2E86C1' : '#2E7D6E';
  const iconBg = isLike ? 'rgba(232,61,61,0.08)' : isAnnouncement ? 'rgba(46,134,193,0.08)' : 'rgba(46,125,110,0.08)';
  const icon = isLike ? Fire02Icon : isAnnouncement ? Notification03Icon : HandshakeIcon;

  const notifTitle = isLike
    ? 'Someone liked your confession'
    : isAnnouncement
    ? item.actor_ghost_tag
    : 'Someone handshaked your confession';

  const springTo = (toValue: number) => {
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      bounciness: 4,
    }).start(() => { currentX.current = toValue; });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        translateX.setValue(currentX.current);
      },
      onPanResponderMove: (_, g) => {
        const next = currentX.current + g.dx;
        translateX.setValue(Math.min(0, Math.max(-ACTION_WIDTH - 10, next)));
      },
      onPanResponderRelease: (_, g) => {
        const landed = currentX.current + g.dx;
        if (landed < SWIPE_THRESHOLD) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          springTo(-ACTION_WIDTH);
        } else {
          springTo(0);
        }
      },
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  const dismiss = () => {
    Animated.timing(translateX, {
      toValue: -400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss(item.id));
  };

  const handlePress = () => {
    onRead(item.id);
    if (isAnnouncement) {
      onViewAnnouncement?.(item);
    } else if (item.post_id) {
      onNavigateToPost?.(item.post_id);
    } else {
      onNavigateToHome?.();
    }
  };

  const diff = Date.now() - new Date(item.created_at).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  let timeStr: string;
  if (mins < 1) timeStr = 'just now';
  else if (mins < 60) timeStr = `${mins}m ago`;
  else if (mins < 1440) timeStr = `${Math.floor(mins / 60)}h ago`;
  else timeStr = `${Math.floor(mins / 1440)}d ago`;

  return (
    <View style={swipeStyles.wrapper}>
      <View style={[swipeStyles.actionContainer, { width: ACTION_WIDTH }]}>
        <TouchableOpacity style={swipeStyles.dismissBtn} onPress={dismiss} activeOpacity={0.8}>
          <Text style={swipeStyles.dismissLabel}>DISMISS</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[swipeStyles.card, { transform: [{ translateX }], backgroundColor: item.read ? colors.bg : colors.surface }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={swipeStyles.touchable} activeOpacity={0.6} onPress={handlePress}>
          <View style={[swipeStyles.iconCircle, { backgroundColor: iconBg }]}>
            <HugeiconsIcon icon={icon} size={18} color={iconColor} />
          </View>
          <View style={swipeStyles.content}>
            <View style={swipeStyles.titleRow}>
              <Text style={[swipeStyles.notifTitle, { color: colors.text }, !item.read && { fontWeight: '700' }]} numberOfLines={1}>
                {notifTitle}
              </Text>
              <Text style={[swipeStyles.time, { color: colors.textMuted }]}>{timeStr}</Text>
            </View>
            <Text style={[swipeStyles.bodyText, { color: colors.textMuted }]} numberOfLines={2}>
              {isAnnouncement
                ? item.post_preview
                : <><Text style={{ color: iconColor, fontWeight: '600' }}>{item.actor_ghost_tag} </Text>— "{item.post_preview}"</>
              }
            </Text>
          </View>
          {!item.read && <View style={[swipeStyles.unreadDot, { backgroundColor: iconColor }]} />}
        </TouchableOpacity>
        {!isLast && <View style={[swipeStyles.divider, { backgroundColor: colors.navBorder }]} />}
      </Animated.View>
    </View>
  );
}

type Filter = 'TODAY' | 'YESTERDAY' | 'EARLIER';

function groupByFilter(notifications: NotificationItem[], filter: Filter) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  return notifications.filter(n => {
    const t = new Date(n.created_at).getTime();
    if (filter === 'TODAY') return t >= todayStart;
    if (filter === 'YESTERDAY') return t >= yesterdayStart && t < todayStart;
    return t < yesterdayStart;
  });
}

export default function NotificationsScreen({ onNavigateToHome, onNavigateToPost, onNavigateToProfile, onNavigateToSettings }: Props) {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('TODAY');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<NotificationItem | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchNotifications(user.id);
    setNotifications(data);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const handleRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markNotificationRead(id).catch(() => {});
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    deleteNotification(id).catch(() => {});
    setTimeout(() => {
      setDismissed(prev => { const n = new Set(prev); n.delete(id); return n; });
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 250);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user?.id) markAllNotificationsRead(user.id).catch(() => {});

  }, [user?.id]);

  const handleViewAnnouncement = useCallback((item: NotificationItem) => {
    setSelectedAnnouncement(item);
  }, []);

  const handleCloseAnnouncement = useCallback(() => {
    setSelectedAnnouncement(null);
  }, []);

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const visible = notifications.filter(n => !dismissed.has(n.id));
  const filtered = groupByFilter(visible, filter);
  const hasUnread = visible.some(n => !n.read);
  const FILTERS: Filter[] = ['TODAY', 'YESTERDAY', 'EARLIER'];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={styles.topBar}>
        <Text style={[styles.title, { color: colors.text }]}>NOTIFICATIONS</Text>
        {hasUnread && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={[styles.markAll, { color: colors.textMuted }]}>MARK ALL READ</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, { borderColor: colors.navBorder }, filter === f && { backgroundColor: colors.text, borderColor: colors.text }]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, { color: filter === f ? colors.bg : colors.textMuted }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.navBorder }]} />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <HugeiconsIcon icon={BellIcon} size={28} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>NOTHING HERE</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {filter === 'TODAY'
                ? 'No notifications today yet.'
                : filter === 'YESTERDAY'
                ? 'Nothing from yesterday.'
                : 'Nothing older to show.'}
            </Text>
          </View>
        ) : (
          filtered.map((n, i) => (
            <SwipeableNotif
              key={n.id}
              item={n}
              onDismiss={handleDismiss}
              onRead={handleRead}
              onViewAnnouncement={handleViewAnnouncement}
              isLast={i === filtered.length - 1}
              onNavigateToPost={onNavigateToPost}
              onNavigateToHome={onNavigateToHome}
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.nav, { backgroundColor: colors.nav, borderTopColor: colors.navBorder }]}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToHome}>
          <HugeiconsIcon icon={Home01Icon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => onNavigateToPost?.()}>
          <HugeiconsIcon icon={AddCircleIcon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>POST</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <HugeiconsIcon icon={BellIcon} size={24} color={colors.text} />
          <Text style={[styles.navLabel, { color: colors.text }]}>DROPS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToProfile}>
          <HugeiconsIcon icon={UserCircleIcon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>PROFILE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToSettings}>
          <HugeiconsIcon icon={Settings01Icon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>SETTINGS</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!selectedAnnouncement}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAnnouncement}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.modalX} onPress={handleCloseAnnouncement} activeOpacity={0.7}>
              <View style={styles.modalXInner}>
                <Text style={[styles.modalXLabel, { color: colors.textMuted }]}>✕</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.modalTopAccent} />
            <View style={styles.modalIconWrap}>
              <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(46,134,193,0.12)' }]}>
                <HugeiconsIcon icon={Notification03Icon} size={24} color="#2E86C1" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={3}>
              {selectedAnnouncement?.actor_ghost_tag}
            </Text>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalText, { color: colors.text }]}>
                {selectedAnnouncement?.post_preview}
              </Text>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Text style={[styles.modalDate, { color: colors.textMuted }]}>
                {selectedAnnouncement ? formatTime(selectedAnnouncement.created_at) : ''}
              </Text>
              <TouchableOpacity style={styles.modalGotIt} onPress={handleCloseAnnouncement} activeOpacity={0.8}>
                <Text style={styles.modalGotItLabel}>GOT IT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingTop: 60, paddingBottom: 12, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  markAll: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 14 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: 'transparent', borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  divider: { height: 0.5 },
  body: { flex: 1 },
  bodyInner: { paddingBottom: 40 },
  empty: { alignItems: 'center', gap: 10, marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 2.5 },
  emptySub: { fontSize: 13, lineHeight: 20, textAlign: 'center', letterSpacing: 0.3 },
  nav: { flexDirection: 'row', paddingTop: 12, paddingBottom: 32, borderTopWidth: 0.5 },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 10, letterSpacing: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: 24, paddingTop: 8, paddingHorizontal: 28, paddingBottom: 28, maxHeight: '85%' },
  modalX: { position: 'absolute', top: 12, right: 12, zIndex: 10, padding: 6 },
  modalXInner: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' },
  modalXLabel: { fontSize: 14, lineHeight: 16 },
  modalTopAccent: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2E86C1', alignSelf: 'center', marginBottom: 20 },
  modalIconWrap: { alignItems: 'center', marginBottom: 16 },
  modalIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', lineHeight: 26, textAlign: 'center', marginBottom: 20 },
  modalBody: { flexGrow: 0 },
  modalText: { fontSize: 15, lineHeight: 26, letterSpacing: 0.2 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  modalDate: { fontSize: 11 },
  modalGotIt: { flex: 1, marginLeft: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2E86C1', alignItems: 'center' },
  modalGotItLabel: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
});

const swipeStyles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  actionContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  dismissBtn: { flex: 1, width: '100%', backgroundColor: '#C0392B', justifyContent: 'center', alignItems: 'center' },
  dismissLabel: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  card: {},
  touchable: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, gap: 14 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  content: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  notifTitle: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
  time: { fontSize: 11, flexShrink: 0 },
  bodyText: { fontSize: 12, lineHeight: 17 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  divider: { height: 0.5, marginLeft: 82 },
});