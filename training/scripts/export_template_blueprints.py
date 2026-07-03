#!/usr/bin/env python3
"""Generate template-seed LayoutPlan samples (no API)."""
from __future__ import annotations

import hashlib
import json
import sys
import uuid
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.build_layout_plan import build_layout_plan  # noqa: E402
from lib.paths import RAW_DIR, SCHEMA_DIR  # noqa: E402
from lib.template_data import DEFAULT_PAGES, get_homepage_blocks, get_page_blocks  # noqa: E402

HOME_PROMPT_TEMPLATES = [
    "Create a {style} {business} website{location_suffix}.",
    "Design a {style} {website_label} site for a {business}{location_suffix}.",
    "I need a {complexity} complexity {website_label} homepage for {business}{location_suffix}.",
    "Build a professional {business} web presence with a {style} look{location_suffix}.",
    "Generate a {style} layout plan for a {website_label} business ({business}){location_suffix}.",
]

PAGE_PROMPT_TEMPLATES = [
    "Design the {page_name} page for a {style} {website_label} ({business}){location_suffix}.",
    "Build a {page_name} page layout for {business} — {complexity} complexity{location_suffix}.",
    "Create the {page_name} page for a {style} {website_label} business{location_suffix}.",
    "I need a {page_name} page for {business} with a {style} look{location_suffix}.",
    "Generate a {style} {page_name} page layout plan for {business}{location_suffix}.",
]

LOCATIONS = ["", " in London", " in Ahmedabad", " in New York", " in Berlin"]


def _sample_id(prompt: str, website_type: str, page_name: str, variant: int) -> str:
    digest = hashlib.sha256(f"{prompt}|{website_type}|{page_name}|{variant}".encode()).hexdigest()
    return str(uuid.UUID(digest[:32]))


def main() -> None:
    profiles = json.loads((SCHEMA_DIR / "industry_profiles.json").read_text(encoding="utf-8"))
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / "template_seed.jsonl"

    samples: list[dict] = []
    for website_type, pages in DEFAULT_PAGES.items():
        wt = profiles["websiteTypes"].get(website_type, profiles["websiteTypes"]["agency"])
        themes = wt.get("preferredThemes", ["modern"])
        businesses = wt.get("sampleBusinesses", [wt.get("label", website_type)])
        for page_name in pages:
            wizard_blocks = (
                get_homepage_blocks(website_type)
                if page_name == "Home"
                else get_page_blocks(page_name)
            )
            templates = HOME_PROMPT_TEMPLATES if page_name == "Home" else PAGE_PROMPT_TEMPLATES
            for t_idx, theme_id in enumerate(themes[:2]):
                business = businesses[t_idx % len(businesses)]
                theme_meta = profiles["wizardThemes"].get(theme_id, profiles["wizardThemes"]["modern"])
                style = theme_meta.get("metaStyle", wt.get("defaultMetaStyle", "Modern"))
                complexity = wt.get("defaultComplexity", "Medium")
                for p_idx, tmpl in enumerate(templates):
                    location = LOCATIONS[(t_idx + p_idx) % len(LOCATIONS)]
                    location_suffix = location
                    prompt = tmpl.format(
                        style=style,
                        business=business,
                        website_label=wt.get("label", website_type),
                        complexity=complexity,
                        location_suffix=location_suffix,
                        page_name=page_name,
                    )
                    output = build_layout_plan(
                        wizard_blocks=wizard_blocks,
                        website_type=website_type,
                        page_name=page_name,
                        page_title=page_name if page_name != "Home" else "",
                        business=business,
                        style=style,
                        complexity=complexity,
                        location=location.strip().removeprefix(" in ").strip(),
                        theme_id=theme_id,
                    )
                    samples.append(
                        {
                            "id": _sample_id(prompt, website_type, page_name, p_idx),
                            "source": "template",
                            "websiteType": website_type,
                            "pageName": page_name,
                            "prompt": prompt,
                            "output": output,
                        }
                    )

    with out_path.open("w", encoding="utf-8") as f:
        for row in samples:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Wrote {len(samples)} samples to {out_path}")


if __name__ == "__main__":
    main()
