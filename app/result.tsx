import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AnalysisResponse = {
  letter_type: string;
  importance: '高' | '中' | '低' | '无法判断';
  summary: string;
  deadline: string;
  action_required: '需要' | '不需要' | '无法判断';
  consequence: string;
  actions: string[];
  contact_information: string[];
  reply_required: '需要' | '不需要' | '无法判断';
  payment_required: '需要' | '不需要' | '无法判断';
  scam_risk: '未发现明显异常' | '存在可疑迹象' | '无法判断';
  scam_warning: string;
};

const importanceBadges: Record<AnalysisResponse['importance'], string> = {
  高: '🔴 高',
  中: '🟡 中',
  低: '🟢 低',
  无法判断: '⚪ 无法判断',
};

function normalizeAnalysis(value: unknown): AnalysisResponse | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const result = value as Partial<AnalysisResponse>;
  const importance = ['高', '中', '低', '无法判断'].includes(result.importance ?? '')
    ? result.importance!
    : '无法判断';
  const actionRequired = ['需要', '不需要', '无法判断'].includes(result.action_required ?? '')
    ? result.action_required!
    : '无法判断';
  const replyRequired = ['需要', '不需要', '无法判断'].includes(result.reply_required ?? '')
    ? result.reply_required!
    : '无法判断';
  const paymentRequired = ['需要', '不需要', '无法判断'].includes(result.payment_required ?? '')
    ? result.payment_required!
    : '无法判断';
  const scamRisk = ['未发现明显异常', '存在可疑迹象', '无法判断'].includes(
    result.scam_risk ?? ''
  )
    ? result.scam_risk!
    : '无法判断';

  return {
    letter_type: typeof result.letter_type === 'string' ? result.letter_type : '无法判断',
    importance,
    summary:
      typeof result.summary === 'string' ? result.summary : '当前资料不足，无法显示信件内容。',
    deadline:
      typeof result.deadline === 'string' ? result.deadline : '信中未找到明确截止日期',
    action_required: actionRequired,
    consequence:
      typeof result.consequence === 'string'
        ? result.consequence
        : '信中没有说明不处理的后果',
    actions: Array.isArray(result.actions) ? result.actions.filter((item) => typeof item === 'string') : [],
    contact_information: Array.isArray(result.contact_information)
      ? result.contact_information.filter((item) => typeof item === 'string')
      : [],
    reply_required: replyRequired,
    payment_required: paymentRequired,
    scam_risk: scamRisk,
    scam_warning:
      typeof result.scam_warning === 'string' ? result.scam_warning : '当前资料不足，无法判断。',
  };
}

export default function ResultScreen() {
  const router = useRouter();
  const { analysis, pageCount } = useLocalSearchParams<{
    analysis?: string | string[];
    pageCount?: string | string[];
  }>();
  const analysisParam = Array.isArray(analysis) ? analysis[0] : analysis;
  const pageCountParam = Array.isArray(pageCount) ? pageCount[0] : pageCount;
  const parsedPageCount = Number(pageCountParam);
  const validPageCount =
    Number.isInteger(parsedPageCount) && parsedPageCount >= 1 && parsedPageCount <= 10
      ? parsedPageCount
      : null;
  let analysisData: AnalysisResponse | null = null;

  if (analysisParam) {
    try {
      analysisData = normalizeAnalysis(JSON.parse(analysisParam));
    } catch {
      analysisData = null;
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={[styles.title, validPageCount !== null && styles.titleWithPageCount]}>
        信件分析结果
      </Text>
      {validPageCount !== null && (
        <Text style={styles.pageCount}>已分析 {validPageCount} 页信件</Text>
      )}

      {analysisData ? (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>这是什么信？</Text>
            <Text style={styles.value}>{analysisData.letter_type}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>重要程度</Text>
            <Text style={styles.importanceBadge}>
              {importanceBadges[analysisData.importance]}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>这封信在说什么？</Text>
            <Text style={styles.body}>{analysisData.summary}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>您需要处理吗？</Text>
            <Text style={styles.emphasizedValue}>{analysisData.action_required}</Text>
          </View>

          <View style={[styles.card, styles.attentionCard]}>
            <Text style={styles.label}>什么时候要处理？</Text>
            <Text style={styles.emphasizedValue}>{analysisData.deadline}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>如果不处理，会怎样？</Text>
            <Text style={styles.body}>{analysisData.consequence}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>您现在需要做什么？</Text>
            {analysisData.actions.length > 0 ? (
              analysisData.actions.map((action, index) => (
                <Text key={`${index}-${action}`} style={styles.listItem}>
                  {index + 1}. {action}
                </Text>
              ))
            ) : (
              <Text style={styles.body}>目前没有需要完成的步骤。</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>需要回复吗？</Text>
            <Text style={styles.value}>{analysisData.reply_required}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>需要付款吗？</Text>
            <Text style={styles.value}>{analysisData.payment_required}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>联系方式</Text>
            {analysisData.contact_information.length > 0 ? (
              analysisData.contact_information.map((contact, index) => (
                <Text key={`${index}-${contact}`} style={styles.listItem}>
                  • {contact}
                </Text>
              ))
            ) : (
              <Text style={styles.body}>信中未找到明确联系方式。</Text>
            )}
          </View>

          <View
            style={[
              styles.card,
              analysisData.scam_risk === '存在可疑迹象' && styles.scamWarningCard,
            ]}>
            <Text
              style={[
                styles.label,
                analysisData.scam_risk === '存在可疑迹象' && styles.scamWarningText,
              ]}>
              诈骗风险提示
            </Text>
            <Text
              style={[
                styles.emphasizedValue,
                analysisData.scam_risk === '存在可疑迹象' && styles.scamWarningText,
              ]}>
              {analysisData.scam_risk}
            </Text>
            <Text
              style={[
                styles.body,
                styles.scamExplanation,
                analysisData.scam_risk === '存在可疑迹象' && styles.scamWarningText,
              ]}>
              {analysisData.scam_warning}
            </Text>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              提示：AI分析仅供参考。涉及付款、福利、法律、医疗或个人资料时，请通过机构官方网站上的联系方式再次核实。
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>暂时无法显示分析结果</Text>
          <Text style={styles.body}>请返回首页，重新上传清晰、完整的信件照片。</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>{analysisData ? '分析另一封信' : '返回首页'}</Text>
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
  titleWithPageCount: {
    marginBottom: 8,
  },
  pageCount: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: '#333333',
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
  emphasizedValue: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#111111',
  },
  importanceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 19,
    fontWeight: '700',
    color: '#111111',
    backgroundColor: '#f0f0f0',
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
  attentionCard: {
    borderWidth: 2,
    borderColor: '#d6a500',
  },
  scamWarningCard: {
    borderWidth: 2,
    borderColor: '#b42318',
    backgroundColor: '#fff1f0',
  },
  scamWarningText: {
    color: '#8f1711',
  },
  scamExplanation: {
    marginTop: 10,
  },
  noteCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff8e1',
    marginBottom: 16,
  },
  noteText: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
    color: '#4a3b00',
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
