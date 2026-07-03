#!/usr/bin/env python3
"""
Generate structure-only LayoutPlan targets for each brief via OpenRouter.

Reads briefs from ../../data/briefs.jsonl, asks the model for ONE minified
LayoutPlan JSON per brief (content:{} — NO copy), and appends
{id, brief, websiteType, style, complexity, location, plan} lines to
../../data/raw/raw_pairs.jsonl. Resumable: briefs whose id is already in the
output are skipped.

Requires OPENROUTER_API_KEY (from environment or the repo .env). If the key is
absent the script prints a blocker and exits 2 WITHOUT calling the API — so it is
safe to wire into the loop while Phase 2 is gated on the key.

Downstream: strip_content.py -> validate_layout_plan.py --jsonl -> build_seq2seq.py

Usage:
  python generate_training_data.py                 # all briefs
  python generate_training_data.py --limit 5       # smoke test
  python generate_training_data.py --model google/gemini-2.0-flash-001
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from strip_content import strip_content  # noqa: E402
from validate_layout_plan import validate_plan  # noqa: E402
from plan_json import parse_plan_json  # noqa: E402

REPO_ROOT = HERE.parent.parent.parent
DATA_DIR = HERE.parent.parent / "data"
SCHEMA_DIR = HERE.parent / "schema"
TYPES_FILE = SCHEMA_DIR / "allowed-block-types.json"
BRIEFS = DATA_DIR / "briefs.jsonl"
RAW_OUT = DATA_DIR / "raw" / "raw_pairs.jsonl"

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.0-flash-001"


def _load_dotenv() -> None:
    """Best-effort: populate os.environ from the repo .env without a hard dep."""
    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv(REPO_ROOT / ".env")
        return
    except Exception:
        pass
    env = REPO_ROOT / ".env"
    if not env.is_file():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def build_system_prompt() -> str:
    reg = json.loads(TYPES_FILE.read_text(encoding="utf-8"))
    allowed = reg["primitiveTypes"] + reg["plannerSectionTypes"]
    nav = ", ".join(reg["categories"]["navigation"])
    hero = ", ".join(reg["categories"]["hero"])
    return (
        "You are a website STRUCTURE planner for OpenNext CMS. "
        "Return ONLY ONE valid minified JSON object matching the LayoutPlan schema. "
        "No markdown fences, no prose.\n\n"
        "SHAPE: {\"meta\":{business,style,websiteType,pageName,location,complexity},"
        "\"page\":{\"theme\":{primaryColor,secondaryColor,backgroundColor,textColor,fontFamily,borderRadius},"
        "\"blocks\":[{id,type,order,variant?,layout?,styles?,content}]}}\n\n"
        f"ALLOWED block types (use ONLY these): {', '.join(allowed)}.\n\n"
        "HARD RULES:\n"
        f"- blocks[0].type MUST be navigation ({nav}); the LAST block MUST be footer.\n"
        f"- Include exactly one hero ({hero}) and place it before any feature/testimonial/"
        "pricing/content/stats section.\n"
        "- EVERY block.content MUST be {} (an empty object). Put NO headlines, paragraphs, "
        "or marketing copy anywhere.\n"
        "- complexity simple => 4-6 blocks, standard => 7-10, rich => 11-15.\n"
        "- ids are kebab-case and unique; order is 0..n-1 top to bottom.\n"
        "- theme colours are hex; give each block a styles object and VARY backgroundColor "
        "between sections (do not repeat one background everywhere).\n"
        "- websiteType drives sections (e.g. saas => pricing + feature blocks; "
        "healthcare => contact + testimonials; ecommerce => product grid + categories).\n"
    )


def build_user_prompt(brief: dict) -> str:
    return (
        f"Brief: {brief['brief']}\n"
        f"meta.websiteType = {brief['websiteType']}\n"
        f"meta.style = {brief['style']}\n"
        f"meta.complexity = {brief['complexity']}\n"
        f"meta.location = {brief.get('location') or ''}\n"
        "Return the minified LayoutPlan JSON now."
    )


def call_openrouter(session, api_key: str, model: str, brief: dict) -> dict | None:
    payload = {
        "model": model,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_prompt(brief)},
        ],
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    for attempt in range(3):
        try:
            resp = session.post(OPENROUTER_URL, headers=headers, json=payload, timeout=90)
            if resp.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"]
            plan = parse_plan_json(text)
            if plan is not None:
                return strip_content(plan)  # enforce content:{} immediately
        except Exception as exc:
            print(f"  attempt {attempt + 1} failed: {exc}", file=sys.stderr)
            time.sleep(1.5 * (attempt + 1))
    return None


def load_done_ids(path: Path) -> set[str]:
    done: set[str] = set()
    if path.is_file():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                done.add(json.loads(line)["id"])
            except Exception:
                continue
    return done


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate structure-only LayoutPlan targets via OpenRouter.")
    ap.add_argument("--briefs", default=str(BRIEFS))
    ap.add_argument("--out", default=str(RAW_OUT))
    ap.add_argument("--model", default=None,
                    help="OpenRouter model id (default: $OPENROUTER_MODEL from .env, else built-in)")
    ap.add_argument("--limit", type=int, default=0, help="cap number of NEW briefs this run (0 = all)")
    args = ap.parse_args(argv)

    # load .env FIRST so OPENROUTER_MODEL / _API_KEY are visible before we resolve them
    _load_dotenv()
    model = args.model or os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL)
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        print(
            "BLOCKED: OPENROUTER_API_KEY is not set (checked environment and repo .env).\n"
            "Add it to .env, then re-run. This script made no API calls.",
            file=sys.stderr,
        )
        return 2

    try:
        import requests  # type: ignore
    except Exception:
        print("error: `requests` not installed. pip install -r requirements.txt", file=sys.stderr)
        return 1

    briefs_path = Path(args.briefs)
    if not briefs_path.is_file():
        print(f"error: briefs not found: {briefs_path}. Run brief_bank.py first.", file=sys.stderr)
        return 1

    briefs = [json.loads(l) for l in briefs_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    done = load_done_ids(out)
    todo = [b for b in briefs if b["id"] not in done]
    if args.limit:
        todo = todo[:args.limit]

    print(f"briefs: {len(briefs)}  done: {len(done)}  this run: {len(todo)}  model: {model}")

    session = requests.Session()
    ok = fail = 0
    with out.open("a", encoding="utf-8") as fout:
        for i, brief in enumerate(todo, 1):
            plan = call_openrouter(session, api_key, model, brief)
            if plan is None:
                fail += 1
                print(f"[{i}/{len(todo)}] {brief['id']} FAILED (no parseable JSON)")
                continue
            rep = validate_plan(plan, brief["id"])
            rec = {
                "id": brief["id"], "brief": brief["brief"], "websiteType": brief["websiteType"],
                "style": brief["style"], "complexity": brief["complexity"],
                "location": brief.get("location", ""), "valid": rep.ok, "plan": plan,
            }
            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fout.flush()
            ok += 1
            print(f"[{i}/{len(todo)}] {brief['id']} -> {'valid' if rep.ok else 'INVALID (' + str(len(rep.errors)) + ' errs)'}")

    print(f"\nwrote {ok} pairs ({fail} failed) -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
