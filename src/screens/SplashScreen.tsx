import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Props {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: Props) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
    ]).start(() => {
      onComplete();
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageWrapper, { opacity: titleOpacity }]}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        say the unsaid.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8FAF9F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  imageWrapper: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  subtitle: {
    fontSize: 16,
    color: '#2E4A3E',
    letterSpacing: 3,
    marginTop: 16,
  },
});