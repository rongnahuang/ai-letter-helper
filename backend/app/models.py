from pydantic import BaseModel


class AnalysisResponse(BaseModel):
    letter_type: str
    summary: str
    deadline: str
    actions: list[str]
