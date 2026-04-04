from typing import Literal, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from export_docx import build_docx_bytes
from extract_text import extract_from_upload

app = FastAPI(title="TRPG Log Export")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TitleStylePayload(BaseModel):
    fontSizePt: float = 14
    align: Literal["left", "center", "right"] = "center"
    border: bool = True


class InsertedTitlePayload(BaseModel):
    text: str = ""
    afterIndex: int = -1


class LinePayload(BaseModel):
    type: Literal["speech", "dice", "narration"]
    name: Optional[str] = None
    content: str = ""


class BgBlock(BaseModel):
    start: int = 0
    end: int = 0
    color: str = "#5a4a3a"


class AppearancePayload(BaseModel):
    bodyFont: str = "宋体"
    speakerFont: str = "黑体"
    bodyFontSizePt: float = Field(
        default=11.0,
        description="正文主字号（磅）：旁白、对话正文与角色名；骰点行按比例略小。",
    )
    charColors: dict[str, str] = Field(default_factory=dict)


class PageLayoutPayload(BaseModel):
    marginTopMm: float = 25.4
    marginBottomMm: float = 25.4
    marginLeftMm: float = 25.4
    marginRightMm: float = 25.4
    lineSpacingMultiple: float = 1.0


class ExportPayload(BaseModel):
    titleStyle: TitleStylePayload = Field(default_factory=TitleStylePayload)
    insertedTitles: list[InsertedTitlePayload] = Field(default_factory=list)
    appearance: AppearancePayload = Field(default_factory=AppearancePayload)
    lines: list[LinePayload] = Field(default_factory=list)
    charMap: dict[str, int] = Field(default_factory=dict)
    backgroundBlocks: list[BgBlock] = Field(default_factory=list)
    hiddenLineIndices: list[int] = Field(
        default_factory=list,
        description="按稳定解析行号（0-based）跳过正文；标题与背景块行号仍按原数组下标。",
    )
    pageLayout: PageLayoutPayload = Field(default_factory=PageLayoutPayload)
    parensSpeechRightAlign: bool = False


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)) -> dict[str, str]:
    try:
        raw = await file.read()
        if not raw:
            raise ValueError("空文件")
        text = extract_from_upload(file.filename or "", raw)
        return {"text": text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/export")
def export_docx(body: ExportPayload) -> Response:
    raw = build_docx_bytes(body.model_dump())
    return Response(
        content=raw,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
