import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ResultScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>Letter Analysis</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Letter Type</Text>
        <Text style={styles.value}>Medical Bill</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>What This Letter Says</Text>
        <Text style={styles.body}>
          This letter is asking you to pay a medical bill of $120.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Deadline</Text>
        <Text style={styles.value}>August 15, 2026</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>What You Need To Do</Text>
        <Text style={styles.listItem}>
          • Check whether your insurance already paid part of the bill.
        </Text>
        <Text style={styles.listItem}>
          • Call the billing department if the amount looks incorrect.
        </Text>
        <Text style={styles.listItem}>• Pay before the deadline to avoid late fees.</Text>
      </View>

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
