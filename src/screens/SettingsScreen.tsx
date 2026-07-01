import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GhostIcon, Alert02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { getNotificationPreferences, updateNotificationPreferences, fetchIsAdmin, sendAnnouncement, fetchBlockedGhosts, unblockGhost } from '../lib/api';
import BottomNav from '../components/BottomNav';
import appConfig from '../../app.json';

interface Props {
  onNavigateToHome?: () => void;
  onNavigateToPost?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToLogin?: () => void;
}

const privacyContent = `Privacy Policy

Last updated: June 4, 2026

1. Introduction

Welcome to Murkd. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.

Murkd is an anonymous confession platform where users can share thoughts and feelings publicly. Posts automatically expire and are permanently deleted after 48 hours.

2. Information You Provide Directly

- Email address — required for account creation and authentication
- Username (ghost tag) — a randomly generated anonymous identifier displayed on your posts
- Password — stored securely for authentication
- Post content — the text you submit as confessions

3. Sensitive Information

Because Murkd is an open confession platform, your posts may voluntarily contain sensitive information such as health or mental health information, information about your sex life or sexual orientation, information revealing race or ethnic origin, political opinions, or religious beliefs. We do not solicit or require this information.

4. Information Collected Automatically

We do not use analytics services, cookies, tracking scripts, or any automatic data collection tools.

5. How We Use Your Information

We use your information to create and manage your account, enable you to post and interact with confessions, display your anonymous ghost tag, send push notifications (if enabled), respond to support inquiries, and protect our service.

6. Push Notifications

With your permission, we may send push notifications. You can opt out at any time through your device settings.

7. Data Retention

Account information is retained as long as your account is active. Confessions are automatically and permanently deleted 48 hours after posting. When you delete your account, all associated data is permanently removed.

8. Data Sharing

We do not sell, rent, or share your personal information with third parties. We use Supabase as our data hosting provider, which processes data solely on our behalf.

9. Age Requirement

Murkd is strictly for users 18 years of age or older. We do not knowingly collect information from anyone under 18.

10. Your Rights

You can view your account information, delete your account, sign out, and manage notification preferences. To exercise any rights, contact us at the email below.

11. Security

We implement industry-standard security measures including encrypted data transmission (HTTPS) and secure password hashing.

12. Contact

For questions about this Privacy Policy, contact us at murkdapp@gmail.com`;

const termsContent = `Terms of Service

Last updated: June 4, 2026

1. Acceptance of Terms

By creating an account or using Murkd, you agree to these Terms of Service.

2. Eligibility

You must be at least 18 years old to use Murkd.

3. Anonymous Identity

Your ghost tag is randomly generated and cannot be changed. It is your public identity within the app. Do not share personal identifying information in your posts.

4. User Conduct

You agree not to post illegal, threatening, harassing, or hateful content, content promoting violence or self-harm, impersonate others, or use the app for any unlawful purpose. We reserve the right to remove content and terminate accounts for violations.

5. Content Expiration

All posts are automatically and permanently deleted 48 hours after creation. This process is irreversible.

6. Intellectual Property

You retain ownership of your content. By posting, you grant Murkd a non-exclusive license to display your content within the app for the duration of the 48-hour expiration period.

7. Disclaimer

Murkd is provided "as is" without warranties of any kind.

8. Limitation of Liability

Murkd shall not be liable for any indirect, incidental, or consequential damages arising from your use of the app.

9. Termination

We reserve the right to suspend or terminate accounts at our discretion.

10. Changes

We may update these terms at any time. Continued use after changes constitutes acceptance.

11. Contact

For questions, contact us at murkdapp@gmail.com`;

const TAG_OPTIONS = ['ALL', 'WORK', 'RELATIONSHIPS', 'FAMILY', 'MENTAL HEALTH', 'MONEY', 'SECRET', 'REGRET', 'OTHER'];

