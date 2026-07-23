import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getAnalysisHistoryItem } from '@/lib/history';

type FormFieldOption = {
  original_text: string;
  chinese_translation: string;
  explanation: string;
  is_selected: '是' | '否' | '无法判断';
};

type FormFieldGuidance = {
  field_name: string;
  chinese_name: string;
  explanation: string;
  example: string;
  required_status: '必填' | '选填' | '无法判断';
  page_number: number | null;
  location_hint: string;
  warning: string;
  options: FormFieldOption[];
};

type FormGuidance = {
  form_detected: '是' | '否' | '无法判断';
  form_name: string;
  general_instructions: string[];
  fields: FormFieldGuidance[];
  signature_required: '需要' | '不需要' | '无法判断';
  signature_instructions: string;
  documents_needed: string[];
  return_methods: string[];
  return_deadline: string;
  important_warning: string;
};

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
  form_guidance: FormGuidance;
};

const defaultFormGuidance: FormGuidance = {
  form_detected: '无法判断',
  form_name: '未识别到明确表格名称',
  general_instructions: [],
  fields: [],
  signature_required: '无法判断',
  signature_instructions: '暂时无法判断是否需要签名。',
  documents_needed: [],
  return_methods: [],
  return_deadline: '表格中未找到明确提交期限',
  important_warning: '当前资料可能不完整，请检查是否还有其他页面。',
};

const importanceBadges: Record<AnalysisResponse['importance'], string> = {
  高: '🔴 高',
  中: '🟡 中',
  低: '🟢 低',
  无法判断: '⚪ 无法判断',
};

const HIGH_RISK_KEYWORDS = [
  '医疗',
  '医院',
  '药物',
  '法律',
  '法院',
  '移民',
  '驱逐',
  '税务',
  'irs',
  '保险',
  '福利',
  'medicare',
  'medicaid',
  'social security',
  '银行',
  '付款',
  '欠款',
  '催收',
];

const UNSAFE_SCAM_CLAIMS = ['绝对安全', '已经确认不是诈骗', '可以放心付款'];

function indicatesRequired(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  return (
    normalizedValue === '是' ||
    normalizedValue === '需要' ||
    normalizedValue.includes('可能需要') ||
    normalizedValue.includes('需要付款') ||
    normalizedValue.includes('需要回复')
  );
}

function isPotentiallyHighRisk(analysis: AnalysisResponse) {
  const searchableText = `${analysis.letter_type} ${analysis.summary}`.toLowerCase();

  return (
    indicatesRequired(analysis.payment_required) ||
    indicatesRequired(analysis.reply_required) ||
    analysis.importance === '高' ||
    analysis.scam_risk !== '未发现明显异常' ||
    HIGH_RISK_KEYWORDS.some((keyword) => searchableText.includes(keyword))
  );
}

