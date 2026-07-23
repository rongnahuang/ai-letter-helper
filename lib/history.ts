import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalysisHistoryItem = {
  id: string;
  created_at: string;
  title: string;
  subtitle: string;
  page_count: number;
  importance: string;
  result: unknown;
};

export const ANALYSIS_HISTORY_KEY = 'ai_letter_helper_analysis_history_v1';
export const MAX_ANALYSIS_HISTORY_ITEMS = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function logStorageError(operation: string, error: unknown) {
  if (__DEV__) {
    console.error(`[history] ${operation} failed:`, error);
  }
}

function sanitizeDisplayText(value: string) {
  const sanitizedValue = value
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '•••-••-••••')
    .replace(/\b\d{6,}\b/g, '••••')
    .replace(/\s+/g, ' ')
    .trim();
  const characters = Array.from(sanitizedValue);
  return characters.length > 60 ? `${characters.slice(0, 60).join('')}…` : sanitizedValue;
}

function normalizeHistoryItem(value: unknown): AnalysisHistoryItem | null {
  if (!isRecord(value) || !isRecord(value.result)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const createdAt = typeof value.created_at === 'string' ? value.created_at : '';

  if (!id || !createdAt || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }

  const pageCount =
    typeof value.page_count === 'number' &&
    Number.isInteger(value.page_count) &&
    value.page_count > 0 &&
    value.page_count <= 10
      ? value.page_count
      : 1;

  return {
    id,
    created_at: createdAt,
    title: sanitizeDisplayText(
      typeof value.title === 'string' && value.title.trim()
        ? value.title.trim()
        : '未识别的信件'
    ),
    subtitle: sanitizeDisplayText(
      typeof value.subtitle === 'string' && value.subtitle.trim()
        ? value.subtitle.trim()
        : '点击查看分析结果'
    ),
    page_count: pageCount,
    importance:
      typeof value.importance === 'string' &&
      ['高', '中', '低', '无法判断'].includes(value.importance.trim())
        ? value.importance.trim()
        : '无法判断',
    result: value.result,
  };
}

function sortAndLimitHistory(items: AnalysisHistoryItem[]) {
  const uniqueItems = new Map<string, AnalysisHistoryItem>();

  items
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .forEach((item) => {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item);
      }
    });

  return Array.from(uniqueItems.values()).slice(0, MAX_ANALYSIS_HISTORY_ITEMS);
}

export async function getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  let storedValue: string | null;

  try {
    storedValue = await AsyncStorage.getItem(ANALYSIS_HISTORY_KEY);
  } catch (error) {
    logStorageError('read', error);
    throw new Error('HISTORY_READ_FAILED');
  }

  if (!storedValue) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    console.warn('[history] ignored malformed stored JSON');
    return [];
  }

  if (!Array.isArray(parsedValue)) {
    console.warn('[history] ignored invalid stored value');
    return [];
  }

  return sortAndLimitHistory(
    parsedValue.flatMap((item): AnalysisHistoryItem[] => {
      const normalizedItem = normalizeHistoryItem(item);
      return normalizedItem ? [normalizedItem] : [];
    })
  );
}

export async function saveAnalysisHistoryItem(item: AnalysisHistoryItem): Promise<void> {
  const normalizedItem = normalizeHistoryItem(item);

  if (!normalizedItem) {
    console.warn('[history] ignored invalid item');
    return;
  }

  try {
    const currentHistory = await getAnalysisHistory();
    const nextHistory = sortAndLimitHistory([
      normalizedItem,
      ...currentHistory.filter((historyItem) => historyItem.id !== normalizedItem.id),
    ]);
    const serialized = JSON.stringify(nextHistory);
    await AsyncStorage.setItem(ANALYSIS_HISTORY_KEY, serialized);
  } catch (error) {
    logStorageError('save', error);
    throw new Error('HISTORY_SAVE_FAILED');
  }
}

export async function deleteAnalysisHistoryItem(id: string): Promise<void> {
  try {
    const currentHistory = await getAnalysisHistory();
    const nextHistory = currentHistory.filter((item) => item.id !== id);
    await AsyncStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(nextHistory));
  } catch (error) {
    logStorageError('delete', error);
    throw new Error('HISTORY_DELETE_FAILED');
  }
}

export async function clearAnalysisHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ANALYSIS_HISTORY_KEY);
  } catch (error) {
    logStorageError('clear', error);
    throw new Error('HISTORY_CLEAR_FAILED');
  }
}

export async function getAnalysisHistoryItem(
  id: string
): Promise<AnalysisHistoryItem | null> {
  const history = await getAnalysisHistory();
  return history.find((item) => item.id === id) ?? null;
}
