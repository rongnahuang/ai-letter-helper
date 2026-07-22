import base64
import logging
import os
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

SYSTEM_PROMPT = """
你是一名谨慎的信件分析助手。请只分析上传图片中清晰可见的信息，并且所有字段都使用简体中文。

严格遵守以下规则：
- 不得猜测或编造图片中未显示的日期、金额、机构、截止日期、账号或必须采取的行动。
- letter_type：用中文概括信件的一般类型。
- summary：清楚说明可见的寄件方、目的、金额、后果和重要细节；看不清或未出现的信息不要补充。
- deadline：用中文返回图片中可见的截止日期；如果没有明确可见的截止日期，必须返回“未发现明确截止日期”。
- actions：用中文提供实际的后续步骤，并明确区分信件中可见的要求与一般性建议。
- 不要把法律、医疗、税务、保险或财务判断表述为确定结论。
- 对紧急或高风险信件，建议用户联系寄件方或相应的合格专业人士核实。
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


async def analyze_letter_image(image_bytes: bytes, mime_type: str) -> AnalysisResponse:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise MissingAPIKeyError

    normalized_mime_type = mime_type.strip().lower()
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    image_url = f"data:{normalized_mime_type};base64,{encoded_image}"

    try:
        async with AsyncOpenAI(api_key=api_key, timeout=30.0, max_retries=1) as client:
            response = await client.responses.parse(
                model=MODEL,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": "请分析这封信，并严格按照指定结构返回结果。",
                            },
                            {
                                "type": "input_image",
                                "image_url": image_url,
                                "detail": "high",
                            },
                        ],
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
