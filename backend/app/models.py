from typing import Literal

from pydantic import BaseModel


class AnalysisResponse(BaseModel):
    letter_type: str
    importance: Literal["高", "中", "低", "无法判断"]
    summary: str
    deadline: str
    action_required: Literal["需要", "不需要", "无法判断"]
    consequence: str
    actions: list[str]
    contact_information: list[str]
    reply_required: Literal["需要", "不需要", "无法判断"]
    payment_required: Literal["需要", "不需要", "无法判断"]
    scam_risk: Literal["未发现明显异常", "存在可疑迹象", "无法判断"]
    scam_warning: str
