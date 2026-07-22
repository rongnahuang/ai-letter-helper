from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.models import AnalysisResponse
from app.services.openai_service import (
    MissingAPIKeyError,
    OpenAIAuthenticationError,
    OpenAIResponseError,
    OpenAIUnavailableError,
    analyze_letter_image,
)

MAX_FILE_SIZE = 10 * 1024 * 1024
READ_CHUNK_SIZE = 1024 * 1024


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

    image_data = bytearray()

    try:
        while chunk := await file.read(READ_CHUNK_SIZE):
            image_data.extend(chunk)
            if len(image_data) > MAX_FILE_SIZE:
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

    try:
        return await analyze_letter_image(bytes(image_data), file.content_type)
    except MissingAPIKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The analysis service is not configured.",
        ) from exc
    except OpenAIAuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The analysis service could not authenticate.",
        ) from exc
    except OpenAIUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The analysis service is temporarily unavailable.",
        ) from exc
    except OpenAIResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The analysis service returned an invalid response.",
        ) from exc
