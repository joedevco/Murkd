import { useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home01Icon, AddCircleIcon, BellIcon, UserCircleIcon, Settings01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { createPost } from '../lib/api';

interface Props {
  onBack: () => void;
  onPostDone: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToNotifications?: () => void;
}

const TAGS = ['WORK', 'RELATIONSHIPS', 'FAMILY', 'MENTAL HEALTH', 'MONEY', 'SECRET', 'REGRET', 'OTHER'];
const MAX = 280;
const WARN_AT = 240;

export default function PostScreen({ onBack, onPostDone, onNavigateToProfile, onNavigateToSettings, onNavigateToNotifications }: Props) {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const ghostTag = (user?.user_metadata?.ghost_tag as string | undefined)?.replace('@', '');
  const [text, setText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postBtnScale = useRef(new Animated.Value(1)).current;

  const showToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const animatePostBtn = () => {
    Animated.sequence([
      Animated.timing(postBtnScale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(postBtnScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const canPost = text.trim().length > 0 && selectedTag !== null && !posting;
  const remaining = MAX - text.length;
  const nearLimit = remaining <= MAX - WARN_AT;

  const handleTagSelect = (tag: string) => {
    Haptics.selectionAsync();
    setSelectedTag(tag);
  };

  const handlePost = async () => {
    if (!canPost || !ghostTag) return;
    animatePostBtn();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setPosting(true);
    try {
      await createPost(text.trim(), ghostTag, selectedTag);
      onPostDone();
    } catch {
      setPosting(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <Animated.View style={[styles.toast, { opacity: toastOpacity, backgroundColor: theme === 'dark' ? '#1C1C1A' : '#2C2C2A' }]} pointerEvents="none">
        <View style={[styles.toastDot, { backgroundColor: '#E83D3D' }]} />
        <Text style={[styles.toastText, { color: colors.bg }]}>FAILED TO POST — TRY AGAIN</Text>
      </Animated.View>

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.6} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.textMuted }]}>CANCEL</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <View style={[styles.ghostDot, { backgroundColor: colors.accentMuted }]} />
          <Text style={[styles.ghostTagText, { color: colors.text }]}>{ghostTag ?? 'unknown'}</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: postBtnScale }] }}>
          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: colors.text }, !canPost && styles.postButtonDisabled]}
            activeOpacity={0.85}
            disabled={!canPost}
            onPress={handlePost}
          >
            {posting ? (
              <ActivityIndicator color={colors.bg} size="small" />
            ) : (
              <Text style={[styles.postButtonText, { color: colors.bg }]}>DROP IT</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.navBorder }]} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Input area */}
          <View style={styles.inputArea}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="What are you carrying today?"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={t => t.length <= MAX && setText(t)}
              multiline
              scrollEnabled={false}
            />
            {text.length > 0 && (
              <View style={styles.counterRow}>
                <View style={[styles.counterBar, { width: `${(text.length / MAX) * 100}%` as any, backgroundColor: colors.text, opacity: 0.3 }, nearLimit && styles.counterBarWarn]} />
                <Text style={[styles.counterText, { color: colors.textMuted }, nearLimit && styles.counterTextWarn]}>
                  {remaining}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.navBorder }]} />

          {/* Tags */}
          <View style={styles.tagSection}>
            <Text style={[styles.tagSectionLabel, { color: colors.text }]}>TAG YOUR CONFESSION *</Text>
            <View style={styles.tagsGrid}>
              {TAGS.map(tag => {
                const active = selectedTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagPill, { borderColor: colors.navBorder, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,74,62,0.04)' }, active && { backgroundColor: colors.text, borderColor: colors.text }]}
                    activeOpacity={0.7}
                    onPress={() => handleTagSelect(tag)}
                  >
                    {active && <View style={[styles.tagDot, { backgroundColor: colors.accentMuted }]} />}
                    <Text style={[styles.tagPillText, { color: colors.text }, active && { color: colors.bg }]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.navBorder }]} />

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={[styles.disclaimerLine, { color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(46,74,62,0.35)' }]}>Vanishes in 48h · No name · No trace</Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      </KeyboardAvoidingView>

      <View style={[styles.nav, { backgroundColor: colors.nav, borderTopColor: colors.navBorder }]}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onBack}>
          <HugeiconsIcon icon={Home01Icon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <HugeiconsIcon icon={AddCircleIcon} size={24} color={colors.text} />
          <Text style={[styles.navLabel, { color: colors.text }]}>POST</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={onNavigateToNotifications}>
          <HugeiconsIcon icon={BellIcon} size={24} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>DROPS</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDE8' },

  toast: {
    position: 'absolute', bottom: 108, left: 24, right: 24, zIndex: 99,
    backgroundColor: '#1C1C1A', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  toastDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E83D3D' },
  toastText: { fontSize: 11, color: '#F0F5F0', letterSpacing: 1.5, fontWeight: '600' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24,
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  cancelText: { fontSize: 13, color: '#8B8B8B', letterSpacing: 1.5, fontWeight: '600' },

  topBarCenter: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ghostDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8FAF9F' },
  ghostTagText: { fontSize: 12, color: '#2E4A3E', fontWeight: '700', letterSpacing: 1 },

  postButton: {
    backgroundColor: '#2E4A3E', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 6, minWidth: 88, alignItems: 'center',
  },
  postButtonDisabled: { opacity: 0.3 },
  postButtonText: { color: '#F0F5F0', fontSize: 11, fontWeight: '800', letterSpacing: 2.5 },

  divider: { height: 1, backgroundColor: 'rgba(46,74,62,0.08)' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  inputArea: {
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20,
  },
  input: {
    fontSize: 18, color: '#2E4A3E', lineHeight: 28,
    textAlignVertical: 'top', minHeight: 160,
    fontWeight: '400',
  },
  counterRow: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  counterBar: {
    height: 2, backgroundColor: '#2E4A3E', borderRadius: 2, opacity: 0.3,
    maxWidth: '85%' as any,
  },
  counterBarWarn: { backgroundColor: '#E83D3D', opacity: 0.7 },
  counterText: { fontSize: 11, color: '#8B8B8B', letterSpacing: 0.5, marginLeft: 'auto' as any },
  counterTextWarn: { color: '#E83D3D', fontWeight: '600' },

  tagSection: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  tagSectionLabel: {
    fontSize: 10, color: '#2E4A3E', letterSpacing: 2.5, fontWeight: '700',
    opacity: 0.4, marginBottom: 14,
  },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(46,74,62,0.18)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
    backgroundColor: 'rgba(46,74,62,0.04)',
  },
  tagPillActive: {
    backgroundColor: '#2E4A3E', borderColor: '#2E4A3E',
  },
  tagDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8FAF9F' },
  tagPillText: { fontSize: 10, color: '#2E4A3E', fontWeight: '700', letterSpacing: 1.5 },
  tagPillTextActive: { color: '#F0F5F0' },

  disclaimer: { paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center' },
  disclaimerLine: { fontSize: 11, color: 'rgba(46,74,62,0.35)', letterSpacing: 1, textAlign: 'center' },

  nav: {
    flexDirection: 'row', backgroundColor: '#F0F5F0',
    paddingTop: 12, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: 'rgba(46,74,62,0.1)',
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 10, color: '#8B8B8B', letterSpacing: 2 },
  navLabelActive: { color: '#2E4A3E' },
});