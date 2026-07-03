"""Normalize malformed model JSON into canonical { meta, page } LayoutPlan shape."""
from __future__ import annotations

import copy
import re
from typing import Any

from .layout_validate import _load_allowed
from .prompt_hints import hints_from_prompt

_META_KEYS = frozenset(
    {"business", "style", "complexity", "websiteType", "pageName", "location", "industry"}
)
_THEME_KEYS = frozenset(
    {"primaryColor", "backgroundColor", "fontFamily", "borderRadius", "secondaryColor", "textColor"}
)
_DEFAULT_THEME = {
    "primaryColor": "#2563eb",
    "backgroundColor": "#ffffff",
    "fontFamily": "Inter, sans-serif",
    "borderRadius": "8px",
}


def _parse_embedded_kv(value: str) -> dict[str, Any]:
    """Parse broken strings like 'business\":\"Dental Clinic' into a dict."""
    if not isinstance(value, str):
        return {}
    text = value.strip()
    if not text:
        return {}
    # Already looks like broken JSON fragment
    if '":"' in text or '":' in text:
        wrapped = "{" + text.strip(",").strip() + "}"
        wrapped = re.sub(r'(\w+):', r'"\1":', wrapped)
        wrapped = wrapped.replace('":"', '":"').replace('""', '"')
        try:
            import json

            return json.loads(wrapped)
        except Exception:  # noqa: BLE001
            pass
    return {}


def _coerce_layout(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return dict(value)
    if isinstance(value, str):
        inner = _parse_embedded_kv(value)
        if inner:
            return inner
        if "variant" in value:
            m = re.search(r'variant["\']?\s*[:=]\s*["\']?([^"\',}]+)', value)
            if m:
                return {"variant": m.group(1).strip()}
    return {}


def _normalize_block(block: Any, allowed_types: set[str], index: int) -> dict[str, Any] | None:
    if not isinstance(block, dict):
        return None
    b = copy.deepcopy(block)
    btype = b.get("type")
    if isinstance(btype, str):
        btype = btype.strip().strip('"')
    if not btype or btype not in allowed_types:
        return None
    b["type"] = btype
    b["content"] = {} if b.get("content") in (None, "", {}) else {}
    if not isinstance(b.get("content"), dict):
        b["content"] = {}
    layout = _coerce_layout(b.get("layout"))
    if layout:
        b["layout"] = layout
    elif btype in ("hero", "heroSplit", "heroCentered"):
        defaults = {
            "hero": "stacked-image-top",
            "heroSplit": "split-image",
            "heroCentered": "centered",
        }
        b["layout"] = {"variant": defaults[btype]}
    styles = b.get("styles")
    if styles in (None, "", {}):
        b["styles"] = {}
    elif isinstance(styles, str):
        b["styles"] = _coerce_layout(styles) or {}
    elif not isinstance(styles, dict):
        b["styles"] = {}
    b["order"] = index
    return b


def _normalize_blocks(blocks: Any, allowed_types: set[str]) -> list[dict[str, Any]]:
    if not isinstance(blocks, list):
        return []
    out: list[dict[str, Any]] = []
    for raw in blocks:
        nb = _normalize_block(raw, allowed_types, len(out))
        if nb:
            out.append(nb)
    if not out:
        return []
    # enforce navbar first / footer last if present
    types = [b["type"] for b in out]
    if "navbar" in types and types[0] != "navbar":
        out.sort(key=lambda b: 0 if b["type"] == "navbar" else 1)
    if "footer" in types and out[-1]["type"] != "footer":
        footers = [b for b in out if b["type"] == "footer"]
        rest = [b for b in out if b["type"] != "footer"]
        out = rest + footers
    for i, b in enumerate(out):
        b["order"] = i
    return out


def normalize_layout_plan(
    raw: Any,
    *,
    prompt: str = "",
    page_name: str = "Home",
) -> dict[str, Any]:
    """Convert parsed model output (often flat/broken) into { meta, page }."""
    hints = hints_from_prompt(prompt, page_name)
    allowed = _load_allowed()
    allowed_types = set(allowed.get("semanticBlockTypes", []))

    if not isinstance(raw, dict):
        raw = {}

    # Already canonical
    if isinstance(raw.get("meta"), dict) and isinstance(raw.get("page"), dict):
        doc = copy.deepcopy(raw)
    else:
        meta: dict[str, Any] = {}
        page: dict[str, Any] = {"title": "", "theme": dict(_DEFAULT_THEME), "blocks": []}

        if isinstance(raw.get("meta"), dict):
            meta.update(raw["meta"])
        elif isinstance(raw.get("meta"), str):
            meta.update(_parse_embedded_kv(raw["meta"]))

        for k in _META_KEYS:
            if k in raw and k not in meta and not isinstance(raw[k], (dict, list)):
                meta[k] = raw[k]

        if isinstance(raw.get("page"), dict):
            page.update(copy.deepcopy(raw["page"]))
        elif isinstance(raw.get("page"), str):
            page["title"] = raw["page"]

        theme = page.get("theme")
        if not isinstance(theme, dict):
            theme = {}
        for k in _THEME_KEYS:
            if k in raw and k not in theme:
                theme[k] = raw[k]
        page["theme"] = {**_DEFAULT_THEME, **theme}

        blocks = page.get("blocks")
        if not isinstance(blocks, list) or not blocks:
            blocks = raw.get("blocks", [])
        page["blocks"] = _normalize_blocks(blocks, allowed_types)
        doc = {"meta": meta, "page": page}

    # Merge prompt hints for missing meta
    meta = dict(doc.get("meta") or {})
    for k, v in hints.items():
        if k not in meta or meta[k] in (None, "", {}):
            meta[k] = v
    meta["pageName"] = page_name or meta.get("pageName") or hints["pageName"]

    page = dict(doc.get("page") or {})
    theme = page.get("theme") if isinstance(page.get("theme"), dict) else {}
    page["theme"] = {**_DEFAULT_THEME, **theme}
    page["blocks"] = _normalize_blocks(page.get("blocks"), allowed_types)
    page.setdefault("title", page_name if page_name != "Home" else "")

    # Recompute complexity from block count if not in prompt
    from .prompt_hints import infer_complexity

    meta["complexity"] = infer_complexity(prompt, len(page["blocks"]))

    return {"meta": meta, "page": page}
