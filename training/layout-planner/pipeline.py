#!/usr/bin/env python3
"""
End-to-end two-stage pipeline: brief -> LayoutPlan (Stage 1) -> filled page JSON (Stage 2).

  1. FLAN-T5 layout planner  ->  LayoutPlan (structure only)      [inference.LayoutPlanner]
  2. validate; if invalid, one retry with sampling; else retrieval fallback from fixtures/
  3. translate block types to the v2 filler vocabulary and ask OpenRouter/Gemini to fill
     ONLY the copy (data) into the fixed structure  [adapts the v2.ts contract]
  4. return a v2 document { meta, theme, blocks:[{id,type,styles,data}] } — the exact shape
     the CMS's normalizeV2Document() consumes.

CLI:
  python pipeline.py "Create a premium dental clinic website in Ahmedabad."
  python pipeline.py --offline "..."      # no model, no API: retrieval plan + unfilled skeleton
  python pipeline.py --plan-only "..."    # stop after Stage 1, print the LayoutPlan

Live Stage-1 needs trained weights (outputs/); live Stage-2 needs OPENROUTER_API_KEY.
--offline exercises the plan->skeleton wiring with neither.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "scripts"))
from plan_json import parse_plan_json  # noqa: E402
from validate_layout_plan import validate_plan  # noqa: E402

REPO_ROOT = HERE.parent.parent
SCHEMA_DIR = HERE / "schema"
FIXTURES = HERE / "fixtures"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.0-flash-001"

_ALIASES = json.loads((SCHEMA_DIR / "allowed-block-types.json").read_text(encoding="utf-8"))["stage2Aliases"]

# keyword -> websiteType hints for retrieval fallback
_HINTS = {
    "dental": "healthcare", "clinic": "healthcare", "health": "healthcare", "medical": "healthcare",
    "yoga": "healthcare", "wellness": "healthcare", "therapy": "healthcare", "fitness": "healthcare",
    "saas": "saas", "software": "saas", "app": "saas", "platform": "saas", "analytics": "saas",
    "dashboard": "saas", "api": "saas", "startup": "saas",
    "agency": "agency", "studio": "agency", "marketing": "agency", "branding": "agency",
    "creative": "agency", "design": "agency", "advertising": "agency",
    "store": "ecommerce", "shop": "ecommerce", "fashion": "ecommerce", "ecommerce": "ecommerce",
    "product": "ecommerce", "boutique": "ecommerce", "clothing": "ecommerce",
    "restaurant": "restaurant", "cafe": "restaurant", "coffee": "restaurant", "bakery": "restaurant",
    "food": "restaurant", "dining": "restaurant", "menu": "restaurant", "bar": "restaurant",
}


# ------------------------------------------------------------------ Stage 1

def _load_fixtures() -> list[dict]:
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(FIXTURES.glob("*.json"))]


def retrieve_fixture(brief: str) -> dict:
    """Pick the closest hand-written fixture for a brief (retrieval fallback)."""
    from collections import Counter
    tokens = set(brief.lower().replace(".", " ").replace(",", " ").split())
    # count hints per websiteType so "coffee shop bakery menu" (3 restaurant hits)
    # beats a single stray "shop" (1 ecommerce hit).
    inferred = Counter(_HINTS[t] for t in tokens if t in _HINTS)
    fixtures = _load_fixtures()
    best, best_score = fixtures[0], -1
    for fx in fixtures:
        meta = fx["meta"]
        score = 5 * inferred.get(meta["websiteType"], 0)
        if meta["style"] in tokens:
            score += 2
        score += sum(1 for w in meta.get("business", "").lower().split() if w in tokens)
        if score > best_score:
            best, best_score = fx, score
    return best


def get_layout_plan(brief: str, planner=None, log=print) -> tuple[dict, str]:
    """Return (plan, source). source in {model, model-retry, retrieval}."""
    if planner is not None:
        raw = planner.generate_text(brief)
        plan = parse_plan_json(raw)
        if plan and validate_plan(plan, "stage1").ok:
            return plan, "model"
        log("  Stage 1: first plan invalid -> retry with sampling")
        raw = planner.generate_text(brief, num_beams=1)  # sampling-ish retry
        plan = parse_plan_json(raw)
        if plan and validate_plan(plan, "stage1-retry").ok:
            return plan, "model-retry"
        log("  Stage 1: retry still invalid -> retrieval fallback")
    return retrieve_fixture(brief), "retrieval"


# ------------------------------------------------------------------ Stage 2

def to_v2_skeleton(plan: dict) -> dict:
    """LayoutPlan -> v2 document skeleton (types translated, data empty)."""
    page = plan.get("page", {})
    blocks = []
    for b in page.get("blocks", []):
        btype = b.get("type")
        blocks.append({
            "id": b.get("id"),
            "type": _ALIASES.get(btype, btype),
            "styles": b.get("styles", {}),
            "data": {},
        })
    theme = page.get("theme", {})
    return {
        "meta": {k: plan.get("meta", {}).get(k) for k in ("business", "websiteType", "style", "pageName", "location")},
        "theme": {
            "primary_color": theme.get("primaryColor"),
            "secondary_color": theme.get("secondaryColor"),
            "background_color": theme.get("backgroundColor"),
            "text_color": theme.get("textColor"),
            "font_body": theme.get("fontFamily"),
            "border_radius": theme.get("borderRadius"),
        },
        "blocks": blocks,
    }


FILLER_SYSTEM = (
    "You are the Stage-2 CONTENT filler for OpenNext CMS. You are given a FIXED page "
    "structure: a list of blocks, each with an id, a type, a styles object, and an empty "
    "data object. Fill ONLY the copy.\n\n"
    "RULES:\n"
    "- Return ONE JSON object: {\"meta\":{...},\"theme\":{...},\"blocks\":[{id,type,styles,data}]}.\n"
    "- Keep EVERY block's id, type, styles and ORDER exactly as given. Do NOT add, remove, "
    "reorder, or retype blocks.\n"
    "- Populate each block's `data` with realistic, niche-specific copy for the brief "
    "(headlines <=10 words, subheadlines <=30 words, feature text <=20 words). No lorem ipsum.\n"
    "- Use the data shape appropriate to each v2 type: navigation{logo,links,cta}, "
    "heroCentered/hero{eyebrow,headline,subheadline,cta_primary,media}, "
    "featureGrid/featureCards{headline,features|cards:[{title,description,icon}]}, "
    "testimonials{headline,items:[{quote,author_name,author_title}]}, "
    "statistics{headline,stats:[{value,label}]}, pricing{headline,plans:[{name,price,features}]}, "
    "cta{headline,subheadline,cta_primary}, contact{headline,email,phone,address}, "
    "gallery{headline,items:[{src,caption}]}, footer{logo,columns:[{title,links}],copyright}.\n"
    "- Every media/avatar/logo field gets a real Unsplash/Pexels URL matching the niche.\n"
    "Return JSON only — no markdown, no prose."
)


def build_filler_messages(skeleton: dict, brief: str) -> list[dict]:
    return [
        {"role": "system", "content": FILLER_SYSTEM},
        {"role": "user", "content": (
            f"BRIEF: {brief}\n\n"
            f"STRUCTURE (fill each block's data, keep everything else):\n"
            f"{json.dumps(skeleton, ensure_ascii=False)}"
        )},
    ]


def fill_content(skeleton: dict, brief: str, api_key: str, model: str) -> dict:
    import requests  # type: ignore
    resp = requests.post(
        OPENROUTER_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": model, "temperature": 0.7, "messages": build_filler_messages(skeleton, brief)},
        timeout=90,
    )
    resp.raise_for_status()
    filled = parse_plan_json(resp.json()["choices"][0]["message"]["content"])
    return filled if filled is not None else skeleton


# ------------------------------------------------------------------ Orchestration

def run(brief: str, offline: bool = False, plan_only: bool = False,
        model_dir: str | None = None, log=print) -> dict:
    planner = None
    if not offline:
        try:
            from inference import LayoutPlanner  # noqa: E402
            planner = LayoutPlanner(model_dir) if model_dir else LayoutPlanner()
        except FileNotFoundError:
            log("  weights not found -> using retrieval fallback for Stage 1")
        except RuntimeError as exc:
            log(f"  {exc} -> using retrieval fallback for Stage 1")

    plan, source = get_layout_plan(brief, planner, log=log)
    log(f"  Stage 1 source: {source}; blocks: {[b['type'] for b in plan['page']['blocks']]}")
    if plan_only:
        return {"layout_plan": plan, "source": source}

    skeleton = to_v2_skeleton(plan)

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if offline or not api_key:
        log("  Stage 2 skipped (offline or no OPENROUTER_API_KEY) -> returning unfilled skeleton")
        return {"page": skeleton, "source": source, "filled": False}

    model = os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL)
    log(f"  Stage 2: filling copy via {model}")
    filled = fill_content(skeleton, brief, api_key, model)
    return {"page": filled, "source": source, "filled": True}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Two-stage brief -> filled page pipeline.")
    ap.add_argument("brief", nargs="+")
    ap.add_argument("--offline", action="store_true", help="no model/API: retrieval plan + unfilled skeleton")
    ap.add_argument("--plan-only", action="store_true", help="stop after Stage 1, print the LayoutPlan")
    ap.add_argument("--model-dir", default=None)
    args = ap.parse_args(argv)

    # best-effort load of .env for Stage 2 key
    env = REPO_ROOT / ".env"
    if env.is_file():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

    brief = " ".join(args.brief)
    print(f"brief: {brief}", file=sys.stderr)
    result = run(brief, offline=args.offline, plan_only=args.plan_only,
                 model_dir=args.model_dir, log=lambda m: print(m, file=sys.stderr))
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
