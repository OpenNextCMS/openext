#!/usr/bin/env python3
"""Map scraped PageOutlines to CMS LayoutPlan JSONL (rules + optional LLM fallback)."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.map_outline import build_prompt, outline_to_sample, outline_to_layout_plan  # noqa: E402
from lib.paths import RAW_DIR  # noqa: E402
from lib.validate import validate_sample, _load_allowed  # noqa: E402

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None

try:
    import json_repair
except ImportError:  # pragma: no cover
    json_repair = None

TEACHER_SYSTEM = """You are a layout planner for OpenNext CMS.
Given a PageOutline extracted from a REAL website (structure signals only, no marketing copy to copy).
Return ONLY valid JSON: { "output": { "meta": {...}, "page": { "theme": {...}, "blocks": [...] } } }
Rules:
- blocks[0] type navbar, last type footer; every block content must be {}
- Hero blocks need layout.variant; use semantic types only
- Do NOT copy text from the site; plan structure only
"""

ALLOWED_SNIPPET = ""


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        if json_repair:
            return json.loads(json_repair.repair_json(text))
        raise


def _load_allowed_snippet() -> str:
    allowed = _load_allowed()
    return "Allowed types: " + ", ".join(allowed.get("semanticBlockTypes", []))


def call_openrouter(api_key: str, model: str, user_content: str) -> str:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": TEACHER_SYSTEM + "\n" + ALLOWED_SNIPPET},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.2,
    }
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def call_gemini(api_key: str, model: str, user_content: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": TEACHER_SYSTEM + "\n" + ALLOWED_SNIPPET + "\n\n" + user_content}]}],
        "generationConfig": {"temperature": 0.2},
    }
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


def llm_fallback(outline: dict, site_meta: dict, provider: str, model: str) -> dict | None:
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()

    user_content = json.dumps(
        {
            "siteMeta": site_meta,
            "pageOutline": {
                k: outline.get(k)
                for k in ("url", "title", "sections", "styleHints", "navDetected", "footerDetected")
            },
        },
        indent=2,
    )

    try:
        if provider == "gemini" and gemini_key:
            raw = call_gemini(gemini_key, model, user_content)
        elif openrouter_key:
            raw = call_openrouter(openrouter_key, model, user_content)
        else:
            return None
        parsed = _parse_json(raw)
        output = parsed.get("output", parsed)
        return {"output": output, "confidence": 0.72}
    except Exception as exc:  # noqa: BLE001
        print(f"  LLM fallback failed: {exc}")
        return None


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main() -> None:
    global ALLOWED_SNIPPET
    ALLOWED_SNIPPET = _load_allowed_snippet()

    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=RAW_DIR / "scrape_outlines.jsonl")
    parser.add_argument("--output", type=Path, default=RAW_DIR / "real_sites.jsonl")
    parser.add_argument("--confidence-threshold", type=float, default=0.6)
    parser.add_argument("--llm-fallback", action="store_true", help="Use LLM when rule confidence below threshold")
    parser.add_argument("--provider", choices=["openrouter", "gemini", "auto"], default="auto")
    parser.add_argument("--model", default=None)
    parser.add_argument("--sleep", type=float, default=0.3)
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Missing {args.input}; run scrape_real_sites.py first")

    allowed = _load_allowed()
    outlines = load_jsonl(args.input)
    args.output.parent.mkdir(parents=True, exist_ok=True)

    provider = args.provider
    if provider == "auto":
        if os.environ.get("OPENROUTER_API_KEY"):
            provider = "openrouter"
        elif os.environ.get("GEMINI_API_KEY"):
            provider = "gemini"

    model = args.model or ("google/gemini-2.0-flash-001" if provider == "openrouter" else "gemini-2.0-flash")

    written = 0
    invalid = 0
    llm_used = 0

    with args.output.open("w", encoding="utf-8") as out_f:
        for row in outlines:
            site_meta = row.get("siteMeta") or {
                "id": row.get("id"),
                "url": row.get("url"),
                "industry": row.get("industry", "saas"),
                "business": row.get("business", "Business"),
                "expectedStyle": row.get("expectedStyle", "Modern"),
            }
            if row.get("error") and not row.get("sections"):
                print(f"skip {site_meta.get('id')}: {row.get('error')}")
                continue

            try:
                output, confidence, warnings = outline_to_layout_plan(row, site_meta)
                llm_payload = None
                if confidence < args.confidence_threshold and args.llm_fallback:
                    llm_payload = llm_fallback(row, site_meta, provider, model)
                    if llm_payload:
                        llm_used += 1
                        time.sleep(args.sleep)

                sample = outline_to_sample(row, site_meta, use_llm_output=llm_payload)
                if llm_payload:
                    sample["confidence"] = llm_payload.get("confidence", sample["confidence"])
                    sample["needs_review"] = sample["confidence"] < args.confidence_threshold
                    sample["mappingMethod"] = "llm-fallback"
                else:
                    sample["mappingMethod"] = "rules"
                    sample["mappingWarnings"] = warnings

                errors = validate_sample(sample, allowed=allowed)
                if errors:
                    invalid += 1
                    print(f"invalid {site_meta.get('id')}: {errors[0]}")
                    continue

                if len(sample["output"]["page"]["blocks"]) < 4:
                    invalid += 1
                    print(f"invalid {site_meta.get('id')}: too few blocks")
                    continue

                out_f.write(json.dumps(sample, ensure_ascii=False) + "\n")
                written += 1
                print(f"saved {site_meta.get('id')} conf={sample['confidence']:.2f} method={sample['mappingMethod']}")
            except Exception as exc:  # noqa: BLE001
                invalid += 1
                print(f"error {site_meta.get('id')}: {exc}")

    print(f"Done. valid={written} invalid={invalid} llm_fallback={llm_used} -> {args.output}")


if __name__ == "__main__":
    main()
