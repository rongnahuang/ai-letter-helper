import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseFormGuidance(value: string | undefined): FormGuidance | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<FormGuidance> | null;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const formDetected = ['是', '否', '无法判断'].includes(parsed.form_detected ?? '')
      ? parsed.form_detected!
      : '无法判断';
    const signatureRequired = ['需要', '不需要', '无法判断'].includes(
      parsed.signature_required ?? ''
    )
      ? parsed.signature_required!
      : '无法判断';
    const fields = Array.isArray(parsed.fields)
      ? parsed.fields.flatMap((field): FormFieldGuidance[] => {
          if (!field || typeof field !== 'object') {
            return [];
          }

          const item = field as Partial<FormFieldGuidance>;
          const requiredStatus = ['必填', '选填', '无法判断'].includes(
            item.required_status ?? ''
          )
            ? item.required_status!
            : '无法判断';
          const options = Array.isArray(item.options)
            ? item.options.flatMap((option): FormFieldOption[] => {
                if (!option || typeof option !== 'object') {
                  return [];
                }

                const choice = option as Partial<FormFieldOption>;
                const isSelected = ['是', '否', '无法判断'].includes(
                  choice.is_selected ?? ''
                )
                  ? choice.is_selected!
                  : '无法判断';

                return [
                  {
                    original_text:
                      stringValue(choice.original_text) || '未识别到选项文字',
                    chinese_translation:
                      stringValue(choice.chinese_translation) || '暂时无法翻译',
                    explanation: stringValue(choice.explanation),
                    is_selected: isSelected,
                  },
                ];
              })
            : [];

          return [
            {
              field_name: stringValue(item.field_name),
              chinese_name: stringValue(item.chinese_name),
              explanation: stringValue(item.explanation),
              example: stringValue(item.example),
              required_status: requiredStatus,
              page_number:
                typeof item.page_number === 'number' && Number.isInteger(item.page_number)
                  ? item.page_number
                  : null,
              location_hint: stringValue(item.location_hint),
              warning: stringValue(item.warning),
              options,
            },
          ];
        })
      : [];

    return {
      form_detected: formDetected,
      form_name: stringValue(parsed.form_name) || '未识别到明确表格名称',
      general_instructions: stringList(parsed.general_instructions),
      fields,
      signature_required: signatureRequired,
      signature_instructions:
        stringValue(parsed.signature_instructions) || '暂时无法判断是否需要签名。',
      documents_needed: stringList(parsed.documents_needed),
      return_methods: stringList(parsed.return_methods),
      return_deadline:
        stringValue(parsed.return_deadline) || '表格中未找到明确提交期限',
      important_warning:
        stringValue(parsed.important_warning) || '当前资料可能不完整，请检查是否还有其他页面。',
    };
  } catch {
    return null;
  }
}

function BulletList({ items, emptyText }: { items: string[]; emptyText?: string }) {
  if (items.length === 0) {
    return emptyText ? <Text style={styles.body}>{emptyText}</Text> : null;
  }

  return items.map((item, index) => (
    <Text key={`${index}-${item}`} style={styles.listItem}>
      • {item}
    </Text>
  ));
}

