import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';
import { saveAnalysisHistoryItem } from '@/lib/history';

type Analysis = Record<string, unknown> & {
  letter_type?: unknown;
  summary?: unknown;
  deadline?: unknown;
  importance?: unknown;
};

type SelectedImage = {
  id: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

class BackendResponseError extends Error {
  constructor(readonly status: number) {
    super(`HTTP_${status}`);
    this.name = 'BackendResponseError';
  }
}

class InvalidAnalysisResponseError extends Error {
  constructor() {
    super('INVALID_ANALYSIS');
    this.name = 'InvalidAnalysisResponseError';
  }
}

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

function getAnalysisText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeHistoryText(value: string) {
  return value
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '•••-••-••••')
    .replace(/\b\d{6,}\b/g, '••••')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateHistoryText(value: string, maximumLength = 60) {
  const characters = Array.from(value);
  return characters.length > maximumLength
    ? `${characters.slice(0, maximumLength).join('')}…`
    : value;
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
      let analysis: Analysis;

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

        if (__DEV__) {
          console.log('[analyze] request started');
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
          method: 'POST',
          body: formData,
        });

        if (__DEV__) {
          console.log('[analyze] response status:', response.status);
        }

        if (!response.ok) {
          throw new BackendResponseError(response.status);
        }

        const parsedAnalysis = (await response.json()) as unknown;

        if (!parsedAnalysis || typeof parsedAnalysis !== 'object' || Array.isArray(parsedAnalysis)) {
          throw new InvalidAnalysisResponseError();
        }

        analysis = parsedAnalysis as Analysis;

        if (__DEV__) {
          console.log('[analyze] response parsed successfully');
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[analyze] request failed:', error);
        }

        if (error instanceof Error && error.message === 'UNSUPPORTED_IMAGE') {
          Alert.alert('分析失败', '其中一张图片格式不受支持，请重新选择。');
        } else if (error instanceof BackendResponseError) {
          const message =
            error.status === 413
              ? '图片文件过大，请缩小图片后再试。'
              : error.status === 400 || error.status === 415 || error.status === 422
                ? '上传的图片无法处理，请确认图片格式和内容后再试。'
                : '暂时无法分析这些信件图片，请确认图片清晰完整后再试。';
          Alert.alert('分析失败', message);
        } else if (error instanceof TypeError) {
          Alert.alert('无法连接服务器', '请检查网络连接后再试。');
        } else {
          Alert.alert('分析失败', '暂时无法分析这些信件图片，请确认图片清晰完整后再试。');
        }

        return;
      }

      try {
        if (__DEV__) {
          console.log('[history] save started');
        }

        const letterType = getAnalysisText(analysis.letter_type);
        const summary = getAnalysisText(analysis.summary);
        const deadline = getAnalysisText(analysis.deadline);
        const importance = getAnalysisText(analysis.importance);
        const historySubtitle = summary || deadline || '点击查看分析结果';

        await saveAnalysisHistoryItem({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          created_at: new Date().toISOString(),
          title: truncateHistoryText(sanitizeHistoryText(letterType || '未识别的信件')),
          subtitle: truncateHistoryText(sanitizeHistoryText(historySubtitle)),
          page_count: selectedImages.length || 1,
          importance: importance || '无法判断',
          result: analysis,
        });

        if (__DEV__) {
          console.log('[history] save completed');
        }
      } catch (historyError) {
        if (__DEV__) {
          console.error('[history] save failed:', historyError);
        }
      }

      try {
        if (__DEV__) {
          console.log('[navigation] opening result');
        }

        router.push({
          pathname: '/result',
          params: {
            analysis: JSON.stringify(analysis),
            pageCount: String(selectedImages.length),
          },
        });
      } catch (navigationError) {
        if (__DEV__) {
          console.error('[navigation] failed:', navigationError);
        }
        Alert.alert(
          '暂时无法显示结果',
          '信件已经分析完成，但结果页面暂时无法打开，请重新尝试。'
        );
      }
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
      <View style={styles.settingsRow}>
        <Pressable
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="打开设置">
          <MaterialIcons name="settings" size={28} color="#111111" />
        </Pressable>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.titleRow}>
          <Image
            source={require('../../assets/logo/black-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            小鹿英文信件助手
          </Text>
        </View>

        <Text style={styles.subtitle}>
          看懂英文信件{'\n'}
          拍张照片，我们帮您用中文解释。
        </Text>
      </View>

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

      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => router.push('/history')}
        accessibilityRole="button"
        accessibilityLabel="打开最近分析">
        <View style={styles.historyButtonIcon}>
          <MaterialIcons name="history" size={28} color="#174f86" />
        </View>
        <View style={styles.historyButtonTextContainer}>
          <Text style={styles.historyButtonTitle}>最近分析</Text>
          <Text style={styles.historyButtonSubtitle}>查看之前的信件分析结果</Text>
        </View>
        <MaterialIcons name="chevron-right" size={28} color="#666666" />
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
    paddingTop: 8,
    paddingBottom: 56,
    backgroundColor: '#ffffff',
  },
  settingsRow: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 52,
  },
  settingsButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f1f1',
  },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 40,
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  logo: {
    width: 38,
    height: 38,
    marginRight: 4,
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 46,
    color: '#000000',
    flexShrink: 1,
  },
  subtitle: {
    width: '100%',
    maxWidth: 330,
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'center',
    color: '#555555',
  },
  historyButton: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9d8e8',
    backgroundColor: '#f4f8fc',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 48,
  },
  historyButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5eff9',
    marginRight: 12,
  },
  historyButtonTextContainer: {
    flex: 1,
  },
  historyButtonTitle: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    color: '#111111',
  },
  historyButtonSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555555',
    marginTop: 2,
  },
  primaryButton: {
    width: '100%',
    minHeight: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    marginBottom: 14,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#111111',
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
    marginTop: 48,
    marginBottom: 20,
  },
  note: {
    fontSize: 16,
    lineHeight: 28,
    color: '#555555',
  },
  previewSection: {
    marginTop: 40,
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
    marginTop: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
