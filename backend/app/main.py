from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.models import AnalysisResponse
from app.services.openai_service import (
    LetterImage,
    MissingAPIKeyError,
    OpenAIAuthenticationError,
    OpenAIResponseError,
    OpenAIUnavailableError,
    analyze_letter_images,
)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_FILES = 10
READ_CHUNK_SIZE = 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
    "image/webp",
}


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
async def analyze_letter(files: Annotated[list[UploadFile], File(...)]) -> AnalysisResponse:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请至少上传一张图片。",
        )

    if len(files) > MAX_FILES:
        for file in files:
            await file.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="每次最多可以上传10张图片。",
        )

    letter_images: list[LetterImage] = []

    try:
        for index, file in enumerate(files):
            content_type = (file.content_type or "").strip().lower()

            if content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="其中一张图片格式不受支持。",
                )

            image_data = bytearray()

            while chunk := await file.read(READ_CHUNK_SIZE):
                image_data.extend(chunk)
                if len(image_data) > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="每张图片必须小于或等于10 MB。",
                    )

            if not image_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="上传的图片不能为空。",
                )

            letter_images.append(
                LetterImage(
                    content=bytes(image_data),
                    content_type=content_type,
                    filename=file.filename or f"letter-page-{index + 1}",
                )
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法读取上传的图片。",
        ) from exc
    finally:
        for file in files:
            await file.close()

    try:
        return await analyze_letter_images(letter_images)
    except MissingAPIKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="分析服务尚未配置。",
        ) from exc
    except OpenAIAuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="分析服务认证失败。",
        ) from exc
    except OpenAIUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="分析服务暂时无法使用。",
        ) from exc
    except OpenAIResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="分析服务返回了无效结果。",
        ) from exc