function getSafeScamExplanation(value: string) {
  return UNSAFE_SCAM_CLAIMS.some((claim) => value.includes(claim)) ? '' : value;
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeFormGuidance(value: unknown): FormGuidance {
  if (!value || typeof value !== 'object') {
    return defaultFormGuidance;
  }

  const result = value as Partial<FormGuidance>;
  const formDetected = ['是', '否', '无法判断'].includes(result.form_detected ?? '')
    ? result.form_detected!
    : '无法判断';
  const signatureRequired = ['需要', '不需要', '无法判断'].includes(
    result.signature_required ?? ''
  )
    ? result.signature_required!
    : '无法判断';
  const fields = Array.isArray(result.fields)
    ? result.fields.flatMap((field): FormFieldGuidance[] => {
        if (!field || typeof field !== 'object') {
          return [];
        }

        const item = field as Partial<FormFieldGuidance>;
        const requiredStatus = ['必填', '选填', '无法判断'].includes(item.required_status ?? '')
          ? item.required_status!
          : '无法判断';
        const options = Array.isArray(item.options)
          ? item.options.flatMap((option): FormFieldOption[] => {
              if (!option || typeof option !== 'object') {
                return [];
              }

              const choice = option as Partial<FormFieldOption>;
              const isSelected = ['是', '否', '无法判断'].includes(choice.is_selected ?? '')
                ? choice.is_selected!
                : '无法判断';

              return [
                {
                  original_text:
                    typeof choice.original_text === 'string' && choice.original_text
                      ? choice.original_text
                      : '未识别到选项文字',
                  chinese_translation:
                    typeof choice.chinese_translation === 'string' && choice.chinese_translation
                      ? choice.chinese_translation
                      : '暂时无法翻译',
                  explanation:
                    typeof choice.explanation === 'string' ? choice.explanation : '',
                  is_selected: isSelected,
                },
              ];
            })
          : [];

        return [
          {
            field_name: typeof item.field_name === 'string' ? item.field_name : '',
            chinese_name: typeof item.chinese_name === 'string' ? item.chinese_name : '',
            explanation: typeof item.explanation === 'string' ? item.explanation : '',
            example: typeof item.example === 'string' ? item.example : '',
            required_status: requiredStatus,
            page_number:
              typeof item.page_number === 'number' && Number.isInteger(item.page_number)
                ? item.page_number
                : null,
            location_hint: typeof item.location_hint === 'string' ? item.location_hint : '',
            warning: typeof item.warning === 'string' ? item.warning : '',
            options,
          },
        ];
      })
    : [];

  return {
    form_detected: formDetected,
    form_name:
      typeof result.form_name === 'string' && result.form_name
        ? result.form_name
        : defaultFormGuidance.form_name,
    general_instructions: normalizeStringArray(result.general_instructions),
    fields,
    signature_required: signatureRequired,
    signature_instructions:
      typeof result.signature_instructions === 'string'
        ? result.signature_instructions
        : defaultFormGuidance.signature_instructions,
    documents_needed: normalizeStringArray(result.documents_needed),
    return_methods: normalizeStringArray(result.return_methods),
    return_deadline:
      typeof result.return_deadline === 'string' && result.return_deadline
        ? result.return_deadline
        : defaultFormGuidance.return_deadline,
    important_warning:
      typeof result.important_warning === 'string'
        ? result.important_warning
        : defaultFormGuidance.important_warning,
  };
}

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
    form_guidance: normalizeFormGuidance(result.form_guidance),
  };
}

