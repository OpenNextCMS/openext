"""JSON parse/repair helpers."""
from __future__ import annotations

import json
import re
from typing import Any

try:
    import json_repair
except ImportError:  # pragma: no cover
    json_repair = None

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = _FENCE_RE.sub("", text).strip()
    return text


def extract_json_object(text: str) -> str:
    text = strip_markdown_fences(text)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    # FLAN-T5 often omits outer braces on generation
    stripped = text.strip().rstrip(",")
    if start == -1 and stripped:
        if end != -1:
            return "{" + stripped[: stripped.rfind("}") + 1] + "}"
        return "{" + stripped + "}"
    if start != -1 and end == -1:
        return text[start:] + "}"
    return text


def parse_json_loose(text: str) -> Any:
    candidates = [extract_json_object(text)]
    stripped = strip_markdown_fences(text).strip()
    if not stripped.startswith("{"):
        candidates.append("{" + stripped.rstrip(",") + "}")

    last_error: Exception | None = None
    for raw in candidates:
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            last_error = exc
            if json_repair is not None:
                try:
                    return json.loads(json_repair.repair_json(raw))
                except Exception as repair_exc:  # noqa: BLE001
                    last_error = repair_exc
    if last_error:
        raise last_error
    raise json.JSONDecodeError("empty input", text, 0)


def to_compact_json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
