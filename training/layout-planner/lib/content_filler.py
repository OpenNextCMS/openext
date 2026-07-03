"""LLM content filler — fills block content/images while preserving layout structure."""
from __future__ import annotations

import copy
from typing import Any

from .json_utils import parse_json_loose, to_compact_json
from .llm_client import Provider, call_llm

CONTENT_FILLER_SYSTEM = """You are the Content Filler for OpenNext CMS — stage 2 of a two-stage website generator.

Stage 1 (already done): a layout planner produced structure-only JSON — block types, order, layout variants, theme, and per-section styles. Every block has content: {} and images: {}.

Your job: fill ONLY the content and images fields for each block. Match the user's business brief and meta fields (business, style, websiteType, pageName, location).

STRICT RULES:
1. Return ONE valid JSON object with the same top-level shape: { "meta": {...}, "page": { "title", "theme", "blocks": [...] } }
2. DO NOT change: meta, page.theme, block types, block order, layout, or styles
3. DO NOT add or remove blocks
4. NO lorem ipsum, NO "Your headline here", NO placeholder text
5. Write realistic, niche-specific marketing copy
6. Headlines ≤ 12 words; subheadlines ≤ 35 words
7. Include royalty-free image URLs (Unsplash) in images where appropriate:
   - hero blocks: images.heroImage
   - gallery: images.items or content.items with src/url
   - team: member avatars in content.items[].avatar or images
8. navbar content: logo, links[{label, href}], optional cta {label, href}
9. footer content: brand, copyright, columns[{title, links[{label, href}]}]
10. featureGrid/featureCards: content with title/heading, items or features array
11. testimonials: content.items[{name, role, company, feedback, quote}]
12. faq: content.items[{question, answer}]
13. pricing: content.plans[{name, price, features[], cta}]
14. contact: content with email, phone, address, headline, subtitle
15. stats: content.items[{value, label}]
16. Return JSON ONLY — no markdown fences, no explanation
"""

BLOCK_CONTENT_HINTS: dict[str, str] = {
    "navbar": '{"logo":"Brand Name","links":[{"label":"Home","href":"#home"},{"label":"About","href":"#about"}],"cta":{"label":"Contact","href":"#contact"}}',
    "hero": '{"eyebrow":"...","headline":"...","subheadline":"...","primaryButton":"...","secondaryButton":"..."} + images.heroImage',
    "heroSplit": "same as hero + images.heroImage",
    "heroCentered": "same as hero + images.heroImage",
    "featureGrid": '{"title":"...","subtitle":"...","items":[{"title":"...","description":"..."}]}',
    "featureCards": '{"title":"...","items":[{"title":"...","description":"..."}]}',
    "about": '{"title":"...","description":"...","body":"..."}',
    "stats": '{"title":"...","items":[{"value":"500+","label":"Clients"}]}',
    "cta": '{"title":"...","subtitle":"...","primaryButton":"...","secondaryButton":"..."}',
    "testimonials": '{"title":"...","items":[{"name":"...","role":"...","company":"...","feedback":"..."}]}',
    "team": '{"title":"...","items":[{"name":"...","role":"...","bio":"..."}]}',
    "pricing": '{"title":"...","plans":[{"name":"...","price":"$29/mo","features":["..."],"cta":"Get Started"}]}',
    "gallery": '{"title":"...","items":[{"src":"https://images.unsplash.com/...","alt":"..."}]}',
    "faq": '{"title":"...","items":[{"question":"...","answer":"..."}]}',
    "blog": '{"title":"...","items":[{"title":"...","excerpt":"...","date":"..."}]}',
    "contact": '{"title":"...","subtitle":"...","email":"...","phone":"...","address":"..."}',
    "footer": '{"brand":"...","copyright":"© 2026 ...","columns":[{"title":"Links","links":[{"label":"...","href":"#"}]}]}',
    "process": '{"title":"...","items":[{"step":"1","title":"...","description":"..."}]}',
    "logos": '{"title":"Trusted by","items":[{"name":"Company A"},{"name":"Company B"}]}',
    "newsletter": '{"title":"...","subtitle":"...","buttonText":"Subscribe","placeholder":"your@email.com"}',
    "custom": '{"title":"...","body":"..."}',
}


def _merge_filled_content(
    skeleton: dict[str, Any],
    filled: dict[str, Any],
) -> dict[str, Any]:
    """Merge LLM-filled content/images onto the original skeleton (structure preserved)."""
    result = copy.deepcopy(skeleton)
    filled_page = filled.get("page") if isinstance(filled.get("page"), dict) else filled
    filled_blocks = filled_page.get("blocks") if isinstance(filled_page, dict) else None
    if not isinstance(filled_blocks, list):
        return result

    skel_blocks = result.get("page", {}).get("blocks", [])
    for i, skel_block in enumerate(skel_blocks):
        if i >= len(filled_blocks):
            break
        fb = filled_blocks[i]
        if not isinstance(fb, dict):
            continue
        if isinstance(fb.get("content"), dict) and fb["content"]:
            skel_block["content"] = fb["content"]
        if isinstance(fb.get("images"), dict) and fb["images"]:
            skel_block["images"] = fb["images"]
    return result


def fill_content(
    layout_plan: dict[str, Any],
    user_prompt: str,
    *,
    provider: Provider | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Call LLM to fill content/images into a structure-only LayoutPlan.
    Returns the combined full page document.
    """
    skeleton = copy.deepcopy(layout_plan)
    for block in skeleton.get("page", {}).get("blocks", []):
        block["content"] = {}
        block.setdefault("images", {})

    block_types = [b.get("type", "?") for b in skeleton.get("page", {}).get("blocks", [])]
    hints = "\n".join(
        f"- {t}: {BLOCK_CONTENT_HINTS.get(t, 'title, subtitle, items as needed')}"
        for t in block_types
        if t not in ("navbar", "footer") or True
    )

    user_message = f"""USER BRIEF:
{user_prompt.strip()}

LAYOUT SKELETON (fill content and images only — do not change structure):
{to_compact_json(skeleton)}

BLOCK CONTENT SCHEMA HINTS:
{hints}

Return the complete JSON with all content and images filled."""

    raw = call_llm(
        system=CONTENT_FILLER_SYSTEM,
        user=user_message,
        provider=provider,
        model=model,
        temperature=0.55,
    )

    try:
        parsed = parse_json_loose(raw)
    except Exception as exc:  # noqa: BLE001
        return {
            "page": skeleton,
            "valid": False,
            "errors": [f"Content filler JSON parse failed: {exc}"],
            "raw": raw[:2000],
        }

    if "page" not in parsed and "meta" in parsed:
        filled_doc = parsed
    elif isinstance(parsed.get("output"), dict):
        filled_doc = parsed["output"]
    else:
        filled_doc = parsed

    merged = _merge_filled_content(skeleton, filled_doc)
    return {
        "page": merged,
        "valid": True,
        "errors": [],
    }
