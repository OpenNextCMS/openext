#!/usr/bin/env python3
"""Generate synthetic LayoutPlan samples via OpenRouter or Gemini (structure-only)."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.coverage import enrich_output_meta, normalize_sample  # noqa: E402
from lib.paths import RAW_DIR, SCHEMA_DIR  # noqa: E402
from lib.template_data import DEFAULT_PAGES  # noqa: E402
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
Return ONLY valid JSON for a LayoutPlan label (no markdown, no commentary).
Rules:
- output.meta: business, style (Premium|Modern|Minimal|Corporate|Creative|Luxury|Startup|Editorial), complexity (Low|Medium|High), websiteType, pageName; optional location
- output.page.theme: primaryColor, backgroundColor, fontFamily, borderRadius
- output.page.blocks: ordered array; first type navbar, last footer
- Every block: type (semantic CMS type), order (0..N-1), content must be {}
- Hero blocks (hero, heroSplit, heroCentered) must include layout.variant
- Include layout and styles hints where appropriate
- NEVER include marketing copy, FAQ text, headlines, URLs, or lorem ipsum
"""

ALLOWED_SNIPPET = ""


def _load_allowed_snippet() -> str:
    allowed = json.loads((SCHEMA_DIR / "allowed_types.json").read_text(encoding="utf-8"))
    types = ", ".join(allowed.get("semanticBlockTypes", []))
    return f"Allowed block types: {types}"


def _parse_json_response(text: str) -> dict:
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


def _existing_ids(path: Path) -> set[str]:
    ids: set[str] = set()
    if not path.exists():
        return ids
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                if row.get("id"):
                    ids.add(row["id"])
            except json.JSONDecodeError:
                continue
    return ids


def _prompt_bank() -> list[dict[str, str]]:
    profiles = json.loads((SCHEMA_DIR / "industry_profiles.json").read_text(encoding="utf-8"))
    entries: list[dict[str, str]] = []
    styles = ["Premium", "Modern", "Minimal", "Corporate", "Creative"]
    complexities = ["Low", "Medium", "High"]
    locations = ["", "London", "Ahmedabad", "Toronto", "Sydney"]

    for wt_key, pages in DEFAULT_PAGES.items():
        wt = profiles.get("websiteTypes", {}).get(wt_key, {})
        label = wt.get("label", wt_key)
        for page_name in pages:
            for biz in wt.get("sampleBusinesses", [label]):
                for style in styles:
                    for complexity in complexities:
                        for loc in locations[:3]:
                            loc_part = f" in {loc}" if loc else ""
                            if page_name == "Home":
                                prompt = (
                                    f"Create a {style} {complexity.lower()}-complexity "
                                    f"{label.lower()} website for {biz}{loc_part}."
                                )
                            else:
                                prompt = (
                                    f"Design the {page_name} page for a {style} {label.lower()} "
                                    f"({biz}) — {complexity.lower()} complexity{loc_part}."
                                )
                            entries.append(
                                {
                                    "prompt": prompt,
                                    "websiteType": wt_key,
                                    "pageName": page_name,
                                }
                            )
    return entries


def call_openrouter(api_key: str, model: str, user_prompt: str) -> str:
    if httpx is None:
        raise RuntimeError("httpx is required; pip install -r training/requirements.txt")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": TEACHER_SYSTEM + "\n" + ALLOWED_SNIPPET},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
    }
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
    return data["choices"][0]["message"]["content"]


def call_gemini(api_key: str, model: str, user_prompt: str) -> str:
    if httpx is None:
        raise RuntimeError("httpx is required; pip install -r training/requirements.txt")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": TEACHER_SYSTEM + "\n" + ALLOWED_SNIPPET + "\n\nUser brief:\n" + user_prompt}
                ]
            }
        ],
        "generationConfig": {"temperature": 0.4},
    }
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def main() -> None:
    global ALLOWED_SNIPPET
    ALLOWED_SNIPPET = _load_allowed_snippet()

    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument("--provider", choices=["openrouter", "gemini", "auto"], default="auto")
    parser.add_argument("--model", default=None)
    parser.add_argument("--sleep", type=float, default=0.5)
    parser.add_argument("--resume", action="store_true", default=True)
    args = parser.parse_args()

    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()

    provider = args.provider
    if provider == "auto":
        if openrouter_key:
            provider = "openrouter"
        elif gemini_key:
            provider = "gemini"
        else:
            raise SystemExit("Set OPENROUTER_API_KEY or GEMINI_API_KEY")

    model = args.model
    if not model:
        model = "google/gemini-2.0-flash-001" if provider == "openrouter" else "gemini-2.0-flash"

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / "synthetic.jsonl"
    existing = _existing_ids(out_path) if args.resume else set()
    allowed = _load_allowed()

    bank = _prompt_bank()
    written = 0
    attempts = 0
    max_attempts = max(args.count * 3, args.count + 10)

    with out_path.open("a", encoding="utf-8") as out_f:
        while written < args.count and attempts < max_attempts:
            attempts += 1
            entry = bank[(written + attempts) % len(bank)]
            user_prompt = entry["prompt"]
            website_type = entry["websiteType"]
            page_name = entry["pageName"]
            sample_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, user_prompt + provider + page_name))
            if sample_id in existing:
                continue

            try:
                if provider == "openrouter":
                    raw = call_openrouter(openrouter_key, model, user_prompt)
                else:
                    raw = call_gemini(gemini_key, model, user_prompt)
                parsed = _parse_json_response(raw)
                output = parsed.get("output", parsed)
                output = enrich_output_meta(
                    output,
                    website_type=website_type,
                    page_name=page_name,
                )
                row = normalize_sample(
                    {
                        "id": sample_id,
                        "source": "synthetic",
                        "websiteType": website_type,
                        "pageName": page_name,
                        "prompt": user_prompt,
                        "output": output,
                    }
                )
                errors = validate_sample(row, allowed=allowed)
                if errors:
                    print(f"skip invalid ({errors[0]})")
                    continue
                out_f.write(json.dumps(row, ensure_ascii=False) + "\n")
                out_f.flush()
                existing.add(sample_id)
                written += 1
                print(f"[{written}/{args.count}] saved {sample_id}")
            except Exception as exc:  # noqa: BLE001
                print(f"error: {exc}")
            time.sleep(args.sleep)

    print(f"Done. wrote {written} samples to {out_path}")


if __name__ == "__main__":
    main()
