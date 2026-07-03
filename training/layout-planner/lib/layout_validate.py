"""LayoutPlan validation (self-contained — no import conflict with training/scripts/lib)."""
from __future__ import annotations

import json
import re
from typing import Any

from .paths import SCHEMA_DIR

_LOREM_RE = re.compile(
    r"lorem\s+ipsum|dolor\s+sit\s+amet|consectetur\s+adipiscing|placeholder\s+text",
    re.IGNORECASE,
)

_HERO_TYPES = frozenset({"hero", "heroSplit", "heroCentered"})
_ALLOWED_STYLES = frozenset(
    {"Premium", "Modern", "Minimal", "Corporate", "Creative", "Luxury", "Startup", "Editorial"}
)
_ALLOWED_COMPLEXITY = frozenset({"Low", "Medium", "High"})


def _load_allowed() -> dict[str, Any]:
    path = SCHEMA_DIR / "allowed_types.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _deep_iter_strings(obj: Any):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from _deep_iter_strings(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _deep_iter_strings(item)


def validate_layout_plan_output(output: dict[str, Any], allowed: dict[str, Any] | None = None) -> list[str]:
    """Return validation errors for structure-only LayoutPlan (empty content on every block)."""
    errors: list[str] = []
    allowed = allowed or _load_allowed()
    allowed_types = set(allowed.get("semanticBlockTypes", []))
    layout_variants: dict[str, list[str]] = allowed.get("layoutVariants", {})

    if not isinstance(output, dict):
        return ["output must be an object"]

    meta = output.get("meta")
    page = output.get("page")
    if not isinstance(meta, dict):
        errors.append("meta must be an object")
    else:
        if not meta.get("websiteType"):
            errors.append("meta.websiteType is required")
        if not meta.get("pageName"):
            errors.append("meta.pageName is required")
        style = meta.get("style")
        if style and style not in _ALLOWED_STYLES:
            errors.append(f"meta.style invalid: {style!r}")
        complexity = meta.get("complexity")
        if complexity and complexity not in _ALLOWED_COMPLEXITY:
            errors.append(f"meta.complexity invalid: {complexity!r}")
    if not isinstance(page, dict):
        errors.append("page must be an object")
        return errors

    for text in _deep_iter_strings(output):
        if _LOREM_RE.search(text):
            errors.append("contains lorem ipsum or placeholder text")
            break

    theme = page.get("theme")
    if not isinstance(theme, dict):
        errors.append("page.theme must be an object")
    else:
        for key in ("primaryColor", "backgroundColor"):
            if not theme.get(key):
                errors.append(f"page.theme missing required field: {key}")

    blocks = page.get("blocks")
    if not isinstance(blocks, list) or not blocks:
        errors.append("page.blocks must be a non-empty array")
        return errors

    if blocks[0].get("type") != "navbar":
        errors.append("first block must be navbar")
    if blocks[-1].get("type") != "footer":
        errors.append("last block must be footer")

    orders: list[int] = []
    for i, block in enumerate(blocks):
        if not isinstance(block, dict):
            errors.append(f"blocks[{i}] must be an object")
            continue
        btype = block.get("type")
        if btype not in allowed_types:
            errors.append(f"blocks[{i}] unknown type: {btype}")
        content = block.get("content")
        if content != {}:
            errors.append(f"blocks[{i}].content must be empty object {{}}")
        order = block.get("order")
        if not isinstance(order, int):
            errors.append(f"blocks[{i}].order must be integer")
        else:
            orders.append(order)
        if btype in _HERO_TYPES:
            layout = block.get("layout")
            if not isinstance(layout, dict) or not layout.get("variant"):
                errors.append(f"blocks[{i}] ({btype}) requires layout.variant")
            elif btype in layout_variants:
                variant = layout.get("variant")
                if variant not in layout_variants[btype]:
                    errors.append(f"blocks[{i}] invalid variant {variant!r} for {btype}")

    expected = list(range(len(blocks)))
    if sorted(orders) != expected:
        errors.append(f"block order must be sequential 0..{len(blocks) - 1}")

    return errors


def validate_filled_page(page_doc: dict[str, Any], allowed: dict[str, Any] | None = None) -> list[str]:
    """Validate a content-filled page — structure rules; content may be non-empty."""
    allowed = allowed or _load_allowed()
    allowed_types = set(allowed.get("semanticBlockTypes", []))

    errors: list[str] = []
    if not isinstance(page_doc, dict):
        return ["document must be an object"]

    meta = page_doc.get("meta")
    page = page_doc.get("page")
    if not isinstance(meta, dict):
        errors.append("meta must be an object")
    if not isinstance(page, dict):
        errors.append("page must be an object")
        return errors

    theme = page.get("theme")
    if not isinstance(theme, dict):
        errors.append("page.theme must be an object")
    elif not theme.get("primaryColor") or not theme.get("backgroundColor"):
        errors.append("page.theme requires primaryColor and backgroundColor")

    blocks = page.get("blocks")
    if not isinstance(blocks, list) or not blocks:
        errors.append("page.blocks must be a non-empty array")
        return errors

    if blocks[0].get("type") != "navbar":
        errors.append("first block must be navbar")
    if blocks[-1].get("type") != "footer":
        errors.append("last block must be footer")

    for i, block in enumerate(blocks):
        if not isinstance(block, dict):
            errors.append(f"blocks[{i}] must be an object")
            continue
        btype = block.get("type")
        if btype not in allowed_types:
            errors.append(f"blocks[{i}] unknown type: {btype!r}")
        content = block.get("content")
        if content is not None and not isinstance(content, dict):
            errors.append(f"blocks[{i}].content must be an object")
        if not isinstance(block.get("order"), int):
            errors.append(f"blocks[{i}].order must be integer")

    orders = [b.get("order") for b in blocks if isinstance(b.get("order"), int)]
    expected = list(range(len(blocks)))
    if sorted(orders) != expected:
        errors.append(f"block order must be sequential 0..{len(blocks) - 1}")

    return errors
