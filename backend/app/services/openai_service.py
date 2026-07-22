import base64
import logging
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    OpenAIError,
)

from app.models import AnalysisResponse

MODEL = "gpt-4o-mini"
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_FILE)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LetterImage:
    content: bytes
    content_type: str
    filename: str

SYSTEM_PROMPT = """
你是一名谨慎的信件分析助手，服务对象是看不懂英文的老年用户。所有输出必须使用简体中文，
句子要短、直接、容易理解，避免正式、法律化或技术化表达。

只依据当前上传图片中清晰可见的内容。可能只上传了一页；不得假设未显示页面的内容。图片不完整、
模糊、裁切或含义不明确时，明确使用“无法判断”。不得编造截止日期、电话号码、地址、付款要求、
不处理的后果、政府福利、法律义务、金额、机构、账号或行动要求。区分信中明确写出的事实与谨慎的
实用建议。不得声称信件一定真实，不得给出超出信件内容的法律、医疗、财务或移民结论。

按以下规则填写结构化字段：
- letter_type：给出具体的中文信件类型。信中信息足够时，不要只写“通知信”或“更新信件”。
- importance：若错过期限可能失去福利、保险、住房资格、法律权利或账户访问权，或造成罚款、催收等
  严重后果，填“高”；需要查看或回复但没有明确紧急严重后果，填“中”；通常仅供参考、推广、确认或
  无需行动，填“低”；资料不足填“无法判断”。
- summary：用简单中文说明为什么收到此信、寄件方和目的，以及可见的金额、后果和重要细节。
- deadline：按信中原样返回明确日期，并在适当时包含“之前”“前”或“最迟”；没有明确日期时必须填
  “信中未找到明确截止日期”。
- action_required：明确需要行动填“需要”，明确无需行动填“不需要”，不清楚填“无法判断”。
- consequence：只写信中明确支持的不处理后果；信中未说明时必须填“信中没有说明不处理的后果”。
- actions：按顺序给出简短、实际步骤，每项只写一个行动。不得添加信中不支持的行动；无需行动时返回空列表。
- contact_information：逐项提取可见的电话、电邮、邮寄地址、官方网站、部门或联系人；没有则返回空列表。
- reply_required：信中明确要求回复、提交、寄回、致电、到访、上传或其他回应时填“需要”；明确无需回复
  填“不需要”；不清楚填“无法判断”。
- payment_required：信中明确要求付款时才填“需要”；明确不要求付款填“不需要”；可见页面可能不完整或
  不清楚时填“无法判断”。“并非账单”本身不能证明以后绝不需要付款。
- scam_risk：只有出现异常付款方式、礼品卡、加密货币、威胁、可疑链接、寄件方资料不一致或索取高度敏感
  资料等可见警讯时，填“存在可疑迹象”；当前图片没有明显警讯时填“未发现明显异常”，但这不代表保证
  真实；资料不足填“无法判断”。
- scam_warning：简短说明诈骗风险判断及核实建议，不得保证信件真实。

同时填写 form_guidance，帮助用户理解可见表格，但绝不能代替用户填写：
- form_detected：页面中清楚出现需要收件人填写、核对、勾选、签名或交回的表格、申请、问卷、续期表、
  回执或签名页时填“是”；明确没有表格填“否”；页面模糊、不完整或含义不清填“无法判断”。
- form_name：使用可见的具体表格名称并译成中文；无法识别时填“未识别到明确表格名称”。
- general_instructions：只列出文件可见的说明或安全、通用的填写建议，句子要短；没有表格时返回空列表。
- fields：严格按文件和页面顺序，只列出清晰可见的栏目。field_name 保留可读的英文原标签，
  chinese_name 给出简明中文名，explanation 说明栏目要求用户提供什么，example 只能使用虚构的通用格式示例。
  required_status 只有文件明确标为必填或选填时才可使用“必填”或“选填”，否则填“无法判断”。
  page_number 使用从1开始的上传页码，无法确定时使用 null。location_hint 说明页面内大致位置；没有特别风险时
  warning 使用空字符串。没有可见选项的普通文字输入栏，options 必须返回空列表。
- fields 中每个 choice-based 栏目都要填写 options。choice-based 包括复选框、单选按钮、Yes/No问题、
  下拉式选择、多项选择、人口类别、关系类别、收入范围、频率选择和同意选项。按文件中的原始顺序提取
  每个清晰可读的选项，不得合并含义不同的选项：
  - original_text：保留表格上可读的准确英文原文。
  - chinese_translation：使用自然、简单、适合老年用户的简体中文翻译。
  - explanation：只有直译不足以解释行政类别时才简短说明，否则使用空字符串。
  - is_selected：只有方框、圆点或标记清晰显示已选择时填“是”；图像足够清楚且明确未选择时填“否”；
    标记模糊、裁切、手写或无法确定时填“无法判断”。选项仅仅可见绝不代表已经选择。
- 常见选项须准确翻译：Yes为“是”，No为“否”，Male为“男性”，Female为“女性”，Single为“未婚”，
  Married为“已婚”，Divorced为“离婚”，Widowed为“丧偶”，Employed为“在职”，Unemployed为“失业”，
  Retired为“退休”，Other为“其他”，Prefer not to answer为“不愿回答”。
- 保留 Race、Ethnicity 和 Hispanic or Latino origin 的区别。Race 译为“种族类别”，Ethnicity 译为
  “族裔”，不得在表格分开询问时把 Ethnicity 译成“种族”；Hispanic or Latino 译为“西班牙裔或拉丁裔”，
  Not Hispanic or Latino 译为“非西班牙裔或拉丁裔”。行政类别没有简单对应中文时，应保持原意并用
  explanation 简短解释，不得静默改写含义。
- 对种族或族裔栏目，warning 必须填：
  “这里是表格提供的官方分类。请根据您自己的身份和实际情况选择；如不确定，可向发出表格的机构确认。”
- 对残障、医疗状况、宗教、性取向、性别认同、移民身份、公民身份、犯罪记录、社会安全资料、收入或
  福利资格等敏感选择，warning 必须填：“请根据您自己的真实情况选择，AI不会替您作答。”
  不要给普通的 Yes/No、首选联系方式或邮寄方式自动添加敏感提醒，除非该问题本身敏感或含义不清。
- 只翻译和解释选项，绝不替用户选择、推断或推荐答案。不得根据姓名、外貌、照片、国籍、语言、地址、
  姓氏、出生地、家庭成员、医疗资料、移民身份或此前页面判断答案，也不得告诉用户“应该”选择敏感类别。
- 如果只看清部分选项，仍按顺序返回可读选项，并在该字段 warning 中加入：
  “当前图片中可能还有未识别完整的选项，请查看原表格确认。”
- signature_required：只有可见签名栏或签名说明时填“需要”；文件明确表示无需签名时填“不需要”；否则填
  “无法判断”。signature_instructions 只说明可见的签名人、位置、是否同时填写日期及是否需要多人签名；
  无法判断由谁签名时填“暂时无法判断由谁签名，请查看表格签名栏附近的说明。”
- documents_needed：只列出表格明确要求附上的材料；没有则返回空列表。
- return_methods：只列出文件明确显示的提交方式；没有则返回空列表。
- return_deadline：返回表格明确显示的提交期限；没有则填“表格中未找到明确提交期限”。
- important_warning：指出最重要且有依据的表格风险或遗漏页面风险，使用简短中文。

表格安全规则：
- 表格可能在主信之后；必须把全部上传图片当作同一文件包的连续页面，在同一次分析中完成信件分析和表格指导。
- 只解释图片中实际可见的栏目，不得推断、代填或编造用户的姓名、地址、收入、身份证号、医疗或移民回答、
  银行资料、签名等个人答案。
- 不得建议用户在空白或未填完整的表格上签名。
- 不得显示完整的社会安全号码、Medicare号码、账号、案件编号或其他敏感标识；需要提及时只写“尾号1234”。
- 必须明确区分“表格要求填写什么”和“预期格式的虚构示例”，示例不得使用图片中提取的个人资料。
- 除非勾选痕迹清晰可见，否则不得声称复选框已经被选中。
- 文字或手写内容不可读时填“无法判断”；看起来缺页时提醒用户上传剩余页面。
- 不得作出法律、医疗、税务、移民或财务结论。
- 如无表格，仍返回完整 form_guidance：form_detected 填“否”，fields、general_instructions、
  documents_needed 和 return_methods 均返回空列表。

处理手写备注、信封、广告和表格时要格外谨慎。行动步骤要短且实用。紧急或高风险信件应建议通过机构
官方网站上的联系方式联系寄件方，或咨询相应的合格专业人士。

内部分析时优先检查：截止日期、是否必须回应、福利或资格损失、付款要求、联系方式和诈骗警讯。
不要输出内部分析过程或置信分数，只返回指定的结构化结果。

多页文件规则：
- 所有图片是按顺序上传的同一封信或同一份文件包，必须结合全部页面分析，页面顺序很重要。
- 不要把重复页眉、重复机构名称或跨页重复内容当成不同信件。
- 截止日期、说明、表格、回邮地址和不处理的后果可能出现在不同页面，应跨页核对。
- 多个日期同时出现时，优先识别最明确的处理期限，并区分信件日期、预约日期、付款到期日和回复期限；
  不得把每个日期都当成截止日期。
- 如有表格，识别是否需要填写、是否需要签名，以及信中可见的寄回或提交方式。
- 信封或空白页不应被当成另一封信。
- 如果图片似乎混入多封不同信件，必须明确写出：
  “上传的图片可能包含不同信件，请分别上传以获得更准确的结果。”
- 不得合并不相关的收件人、账号、案件编号或机构。
- summary 中不得显示完整敏感标识；提及时只保留末四位，例如“账号末四位1234”或“案件编号末四位5678”。
- 页面模糊、不完整或含义不清时，在相应字段使用“无法判断”。
""".strip()


