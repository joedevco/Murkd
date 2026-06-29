import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Home01Icon, AddCircleIcon, BellIcon, UserCircleIcon, Settings01Icon,
} from '@hugeicons/core-free-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  activeTab: 'home' | 'post' | 'drops' | 'profile' | 'settings';
  unreadNotifications?: boolean;
  onPressHome?: () => void;
  onPressPost?: () => void;
  onPressDrops?: () => void;
  onPressProfile?: () => void;
  onPressSettings?: () => void;
}

export default function BottomNav({
  activeTab,
  unreadNotifications,
  onPressHome,
  onPressPost,
  onPressDrops,
  onPressProfile,
  onPressSettings,
}: Props) {
  const { colors } = useTheme();

  const tabs = [
    { key: 'home' as const, icon: Home01Icon, label: 'HOME', onPress: onPressHome },
    { key: 'post' as const, icon: AddCircleIcon, label: 'POST', onPress: onPressPost },
    { key: 'drops' as const, icon: BellIcon, label: 'DROPS', onPress: onPressDrops, showDot: unreadNotifications },
    { key: 'profile' as const, icon: UserCircleIcon, label: 'PROFILE', onPress: onPressProfile },
    { key: 'settings' as const, icon: Settings01Icon, label: 'SETTINGS', onPress: onPressSettings },
  ];

  return (
    <View style={[styles.nav, { backgroundColor: colors.nav, borderTopColor: colors.navBorder }]}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        const color = isActive ? colors.text : colors.textMuted;
        return (
          <TouchableOpacity key={tab.key} style={styles.navItem} activeOpacity={0.7} onPress={tab.onPress}>
            <View style={tab.showDot ? styles.notifIconWrapper : undefined}>
              <HugeiconsIcon icon={tab.icon} size={24} color={color} />
              {tab.showDot && <View style={styles.notifDot} />}
            </View>
            <Text style={[styles.navLabel, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    letterSpacing: 2,
  },
  notifIconWrapper: {
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E83D3D',
  },
});