export default function SettingsScreen({ onNavigateToHome, onNavigateToPost, onNavigateToNotifications, onNavigateToProfile, onNavigateToLogin }: Props) {
  const { user, signOut, deleteAccount } = useAuth();
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | null>(null);
  const [defaultTag, setDefaultTag] = useState('ALL');
  const [showExpired, setShowExpired] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifHandshakes, setNotifHandshakes] = useState(true);
  const [notifSad, setNotifSad] = useState(true);
  const [notifFunny, setNotifFunny] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [sendingAnnounce, setSendingAnnounce] = useState(false);
  const { colors, theme, toggleTheme } = useTheme();
  const ghostTag = (user?.user_metadata?.ghost_tag as string | undefined)?.replace('@', '') ?? 'ghost';
  const [showChangePassword, setShowChangePassword] = useState(false);
const [newPassword, setNewPassword] = useState('');
const [changingPassword, setChangingPassword] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedGhosts, setBlockedGhosts] = useState<{ id: string; blocked_user_id: string; blocked_ghost_tag: string; created_at: string }[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);

  const privacyEmail = 'murkdapp@gmail.com';

  useEffect(() => {
    // Load local prefs immediately for instant UI
    AsyncStorage.getItem('defaultTag').then(tag => { if (tag) setDefaultTag(tag); });
    AsyncStorage.getItem('showExpired').then(val => { if (val === 'true') setShowExpired(true); });
    AsyncStorage.getItem('notifAnnouncements').then(val => { if (val === 'false') setNotifAnnouncements(false); });
    AsyncStorage.getItem('notifLikes').then(val => { if (val === 'false') setNotifLikes(false); });
    AsyncStorage.getItem('notifHandshakes').then(val => { if (val === 'false') setNotifHandshakes(false); });
    AsyncStorage.getItem('notifSad').then(val => { if (val === 'false') setNotifSad(false); });
    AsyncStorage.getItem('notifFunny').then(val => { if (val === 'false') setNotifFunny(false); });

    // Then sync from Supabase to get the authoritative values
    if (user?.id) {
      getNotificationPreferences(user.id)
        .then(prefs => {
          setNotifLikes(prefs.likes);
          setNotifHandshakes(prefs.handshakes);
          setNotifSad(prefs.sad);
          setNotifFunny(prefs.funny);
          setNotifAnnouncements(prefs.announcements);
          // Keep AsyncStorage in sync
          AsyncStorage.setItem('notifLikes', prefs.likes ? 'true' : 'false');
          AsyncStorage.setItem('notifHandshakes', prefs.handshakes ? 'true' : 'false');
          AsyncStorage.setItem('notifSad', prefs.sad ? 'true' : 'false');
          AsyncStorage.setItem('notifFunny', prefs.funny ? 'true' : 'false');
          AsyncStorage.setItem('notifAnnouncements', prefs.announcements ? 'true' : 'false');
        })
        .catch(() => {}) // silently fall back to AsyncStorage values
        .finally(() => setPrefsLoading(false));
    } else {
      setPrefsLoading(false);
    }

    fetchIsAdmin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false))
      .finally(() => setAdminLoading(false));
  }, [user?.id]);

  const handleNotifToggle = async (
    key: 'likes' | 'handshakes' | 'sad' | 'funny' | 'announcements',
    current: boolean,
    setter: (v: boolean) => void
  ) => {
    const next = !current;
    setter(next);
    AsyncStorage.setItem(`notif${key.charAt(0).toUpperCase() + key.slice(1)}`, next ? 'true' : 'false');

    if (user?.id) {
      const prefs = {
        likes: key === 'likes' ? next : notifLikes,
        handshakes: key === 'handshakes' ? next : notifHandshakes,
        sad: key === 'sad' ? next : notifSad,
        funny: key === 'funny' ? next : notifFunny,
        announcements: key === 'announcements' ? next : notifAnnouncements,
      };
      await updateNotificationPreferences(user.id, prefs);
    }
  };

  const handleChangePassword = async () => {
  if (!newPassword || newPassword.length < 6) {
    Alert.alert('Error', 'Password must be at least 6 characters.');
    return;
  }
  setChangingPassword(true);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  setChangingPassword(false);
  if (error) {
    Alert.alert('Error', error.message);
  } else {
    setShowChangePassword(false);
    setNewPassword('');
    Alert.alert('Done', 'Your password has been updated.');
  }
};

  const handleDefaultTag = (tag: string) => {
    setDefaultTag(tag);
    setShowTagPicker(false);
    AsyncStorage.setItem('defaultTag', tag);
  };

  const handleEmail = () => Linking.openURL(`mailto:${privacyEmail}`).catch(() => {});

  const handleOpenBlocked = () => {
    setShowBlockedModal(true);
    setBlockedLoading(true);
    if (user?.id) fetchBlockedGhosts(user.id).then(setBlockedGhosts).catch(() => setBlockedGhosts([])).finally(() => setBlockedLoading(false));
  };

  const handleUnblock = async (blockId: string) => {
    await unblockGhost(blockId);
    setBlockedGhosts(prev => prev.filter(b => b.id !== blockId));
  };

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const handleSignOutConfirm = async () => {
    setSigningOut(true);
    await signOut();
    onNavigateToLogin?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.topBar}>
        <Text style={[styles.title, { color: colors.text }]}>SETTINGS</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.navBorder }]} />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>GHOST TAG</Text>
            <View style={styles.tagRow}>
              <View style={[styles.ghostCircle, { backgroundColor: theme === 'dark' ? '#2C2C2A' : '#DCE4DC', borderColor: colors.navBorder }]}>
                <HugeiconsIcon icon={GhostIcon} size={18} color={colors.text} />
              </View>
              <Text style={[styles.tagValue, { color: colors.text }]}>{ghostTag}</Text>
            </View>
            <Text style={[styles.tagSub, { color: colors.textMuted }]}>your anonymous identity</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRIVACY</Text>
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={handleOpenBlocked}>
              <Text style={[styles.settingText, { color: colors.text }]}>Blocked accounts</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{blockedGhosts.length}</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => setPolicyType('privacy')}>
              <Text style={[styles.settingText, { color: colors.text }]}>Privacy policy</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => setPolicyType('terms')}>
              <Text style={[styles.settingText, { color: colors.text }]}>Terms of service</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={handleEmail}>
              <Text style={[styles.settingText, { color: colors.text }]}>Contact support</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => setShowDeleteConfirm(true)}>
              <Text style={[styles.settingText, { color: '#C0392B' }]}>Delete account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>FEED</Text>
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => setShowTagPicker(true)}>
              <Text style={[styles.settingText, { color: colors.text }]}>Default tag filter</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{defaultTag}</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => {
              const next = !showExpired;
              setShowExpired(next);
              AsyncStorage.setItem('showExpired', next ? 'true' : 'false');
            }}>
              <Text style={[styles.settingText, { color: colors.text }]}>Show expired confessions</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{showExpired ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.6}
              disabled={prefsLoading}
              onPress={() => handleNotifToggle('announcements', notifAnnouncements, setNotifAnnouncements)}
            >
              <Text style={[styles.settingText, { color: colors.text }]}>App updates & announcements</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{prefsLoading ? '...' : notifAnnouncements ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.6}
              disabled={prefsLoading}
              onPress={() => handleNotifToggle('likes', notifLikes, setNotifLikes)}
            >
              <Text style={[styles.settingText, { color: colors.text }]}>Likes</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{prefsLoading ? '...' : notifLikes ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.6}
              disabled={prefsLoading}
              onPress={() => handleNotifToggle('handshakes', notifHandshakes, setNotifHandshakes)}
            >
              <Text style={[styles.settingText, { color: colors.text }]}>Handshakes</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{prefsLoading ? '...' : notifHandshakes ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.6}
              disabled={prefsLoading}
              onPress={() => handleNotifToggle('sad', notifSad, setNotifSad)}
            >
              <Text style={[styles.settingText, { color: colors.text }]}>Sad</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{prefsLoading ? '...' : notifSad ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.6}
              disabled={prefsLoading}
              onPress={() => handleNotifToggle('funny', notifFunny, setNotifFunny)}
            >
              <Text style={[styles.settingText, { color: colors.text }]}>Funny</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{prefsLoading ? '...' : notifFunny ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={toggleTheme}>
              <Text style={[styles.settingText, { color: colors.text }]}>Theme</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{theme === 'dark' ? 'DARK' : 'LIGHT'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6}>
              <Text style={[styles.settingText, { color: colors.text }]}>Email</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{user?.email ?? '—'}</Text>
            </TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
<TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => setShowChangePassword(true)}>
  <Text style={[styles.settingText, { color: colors.text }]}>Change password</Text>
