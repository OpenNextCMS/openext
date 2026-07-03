"""Convert wizard block lists into CMS-native LayoutPlan output JSON."""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

from .paths import SCHEMA_DIR


def _load_json(name: str) -> dict[str, Any]:
    with (SCHEMA_DIR / name).open(encoding="utf-8") as f:
        return json.load(f)


def _merge_block(base: dict[str, Any]) -> dict[str, Any]:
    block: dict[str, Any] = {"content": {}}
    block.update(copy.deepcopy(base))
    if "content" not in block:
        block["content"] = {}
    if "styles" not in block:
        block["styles"] = {}
    return block


def map_wizard_block(
    wizard_type: str,
    website_type: str,
    wizard_map: dict[str, Any] | None = None,
) -> dict[str, Any]:
    wizard_map = wizard_map or _load_json("wizard_to_semantic_map.json")
    overrides = wizard_map.get("industryHeroOverrides", {}).get(website_type, {})
    if wizard_type in overrides:
        return _merge_block(overrides[wizard_type])
    spec = wizard_map.get("blocks", {}).get(wizard_type)
    if not spec:
        return _merge_block({"type": "custom", "layout": {"variant": "default"}})
    return _merge_block(spec)


def build_layout_plan(
    *,
    wizard_blocks: list[str],
    website_type: str,
    page_name: str = "Home",
    page_title: str = "",
    business: str = "",
    style: str = "Modern",
    complexity: str = "Medium",
    location: str = "",
    theme_id: str = "modern",
    header_id: str | None = None,
    footer_id: str | None = None,
    industry: str | None = None,
) -> dict[str, Any]:
    profiles = _load_json("industry_profiles.json")
    wizard_map = _load_json("wizard_to_semantic_map.json")
    wt = profiles.get("websiteTypes", {}).get(website_type, profiles["websiteTypes"]["agency"])
    themes = profiles.get("wizardThemes", {})
    theme = themes.get(theme_id, themes["modern"])

    header_id = header_id or wt.get("defaultHeader", "classic")
    footer_id = footer_id or wt.get("defaultFooter", "simple")
    header_spec = wizard_map.get("headerTemplates", {}).get(header_id, wizard_map["headerTemplates"]["classic"])
    footer_spec = wizard_map.get("footerTemplates", {}).get(footer_id, wizard_map["footerTemplates"]["simple"])

    blocks: list[dict[str, Any]] = []
    blocks.append(_merge_block(header_spec))
    for wb in wizard_blocks:
        blocks.append(map_wizard_block(wb, website_type, wizard_map))
    blocks.append(_merge_block(footer_spec))

    for order, block in enumerate(blocks):
        block["order"] = order

    meta_style = style or wt.get("defaultMetaStyle", theme.get("metaStyle", "Modern"))
    complexity = complexity or wt.get("defaultComplexity", "Medium")

    meta: dict[str, Any] = {
        "business": business or wt.get("label", website_type),
        "style": meta_style,
        "complexity": complexity,
        "websiteType": website_type,
        "pageName": page_name,
        **({"location": location} if location else {}),
    }
    if industry:
        meta["industry"] = industry

    return {
        "meta": meta,
        "page": {
            "title": page_title or (page_name if page_name != "Home" else ""),
            "theme": {
                "primaryColor": theme["primaryColor"],
                "backgroundColor": theme["backgroundColor"],
                "fontFamily": theme.get("fontFamily", "Inter, sans-serif"),
                "borderRadius": theme.get("borderRadius", "8px"),
            },
            "blocks": blocks,
        },
    }
