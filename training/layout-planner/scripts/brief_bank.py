#!/usr/bin/env python3
"""
Generate a diverse, balanced bank of natural-language website briefs — the INPUT
side of the seq2seq training data. Each brief is tagged with the target
`websiteType`, `style`, `complexity`, `location`, and (new) `pageType`/`pageName`
so `generate_training_data.py` can steer the model and so the resulting plan can
be sanity-checked.

Deterministic: same --seed + --count always yields the same briefs (important for
reproducible datasets and resumable generation).

Output: JSONL, one record per line:
  {"id","brief","websiteType","style","complexity","location","business","pageType","pageName"}

Website types & style vocabulary are kept in sync with the CMS wizard
(src/templates/types.ts: WebsiteType, WizardThemeId).

DIVERSITY (anti-overfitting): coverage is spread across
  websiteType x pageType x kind x style x template x location
so a 1.5B model sees many phrasings / page intents rather than memorising a
handful of templates. `--stats` prints the realised distribution.

Usage:
  python brief_bank.py                        # 1200 briefs -> ../../data/briefs.jsonl
  python brief_bank.py --count 1500 --seed 7
  python brief_bank.py --out /tmp/briefs.jsonl --stats
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE.parent.parent / "data"
DEFAULT_OUT = DATA_DIR / "briefs.jsonl"

# websiteType -> plausible business "kinds" (natural phrases used in the brief)
KINDS: dict[str, list[str]] = {
    "agency": ["marketing agency", "branding studio", "creative agency", "digital agency",
               "design studio", "advertising agency", "PR agency", "growth marketing agency",
               "social media agency", "SEO agency", "web design agency", "content studio"],
    "saas": ["SaaS platform", "analytics platform", "project management app", "CRM software",
             "developer tooling startup", "AI writing assistant", "cloud storage service",
             "scheduling app", "no-code platform", "fintech app", "email marketing tool",
             "customer support platform", "data pipeline startup", "observability platform"],
    "ecommerce": ["fashion store", "sneaker shop", "home decor store", "cosmetics brand",
                  "electronics store", "jewelry boutique", "specialty coffee shop",
                  "pet supplies store", "furniture store", "organic grocery store",
                  "skincare brand", "watch store", "toy store", "bookstore"],
    "portfolio": ["photographer portfolio", "graphic designer portfolio", "developer portfolio",
                  "illustrator portfolio", "architect portfolio", "videographer portfolio",
                  "3D artist portfolio", "UX designer portfolio", "motion designer portfolio",
                  "copywriter portfolio"],
    "personal-brand": ["personal brand", "life coach", "public speaker", "fitness influencer",
                       "content creator", "author", "podcaster", "career coach",
                       "nutrition coach", "startup mentor", "keynote speaker"],
    "corporate": ["law firm", "consulting firm", "construction company", "accounting firm",
                  "insurance company", "logistics company", "manufacturing company",
                  "engineering firm", "financial advisory firm", "architecture firm",
                  "recruitment agency", "IT services company"],
    "restaurant": ["restaurant", "coffee shop", "artisan bakery", "fine-dining restaurant",
                   "pizzeria", "juice bar", "steakhouse", "vegan cafe", "sushi bar",
                   "craft brewery", "food truck", "dessert cafe"],
    "real-estate": ["real estate agency", "property listing site", "luxury realtor",
                    "commercial real estate firm", "apartment rental service",
                    "real estate developer", "vacation rental company", "mortgage brokerage"],
    "healthcare": ["dental clinic", "fitness studio", "yoga studio", "physiotherapy clinic",
                   "medical practice", "wellness spa", "mental health clinic",
                   "pediatric clinic", "dermatology clinic", "chiropractic clinic",
                   "optometry clinic", "veterinary clinic"],
    "education": ["online course platform", "coding bootcamp", "language school",
                  "university department", "tutoring service", "music school",
                  "e-learning platform", "design academy", "test-prep service",
                  "kids coding academy", "professional certification provider"],
}

# websiteType -> styles that read naturally for that type (subset of WizardThemeId)
COMPATIBLE_STYLES: dict[str, list[str]] = {
    "agency": ["creative", "modern", "dark", "startup"],
    "saas": ["startup", "modern", "dark", "corporate"],
    "ecommerce": ["ecommerce", "modern", "luxury", "creative"],
    "portfolio": ["minimal", "creative", "dark", "modern"],
    "personal-brand": ["minimal", "creative", "modern", "luxury"],
    "corporate": ["corporate", "modern", "minimal"],
    "restaurant": ["luxury", "creative", "minimal", "modern"],
    "real-estate": ["luxury", "corporate", "modern", "minimal"],
    "healthcare": ["minimal", "modern", "corporate"],
    "education": ["modern", "corporate", "creative", "minimal"],
}

STYLE_ADJECTIVES: dict[str, list[str]] = {
    "modern": ["modern", "sleek", "contemporary"],
    "corporate": ["professional", "corporate", "enterprise-grade"],
    "minimal": ["minimal", "clean", "understated"],
    "luxury": ["premium", "luxury", "high-end", "upscale"],
    "dark": ["bold dark-themed", "dark-mode", "sleek dark"],
    "creative": ["creative", "vibrant", "playful", "artistic"],
    "startup": ["startup-style", "fast-growing", "innovative"],
    "ecommerce": ["shoppable", "conversion-focused", "product-led"],
}

# Page-intent dimension (anti-overfitting): most website types get several page
# intents, not just a homepage. `pageName` is the human label stored on the plan.
# `pricing` and `contact` are intentionally scoped to types where they read naturally.
PAGE_TYPES: dict[str, str] = {
    "home": "Home",
    "landing": "Home",
    "about": "About",
    "services": "Services",
    "pricing": "Pricing",
    "contact": "Contact",
}

# websiteType -> page intents that make sense for it (weighted toward home/landing)
COMPATIBLE_PAGES: dict[str, list[str]] = {
    "agency": ["home", "landing", "about", "services", "contact"],
    "saas": ["home", "landing", "pricing", "about", "contact"],
    "ecommerce": ["home", "landing", "about", "contact"],
    "portfolio": ["home", "about", "contact"],
    "personal-brand": ["home", "landing", "about", "contact"],
    "corporate": ["home", "about", "services", "contact"],
    "restaurant": ["home", "about", "contact"],
    "real-estate": ["home", "landing", "about", "services", "contact"],
    "healthcare": ["home", "about", "services", "contact"],
    "education": ["home", "landing", "pricing", "about", "contact"],
}

LOCATIONS = [
    "", "", "", "Ahmedabad", "Mumbai", "Bengaluru", "New York", "San Francisco", "London",
    "Berlin", "Toronto", "Sydney", "Dubai", "Singapore", "Lisbon", "Amsterdam", "Austin",
    "Tokyo", "Paris", "Barcelona", "Cape Town", "Chicago", "Seattle", "Melbourne",
]

# Homepage / landing templates (no explicit page word).
HOME_TEMPLATES = [
    "Create a {adj} {kind} website{loc}.",
    "Build a {adj} website for a {kind}{loc}.",
    "Design a {adj} {kind} landing page{loc}.",
    "I need a {adj} website for my {kind}{loc}.",
    "Generate a homepage for a {adj} {kind}{loc}.",
    "Make a {adj} {kind} site{loc}.",
    "Design a {adj} online presence for a {kind}{loc}.",
    "Launch a {adj} {kind} website{loc}.",
    "We need a {adj} {kind} homepage{loc}.",
]

# Page-specific templates keyed by pageType. `{page}` = the page word.
PAGE_TEMPLATES: dict[str, list[str]] = {
    "about": [
        "Create an About page for a {adj} {kind}{loc}.",
        "Design the About Us page for a {adj} {kind}{loc}.",
        "Build an about section page for my {adj} {kind}{loc}.",
    ],
    "services": [
        "Create a Services page for a {adj} {kind}{loc}.",
        "Design a services overview page for a {adj} {kind}{loc}.",
        "Build a page listing the services of a {adj} {kind}{loc}.",
    ],
    "pricing": [
        "Create a Pricing page for a {adj} {kind}{loc}.",
        "Design a pricing plans page for a {adj} {kind}{loc}.",
        "Build a pricing and plans page for my {adj} {kind}{loc}.",
    ],
    "contact": [
        "Create a Contact page for a {adj} {kind}{loc}.",
        "Design a Contact Us page for a {adj} {kind}{loc}.",
        "Build a contact page for my {adj} {kind}{loc}.",
    ],
}

# weight standard heaviest, simple/rich less common (matches real-world distribution)
COMPLEXITY_CYCLE = ["standard", "standard", "rich", "simple", "standard", "rich", "standard", "simple"]

WEBSITE_TYPES = list(KINDS.keys())


def _template_for(page_type: str, rng: random.Random) -> str:
    if page_type in ("home", "landing"):
        return rng.choice(HOME_TEMPLATES)
    return rng.choice(PAGE_TEMPLATES[page_type])


def build_briefs(count: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    briefs: list[dict] = []
    seen: set[str] = set()

    # Round-robin over website types AND page intents for balanced, diverse coverage.
    i = 0
    guard = 0
    while len(briefs) < count and guard < count * 80:
        guard += 1
        wtype = WEBSITE_TYPES[i % len(WEBSITE_TYPES)]
        # advance page intent on a different cadence so (type, page) combos vary
        pages = COMPATIBLE_PAGES[wtype]
        page_type = pages[(i // len(WEBSITE_TYPES)) % len(pages)]
        i += 1

        kind = rng.choice(KINDS[wtype])
        style = rng.choice(COMPATIBLE_STYLES[wtype])
        adj = rng.choice(STYLE_ADJECTIVES[style])
        location = rng.choice(LOCATIONS)
        template = _template_for(page_type, rng)
        complexity = COMPLEXITY_CYCLE[len(briefs) % len(COMPLEXITY_CYCLE)]

        loc = f" in {location}" if location else ""
        brief = template.format(adj=adj, kind=kind, loc=loc, page=page_type)

        if brief in seen:
            continue
        seen.add(brief)
        briefs.append({
            "id": f"brief-{len(briefs):04d}",
            "brief": brief,
            "websiteType": wtype,
            "style": style,
            "complexity": complexity,
            "location": location,
            "business": "",
            "pageType": page_type,
            "pageName": PAGE_TYPES[page_type],
        })
    return briefs


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate a balanced bank of website briefs.")
    ap.add_argument("--count", type=int, default=1200, help="number of briefs (default 1200)")
    ap.add_argument("--seed", type=int, default=42, help="RNG seed (default 42)")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output JSONL path")
    ap.add_argument("--stats", action="store_true", help="print coverage stats")
    args = ap.parse_args(argv)

    briefs = build_briefs(args.count, args.seed)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as fh:
        for b in briefs:
            fh.write(json.dumps(b, ensure_ascii=False) + "\n")

    print(f"wrote {len(briefs)} briefs -> {out}")
    if args.stats:
        from collections import Counter
        by_type = Counter(b["websiteType"] for b in briefs)
        by_style = Counter(b["style"] for b in briefs)
        by_cx = Counter(b["complexity"] for b in briefs)
        by_page = Counter(b["pageType"] for b in briefs)
        print("\nby websiteType:")
        for k, v in sorted(by_type.items()):
            print(f"  {k:16} {v}")
        print("by pageType:")
        for k, v in sorted(by_page.items()):
            print(f"  {k:16} {v}")
        print("by style:")
        for k, v in sorted(by_style.items()):
            print(f"  {k:16} {v}")
        print("by complexity:")
        for k, v in sorted(by_cx.items()):
            print(f"  {k:16} {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
