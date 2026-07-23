import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const sensitiveInformation = [
  '社会安全号码',
  '医疗保险号码',
  '银行账户信息',
  '信用卡信息',
  '身份证件号码',
  '医疗资料',
  '收入及福利资料',
  '移民或法律资料',
];

const userChoices = [
  '不上传包含敏感资料的文件',
  '在上传前遮挡敏感内容',
  '拒绝相机或相册权限',
  '停止使用本应用',
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

function BulletList({ items }: { items: string[] }) {
  return items.map((item, index) => (
    <Text key={`${index}-${item}`} style={styles.listItem}>
      • {item}{index === items.length - 1 ? '。' : '；'}
    </Text>
  ));
}

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.updatedDate}>最后更新日期：2026年7月23日</Text>

        <Paragraph>
          欢迎使用“小鹿英文信件助手”。本隐私政策说明您使用本应用时，我们如何处理您提供的信息。
        </Paragraph>

        <Section title="一、我们处理的信息">
          <Paragraph>
            当您使用信件分析功能时，您可以选择通过相机拍摄或从相册上传信件、通知、表格及其他文件图片。
          </Paragraph>
          <Paragraph>
            这些图片可能包含姓名、地址、案件编号、医疗信息、财务信息或其他个人资料。请您在上传前检查文件内容，并在不需要分析的信息上进行遮挡。
          </Paragraph>
          <Paragraph>
            本应用还可能处理为提供分析结果所必需的技术信息，例如请求状态、错误信息和设备网络连接状态。
          </Paragraph>
        </Section>

        <Section title="二、信息的使用目的">
          <Paragraph>上传的文件内容仅用于：</Paragraph>
          <Text style={styles.listItem}>1. 识别和解释信件内容；</Text>
          <Text style={styles.listItem}>2. 提供中文摘要和处理建议；</Text>
          <Text style={styles.listItem}>3. 识别重要日期、付款要求及回复要求；</Text>
          <Text style={styles.listItem}>4. 提供表格栏目及选项的中文说明；</Text>
          <Text style={styles.listItem}>5. 改善应用的稳定性和错误处理。</Text>
          <Paragraph>我们不会将您上传的信件内容用于广告，也不会出售您的个人资料。</Paragraph>
        </Section>

        <Section title="三、人工智能服务">
          <Paragraph>
            为了分析您上传的文件，本应用会将相关图片和分析请求发送至第三方人工智能服务提供商。
          </Paragraph>
          <Paragraph>
            人工智能生成的内容可能存在遗漏、误解或错误。请勿仅依赖分析结果作出法律、医疗、移民、税务、保险、福利或财务决定。
          </Paragraph>
          <Paragraph>涉及重要事项时，请以原始信件、官方网站及相关机构的回复为准。</Paragraph>
        </Section>

        <Section title="四、敏感信息">
          <Paragraph>信件和表格可能包含：</Paragraph>
          <BulletList items={sensitiveInformation} />
          <Paragraph>除非分析确实需要，否则建议您在上传前遮挡完整号码或其他敏感资料。</Paragraph>
          <Paragraph>请勿上传密码、银行卡密码、验证码或完整登录凭证。</Paragraph>
        </Section>

        <Section title="五、相机和相册权限">
          <Paragraph>
            本应用仅在您主动选择拍照或选择图片时请求使用相机或相册权限。
          </Paragraph>
          <Paragraph>
            拒绝相关权限不会影响您使用不依赖该权限的其他功能，但您将无法通过对应方式上传文件。
          </Paragraph>
        </Section>

        <Section title="六、数据保存">
          <Paragraph>
            本应用可以在您的设备上保存最近的分析结果，方便您稍后查看。当前历史记录仅保存AI生成的分析结果，不保存您上传的原始信件图片。
          </Paragraph>
          <Paragraph>
            历史记录保存在您的设备本地，不提供云端同步。您可以删除一条记录或清空全部记录。卸载应用可能会移除本地保存的历史记录。
          </Paragraph>
          <Paragraph>
            本地设备存储并非绝对安全。请妥善保护您的设备，并谨慎保存包含敏感资料的分析结果。
          </Paragraph>
          <Paragraph>
            除非应用界面明确说明，否则请不要假设上传内容会永久保存，也不要假设所有服务器副本都会立即删除。
          </Paragraph>
          <Paragraph>
            如未来增加账户系统或云端保存功能，本隐私政策将作相应更新。
          </Paragraph>
        </Section>

        <Section title="七、信息共享">
          <Paragraph>
            为完成信件分析，我们可能会与提供人工智能、托管、网络传输或错误监控服务的服务提供商处理必要信息。
          </Paragraph>
          <Paragraph>除以下情况外，我们不会主动向其他第三方出售或披露您的个人资料：</Paragraph>
          <Text style={styles.listItem}>1. 为提供您主动请求的应用功能；</Text>
          <Text style={styles.listItem}>2. 为遵守适用法律、法院命令或政府要求；</Text>
          <Text style={styles.listItem}>3. 为保护用户、公众或本应用的合法权益和安全。</Text>
        </Section>

        <Section title="八、儿童隐私">
          <Paragraph>本应用主要面向需要协助理解英文信件的成年人。</Paragraph>
          <Paragraph>
            本应用并非专门为儿童设计。儿童应在父母或监护人的指导下使用本应用，并避免上传不必要的个人资料。
          </Paragraph>
        </Section>

        <Section title="九、信息安全">
          <Paragraph>我们会采取合理的技术和管理措施保护信息。</Paragraph>
          <Paragraph>
            但互联网传输和电子存储无法保证绝对安全。请避免通过不安全的公共网络上传高度敏感的文件。
          </Paragraph>
        </Section>

        <Section title="十、您的选择">
          <Paragraph>您可以选择：</Paragraph>
          <BulletList items={userChoices} />
          <Paragraph>
            您可以在“最近分析”页面删除一条历史记录或清空全部历史记录。
          </Paragraph>
        </Section>

        <Section title="十一、隐私政策更新">
          <Paragraph>
            我们可能根据应用功能、法律要求或服务提供商的变化更新本隐私政策。
          </Paragraph>
          <Paragraph>更新后的政策会显示新的“最后更新日期”。</Paragraph>
        </Section>

        <Section title="十二、联系我们">
          <Paragraph>如您对本隐私政策有疑问，请联系：</Paragraph>
          <View style={styles.placeholderCard}>
            <Text style={styles.contactLine}>应用名称：小鹿英文信件助手</Text>
            <Text style={styles.placeholderLabel}>开发者或公司名称：</Text>
            <Text style={styles.placeholder}>While Loop HK Limited</Text>
            <Text style={styles.placeholderLabel}>联系邮箱：</Text>
            <Text style={styles.placeholder}>admin@whileloophk.com</Text>
          </View>
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
    marginBottom: 18,
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
  placeholderCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#b42318',
    backgroundColor: '#fff1f0',
  },
  contactLine: {
    fontSize: 17,
    lineHeight: 27,
    color: '#333333',
    marginBottom: 14,
  },
  placeholderLabel: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '700',
    color: '#7a1712',
    marginTop: 4,
  },
  placeholder: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '700',
    color: '#b42318',
    marginBottom: 12,
  },
});
