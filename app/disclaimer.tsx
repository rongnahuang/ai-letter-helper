import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const professionalAdvice = [
  '法律意见',
  '医疗意见',
  '税务意见',
  '移民意见',
  '财务或投资意见',
  '保险意见',
  '政府福利资格判断',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export default function DisclaimerScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.updatedDate}>最后更新日期：2026年7月23日</Text>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>重要提醒</Text>
          <Text style={styles.warningText}>
            请始终查看原始信件。涉及付款、医疗、法律、移民、保险或政府福利时，请向发信机构确认。
          </Text>
        </View>

        <Paragraph>“AI信件助手”使用人工智能识别和解释用户上传的信件、通知及表格。</Paragraph>

        <Section title="一、仅供参考">
          <Paragraph>
            本应用提供的翻译、摘要、日期识别、风险提醒、填写指导及其他内容仅供一般信息参考。
          </Paragraph>
          <Paragraph>人工智能可能误读图片、遗漏内容、错误理解上下文或提供不准确的信息。</Paragraph>
        </Section>

        <Section title="二、不构成专业意见">
          <Paragraph>本应用提供的内容不构成：</Paragraph>
          {professionalAdvice.map((item, index) => (
            <Text key={item} style={styles.listItem}>
              • {item}{index === professionalAdvice.length - 1 ? '。' : '；'}
            </Text>
          ))}
          <Paragraph>如信件涉及上述事项，请联系相关机构或合资格专业人士。</Paragraph>
        </Section>

        <Section title="三、以原始文件为准">
          <Paragraph>
            所有日期、金额、地址、电话号码、案件编号、提交要求和处理后果，均应以原始信件和发信机构的正式说明为准。
          </Paragraph>
          <Paragraph>在付款、提交表格、提供个人资料或放弃权利前，请再次核对原始文件。</Paragraph>
        </Section>

        <Section title="四、表格填写指导">
          <Paragraph>
            本应用可以解释表格栏目及英文选项，但不会替用户决定答案，也不会验证用户填写的资料是否真实、完整或符合资格要求。
          </Paragraph>
          <Paragraph>请根据您自己的真实情况填写。</Paragraph>
          <Paragraph>不要签署空白或尚未检查完整的表格。</Paragraph>
        </Section>

        <Section title="五、诈骗及安全提醒">
          <Paragraph>
            本应用提供的诈骗风险提示不能保证准确识别所有诈骗，也不能保证被判断为低风险的信件一定真实。
          </Paragraph>
          <Paragraph>在付款或提供敏感资料前，请通过官方网站或可信渠道确认机构身份。</Paragraph>
        </Section>

        <Section title="六、紧急情况">
          <Paragraph>本应用不适用于紧急医疗、安全或法律情况。</Paragraph>
          <Paragraph>如您或他人面临即时危险，请联系当地紧急服务。</Paragraph>
        </Section>

        <Section title="七、责任限制">
          <Paragraph>
            在适用法律允许的范围内，开发者不对因依赖人工智能分析结果而导致的损失、延误、错过期限、错误付款、资料泄露或其他后果承担责任。
          </Paragraph>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 48,
  },
  updatedDate: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 16,
  },
  warningCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#b42318',
    backgroundColor: '#fff1f0',
    marginBottom: 18,
  },
  warningTitle: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '700',
    color: '#8f1711',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 18,
    lineHeight: 29,
    fontWeight: '600',
    color: '#8f1711',
  },
  section: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 28,
    color: '#333333',
    marginBottom: 12,
  },
  listItem: {
    fontSize: 17,
    lineHeight: 28,
    color: '#333333',
    marginBottom: 7,
  },
});