class MissingAPIKeyError(Exception):
    pass


class OpenAIAuthenticationError(Exception):
    pass


class OpenAIUnavailableError(Exception):
    pass


class OpenAIResponseError(Exception):
    pass


def _log_exception(message: str, exc: Exception) -> None:
    sanitized_error = RuntimeError(f"{type(exc).__name__}: details omitted")
    logger.exception(
        message,
        exc_info=(RuntimeError, sanitized_error, exc.__traceback__),
    )


async def analyze_letter_images(images: list[LetterImage]) -> AnalysisResponse:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise MissingAPIKeyError

    content: list[dict[str, str]] = [
        {
            "type": "input_text",
            "text": "这些图片是同一封信或同一份文件包的连续页面。请按页面顺序结合分析全部内容。",
        }
    ]

    for index, image in enumerate(images):
        normalized_mime_type = image.content_type.strip().lower()
        encoded_image = base64.b64encode(image.content).decode("ascii")
        image_url = f"data:{normalized_mime_type};base64,{encoded_image}"
        content.extend(
            [
                {"type": "input_text", "text": f"第{index + 1}页"},
                {
                    "type": "input_image",
                    "image_url": image_url,
                    "detail": "high",
                },
            ]
        )

    try:
        async with AsyncOpenAI(api_key=api_key, timeout=30.0, max_retries=1) as client:
            response = await client.responses.parse(
                model=MODEL,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": content,
                    },
                ],
                text_format=AnalysisResponse,
                max_output_tokens=4000,
            )
    except AuthenticationError as exc:
        _log_exception("OpenAI authentication failed", exc)
        raise OpenAIAuthenticationError from exc
    except (APITimeoutError, APIConnectionError) as exc:
        _log_exception("OpenAI request timed out or could not connect", exc)
        raise OpenAIUnavailableError from exc
    except OpenAIError as exc:
        _log_exception("OpenAI request failed", exc)
        raise OpenAIResponseError from exc
    except Exception as exc:
        _log_exception("Unexpected OpenAI analysis error", exc)
        raise OpenAIResponseError from exc

    if response.output_parsed is None:
        raise OpenAIResponseError

    return response.output_parsed
