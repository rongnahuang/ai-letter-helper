import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { HAS_SEEN_ONBOARDING_KEY } from '@/constants/onboarding';

const brandLogo = require('../assets/logo/black-logo.png');
const PAGE_COUNT = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const isLastPage = pageIndex === PAGE_COUNT - 1;

  const finishOnboarding = async () => {
    setIsFinishing(true);

    try {
      await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
      router.replace('/');
    } catch (error) {
      if (__DEV__) {
        console.error('[onboarding] save failed:', error);
      }
      Alert.alert('暂时无法开始使用', '请稍后再试。');
      setIsFinishing(false);
    }
  };

  const continueToNextPage = () => {
    if (isLastPage) {
      void finishOnboarding();
      return;
    }

    setPageIndex((current) => current + 1);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Image source={brandLogo} style={styles.logo} resizeMode="contain" />
        {pageIndex === 0 && (
          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressedTextButton]}
            onPress={() => void finishOnboarding()}
            disabled={isFinishing}
            hitSlop={12}
            accessibilityRole="button">
            <Text style={styles.skipButtonText}>跳过</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}>
        {pageIndex === 0 && (
          <View style={styles.copy}>
            <Text style={styles.title}>看懂英文信，{'\n'}从现在开始。</Text>
            <Text style={styles.body}>拍张照片，{'\n'}我们帮您用中文解释英文信件。</Text>

            <View style={styles.flow} accessibilityLabel="英文信件通过小鹿得到中文解释">
              <View style={styles.documentIcon}>
                <MaterialIcons name="description" size={34} color="#000000" />
              </View>
              <Text style={styles.flowArrow}>↓</Text>
              <Image source={brandLogo} style={styles.flowLogo} resizeMode="contain" />
              <Text style={styles.flowArrow}>↓</Text>
              <Text style={styles.flowResult}>中文解释</Text>
            </View>
          </View>
        )}

        {pageIndex === 1 && (
          <View style={styles.copy}>
            <Text style={styles.title}>支持多页信件</Text>

            <Text style={styles.pageSequence}>① → ② → ③</Text>

            <Text style={styles.body}>请按照页码顺序拍摄或选择图片。</Text>
            <Text style={styles.exampleLabel}>例如：</Text>
            <Text style={styles.example}>第一页 → 第二页 → 第三页</Text>
            <Text style={styles.note}>这样 AI 可以更准确理解整封信。</Text>
          </View>
        )}

        {pageIndex === 2 && (
          <View style={styles.copy}>
            <Text style={styles.title}>小鹿一直陪您</Text>
            <Text style={styles.body}>小鹿会尽力帮助您理解英文信件。</Text>
            <Text style={styles.professionalNote}>
              涉及法律、医疗或重要事项，{'\n'}请咨询相关专业人士。
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination} accessibilityLabel={`第${pageIndex + 1}页，共3页`}>
          {Array.from({ length: PAGE_COUNT }, (_, index) => (
            <View key={index} style={[styles.dot, index === pageIndex && styles.activeDot]} />
          ))}
        </View>

        {pageIndex === 1 && (
          <Pressable
            style={({ pressed }) => [
              styles.previousButton,
              pressed && styles.pressedTextButton,
            ]}
            onPress={() => setPageIndex(0)}
            accessibilityRole="button">
            <Text style={styles.previousButtonText}>上一步</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressedButton,
            isFinishing && styles.disabledButton,
          ]}
          onPress={continueToNextPage}
          disabled={isFinishing}
          accessibilityRole="button">
          <Text style={styles.buttonText}>
            {isLastPage ? (isFinishing ? '正在进入...' : '开始使用') : '下一步'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    position: 'relative',
    minHeight: 92,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 54,
    height: 54,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#444444',
  },
  pressedTextButton: {
    opacity: 0.55,
  },
  page: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  copy: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
  },
  body: {
    maxWidth: 330,
    fontSize: 20,
    lineHeight: 32,
    color: '#333333',
    textAlign: 'center',
  },
  flow: {
    marginTop: 34,
    alignItems: 'center',
  },
  documentIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowLogo: {
    width: 48,
    height: 48,
  },
  flowArrow: {
    marginVertical: 2,
    fontSize: 23,
    lineHeight: 30,
    color: '#777777',
  },
  flowResult: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '700',
    color: '#000000',
  },
  pageSequence: {
    marginVertical: 22,
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  exampleLabel: {
    marginTop: 24,
    fontSize: 17,
    lineHeight: 26,
    color: '#666666',
  },
  example: {
    marginTop: 8,
    fontSize: 19,
    lineHeight: 30,
    fontWeight: '600',
    color: '#111111',
    textAlign: 'center',
  },
  note: {
    marginTop: 24,
    fontSize: 16,
    lineHeight: 26,
    color: '#777777',
    textAlign: 'center',
  },
  professionalNote: {
    maxWidth: 340,
    marginTop: 28,
    fontSize: 18,
    lineHeight: 30,
    color: '#666666',
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d8d8d8',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#111111',
  },
  previousButton: {
    minHeight: 48,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousButtonText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#333333',
  },
  button: {
    width: '100%',
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  pressedButton: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
});
