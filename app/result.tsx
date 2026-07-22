import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Analysis = {
  letter_type: string;
  summary: string;
  deadline: string;
  actions: string[];
};

export default function ResultScreen() {
  const router = useRouter();
  const { analysis } = useLocalSearchParams<{ analysis?: string | string[] }>();
  const analysisParam = Array.isArray(analysis) ? analysis[0] : analysis;
  let analysisData: Analysis | null = null;

  if (analysisParam) {
    try {
      analysisData = JSON.parse(analysisParam) as Analysis;
    } catch {
      analysisData = null;
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>信件分析结果</Text>

      {analysisData ? (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>这是什么信？</Text>
            <Text style={styles.value}>{analysisData.letter_type}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>这封信在说什么？</Text>
            <Text style={styles.body}>{analysisData.summary}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>截止日期：</Text>
            <Text style={styles.value}>{analysisData.deadline}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>您现在需要做什么？</Text>
            {analysisData.actions.map((action, index) => (
              <Text key={`${index}-${action}`} style={styles.listItem}>
                • {action}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>暂时无法显示分析结果</Text>
          <Text style={styles.body}>请返回首页，重新上传信件并再次分析。</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>返回首页</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 24,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    lineHeight: 29,
    color: '#333333',
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333333',
  },
  listItem: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333333',
    marginBottom: 8,
  },
  button: {
    paddingVertical: 17,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#111111',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
