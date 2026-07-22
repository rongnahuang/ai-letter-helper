import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';

type Analysis = {
  letter_type: string;
  summary: string;
  deadline: string;
  actions: string[];
};

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
    if (!selectedImageUri) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const uriWithoutQuery = selectedImageUri.split('?')[0];
      const extension = uriWithoutQuery.match(/\.([^.\/]+)$/)?.[1].toLowerCase();
      const imageTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        heic: 'image/heic',
        heif: 'image/heic',
      };
      const supportedExtension = extension && imageTypes[extension] ? extension : 'jpg';
      const mimeType = imageTypes[supportedExtension];
      const formData = new FormData();

      formData.append(
        'file',
        {
          uri: selectedImageUri,
          name: `letter.${supportedExtension}`,
          type: mimeType,
        } as unknown as Blob
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? `The server returned error ${response.status}.`);
      }

      const analysis = (await response.json()) as Analysis;

      router.push({
        pathname: '/result',
        params: { analysis: JSON.stringify(analysis) },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The letter could not be analyzed.';
      Alert.alert(
        'Analysis Failed',
        `${message}\n\nCheck that the backend is running and API_BASE_URL uses your Mac's Wi-Fi IP address.`
      );
    } finally {
      setIsAnalyzing(false);
    }
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