</TouchableOpacity>
            <View style={[styles.settingDivider, { backgroundColor: colors.navBorder }]} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={handleSignOut}>
              <Text style={[styles.settingText, { color: '#C0392B' }]}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ABOUT</Text>
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6}>
              <Text style={[styles.settingText, { color: colors.text }]}>Version</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>{appConfig.expo.version}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!adminLoading && isAdmin && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ADMIN</Text>
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => setShowAdminModal(true)}>
                <Text style={[styles.settingText, { color: '#2E86C1' }]}>Send announcement</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAdminModal} transparent animationType="fade" onRequestClose={() => setShowAdminModal(false)}>
        <KeyboardAvoidingView style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]} behavior="padding">
          <View style={[styles.adminModalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>SEND ANNOUNCEMENT</Text>
            <TextInput
              style={[styles.adminInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.navBorder }]}
              placeholder="Title"
              placeholderTextColor={colors.textMuted}
              value={announceTitle}
              onChangeText={setAnnounceTitle}
            />
            <TextInput
              style={[styles.adminInput, styles.adminBodyInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.navBorder }]}
              placeholder="Body"
              placeholderTextColor={colors.textMuted}
              value={announceBody}
              onChangeText={setAnnounceBody}
              multiline
            />
            {sendingAnnounce ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <View style={styles.adminModalActions}>
                <TouchableOpacity
                  style={[styles.adminSendBtn, { backgroundColor: '#2E86C1' }]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (!announceTitle.trim() || !announceBody.trim()) return;
                    setSendingAnnounce(true);
                    const result = await sendAnnouncement(announceTitle.trim(), announceBody.trim());
                    setSendingAnnounce(false);
                    setShowAdminModal(false);
                    setAnnounceTitle('');
                    setAnnounceBody('');
                    if (result.ok) {
                      Alert.alert('Sent', `Announcement sent to ${result.sent} users`);
                    } else {
                      Alert.alert('Error', result.error || 'Failed to send');
                    }
                  }}
                >
                  <Text style={styles.adminSendBtnText}>SEND</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.adminCancelBtn, { borderColor: colors.navBorder }]} activeOpacity={0.7} onPress={() => { setShowAdminModal(false); setAnnounceTitle(''); setAnnounceBody(''); }}>
                  <Text style={[styles.adminCancelBtnText, { color: colors.textMuted }]}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showBlockedModal} transparent animationType="slide" onRequestClose={() => setShowBlockedModal(false)}>
        <View style={styles.blockedOverlay}>
          <View style={[styles.blockedCard, { backgroundColor: colors.surface }]}>
            <View style={styles.blockedHeader}>
              <Text style={[styles.blockedTitle, { color: colors.text }]}>BLOCKED ACCOUNTS</Text>
              <Text style={[styles.blockedCount, { color: colors.textMuted }]}>{blockedGhosts.length}</Text>
              <TouchableOpacity onPress={() => setShowBlockedModal(false)} activeOpacity={0.7}>
                <Text style={[styles.blockedClose, { color: colors.textMuted }]}>DONE</Text>
              </TouchableOpacity>
            </View>
            {blockedLoading ? (
              <ActivityIndicator size="small" color={colors.text} style={{ marginTop: 40 }} />
            ) : blockedGhosts.length === 0 ? (
              <View style={styles.blockedEmpty}>
                <Text style={[styles.blockedEmptyText, { color: colors.textMuted }]}>No blocked accounts</Text>
              </View>
            ) : (
              <ScrollView style={styles.blockedList} showsVerticalScrollIndicator={false}>
                {blockedGhosts.map(block => (
                  <View key={block.id} style={[styles.blockedRow, { borderBottomColor: colors.navBorder }]}>
                    <View style={styles.blockedRowLeft}>
                      <Text style={[styles.blockedGhostTag, { color: colors.text }]}>@{block.blocked_ghost_tag.replace('@', '')}</Text>
                      <Text style={[styles.blockedDate, { color: colors.textMuted }]}>
                        {new Date(block.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.blockedUnblockBtn} onPress={() => handleUnblock(block.id)} activeOpacity={0.7}>
                      <Text style={styles.blockedUnblockLabel}>UNBLOCK</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <BottomNav
        activeTab="settings"
        onPressHome={onNavigateToHome}
        onPressPost={onNavigateToPost}
        onPressDrops={onNavigateToNotifications}
        onPressProfile={onNavigateToProfile}
      />

      <Modal visible={showTagPicker} transparent animationType="fade" onRequestClose={() => setShowTagPicker(false)}>
        <KeyboardAvoidingView style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.pickerBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>DEFAULT TAG FILTER</Text>
            <View style={styles.pickerList}>
              {TAG_OPTIONS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.pickerItem, defaultTag === tag && { backgroundColor: colors.text }]}
                  activeOpacity={0.7}
                  onPress={() => handleDefaultTag(tag)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }, defaultTag === tag && { color: colors.bg }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showSignOutConfirm} transparent animationType="fade" onRequestClose={() => setShowSignOutConfirm(false)}>
        <KeyboardAvoidingView style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.deleteModalBox, { backgroundColor: colors.surface }]}>
            <View style={styles.deleteModalIcon}>
              <HugeiconsIcon icon={GhostIcon} size={24} color={colors.textMuted} />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>SIGN OUT</Text>
            <Text style={[styles.deleteModalText, { color: colors.textMuted }]}>
              You'll need to sign back in with your email and password to access your account again.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalConfirm, { backgroundColor: colors.text }]}
                activeOpacity={0.8}
                onPress={handleSignOutConfirm}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text style={[styles.deleteModalConfirmText, { color: colors.bg }]}>SIGN OUT</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteModalCancel, { borderColor: colors.navBorder }]} activeOpacity={0.7} onPress={() => { setShowSignOutConfirm(false); setSigningOut(false); }}>
                <Text style={[styles.deleteModalCancelText, { color: colors.textMuted }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <KeyboardAvoidingView style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.deleteModalBox, { backgroundColor: colors.surface }]}>
            <View style={styles.deleteModalIcon}>
              <HugeiconsIcon icon={Alert02Icon} size={24} color="#C0392B" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>DELETE ACCOUNT</Text>
            <Text style={[styles.deleteModalText, { color: colors.textMuted }]}>
              This will permanently delete all your confessions, likes, and data. You will need to create a new account to use Murkd again.
            </Text>
            <Text style={[styles.deleteModalWarning, { color: '#C0392B' }]}>This action cannot be undone.</Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalConfirm, { backgroundColor: '#C0392B' }, deletingAccount && { opacity: 0.5 }]}
                activeOpacity={0.8}
                disabled={deletingAccount}
                onPress={async () => {
                  setDeletingAccount(true);
                  const err = await deleteAccount();
                  if (err) {
                    setShowDeleteConfirm(false);
                    setDeletingAccount(false);
                    Alert.alert('Error', err);
                  } else {
                    onNavigateToLogin?.();
                  }
                }}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>DELETE EVERYTHING</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteModalCancel, { borderColor: colors.navBorder }]} activeOpacity={0.7} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={[styles.deleteModalCancelText, { color: colors.textMuted }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showChangePassword} transparent animationType="fade" onRequestClose={() => { setShowChangePassword(false); setNewPassword(''); }}>
        <KeyboardAvoidingView style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.adminModalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>CHANGE PASSWORD</Text>
            <TextInput
              style={[styles.adminInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.navBorder }]}
              placeholder="New password"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {changingPassword ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <View style={styles.adminModalActions}>
                <TouchableOpacity
                  style={[styles.adminSendBtn, { backgroundColor: colors.text }, (!newPassword || newPassword.length < 6) && { opacity: 0.4 }]}
                  activeOpacity={0.8}
                  disabled={!newPassword || newPassword.length < 6}
                  onPress={handleChangePassword}
                >
                  <Text style={[styles.adminSendBtnText, { color: colors.bg }]}>UPDATE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adminCancelBtn, { borderColor: colors.navBorder }]}
                  activeOpacity={0.7}
                  onPress={() => { setShowChangePassword(false); setNewPassword(''); }}
                >
                  <Text style={[styles.adminCancelBtnText, { color: colors.textMuted }]}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!policyType}
        transparent
        animationType="fade"
        onRequestClose={() => setPolicyType(null)}
      >
        <KeyboardAvoidingView style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{policyType === 'privacy' ? 'PRIVACY POLICY' : 'TERMS OF SERVICE'}</Text>
              <TouchableOpacity onPress={() => setPolicyType(null)} activeOpacity={0.7}>
                <Text style={[styles.modalClose, { color: colors.textMuted }]}>CLOSE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.modalText, { color: colors.text }]}>{policyType === 'privacy' ? privacyContent : termsContent}</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDE8' },
  topBar: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 32 },
  divider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.1)' },
  title: { fontSize: 18, fontWeight: '800', color: '#2E4A3E', letterSpacing: 3 },
  body: { flex: 1 },
  bodyInner: { paddingTop: 24, paddingBottom: 40 },
  card: { backgroundColor: '#F0F5F0', paddingVertical: 16, paddingHorizontal: 32 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#8B8B8B', letterSpacing: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ghostCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCE4DC',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(46, 74, 62, 0.15)',
  },
  tagValue: { fontSize: 16, fontWeight: '600', color: '#2E4A3E', letterSpacing: 1 },
  tagSub: { fontSize: 11, color: '#8B8B8B', letterSpacing: 0.5 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingText: { fontSize: 14, color: '#2E4A3E', fontWeight: '500' },
  settingValue: { fontSize: 14, color: '#8B8B8B', fontWeight: '500' },
  settingDivider: { height: 1, backgroundColor: 'rgba(46, 74, 62, 0.08)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: { backgroundColor: '#E8EDE8', borderRadius: 12, padding: 24, width: '80%', gap: 16 },
  pickerList: { gap: 4 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6 },
  pickerItemActive: { backgroundColor: '#2E4A3E' },
  pickerItemText: { fontSize: 14, color: '#2E4A3E', fontWeight: '600', letterSpacing: 1, textAlign: 'center' },
  pickerItemTextActive: { color: '#F0F5F0' },
  modalBox: { backgroundColor: '#E8EDE8', borderRadius: 12, width: '90%', maxHeight: '85%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 11, fontWeight: '800', color: '#2E4A3E', letterSpacing: 2 },
  modalClose: { fontSize: 11, color: '#8B8B8B', fontWeight: '700', letterSpacing: 1.5 },
  modalScroll: { paddingHorizontal: 24, paddingBottom: 24 },
  modalText: { fontSize: 13, color: '#2E4A3E', lineHeight: 20 },
  deleteModalBox: { borderRadius: 12, padding: 28, width: '82%', gap: 16, alignItems: 'center' },
  deleteModalIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(192,57,43,0.12)', justifyContent: 'center', alignItems: 'center' },
  deleteModalTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 2.5, textAlign: 'center' },
  deleteModalText: { fontSize: 13, lineHeight: 20, textAlign: 'center', letterSpacing: 0.3 },
  deleteModalWarning: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  deleteModalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  deleteModalCancel: { flex: 1, paddingVertical: 13, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteModalCancelText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center', width: '100%' },
  deleteModalConfirm: { flex: 1, paddingVertical: 13, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  deleteModalConfirmText: { fontSize: 11, color: '#fff', fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', width: '100%' },
  adminModalBox: { borderRadius: 12, padding: 28, width: '82%', gap: 16 },
  adminInput: { borderRadius: 6, borderWidth: 1, padding: 14, fontSize: 14, fontWeight: '500' },
  adminBodyInput: { minHeight: 100, textAlignVertical: 'top' },
  adminModalActions: { gap: 10 },
  adminSendBtn: { paddingVertical: 13, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  adminSendBtnText: { fontSize: 11, color: '#fff', fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
  adminCancelBtn: { paddingVertical: 13, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  adminCancelBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  blockedOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  blockedCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 24, paddingBottom: 40, maxHeight: '70%' },
  blockedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  blockedTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 2, flex: 1 },
  blockedCount: { fontSize: 13, fontWeight: '600' },
  blockedClose: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  blockedEmpty: { alignItems: 'center', paddingVertical: 40 },
  blockedEmptyText: { fontSize: 13 },
  blockedList: { flexGrow: 0 },
  blockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5 },
  blockedRowLeft: { gap: 4 },
  blockedGhostTag: { fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
  blockedDate: { fontSize: 11 },
  blockedUnblockBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: 'rgba(192,57,43,0.1)' },
  blockedUnblockLabel: { fontSize: 10, fontWeight: '800', color: '#C0392B', letterSpacing: 1.5 },
});