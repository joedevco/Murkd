import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Mail02Icon, LockIcon, EyeIcon, EyeOffIcon, Calendar01Icon, HashtagIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';
import { generateGhostTag } from '../lib/api';

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

interface Props {
  onRegister: () => void;
  onLogin: () => void;
}

export default function RegisterScreen({ onRegister, onLogin }: Props) {
  const { signUp } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const dobRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [ghostTag] = useState(generateGhostTag);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      setLoading(false);
      return;
    }

    const parts = dob.replace(/\s/g, '').split('/');
    if (parts.length === 3) {
      const birthDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 18) {
        setError('You must be at least 18 years old');
        setLoading(false);
        return;
      }
    }

    const err = await signUp(email, password, {
      ghost_tag: ghostTag,
      ghost_tag_created_at: new Date().toISOString(),
      dob,
    });
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      onRegister();
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.decorCorner} />

      <View style={styles.header}>
        <Text style={styles.title}>
          MURK<Text style={styles.titleAccent}>D</Text>
        </Text>
        <Text style={styles.tagline}>NO NAME. NO FACE. NO TRACE.</Text>
        <View style={styles.separator} />
        <Text style={styles.welcome}>CREATE ACCOUNT</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
      >
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <HugeiconsIcon icon={Mail02Icon} size={20} color="#8B8B8B" style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#4A4A4A"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <HugeiconsIcon icon={LockIcon} size={20} color="#8B8B8B" style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="PASSWORD"
                placeholderTextColor="#4A4A4A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
                onFocus={() => scrollRef.current?.scrollTo({ y: 104, animated: true })}
                onSubmitEditing={() => dobRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.6}>
                <HugeiconsIcon
                  icon={showPassword ? EyeOffIcon : EyeIcon}
                  size={20}
                  color="#8B8B8B"
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DATE OF BIRTH</Text>
            <View style={styles.inputWrapper}>
              <HugeiconsIcon icon={Calendar01Icon} size={20} color="#8B8B8B" style={styles.inputIcon} />
              <TextInput
                ref={dobRef}
                style={styles.input}
                placeholder="MM / DD / YYYY"
                placeholderTextColor="#4A4A4A"
                value={dob}
                onChangeText={setDob}
                returnKeyType="done"
                onFocus={() => scrollRef.current?.scrollTo({ y: 208, animated: true })}
                onSubmitEditing={() => dobRef.current?.blur()}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>GHOST TAG</Text>
            <View style={[styles.inputWrapper, styles.inputDisabled]}>
              <HugeiconsIcon icon={HashtagIcon} size={20} color="#8B8B8B" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={ghostTag}
                editable={false}
              />
            </View>
            <Text style={styles.ghostHint}>auto-generated · not linked to your identity · resets every 30 days</Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>that's all we need</Text>
            <View style={styles.dividerLine} />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F0F5F0" />
            ) : (
              <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onLogin} activeOpacity={0.7}>
            <Text style={styles.loginText}>
              ALREADY HAVE AN ACCOUNT?{' '}
              <Text style={styles.loginLink}>SIGN IN</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Posts disappear after 48 hours. Murkd never links my ghost tag or email to what I post.{' '}
            <Text style={styles.disclaimerLink} onPress={() => setShowPrivacy(true)}>Privacy policy</Text>
          </Text>
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <Modal visible={showPrivacy} transparent animationType="fade" onRequestClose={() => setShowPrivacy(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>PRIVACY POLICY</Text>
              <TouchableOpacity onPress={() => setShowPrivacy(false)} activeOpacity={0.7}>
                <Text style={styles.modalClose}>CLOSE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>{privacyContent}</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#8FAF9F',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  decorCorner: {
    position: 'absolute',
    top: 48,
    right: 48,
    width: 80,
    height: 80,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2E4A3E',
    opacity: 0.4,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#F0F5F0',
    marginBottom: 8,
    letterSpacing: 8,
  },
  titleAccent: {
    color: '#2E4A3E',
  },
  tagline: {
    fontSize: 12,
    color: '#F0F5F0',
    letterSpacing: 4,
    marginTop: 8,
    opacity: 0.7,
  },
  separator: {
    width: 48,
    height: 3,
    backgroundColor: '#2E4A3E',
    marginVertical: 20,
  },
  welcome: {
    fontSize: 13,
    color: '#F0F5F0',
    letterSpacing: 5,
    opacity: 0.5,
  },
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    color: '#F0F5F0',
    letterSpacing: 2,
    opacity: 0.7,
    marginLeft: 4,
  },
  inputDisabled: {
    opacity: 0.8,
  },
  inputReadOnly: {
    color: '#1A3A2A',
  },
  ghostHint: {
    fontSize: 10,
    color: '#F0F5F0',
    letterSpacing: 1,
    opacity: 0.5,
    marginLeft: 4,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5F0',
    borderRadius: 4,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
    opacity: 0.5,
  },
  eyeIcon: {
    marginLeft: 8,
    opacity: 0.4,
  },
  input: {
    flex: 1,
    paddingVertical: 20,
    fontSize: 16,
    color: '#2E4A3E',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#2E4A3E',
    paddingVertical: 20,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2E4A3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#F0F5F0',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F5F0',
    opacity: 0.15,
  },
  dividerText: {
    color: '#F0F5F0',
    fontSize: 12,
    letterSpacing: 3,
    opacity: 0.4,
  },
  loginText: {
    color: '#F0F5F0',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 1.5,
    opacity: 0.7,
    marginTop: 8,
  },
  loginLink: {
    color: '#F0F5F0',
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 1,
  },
  disclaimer: {
    fontSize: 10,
    color: '#F0F5F0',
    letterSpacing: 0.8,
    opacity: 0.45,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  disclaimerLink: {
    fontWeight: '700',
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#E83D3D',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#E8EDE8',
    borderRadius: 12,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E4A3E',
    letterSpacing: 2,
  },
  modalClose: {
    fontSize: 11,
    color: '#8B8B8B',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalText: {
    fontSize: 13,
    color: '#2E4A3E',
    lineHeight: 20,
  },
});
