import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AnalysisHistoryItem,
  clearAnalysisHistory,
  deleteAnalysisHistoryItem,
  getAnalysisHistory,
} from '@/lib/history';

function formatHistoryDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '日期未知';
  }

  const now = new Date();
  const todayTimestamp = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDayTimestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((todayTimestamp - itemDayTimestamp) / 86_400_000);
  const time = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (dayDifference === 0) {
    return `今天 ${time}`;
  }

  if (dayDifference === 1) {
    return `昨天 ${time}`;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function getImportanceStyle(importance: string) {
  switch (importance) {
    case '高':
      return styles.highImportance;
    case '中':
      return styles.mediumImportance;
    case '低':
      return styles.lowImportance;
    default:
      return styles.unknownImportance;
  }
}

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      setHistory(await getAnalysisHistory());
    } catch {
      setHistory([]);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const confirmDelete = (item: AnalysisHistoryItem) => {
    Alert.alert(
      '删除这条记录？',
      '删除后将无法在最近分析中重新查看这份结果。原始信件图片并未保存在历史记录中。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAnalysisHistoryItem(item.id);
                setHistory((current) => current.filter((historyItem) => historyItem.id !== item.id));
              } catch {
                Alert.alert('删除失败', '暂时无法删除这条记录，请稍后再试。');
              }
            })();
          },
        },
      ]
    );
  };

  const confirmClear = () => {
    Alert.alert(
      '清空所有记录？',
      '此操作会删除设备上保存的全部分析结果，且无法恢复。原始信件图片并未保存在历史记录中。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '全部删除',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await clearAnalysisHistory();
                setHistory([]);
              } catch {
                Alert.alert('清空失败', '暂时无法清空记录，请稍后再试。');
              }
            })();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>正在读取记录...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasLoadError) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>暂时无法读取记录</Text>
          <Text style={styles.stateMessage}>请稍后再试。您仍然可以继续分析新的信件。</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void loadHistory()}
            accessibilityRole="button"
            accessibilityLabel="重新加载分析记录">
            <Text style={styles.primaryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>还没有分析记录</Text>
          <Text style={styles.stateMessage}>
            分析完成的信件会显示在这里，方便您稍后再次查看。
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="开始分析信件">
            <Text style={styles.primaryButtonText}>开始分析信件</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.recordCount}>共 {history.length} 条记录</Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={confirmClear}
              accessibilityRole="button"
              accessibilityLabel="清空所有分析记录">
              <Text style={styles.clearButtonText}>清空记录</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const displayDate = formatHistoryDate(item.created_at);

          return (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() =>
                  router.push({ pathname: '/result', params: { historyId: item.id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`${item.title}，${displayDate}，查看分析结果`}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={[styles.importanceBadge, getImportanceStyle(item.importance)]}>
                    {item.importance || '无法判断'}
                  </Text>
                </View>
                <Text style={styles.date}>{displayDate}</Text>
                <Text style={styles.subtitle} numberOfLines={3}>
                  {item.subtitle}
                </Text>
                <Text style={styles.pageCount}>共分析 {item.page_count} 页</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={`删除${item.title}的分析记录`}>
                <Text style={styles.deleteButtonText}>删除</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  listHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordCount: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
    color: '#555555',
  },
  clearButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#a32020',
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  cardMain: {
    minHeight: 150,
    padding: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '700',
    color: '#111111',
  },
  importanceBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  highImportance: {
    backgroundColor: '#ffd9d6',
  },
  mediumImportance: {
    backgroundColor: '#fff0b3',
  },
  lowImportance: {
    backgroundColor: '#d8f3df',
  },
  unknownImportance: {
    backgroundColor: '#eeeeee',
  },
  date: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666666',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333333',
    marginTop: 10,
  },
  pageCount: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#555555',
    marginTop: 10,
  },
  deleteButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dddddd',
    backgroundColor: '#fff7f7',
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#a32020',
  },
  centeredState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
  },
  stateMessage: {
    fontSize: 18,
    lineHeight: 29,
    color: '#555555',
    textAlign: 'center',
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 54,
    minWidth: 180,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
});
