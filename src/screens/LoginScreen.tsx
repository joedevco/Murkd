import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Mail02Icon, LockIcon, EyeIcon, EyeOffIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginScreen({ onLogin, onRegister, onForgotPassword }: Props) {
  const { signIn } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
  setLoading(true);
  setError(null);
  const err = await signIn(email, password);
  if (err) {
    setError(err);
    setLoading(false);
  } else {
    onLogin();
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
        <Text style={styles.welcome}>WELCOME BACK</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
      >
        <View style={styles.form}>
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
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={[styles.inputWrapper, error && styles.inputError]}>
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
              returnKeyType="done"
              onFocus={() => scrollRef.current?.scrollTo({ y: 80, animated: true })}
              onSubmitEditing={handleLogin}
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

          <TouchableOpacity onPress={onForgotPassword} activeOpacity={0.7}>
            <Text style={styles.forgotPassword}>FORGOT PASSWORD?</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F0F5F0" />
            ) : (
              <Text style={styles.buttonText}>SIGN IN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={onRegister} activeOpacity={0.7}>
            <Text style={styles.signupText}>
              NEW HERE?{' '}
              <Text style={styles.signupLink}>CREATE ACCOUNT</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
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
    marginBottom: 64,
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
  inputError: {
    borderWidth: 1,
    borderColor: '#E83D3D',
  },
  input: {
    flex: 1,
    paddingVertical: 20,
    fontSize: 16,
    color: '#2E4A3E',
    letterSpacing: 1,
  },
  forgotPassword: {
    color: '#F0F5F0',
    fontSize: 13,
    textAlign: 'right',
    letterSpacing: 1.5,
    opacity: 0.7,
    marginTop: -4,
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
  signupText: {
    color: '#F0F5F0',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 1.5,
    opacity: 0.7,
    marginTop: 8,
  },
  signupLink: {
    color: '#F0F5F0',
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorText: {
    color: '#E83D3D',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
