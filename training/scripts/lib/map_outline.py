"""Map PageOutline + site metadata to CMS LayoutPlan training labels."""
from __future__ import annotations

import copy
import json
import uuid
from typing import Any

from .coverage import enrich_output_meta, industry_to_website_type
from .paths import SCHEMA_DIR


def _load_signal_map() -> dict[str, Any]:
    with (SCHEMA_DIR / "section_signal_map.json").open(encoding="utf-8") as f:
        return json.load(f)


def _match_rule(signals: set[str], rule: dict[str, Any]) -> bool:
    required = set(rule.get("requiredSignals", []))
    exclude = set(rule.get("excludeSignals", []))
    if not required.issubset(signals):
        return False
    if signals.intersection(exclude):
        return False
    return True


def _map_section(signals: list[str], signal_map: dict[str, Any]) -> tuple[dict[str, Any], float]:
    sig_set = set(signals)
    for rule in signal_map.get("rules", []):
        if _match_rule(sig_set, rule):
            block = copy.deepcopy(rule["block"])
            block["content"] = {}
            if "styles" not in block:
                block["styles"] = {}
            return block, float(rule.get("confidence", 0.7))

    default = copy.deepcopy(signal_map["defaultContentBlock"])
    default["content"] = {}
    if "styles" not in default:
        default["styles"] = {}
    return default, float(default.get("confidence", 0.55))


def _theme_for_industry(industry: str, style_hints: dict[str, Any], signal_map: dict[str, Any]) -> dict[str, str]:
    hints = signal_map.get("industryThemeHints", {}).get(
        industry,
        {
            "primaryColor": "#2563eb",
            "backgroundColor": "#ffffff",
            "fontFamily": "Inter, sans-serif",
            "borderRadius": "8px",
        },
    )
    theme = dict(hints)
    if style_hints.get("isDark"):
        theme["backgroundColor"] = "#0b0f19"
        theme.setdefault("textColor", "#e5e7eb")
    bgs = style_hints.get("backgroundColors") or []
    if bgs and bgs[0].startswith("#"):
        theme["backgroundColor"] = bgs[0]
    return theme


def _complexity_from_blocks(n: int) -> str:
    if n <= 5:
        return "Low"
    if n <= 8:
        return "Medium"
    return "High"


def build_prompt(site_meta: dict[str, Any]) -> str:
    style = site_meta.get("expectedStyle", "Modern")
    business = site_meta.get("business", "Business")
    industry = site_meta.get("industry", "general")
    title = site_meta.get("title") or ""
    title_bit = f" titled '{title}'" if title else ""
    return (
        f"Create a {style} {business} website similar to the layout patterns of a real "
        f"{industry.replace('-', ' ')} homepage{title_bit}."
    )


def outline_to_layout_plan(
    outline: dict[str, Any],
    site_meta: dict[str, Any],
    signal_map: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], float, list[str]]:
    """Returns (layout_plan_output, confidence, warnings)."""
    signal_map = signal_map or _load_signal_map()
    warnings: list[str] = []

    if outline.get("error"):
        raise ValueError(outline["error"])
    if outline.get("statusCode", 0) != 200:
        raise ValueError(f"http_{outline.get('statusCode')}")

    sections = outline.get("sections") or []
    if len(sections) < 3:
        warnings.append("few_sections")

    blocks: list[dict[str, Any]] = []
    confidences: list[float] = []

    nav_spec = copy.deepcopy(signal_map["navbarBlock"])
    nav_spec["content"] = {}
    blocks.append(nav_spec)
    confidences.append(float(nav_spec.get("confidence", 0.95)))

    content_sections = [s for s in sections if "nav-links" not in s.get("signals", []) and "footer-links" not in s.get("signals", [])]
    hero_assigned = False

    if not content_sections:
        warnings.append("no_content_sections")
        content_sections = [
            {"signals": ["h1", "centered-text", "hero-candidate"], "headings": [], "index": 0}
        ]

    for sec in content_sections:
        signals = list(sec.get("signals") or [])
        if not hero_assigned and ("hero-candidate" in signals or ("h1" in signals and "hero-image" in signals)):
            if "split-layout" in signals:
                signals.extend(["split-layout"])
            elif "stacked-image-top" in signals:
                pass
            hero_assigned = True

        block, conf = _map_section(signals, signal_map)
        # Avoid duplicate consecutive same types (merge noise)
        if blocks and blocks[-1]["type"] == block["type"] and block["type"] == "about":
            warnings.append("merged_duplicate_about")
            continue
        blocks.append(block)
        confidences.append(conf)

    footer_spec = copy.deepcopy(signal_map["footerBlock"])
    footer_spec["content"] = {}
    blocks.append(footer_spec)
    confidences.append(float(footer_spec.get("confidence", 0.95)))

    # Cap blocks
    if len(blocks) > 15:
        blocks = [blocks[0], *blocks[1:14], blocks[-1]]
        warnings.append("truncated_blocks")

    for order, block in enumerate(blocks):
        block["order"] = order

    industry = site_meta.get("industry", "saas")
    website_type = industry_to_website_type(industry)
    style = site_meta.get("expectedStyle", "Modern")
    complexity = _complexity_from_blocks(len(blocks))

    output = enrich_output_meta(
        {
            "meta": {
                "business": site_meta.get("business", "Business"),
                "style": style,
                "complexity": complexity,
                "industry": industry,
            },
            "page": {
                "title": "",
                "theme": _theme_for_industry(industry, outline.get("styleHints") or {}, signal_map),
                "blocks": blocks,
            },
        },
        website_type=website_type,
        page_name="Home",
        industry=industry,
    )

    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    if not hero_assigned:
        warnings.append("no_hero_detected")
        avg_conf *= 0.85

    return output, avg_conf, warnings


def outline_to_sample(
    outline: dict[str, Any],
    site_meta: dict[str, Any],
    *,
    use_llm_output: dict[str, Any] | None = None,
) -> dict[str, Any]:
    site_id = site_meta.get("id", str(uuid.uuid4()))
    industry = site_meta.get("industry")
    website_type = industry_to_website_type(industry)

    if use_llm_output:
        raw_output = use_llm_output.get("output", use_llm_output)
        output = enrich_output_meta(
            raw_output,
            website_type=website_type,
            page_name="Home",
            industry=industry,
        )
        confidence = float(use_llm_output.get("confidence", 0.75))
    else:
        output, confidence, warnings = outline_to_layout_plan(outline, site_meta)
        site_meta = {**site_meta, "mappingWarnings": warnings}

    return {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"{site_id}:{outline.get('url', '')}")),
        "source": "real-site",
        "url": outline.get("url") or site_meta.get("url"),
        "siteId": site_id,
        "industry": industry,
        "websiteType": website_type,
        "pageName": "Home",
        "scrapedAt": outline.get("scrapedAt"),
        "contentHash": outline.get("contentHash"),
        "confidence": round(confidence, 3),
        "needs_review": confidence < 0.6,
        "prompt": build_prompt({**site_meta, "title": outline.get("title")}),
        "output": output,
        "mappingWarnings": site_meta.get("mappingWarnings", []),
    }
