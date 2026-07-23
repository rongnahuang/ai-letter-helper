import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { HAS_SEEN_ONBOARDING_KEY } from '@/constants/onboarding';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

type StartupDestination = '(tabs)' | 'onboarding';

const brandLogo = require('../assets/logo/black-logo.png');
const MINIMUM_BRAND_SPLASH_TIME_MS = 1200;

function BrandSplashScreen({ onLayout }: { onLayout: () => void }) {
  return (
    <SafeAreaView style={styles.splashScreen} onLayout={onLayout}>
      <View style={styles.splashContent}>
        <Image
          source={brandLogo}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashBrand}>小鹿</Text>
        <Text style={styles.splashProduct}>英文信件助手</Text>
      </View>
      <Text style={styles.splashTagline}>帮助海外华人看懂英文信件</Text>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isBrandSplashVisible, setIsBrandSplashVisible] = useState(false);
  const [canEnterApp, setCanEnterApp] = useState(false);
  const [startupDestination, setStartupDestination] = useState<StartupDestination | null>(null);
  const hasHiddenNativeSplash = useRef(false);

  useEffect(() => {
    let isCurrent = true;

    const prepareStartup = async () => {
      let destination: StartupDestination = '(tabs)';

      try {
        const [, hasSeenOnboarding] = await Promise.all([
          Asset.fromModule(brandLogo)
            .downloadAsync()
            .catch((error) => {
              console.error('[splash] logo preload failed:', error);
            }),
          AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY).catch((error) => {
            if (__DEV__) {
              console.error('[onboarding] read failed:', error);
            }
            return null;
          }),
        ]);

        destination = hasSeenOnboarding === 'true' ? '(tabs)' : 'onboarding';
      } catch (error) {
        console.error('[startup] preparation failed:', error);
      } finally {
        if (isCurrent) {
          setStartupDestination(destination);
          setAppIsReady(true);
        }
      }
    };

    void prepareStartup();

    return () => {
      isCurrent = false;
    };
  }, []);

  const onBrandSplashLayout = useCallback(async () => {
    if (!appIsReady || !startupDestination || hasHiddenNativeSplash.current) {
      return;
    }

    hasHiddenNativeSplash.current = true;

    try {
      await SplashScreen.hideAsync();
    } catch (error) {
      console.error('[splash] hide failed:', error);
    } finally {
      setIsBrandSplashVisible(true);
    }
  }, [appIsReady, startupDestination]);

  useEffect(() => {
    if (!isBrandSplashVisible) {
      return;
    }

    const timer = setTimeout(() => {
      setCanEnterApp(true);
    }, MINIMUM_BRAND_SPLASH_TIME_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [isBrandSplashVisible]);

  if (!canEnterApp || !startupDestination) {
    return (
      <BrandSplashScreen
        key={appIsReady ? 'ready' : 'initializing'}
        onLayout={onBrandSplashLayout}
      />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={startupDestination}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '返回' }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
        <Stack.Screen name="form-guidance" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ title: '最近分析' }} />
        <Stack.Screen name="settings" options={{ title: '设置' }} />
        <Stack.Screen name="privacy-policy" options={{ title: '隐私政策' }} />
        <Stack.Screen name="disclaimer" options={{ title: '免责声明' }} />
        <Stack.Screen name="about" options={{ title: '关于应用' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 300,
    height: 300,
    marginBottom: 8,
  },
  splashBrand: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    color: '#000000',
  },
  splashProduct: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '600',
    color: '#000000',
  },
  splashTagline: {
    fontSize: 14,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },
});
