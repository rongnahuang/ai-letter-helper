import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access to take a photo of your letter.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const chooseFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const analyzeLetter = async () => {
    setIsAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    router.push('/result');
    setIsAnalyzing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Letter Helper</Text>

      <Text style={styles.subtitle}>
        Take a photo of your letter and get a clear Chinese explanation.
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
        <Text style={styles.primaryButtonText}>Take a Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={chooseFromLibrary}>
        <Text style={styles.secondaryButtonText}>Choose From Library</Text>
      </TouchableOpacity>

      {selectedImageUri && (
        <>
          <Image
            source={{ uri: selectedImageUri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]}
            onPress={analyzeLetter}
            disabled={isAnalyzing}>
            <Text style={styles.primaryButtonText}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Letter'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    marginBottom: 36,
    color: '#555555',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#111111',
    marginBottom: 14,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111111',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
  imagePreview: {
    width: '100%',
    height: 240,
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  analyzeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#111111',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
