import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function SkeletonBox({ width, height, borderRadius = 4, style }: {
  width: number | string; height: number; borderRadius?: number; style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#2E4A3E', opacity }, style]} />;
}

export function PostSkeleton() {
  return (
    <View>
      <View style={skeletonStyles.postPadding}>
        <View style={skeletonStyles.headerRow}>
          <View style={skeletonStyles.headerLeft}>
            <SkeletonBox width={72} height={10} borderRadius={3} />
            <SkeletonBox width={40} height={8} borderRadius={3} style={{ marginLeft: 8 }} />
          </View>
          <SkeletonBox width={32} height={10} borderRadius={3} />
        </View>
        <View style={skeletonStyles.contentBlock}>
          <SkeletonBox width="100%" height={13} borderRadius={3} />
          <SkeletonBox width="88%" height={13} borderRadius={3} style={{ marginTop: 7 }} />
          <SkeletonBox width="60%" height={13} borderRadius={3} style={{ marginTop: 7 }} />
        </View>
        <View style={skeletonStyles.reactionsRow}>
          <SkeletonBox width={40} height={10} borderRadius={3} />
          <SkeletonBox width={40} height={10} borderRadius={3} />
          <SkeletonBox width={28} height={10} borderRadius={3} style={{ marginLeft: 'auto' as any }} />
        </View>
      </View>
      <View style={skeletonStyles.divider} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  postPadding: { paddingHorizontal: 32, paddingVertical: 20, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  contentBlock: { gap: 0 },
  reactionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  divider: { height: 1, backgroundColor: 'rgba(46,74,62,0.1)' },
});
