#!/usr/bin/env python3
"""
Generate a diverse, balanced bank of natural-language website briefs — the INPUT
side of the seq2seq training data. Each brief is tagged with the target
`websiteType`, `style`, and `complexity` so `generate_training_data.py` can steer
the model and so the resulting plan can be sanity-checked.

Deterministic: same --seed + --count always yields the same briefs (important for
reproducible datasets and resumable generation).

Output: JSONL, one record per line:
  {"id","brief","websiteType","style","complexity","location","business"}

Website types & style vocabulary are kept in sync with the CMS wizard
(src/templates/types.ts: WebsiteType, WizardThemeId).

Usage:
  python brief_bank.py                       # 600 briefs -> ../../data/briefs.jsonl
  python brief_bank.py --count 800 --seed 7
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
               "design studio", "advertising agency", "PR agency", "growth marketing agency"],
    "saas": ["SaaS platform", "analytics platform", "project management app", "CRM software",
             "developer tooling startup", "AI writing assistant", "cloud storage service",
             "scheduling app", "no-code platform", "fintech app"],
    "ecommerce": ["fashion store", "sneaker shop", "home decor store", "cosmetics brand",
                  "electronics store", "jewelry boutique", "specialty coffee shop",
                  "pet supplies store", "furniture store", "organic grocery store"],
    "portfolio": ["photographer portfolio", "graphic designer portfolio", "developer portfolio",
                  "illustrator portfolio", "architect portfolio", "videographer portfolio",
                  "3D artist portfolio", "UX designer portfolio"],
    "personal-brand": ["personal brand", "life coach", "public speaker", "fitness influencer",
                       "content creator", "author", "podcaster", "career coach"],
    "corporate": ["law firm", "consulting firm", "construction company", "accounting firm",
                  "insurance company", "logistics company", "manufacturing company",
                  "engineering firm"],
    "restaurant": ["restaurant", "coffee shop", "artisan bakery", "fine-dining restaurant",
                   "pizzeria", "juice bar", "steakhouse", "vegan cafe"],
    "real-estate": ["real estate agency", "property listing site", "luxury realtor",
                    "commercial real estate firm", "apartment rental service",
                    "real estate developer"],
    "healthcare": ["dental clinic", "fitness studio", "yoga studio", "physiotherapy clinic",
                   "medical practice", "wellness spa", "mental health clinic",
                   "pediatric clinic", "dermatology clinic"],
    "education": ["online course platform", "coding bootcamp", "language school",
                  "university department", "tutoring service", "music school",
                  "e-learning platform", "design academy"],
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

LOCATIONS = [
    "", "", "", "Ahmedabad", "Mumbai", "Bengaluru", "New York", "San Francisco", "London",
    "Berlin", "Toronto", "Sydney", "Dubai", "Singapore", "Lisbon", "Amsterdam", "Austin",
    "Tokyo", "Paris", "Barcelona", "Cape Town", "Chicago", "Seattle", "Melbourne",
]

TEMPLATES = [
    "Create a {adj} {kind} website{loc}.",
    "Build a {adj} website for a {kind}{loc}.",
    "Design a {adj} {kind} landing page{loc}.",
    "I need a {adj} website for my {kind}{loc}.",
    "Generate a homepage for a {adj} {kind}{loc}.",
    "Make a {adj} {kind} site{loc}.",
    "Design a {adj} online presence for a {kind}{loc}.",
]

# weight standard heaviest, simple/rich less common (matches real-world distribution)
COMPLEXITY_CYCLE = ["standard", "standard", "rich", "simple", "standard", "rich", "standard", "simple"]

WEBSITE_TYPES = list(KINDS.keys())


def build_briefs(count: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    briefs: list[dict] = []
    seen: set[str] = set()

    # Round-robin over website types for balanced coverage.
    i = 0
    guard = 0
    while len(briefs) < count and guard < count * 50:
        guard += 1
        wtype = WEBSITE_TYPES[i % len(WEBSITE_TYPES)]
        i += 1

        kind = rng.choice(KINDS[wtype])
        style = rng.choice(COMPATIBLE_STYLES[wtype])
        adj = rng.choice(STYLE_ADJECTIVES[style])
        location = rng.choice(LOCATIONS)
        template = rng.choice(TEMPLATES)
        complexity = COMPLEXITY_CYCLE[len(briefs) % len(COMPLEXITY_CYCLE)]

        loc = f" in {location}" if location else ""
        brief = template.format(adj=adj, kind=kind, loc=loc)

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
        })
    return briefs


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate a balanced bank of website briefs.")
    ap.add_argument("--count", type=int, default=600, help="number of briefs (default 600)")
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
        print("\nby websiteType:")
        for k, v in sorted(by_type.items()):
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
