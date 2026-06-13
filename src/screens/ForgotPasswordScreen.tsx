import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Mail02Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: Props) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const err = await resetPassword(email.trim());
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.decorCorner} />

      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color="#F0F5F0" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>
          MURK<Text style={styles.titleAccent}>D</Text>
        </Text>
        <Text style={styles.tagline}>NO NAME. NO FACE. NO TRACE.</Text>
        <View style={styles.separator} />
        <Text style={styles.welcome}>RESET PASSWORD</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            <View style={styles.sentContainer}>
              <View style={styles.sentIcon}>
                <Text style={styles.sentIconText}>✓</Text>
              </View>
              <Text style={styles.sentTitle}>EMAIL SENT</Text>
              <Text style={styles.sentText}>
                Check your email for a password reset link. If you don't see it, check your spam folder.
              </Text>
              <TouchableOpacity style={styles.backToLoginBtn} onPress={onBack} activeOpacity={0.8}>
                <Text style={styles.backToLoginBtnText}>BACK TO LOGIN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.instruction}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              <View style={styles.inputWrapper}>
                <HugeiconsIcon icon={Mail02Icon} size={20} color="#8B8B8B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="EMAIL"
                  placeholderTextColor="#4A4A4A"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, !email.trim() && { opacity: 0.5 }]}
                onPress={handleReset}
                activeOpacity={0.8}
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#F0F5F0" />
                ) : (
                  <Text style={styles.buttonText}>SEND LINK</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#8FAF9F',
    paddingTop: 60,
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
  backButton: {
    position: 'absolute',
    top: 56,
    left: 24,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 74, 62, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 20,
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
  content: {
    flex: 1,
  },
  form: {
    gap: 20,
  },
  instruction: {
    fontSize: 13,
    color: '#F0F5F0',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
    opacity: 0.8,
    marginBottom: 8,
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
  errorText: {
    color: '#E83D3D',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sentContainer: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 16,
  },
  sentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E4A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentIconText: {
    fontSize: 28,
    color: '#F0F5F0',
    fontWeight: '800',
  },
  sentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F0F5F0',
    letterSpacing: 3,
  },
  sentText: {
    fontSize: 13,
    color: '#F0F5F0',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
    opacity: 0.8,
    paddingHorizontal: 16,
  },
  backToLoginBtn: {
    backgroundColor: '#2E4A3E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 4,
    marginTop: 16,
  },
  backToLoginBtnText: {
    color: '#F0F5F0',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
