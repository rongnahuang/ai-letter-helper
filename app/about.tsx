import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LinkRowProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  isLast?: boolean;
};

function LinkRow({ label, accessibilityLabel, onPress, isLast = false }: LinkRowProps) {
  return (
    <TouchableOpacity
      style={[styles.linkRow, !isLast && styles.linkBorder]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Text style={styles.linkText}>{label}</Text>
      <MaterialIcons name="chevron-right" size={28} color="#666666" />
    </TouchableOpacity>
  );
}

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.appCard}>
          <Text style={styles.appName}>AI信件助手</Text>
          <Text style={styles.description}>
            帮助中文用户看懂英文信件、识别重要事项，并理解表格填写要求。
          </Text>
          <Text style={styles.version}>当前版本：0.5.1</Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.note}>• AI分析可能出错，请以原始信件为准。</Text>
          <Text style={styles.note}>• 本应用不会替您作出法律、医疗或财务决定。</Text>
        </View>

        <View style={styles.linksCard}>
          <LinkRow
            label="隐私政策"
            accessibilityLabel="打开隐私政策"
            onPress={() => router.push('/privacy-policy')}
          />
          <LinkRow
            label="免责声明"
            accessibilityLabel="打开免责声明"
            onPress={() => router.push('/disclaimer')}
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
  appCard: {
    padding: 22,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '700',
    color: '#111111',
  },
  description: {
    fontSize: 18,
    lineHeight: 29,
    color: '#333333',
    marginTop: 12,
  },
  version: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
    color: '#555555',
    marginTop: 16,
  },
  noteCard: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#fff8e1',
    marginBottom: 16,
  },
  note: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
    color: '#4a3b00',
    marginBottom: 8,
  },
  linksCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  linkRow: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d9d9d9',
  },
  linkText: {
    flex: 1,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '600',
    color: '#111111',
  },
});
