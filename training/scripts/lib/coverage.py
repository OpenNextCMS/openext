"""Coverage helpers: websiteType × pageName keys and industry mapping."""
from __future__ import annotations

import json
from typing import Any

from .paths import SCHEMA_DIR
from .template_data import DEFAULT_PAGES


def load_industry_to_website_type() -> dict[str, str]:
    data = json.loads((SCHEMA_DIR / "industry_to_website_type.json").read_text(encoding="utf-8"))
    mapping: dict[str, str] = dict(data.get("mapping", {}))
    mapping["__default__"] = data.get("default", "corporate")
    return mapping


def industry_to_website_type(industry: str | None) -> str:
    mapping = load_industry_to_website_type()
    if not industry:
        return mapping["__default__"]
    return mapping.get(industry, mapping["__default__"])


def all_coverage_combos() -> list[tuple[str, str]]:
    combos: list[tuple[str, str]] = []
    for website_type, pages in DEFAULT_PAGES.items():
        for page_name in pages:
            combos.append((website_type, page_name))
    return combos


def sample_dedup_key(sample: dict[str, Any]) -> tuple[str, str, str]:
    """Dedup key: (prompt, websiteType, pageName)."""
    output = sample.get("output") or {}
    meta = output.get("meta") or {}
    website_type = (
        sample.get("websiteType")
        or meta.get("websiteType")
        or industry_to_website_type(sample.get("industry") or meta.get("industry"))
    )
    page_name = sample.get("pageName") or meta.get("pageName") or "Home"
    prompt = (sample.get("prompt") or "").strip()
    return prompt, website_type, page_name


def enrich_output_meta(
    output: dict[str, Any],
    *,
    website_type: str,
    page_name: str,
    industry: str | None = None,
) -> dict[str, Any]:
    """Ensure output.meta has websiteType and pageName."""
    meta = dict(output.get("meta") or {})
    meta["websiteType"] = website_type
    meta["pageName"] = page_name
    if industry and "industry" not in meta:
        meta["industry"] = industry
    return {**output, "meta": meta}


def normalize_sample(sample: dict[str, Any]) -> dict[str, Any]:
    """Fill top-level and output.meta websiteType/pageName from available fields."""
    output = dict(sample.get("output") or {})
    meta = dict(output.get("meta") or {})
    industry = sample.get("industry") or meta.get("industry")
    website_type = (
        sample.get("websiteType")
        or meta.get("websiteType")
        or industry_to_website_type(industry)
    )
    page_name = sample.get("pageName") or meta.get("pageName") or "Home"
    output = enrich_output_meta(
        output,
        website_type=website_type,
        page_name=page_name,
        industry=industry,
    )
    normalized = {**sample, "output": output}
    normalized["websiteType"] = website_type
    normalized["pageName"] = page_name
    if industry:
        normalized["industry"] = industry
    return normalized
