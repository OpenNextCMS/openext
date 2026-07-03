"""Infer LayoutPlan meta fields from a natural-language prompt."""
from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Any

from .paths import SCHEMA_DIR, TRAINING_ROOT

_STYLES = ("Premium", "Modern", "Minimal", "Corporate", "Creative", "Luxury", "Startup", "Editorial")
_COMPLEXITY_RE = re.compile(r"\b(low|medium|high)\b", re.IGNORECASE)
_LOCATION_RE = re.compile(r"\b(?:in|at|near)\s+([A-Z][a-zA-Z\s]{2,40})", re.IGNORECASE)

# keyword -> websiteType (order matters: more specific first)
_WEBSITE_KEYWORDS: list[tuple[str, str]] = [
    ("dental", "healthcare"),
    ("clinic", "healthcare"),
    ("hospital", "healthcare"),
    ("healthcare", "healthcare"),
    ("medical", "healthcare"),
    ("restaurant", "restaurant"),
    ("cafe", "restaurant"),
    ("menu page", "restaurant"),
    ("saas", "saas"),
    ("software company", "saas"),
    ("startup", "saas"),
    ("ai startup", "saas"),
    ("ecommerce", "ecommerce"),
    ("e-commerce", "ecommerce"),
    ("online store", "ecommerce"),
    ("shop", "ecommerce"),
    ("portfolio", "portfolio"),
    ("designer", "portfolio"),
    ("photographer", "portfolio"),
    ("real estate", "real-estate"),
    ("property", "real-estate"),
    ("law firm", "corporate"),
    ("corporate", "corporate"),
    ("agency", "agency"),
    ("marketing agency", "agency"),
    ("school", "education"),
    ("education", "education"),
    ("university", "education"),
    ("course", "education"),
    ("personal brand", "personal-brand"),
    ("influencer", "personal-brand"),
]

_PAGE_KEYWORDS: list[tuple[str, str]] = [
    ("pricing page", "Pricing"),
    ("about page", "About"),
    ("about us", "About"),
    ("contact page", "Contact"),
    ("menu page", "Menu"),
    ("blog page", "Blog"),
    ("services page", "Services"),
    ("features page", "Features"),
    ("shop page", "Shop"),
    ("gallery page", "Gallery"),
    ("home page", "Home"),
    ("homepage", "Home"),
]


@lru_cache(maxsize=1)
def _industry_profiles() -> dict[str, Any]:
    return json.loads((SCHEMA_DIR / "industry_profiles.json").read_text(encoding="utf-8"))


def infer_website_type(prompt: str) -> str:
    text = prompt.lower()
    mapping = json.loads((SCHEMA_DIR / "industry_to_website_type.json").read_text(encoding="utf-8"))
    default = mapping.get("default", "corporate")
    for phrase, wt in _WEBSITE_KEYWORDS:
        if phrase in text:
            return wt
    for industry, wt in mapping.get("mapping", {}).items():
        if industry in text:
            return wt
    return default


def infer_page_name(prompt: str, explicit: str = "Home") -> str:
    if explicit and explicit != "Home":
        return explicit
    text = prompt.lower()
    for phrase, name in _PAGE_KEYWORDS:
        if phrase in text:
            return name
    return explicit or "Home"


def infer_style(prompt: str, website_type: str) -> str:
    text = prompt.lower()
    for style in _STYLES:
        if style.lower() in text:
            return style
    profiles = _industry_profiles().get("websiteTypes", {})
    wt = profiles.get(website_type, {})
    return wt.get("defaultMetaStyle", "Modern")


def infer_complexity(prompt: str, block_count: int | None = None) -> str:
    m = _COMPLEXITY_RE.search(prompt)
    if m:
        return m.group(1).capitalize()
    if block_count is not None:
        if block_count <= 5:
            return "Low"
        if block_count <= 8:
            return "Medium"
        return "High"
    return "Medium"


def infer_business(prompt: str, website_type: str) -> str:
    profiles = _industry_profiles().get("websiteTypes", {})
    wt = profiles.get(website_type, {})
    label = wt.get("label", website_type.replace("-", " ").title())
    # "dental clinic website in Ahmedabad" -> Dental Clinic
    m = re.search(
        r"(?:create|build|design|generate|make)\s+(?:a\s+)?(.{3,60}?)(?:\s+website|\s+site|\s+page|\s+in\b)",
        prompt,
        re.IGNORECASE,
    )
    if m:
        name = m.group(1).strip(" .,-")
        name = re.sub(r"^(premium|modern|minimal|corporate|creative|luxury|startup|editorial)\s+", "", name, flags=re.I)
        if len(name) >= 3:
            return name.title() if name.islower() else name
    samples = wt.get("sampleBusinesses") or []
    return samples[0] if samples else label


def infer_location(prompt: str) -> str:
    m = _LOCATION_RE.search(prompt)
    if m:
        loc = m.group(1).strip()
        return loc if loc.lower().startswith("in ") else f"in {loc}"
    return ""


def hints_from_prompt(prompt: str, page_name: str = "Home") -> dict[str, Any]:
    website_type = infer_website_type(prompt)
    page = infer_page_name(prompt, page_name)
    style = infer_style(prompt, website_type)
    business = infer_business(prompt, website_type)
    location = infer_location(prompt)
    meta: dict[str, Any] = {
        "business": business,
        "style": style,
        "complexity": infer_complexity(prompt),
        "websiteType": website_type,
        "pageName": page,
    }
    if location:
        meta["location"] = location
    if website_type in ("healthcare", "restaurant", "education"):
        meta["industry"] = website_type
    return meta