export default function ResultScreen() {
  const router = useRouter();
  const { analysis, pageCount, historyId } = useLocalSearchParams<{
    analysis?: string | string[];
    pageCount?: string | string[];
    historyId?: string | string[];
  }>();
  const analysisParam = Array.isArray(analysis) ? analysis[0] : analysis;
  const pageCountParam = Array.isArray(pageCount) ? pageCount[0] : pageCount;
  const historyIdParam = Array.isArray(historyId) ? historyId[0] : historyId;
  const directAnalysisData = useMemo(() => {
    if (!analysisParam) {
      return null;
    }

    try {
      return normalizeAnalysis(JSON.parse(analysisParam));
    } catch {
      return null;
    }
  }, [analysisParam]);
  const directPageCount = useMemo(() => {
    const parsedPageCount = Number(pageCountParam);
    return Number.isInteger(parsedPageCount) && parsedPageCount >= 1 && parsedPageCount <= 10
      ? parsedPageCount
      : null;
  }, [pageCountParam]);
  const [historicalResult, setHistoricalResult] = useState<{
    analysis: AnalysisResponse;
    pageCount: number;
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(historyIdParam));

  useEffect(() => {
    let isCurrent = true;

    if (!historyIdParam) {
      setHistoricalResult(null);
      setIsLoadingHistory(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoadingHistory(true);

    void getAnalysisHistoryItem(historyIdParam)
      .then((item) => {
        if (!isCurrent) {
          return;
        }

        const normalizedResult = item ? normalizeAnalysis(item.result) : null;
        setHistoricalResult(
          normalizedResult && item
            ? { analysis: normalizedResult, pageCount: item.page_count }
            : null
        );
      })
      .catch(() => {
        if (isCurrent) {
          setHistoricalResult(null);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [historyIdParam]);

  const analysisData = historyIdParam ? historicalResult?.analysis ?? null : directAnalysisData;
  const validPageCount = historyIdParam ? historicalResult?.pageCount ?? null : directPageCount;

  const showHighRiskWarning = analysisData ? isPotentiallyHighRisk(analysisData) : false;
  const showPaymentWarning = analysisData
    ? indicatesRequired(analysisData.payment_required)
    : false;
  const scamExplanation = analysisData ? getSafeScamExplanation(analysisData.scam_warning) : '';
  const scamSafetyMessage =
    analysisData?.scam_risk === '未发现明显异常'
      ? '暂未发现明显诈骗迹象，但仍建议通过官方渠道核实。'
      : 'AI无法保证准确识别所有诈骗。';

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

      {isLoadingHistory ? (
        <View style={styles.card}>
          <Text style={styles.label}>正在读取分析结果...</Text>
        </View>
      ) : analysisData ? (
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

          {showHighRiskWarning && (
            <View style={styles.officialConfirmationCard}>
              <Text style={styles.officialConfirmationTitle}>请先向官方机构确认</Text>
              <Text style={styles.officialConfirmationText}>
                这封信可能涉及重要权益、付款或敏感事项。在付款、提交资料、签名或作出决定前，请通过官方网站或可信联系方式向发信机构确认。
              </Text>
            </View>
          )}

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
            <Text style={styles.label}>表格填写指导</Text>
            {analysisData.form_guidance.form_detected === '否' ? (
              <Text style={styles.body}>当前上传的页面中没有发现需要填写的表格。</Text>
            ) : analysisData.form_guidance.form_detected === '无法判断' ? (
              <Text style={styles.body}>
                暂时无法确定是否包含表格，请确认已经上传清晰、完整的所有页面。
              </Text>
            ) : (
              <>
                <Text style={styles.formName}>{analysisData.form_guidance.form_name}</Text>
                <Text style={styles.formFieldCount}>
                  共识别到 {analysisData.form_guidance.fields.length} 个栏目
                </Text>
                <TouchableOpacity
                  style={styles.formGuidanceButton}
                  onPress={() =>
                    router.push({
                      pathname: '/form-guidance',
                      params: {
                        formGuidance: JSON.stringify(analysisData.form_guidance),
                      },
                    })
                  }>
                  <Text style={styles.formGuidanceButtonText}>查看填写方法</Text>
                </TouchableOpacity>
              </>
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

          {showPaymentWarning && (
            <View style={styles.paymentWarningCard}>
              <Text style={styles.paymentWarningTitle}>付款前请确认</Text>
              <Text style={styles.paymentWarningText}>
                请勿仅根据AI分析付款。请核对原始信件中的金额、截止日期、收款机构及官方网站，并避免通过礼品卡、加密货币或其他异常方式付款。
              </Text>
            </View>
          )}

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
            {!!scamExplanation && (
              <Text
                style={[
                  styles.body,
                  styles.scamExplanation,
                  analysisData.scam_risk === '存在可疑迹象' && styles.scamWarningText,
                ]}>
                {scamExplanation}
              </Text>
            )}
            <Text
              style={[
                styles.scamSafetyMessage,
                analysisData.scam_risk === '存在可疑迹象' && styles.scamWarningText,
              ]}>
              {scamSafetyMessage}
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

      <View style={styles.aiReminderCard}>
        <Text style={styles.aiReminderTitle}>AI分析提醒</Text>
        <Text style={styles.aiReminderText}>
          AI可能误读、遗漏或错误理解信件内容。日期、金额、付款要求、提交方式及处理后果，请以原始信件和发信机构的正式说明为准。
        </Text>
        <TouchableOpacity
          style={styles.disclaimerLink}
          onPress={() => router.push('/disclaimer')}
          accessibilityRole="link"
          accessibilityLabel="查看完整免责声明">
          <Text style={styles.disclaimerLinkText}>查看完整免责声明</Text>
        </TouchableOpacity>
      </View>

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
  formName: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#222222',
  },
  formFieldCount: {
    fontSize: 18,
    lineHeight: 28,
    color: '#555555',
    marginTop: 6,
  },
  formGuidanceButton: {
    minHeight: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    marginTop: 16,
  },
  formGuidanceButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  attentionCard: {
    borderWidth: 2,
    borderColor: '#d6a500',
  },
  officialConfirmationCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c98100',
    backgroundColor: '#fff8e1',
    marginBottom: 16,
  },
  officialConfirmationTitle: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#704d00',
    marginBottom: 10,
  },
  officialConfirmationText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#704d00',
  },
  paymentWarningCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#b85c00',
    backgroundColor: '#fff4e8',
    marginBottom: 16,
  },
  paymentWarningTitle: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#7a3d00',
    marginBottom: 10,
  },
  paymentWarningText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#7a3d00',
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
  scamSafetyMessage: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
    color: '#4a3b00',
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
  aiReminderCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9cb6d3',
    backgroundColor: '#eef5fc',
    marginBottom: 16,
  },
  aiReminderTitle: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#173b63',
    marginBottom: 10,
  },
  aiReminderText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#24496f',
  },
  disclaimerLink: {
    minHeight: 48,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: 10,
    paddingRight: 16,
  },
  disclaimerLinkText: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
    color: '#174f86',
    textDecorationLine: 'underline',
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
