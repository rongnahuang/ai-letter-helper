from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class FormFieldOption(BaseModel):
    original_text: str
    chinese_translation: str
    explanation: str
    is_selected: Literal["是", "否", "无法判断"]


class FormFieldGuidance(BaseModel):
    field_name: str
    chinese_name: str
    explanation: str
    example: str
    required_status: Literal["必填", "选填", "无法判断"]
    page_number: Optional[int]
    location_hint: str
    warning: str
    options: list[FormFieldOption]


class FormGuidance(BaseModel):
    form_detected: Literal["是", "否", "无法判断"]
    form_name: str
    general_instructions: list[str]
    fields: list[FormFieldGuidance]
    signature_required: Literal["需要", "不需要", "无法判断"]
    signature_instructions: str
    documents_needed: list[str]
    return_methods: list[str]
    return_deadline: str
    important_warning: str


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
    form_guidance: FormGuidance
