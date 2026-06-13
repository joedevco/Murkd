import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import voidImage from '../assets/voidImage';
import shyGuy from '../assets/shyGuy';
import friendsOnline from '../assets/friendsOnline';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  headline: string;
  description: string;
  headlineSize: number;
}

const slides: Slide[] = [
  {
    id: '1',
    headline: 'No names. No faces. Just truth.',
    description: 'Murkd is where men say what they actually think.',
    headlineSize: 32,
  },
  {
    id: '2',
    headline: 'Post.Vote.Disappear.',
    description: 'Confessions vanish in 48 hours. Your shadow stays forever.',
    headlineSize: 36,
  },
  {
    id: '3',
    headline: "You're not alone.",
    description:
      "Thousands of men already said the thing you haven't.",
    headlineSize: 36,
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const slideImages: Record<string, string> = {
    '1': voidImage,
    '2': shyGuy,
    '3': friendsOnline,
  };

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={styles.slide}>
      <SvgXml xml={slideImages[item.id]} width={width * 0.55} height={width * 0.55} style={styles.image} />
      <Text
        style={[styles.headline, { fontSize: item.headlineSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {item.headline}
      </Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skip} onPress={onComplete} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8FAF9F',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  image: {
    marginBottom: 40,
  },
  headline: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F0F5F0',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#F0F5F0',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    paddingTop: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0F5F0',
    opacity: 0.4,
    marginHorizontal: 4,
  },
  activeDot: {
    opacity: 1,
    width: 24,
  },
  button: {
    backgroundColor: '#2E4A3E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#F0F5F0',
    fontSize: 17,
    fontWeight: '600',
  },
  skip: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: '#F0F5F0',
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.8,
  },
});
