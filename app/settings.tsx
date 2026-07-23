import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'admin@whileloophk.com';

type MenuItemProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  isLast?: boolean;
};

function MenuItem({ label, accessibilityLabel, onPress, isLast = false }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={28} color="#666666" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const openSupportEmail = async () => {
    const emailUrl = `mailto:${SUPPORT_EMAIL}`;

    try {
      const canOpen = await Linking.canOpenURL(emailUrl);

      if (!canOpen) {
        throw new Error('MAIL_UNAVAILABLE');
      }

      await Linking.openURL(emailUrl);
    } catch {
      Alert.alert('无法打开邮件', '请稍后再试，或通过应用商店页面联系我们。');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.card}>
          <MenuItem
            label="隐私政策"
            accessibilityLabel="打开隐私政策"
            onPress={() => router.push('/privacy-policy')}
          />
          <MenuItem
            label="免责声明"
            accessibilityLabel="打开免责声明"
            onPress={() => router.push('/disclaimer')}
          />
          <MenuItem
            label="联系我们"
            accessibilityLabel="通过邮件联系我们"
            onPress={openSupportEmail}
          />
          <MenuItem
            label="关于应用"
            accessibilityLabel="打开关于应用"
            onPress={() => router.push('/about')}
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  menuItem: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d9d9d9',
  },
  menuLabel: {
    flex: 1,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '600',
    color: '#111111',
  },
});
