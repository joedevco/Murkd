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
import { LockIcon, EyeIcon, EyeOffIcon } from '@hugeicons/core-free-icons';
import { supabase } from '../lib/supabase';

interface Props {
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      await supabase.auth.signOut();
      onDone();
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
        <Text style={styles.welcome}>SET NEW PASSWORD</Text>
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
          <View style={styles.form}>
            <Text style={styles.instruction}>
              Enter your new password below. Make sure it's at least 8 characters with uppercase, lowercase, number, and a special character.
            </Text>

            <View style={styles.inputWrapper}>
              <HugeiconsIcon icon={LockIcon} size={20} color="#8B8B8B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="NEW PASSWORD"
                placeholderTextColor="#4A4A4A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleReset}
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

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, (!password) && { opacity: 0.5 }]}
              onPress={handleReset}
              activeOpacity={0.8}
              disabled={loading || !password}
            >
              {loading ? (
                <ActivityIndicator color="#F0F5F0" />
              ) : (
                <Text style={styles.buttonText}>UPDATE PASSWORD</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  errorText: {
    color: '#E83D3D',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
