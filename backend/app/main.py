from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MAX_FILE_SIZE = 10 * 1024 * 1024
READ_CHUNK_SIZE = 1024 * 1024


class AnalysisResponse(BaseModel):
    letter_type: str
    summary: str
    deadline: str
    actions: list[str]


app = FastAPI(title="Letter Helper API", version="1.0.0")

# Expo native clients are not restricted by browser CORS. Allow all origins so
# Expo web and local development servers can call the API from any local port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze_letter(file: Annotated[UploadFile, File(...)]) -> AnalysisResponse:
    if not file.content_type or not file.content_type.lower().startswith("image/"):
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file must be an image.",
        )

    bytes_read = 0

    try:
        while chunk := await file.read(READ_CHUNK_SIZE):
            bytes_read += len(chunk)
            if bytes_read > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="The uploaded image must be 10 MB or smaller.",
                )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image could not be read.",
        ) from exc
    finally:
        await file.close()

    return AnalysisResponse(
        letter_type="Medical Bill",
        summary="This letter is asking you to pay a medical bill of $120.",
        deadline="August 15, 2026",
        actions=[
            "Check whether your insurance already paid part of the bill.",
            "Call the billing department if the amount looks incorrect.",
            "Pay before the deadline to avoid late fees.",
        ],
    )
