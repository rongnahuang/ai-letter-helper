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
                max_output_tokens=1000,
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
