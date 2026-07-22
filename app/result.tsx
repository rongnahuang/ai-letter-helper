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
      <Text style={styles.title}>Letter Analysis</Text>

      {analysisData ? (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Letter Type</Text>
            <Text style={styles.value}>{analysisData.letter_type}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>What This Letter Says</Text>
            <Text style={styles.body}>{analysisData.summary}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Deadline</Text>
            <Text style={styles.value}>{analysisData.deadline}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>What You Need To Do</Text>
            {analysisData.actions.map((action, index) => (
              <Text key={`${index}-${action}`} style={styles.listItem}>
                • {action}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Analysis Unavailable</Text>
          <Text style={styles.body}>Please return home and analyze the letter again.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Back to Home</Text>
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
