"""从上传文件提取纯文本（.txt / .docx / .doc）。"""
from __future__ import annotations

import io
import os
import sys
import tempfile
def extract_txt(data: bytes) -> str:
    for enc in ("utf-8-sig", "utf-8", "gbk", "gb18030"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def extract_docx(data: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(data))
    parts: list[str] = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if t:
            parts.append(p.text)
    return "\n".join(parts) if parts else ""


def extract_doc_ms_word(path: str) -> str:
    if sys.platform != "win32":
        raise ValueError(
            ".doc 解析需要 Windows 且已安装 Microsoft Word；请另存为 .docx 后导入，或安装 pywin32 并确保本机 Word 可用。",
        )
    try:
        import win32com.client  # type: ignore[import-untyped]
    except ImportError as e:
        raise ValueError(
            "无法读取 .doc：请执行 pip install pywin32，并确保已安装 Microsoft Word。或请将文件另存为 .docx。",
        ) from e
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(os.path.abspath(path), ReadOnly=True)
        try:
            return str(doc.Content.Text or "")
        finally:
            doc.Close(False)
    finally:
        word.Quit()


def extract_from_upload(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".txt") or name.endswith(".log"):
        return extract_txt(data)
    if name.endswith(".docx"):
        return extract_docx(data)
    if name.endswith(".doc"):
        with tempfile.NamedTemporaryFile(suffix=".doc", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            return extract_doc_ms_word(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    raise ValueError("不支持的格式，请使用 .txt、.docx 或 .doc（.doc 需 Windows + Word）。")
