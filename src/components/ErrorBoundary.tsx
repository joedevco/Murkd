import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>SOMETHING WENT WRONG</Text>
          <Text style={styles.subtitle}>Murkd ran into an unexpected issue.</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.buttonText}>TAP TO RETRY</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EDE8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emoji: { fontSize: 40 },
  title: { fontSize: 16, fontWeight: '900', color: '#2E4A3E', letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#8B8B8B', textAlign: 'center', lineHeight: 20 },
  button: {
    marginTop: 16,
    backgroundColor: '#2E4A3E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonText: { fontSize: 11, color: '#F0F5F0', fontWeight: '700', letterSpacing: 1.5 },
});