export default function FormGuidanceScreen() {
  const router = useRouter();
  const { formGuidance } = useLocalSearchParams<{
    formGuidance?: string | string[];
  }>();
  const formGuidanceParam = Array.isArray(formGuidance) ? formGuidance[0] : formGuidance;
  const guidance = parseFormGuidance(formGuidanceParam);

  if (!guidance) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.title}>暂时无法显示填写指导</Text>
        <View style={styles.card}>
          <Text style={styles.body}>请返回分析结果，或重新上传清晰、完整的表格图片。</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>返回首页</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>表格填写指导</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.formName}>{guidance.form_name}</Text>
        <Text style={styles.summaryText}>共识别到 {guidance.fields.length} 个栏目</Text>
        <Text style={styles.deadlineText}>{guidance.return_deadline}</Text>
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>请根据您自己的真实资料填写。AI不会替您决定或编造答案。</Text>
      </View>

      {guidance.fields.map((field, index) => {
        const location =
          field.location_hint ||
          (field.page_number !== null ? `第${field.page_number}页` : '位置无法判断');

        return (
          <View key={`${index}-${field.field_name}-${field.chinese_name}`} style={styles.card}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldNumber}>第{index + 1}项</Text>
              <Text style={styles.requiredBadge}>{field.required_status}</Text>
            </View>
            <Text style={styles.originalLabel}>原文栏目</Text>
            <Text style={styles.originalValue}>{field.field_name || '无法判断'}</Text>
            <Text style={styles.chineseName}>{field.chinese_name || '栏目名称无法判断'}</Text>
            {!!field.explanation && <Text style={styles.body}>{field.explanation}</Text>}
            {!!field.example && <Text style={styles.example}>填写格式示例：{field.example}</Text>}
            {field.options.length > 0 && (
              <View style={styles.optionsSection}>
                <Text style={styles.optionsTitle}>可选项目</Text>
                {field.options.map((option, optionIndex) => (
                  <View
                    key={`${optionIndex}-${option.original_text}-${option.chinese_translation}`}
                    style={styles.optionItem}>
                    <View style={styles.optionRow}>
                      <Text style={styles.optionMarker}>
                        {option.is_selected === '是' ? '◉' : '○'}
                      </Text>
                      <View style={styles.optionContent}>
                        <Text style={styles.optionOriginal}>{option.original_text}</Text>
                        <Text style={styles.optionTranslation}>{option.chinese_translation}</Text>
                        {!!option.explanation && (
                          <Text style={styles.optionExplanation}>{option.explanation}</Text>
                        )}
                        {option.is_selected === '是' && (
                          <Text style={styles.selectedStatus}>当前图片中似乎已选择此项</Text>
                        )}
                        {option.is_selected === '无法判断' && (
                          <Text style={styles.unknownStatus}>是否已选择：无法判断</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.location}>位置：{location}</Text>
            {!!field.warning && <Text style={styles.fieldWarning}>注意：{field.warning}</Text>}
          </View>
        );
      })}

      {guidance.general_instructions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>填写前注意事项</Text>
          <BulletList items={guidance.general_instructions} />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>需要签名吗？</Text>
        <Text style={styles.emphasizedValue}>{guidance.signature_required}</Text>
        <Text style={styles.sectionBody}>{guidance.signature_instructions}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>需要准备的材料</Text>
        <BulletList items={guidance.documents_needed} emptyText="信中没有明确要求附加材料。" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>如何提交？</Text>
        <BulletList items={guidance.return_methods} emptyText="表格中未找到明确提交方式。" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>最迟什么时候提交？</Text>
        <Text style={styles.emphasizedValue}>{guidance.return_deadline}</Text>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>重要提醒</Text>
        <Text style={styles.warningText}>{guidance.important_warning}</Text>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.sectionTitle}>隐私提示</Text>
        <Text style={styles.body}>
          表格可能包含社会安全号码、医疗资料、银行账户或其他敏感信息。提交前请确认收件机构真实，并避免通过不安全的方式发送个人资料。
        </Text>
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>返回分析结果</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
        <Text style={styles.primaryButtonText}>分析另一封信</Text>
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
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  formName: {
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
    color: '#111111',
  },
  summaryText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#444444',
    marginTop: 8,
  },
  deadlineText: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '700',
    color: '#7a5700',
    marginTop: 8,
  },
  noticeCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#eaf3ff',
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#163a63',
  },
  card: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fieldNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  requiredBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    backgroundColor: '#eeeeee',
  },
  originalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  originalValue: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#111111',
    marginTop: 4,
  },
  chineseName: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#24558a',
    marginTop: 10,
    marginBottom: 8,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333333',
  },
  example: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333333',
    backgroundColor: '#f4f4f4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  optionsSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
  },
  optionsTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionMarker: {
    width: 28,
    fontSize: 21,
    lineHeight: 29,
    color: '#222222',
  },
  optionContent: {
    flex: 1,
  },
  optionOriginal: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '600',
    color: '#111111',
  },
  optionTranslation: {
    fontSize: 18,
    lineHeight: 27,
    color: '#24558a',
    marginTop: 3,
  },
  optionExplanation: {
    fontSize: 17,
    lineHeight: 26,
    color: '#555555',
    marginTop: 5,
  },
  selectedStatus: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#216e39',
    marginTop: 6,
  },
  unknownStatus: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#704d00',
    marginTop: 6,
  },
  location: {
    fontSize: 17,
    lineHeight: 26,
    color: '#555555',
    marginTop: 12,
  },
  fieldWarning: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
    color: '#8f1711',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333333',
    marginTop: 10,
  },
  emphasizedValue: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#111111',
  },
  listItem: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333333',
    marginBottom: 8,
  },
  warningCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c98100',
    backgroundColor: '#fff8e1',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#704d00',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#704d00',
  },
  privacyCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
