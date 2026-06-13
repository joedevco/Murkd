import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Home01Icon, AddCircleIcon, BellIcon, UserCircleIcon, Settings01Icon, Fire02Icon, HandshakeIcon, Clock01Icon, GhostIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchUserStats, fetchUserPosts, fetchFreezeGhostTag, type Post } from '../lib/api';

interface Props {
  onNavigateToHome?: () => void;
  onNavigateToPost?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export default function ProfileScreen({ onNavigateToHome, onNavigateToPost, onNavigateToNotifications, onNavigateToSettings }: Props) {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [stats, setStats] = useState({ postCount: 0, totalLikes: 0, resonance: 0 });
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserStats(user.id).then(setStats);
      fetchUserPosts(user.id).then(setMyPosts);
      fetchFreezeGhostTag().then(setFrozen);
    }
  }, [user?.id]);

  const ghostTag = (user?.user_metadata?.ghost_tag as string | undefined)?.replace('@', '') ?? 'ghost';
  const createdAt = user?.user_metadata?.ghost_tag_created_at as string | undefined;
  const ghostSince = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'March 2025';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.topBar}>
        <Text style={[styles.logo, { color: colors.text }]}>PROFILE</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.navBorder }]} />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
        <View style={[styles.circle, { backgroundColor: theme === 'dark' ? '#2C2C2A' : '#DCE4DC', borderColor: colors.navBorder }]}>
          <HugeiconsIcon icon={GhostIcon} size={40} color={colors.text} />
        </View>
        <Text style={[styles.tag, { color: colors.text }]}>{ghostTag}</Text>
        <Text style={[styles.since, { color: colors.textMuted }]}>Ghost since {ghostSince}</Text>
        {!frozen && (
          <Text style={[
            styles.resetText,
            (() => {
              if (!createdAt) return { color: colors.textMuted };
              const daysIntoCycle = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) % 30;
              const daysLeft = daysIntoCycle === 0 ? 30 : 30 - daysIntoCycle;
              if (daysLeft <= 3) return { color: '#E83D3D' };
              if (daysLeft <= 7) return { color: '#E8A030' };
              return { color: colors.textMuted };
            })()
          ]}>
            {(() => {
              if (!createdAt) return '';
              const daysIntoCycle = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) % 30;
              if (daysIntoCycle === 0) return 'RESETS TODAY';
              const daysLeft = 30 - daysIntoCycle;
              return daysLeft === 1 ? 'TAG RESETS IN 1 DAY' : `TAG RESETS IN ${daysLeft} DAYS`;
            })()}
          </Text>
        )}
        <View style={[styles.innerDivider, { backgroundColor: colors.navBorder }]} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.postCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>POSTS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.navBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalLikes}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIKES</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.navBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }, stats.resonance >= 100 && { color: '#E83D3D' }]}>{stats.resonance}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }, stats.resonance >= 100 && { color: '#E83D3D' }]}>
              {stats.resonance >= 100 ? 'RESONATING' : 'RESONANCE'}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: colors.navBorder }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>YOUR CONFESSIONS</Text>

        {myPosts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No confessions yet.</Text>
        ) : (
          myPosts.map((post, i) => (
            <View key={post.id}>
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
                      {post.edited_at && (
                        <Text style={[styles.editedLabel, { color: colors.textMuted }]}>edited</Text>
                      )}
                    </View>
                    {post.tag && (
                      <View style={styles.postHeaderRight}>
                        <Text style={[styles.postTagLabel, { color: colors.bg, backgroundColor: colors.text }]}>{post.tag}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

                  <View style={styles.reactionsRow}>
                    <View style={styles.reactionBtn}>
                      <HugeiconsIcon icon={Fire02Icon} size={18} color={colors.textMuted} />
                      <Text style={[styles.reactionCount, { color: colors.textMuted }]}>{post.like_count ?? 0}</Text>
                    </View>

                    <View style={styles.reactionBtn}>
                      <HugeiconsIcon icon={HandshakeIcon} size={18} color={colors.textMuted} />
                      <Text style={[styles.reactionCount, { color: colors.textMuted }]}>{post.not_alone_count ?? 0}</Text>
                    </View>

                    <View style={styles.expiryRow}>
                      <HugeiconsIcon icon={Clock01Icon} size={12} color={colors.textMuted} />
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
              {i < myPosts.length - 1 && <View style={[styles.postDivider, { backgroundColor: colors.navBorder }]} />}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.nav, { backgroundColor: colors.nav, borderTopColor: colors.navBorder }]}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToHome}>
          <HugeiconsIcon icon={Home01Icon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToPost}>
          <HugeiconsIcon icon={AddCircleIcon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>POST</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToNotifications}>
          <HugeiconsIcon icon={BellIcon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>DROPS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <HugeiconsIcon icon={UserCircleIcon} size={24} color={colors.text} />
          <Text style={[styles.navLabel, { color: colors.text }]}>PROFILE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToSettings}>
          <HugeiconsIcon icon={Settings01Icon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>SETTINGS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDE8' },
  topBar: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 32 },
  divider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.1)' },
  logo: { fontSize: 18, fontWeight: '800', color: '#2E4A3E', letterSpacing: 3 },
  body: { flex: 1 },
  bodyInner: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DCE4DC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 74, 62, 0.15)',
  },
  innerDivider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.1)', width: '100%', marginTop: 24 },
  tag: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E4A3E',
    letterSpacing: 1.5,
    marginTop: 16,
  },
  since: {
    fontSize: 12,
    color: '#8B8B8B',
    letterSpacing: 1,
    marginTop: 6,
  },
  resetText: {
    fontSize: 11,
    color: '#8B8B8B',
    letterSpacing: 1.5,
    marginTop: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#2E4A3E', letterSpacing: 1 },
  statLabel: { fontSize: 9, color: '#8B8B8B', letterSpacing: 1.5, fontWeight: '700', marginTop: 4 },
  statValueHot: { color: '#E83D3D' },
  statLabelHot: { color: '#E83D3D' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(46, 74, 62, 0.12)' },
  sectionDivider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.1)', width: '100%', marginTop: 24 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E4A3E',
    letterSpacing: 2.5,
    marginTop: 20,
    marginBottom: 4,
    paddingHorizontal: 32,
    alignSelf: 'flex-start',
  },
  emptyText: { fontSize: 13, color: '#8B8B8B', letterSpacing: 1, textAlign: 'center', marginTop: 40 },
  postPadding: { paddingHorizontal: 32, paddingVertical: 20, width: '100%' },
  postCard: { gap: 12 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postTag: { fontSize: 12, color: '#2E4A3E', fontWeight: '700', letterSpacing: 1 },
  postHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postTagLabel: { fontSize: 9, color: '#F0F5F0', letterSpacing: 1.5, fontWeight: '700', backgroundColor: '#2E4A3E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, overflow: 'hidden' },
  postTime: { fontSize: 10, color: '#8B8B8B', letterSpacing: 0.5, marginTop: 1 },
  editedLabel: { fontSize: 9, color: '#8B8B8B', letterSpacing: 0.5, fontStyle: 'italic' },
  postContent: { fontSize: 15, color: '#2E4A3E', lineHeight: 22 },
  reactionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionCount: { fontSize: 14, color: '#8B8B8B', fontWeight: '600', letterSpacing: 0.5 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' as any },
  expiryText: { fontSize: 10, color: '#8B8B8B', letterSpacing: 0.5 },
  postDivider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.1)' },
  nav: { flexDirection: 'row', backgroundColor: '#F0F5F0', paddingTop: 12, paddingBottom: 32, borderTopWidth: 1, borderTopColor: 'rgba(46, 74, 62, 0.1)' },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 10, color: '#8B8B8B', letterSpacing: 2 },
  navLabelActive: { color: '#2E4A3E' },
});
