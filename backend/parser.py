import re
from typing import Literal, TypedDict


class SpeechLine(TypedDict):
    type: Literal["speech"]
    name: str
    content: str


class DiceLine(TypedDict):
    type: Literal["dice"]
    name: str
    content: str


class NarrationLine(TypedDict):
    type: Literal["narration"]
    content: str


ParsedLine = SpeechLine | DiceLine | NarrationLine

LINE_RE = re.compile(r"^<([^>]+)>:([\s\S]*)$")


def _parse_line(raw: str) -> ParsedLine | dict | None:
    m = LINE_RE.match(raw)
    if m:
        name = m.group(1).strip()
        content = m.group(2).strip()
        return {"type": "speech", "name": name, "content": content}
    stripped = raw.strip()
    if stripped:
        return {"type": "continuation", "content": stripped}
    return None


def merge_continuations(
    parsed: list,
) -> list[ParsedLine]:
    merged: list[ParsedLine] = []
    for l in parsed:
        if l.get("type") == "continuation":
            prev = next(
                (x for x in reversed(merged) if x["type"] in ("speech", "dice")),
                None,
            )
            if prev:
                prev["content"] += "\n" + l["content"]
            else:
                merged.append({"type": "narration", "content": l["content"]})
        else:
            merged.append(l)  # type: ignore[arg-type]
    return merged


def parse_raw_log(raw: str) -> tuple[list[ParsedLine], dict[str, int], list[str]]:
    if not raw.strip():
        return [], {}, []
    lines_raw = raw.split("\n")
    parsed = [x for x in (_parse_line(x) for x in lines_raw) if x is not None]
    merged = merge_continuations(parsed)

    char_map: dict[str, int] = {}
    char_order: list[str] = []
    colors_n = 6

    for l in merged:
        if l["type"] == "speech":
            name = l["name"]
            if name not in char_map:
                char_map[name] = len(char_order) % colors_n
                char_order.append(name)

    return merged, char_map, char_order
