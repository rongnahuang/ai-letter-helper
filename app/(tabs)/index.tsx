import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';

type Analysis = {
  letter_type: string;
  summary: string;
  deadline: string;
  actions: string[];
};

type SelectedImage = {
  id: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

const MAX_IMAGES = 10;
const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);
const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
};

function createImageId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getFileExtension(value: string) {
  const valueWithoutQuery = value.split(/[?#]/)[0];
  return valueWithoutQuery.match(/\.([^.\/]+)$/)?.[1].toLowerCase();
}

function getUploadMetadata(image: SelectedImage, index: number) {
  const providedMimeType = image.mimeType?.trim().toLowerCase();

  if (providedMimeType && !SUPPORTED_MIME_TYPES.has(providedMimeType)) {
    return null;
  }

  const extension = getFileExtension(image.fileName ?? image.uri);
  const extensionMimeType = extension ? MIME_TYPES_BY_EXTENSION[extension] : undefined;

  if (!providedMimeType && extension && !extensionMimeType) {
    return null;
  }

  const mimeType = providedMimeType ?? extensionMimeType ?? 'image/jpeg';
  const fallbackExtension =
    Object.entries(MIME_TYPES_BY_EXTENSION).find(([, type]) => type === mimeType)?.[0] ?? 'jpg';

  return {
    name: image.fileName ?? `letter-page-${index + 1}.${fallbackExtension}`,
    type: mimeType,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const showLimitAlert = () => {
    Alert.alert('已达到上限', '每次最多可以上传10张图片。');
  };

  const appendAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const existingUris = new Set(selectedImages.map((image) => image.uri));
    const uniqueAssets = assets.filter((asset) => {
      if (existingUris.has(asset.uri)) {
        return false;
      }
      existingUris.add(asset.uri);
      return true;
    });
    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const acceptedAssets = uniqueAssets.slice(0, remainingSlots);

    if (uniqueAssets.length > remainingSlots) {
      showLimitAlert();
    }

    if (acceptedAssets.length > 0) {
      setSelectedImages((current) => [
        ...current,
        ...acceptedAssets.map((asset) => ({
          id: createImageId(),
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        })),
      ]);
    }
  };

  const takePhoto = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      showLimitAlert();
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        '需要相机权限',
        '请允许使用相机，以便拍摄需要分析的信件。'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      appendAssets([result.assets[0]]);
    }
  };

  const chooseFromLibrary = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      showLimitAlert();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      selectionLimit: MAX_IMAGES - selectedImages.length,
      quality: 1,
    });

    if (!result.canceled) {
      appendAssets(result.assets);
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages((current) => current.filter((image) => image.id !== id));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setSelectedImages((current) => {
      const destination = index + direction;

      if (destination < 0 || destination >= current.length) {
        return current;
      }

      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  };

  const analyzeLetter = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('请先添加图片', '请先添加至少一张信件图片。');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();

      selectedImages.forEach((image, index) => {
        const metadata = getUploadMetadata(image, index);

        if (!metadata) {
          throw new Error('UNSUPPORTED_IMAGE');
        }

        formData.append(
          'files',
          {
            uri: image.uri,
            name: metadata.name,
            type: metadata.type,
          } as unknown as Blob
        );
      });

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
        params: {
          analysis: JSON.stringify(analysis),
          pageCount: String(selectedImages.length),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'UNSUPPORTED_IMAGE'
          ? '其中一张图片格式不受支持，请重新选择。'
          : '暂时无法分析这些信件图片，请确认图片清晰完整后再试。';
      Alert.alert('分析失败', message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeButtonText = isAnalyzing
    ? `正在分析${selectedImages.length}页信件，请稍候...`
    : selectedImages.length === 0
      ? '请先添加信件图片'
      : `开始分析${selectedImages.length}页信件`;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>AI信件助手</Text>

      <Text style={styles.subtitle}>看不懂英文信件？拍张照片，我们帮您用中文解释。</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
        <Text style={styles.primaryButtonText}>拍照</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={chooseFromLibrary}>
        <Text style={styles.secondaryButtonText}>从相册选择</Text>
      </TouchableOpacity>

      <Text style={styles.guidance}>
        请按照信件顺序添加图片，例如先添加第1页，再添加第2页。
      </Text>
      <Text style={styles.note}>建议拍摄完整页面，避免裁掉日期、电话号码、签名位置和背面内容。</Text>

      {selectedImages.length > 0 && (
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>已选择 {selectedImages.length} 页</Text>
            <TouchableOpacity style={styles.clearButton} onPress={() => setSelectedImages([])}>
              <Text style={styles.clearButtonText}>清空全部</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedImages.map((image, index) => (
              <View key={image.id} style={styles.imageCard}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} resizeMode="cover" />
                <Text style={styles.pageLabel}>第{index + 1}页</Text>

                <View style={styles.moveButtons}>
                  <TouchableOpacity
                    style={[styles.smallButton, index === 0 && styles.disabledSmallButton]}
                    onPress={() => moveImage(index, -1)}
                    disabled={index === 0}>
                    <Text style={styles.smallButtonText}>前移</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.smallButton,
                      index === selectedImages.length - 1 && styles.disabledSmallButton,
                    ]}
                    onPress={() => moveImage(index, 1)}
                    disabled={index === selectedImages.length - 1}>
                    <Text style={styles.smallButtonText}>后移</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={() => removeImage(image.id)}>
                  <Text style={styles.deleteButtonText}>删除</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.analyzeButton,
          (isAnalyzing || selectedImages.length === 0) && styles.disabledButton,
        ]}
        onPress={analyzeLetter}
        disabled={isAnalyzing || selectedImages.length === 0}>
        <Text style={styles.primaryButtonText}>{analyzeButtonText}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
  guidance: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  note: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555555',
    marginBottom: 20,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  clearButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#a32020',
  },
  imageCard: {
    width: 170,
    padding: 12,
    marginRight: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: '#ffffff',
  },
  thumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  pageLabel: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 10,
    color: '#111111',
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
  },
  disabledSmallButton: {
    opacity: 0.35,
  },
  smallButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  deleteButton: {
    minHeight: 44,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f0',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a32020',
  },
  analyzeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#111111',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
