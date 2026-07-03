#!/usr/bin/env python3
"""Merge raw JSONL shards, validate, dedupe by (prompt, websiteType, pageName), write validated/all.jsonl."""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.coverage import normalize_sample, sample_dedup_key  # noqa: E402
from lib.paths import RAW_DIR, VALIDATED_DIR  # noqa: E402
from lib.validate import validate_sample, _load_allowed  # noqa: E402

SOURCE_PRIORITY = {
    "real-site-reviewed": 0,
    "real-site": 1,
    "synthetic": 2,
    "template": 3,
}


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.exists():
        return rows
    with path.open(encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_no}: invalid JSON: {exc}") from exc
    return rows


def source_rank(row: dict) -> int:
    return SOURCE_PRIORITY.get(row.get("source", ""), 99)


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge and validate training JSONL files")
    parser.add_argument(
        "--inputs",
        nargs="*",
        default=None,
        help="JSONL files under training/data/raw (default: all *.jsonl except scrape_outlines)",
    )
    parser.add_argument(
        "--include-templates",
        action="store_true",
        default=True,
        help="Include template_seed.jsonl (default: true)",
    )
    parser.add_argument(
        "--templates-only",
        action="store_true",
        help="Only merge template_seed.jsonl",
    )
    parser.add_argument(
        "--max-templates",
        type=int,
        default=None,
        help="Optional cap on template_seed rows (random sample, seed 42). Omit to merge all templates.",
    )
    args = parser.parse_args()

    allowed = _load_allowed()
    VALIDATED_DIR.mkdir(parents=True, exist_ok=True)

    if args.templates_only:
        paths = [RAW_DIR / "template_seed.jsonl"]
    elif args.inputs:
        paths = [Path(p) if Path(p).is_absolute() else RAW_DIR / p for p in args.inputs]
    else:
        paths = sorted(
            p
            for p in RAW_DIR.glob("*.jsonl")
            if p.name != "scrape_outlines.jsonl"
        )
        if not args.include_templates:
            paths = [p for p in paths if p.name != "template_seed.jsonl"]

    merged: list[dict] = []
    for path in paths:
        rows = load_jsonl(path)
        if args.max_templates and path.name == "template_seed.jsonl" and len(rows) > args.max_templates:
            rng = random.Random(42)
            rows = rng.sample(rows, args.max_templates)
            print(f"  capped templates to {args.max_templates}")
        merged.extend(rows)
        print(f"  loaded {len(rows)} from {path.name}")

    by_key: dict[tuple[str, str, str], dict] = {}
    invalid_count = 0
    invalid_samples: list[str] = []

    for row in merged:
        row = normalize_sample(row)
        errors = validate_sample(row, allowed=allowed)
        if errors:
            invalid_count += 1
            if len(invalid_samples) < 5:
                invalid_samples.append(f"{row.get('id', '?')}: {errors[0]}")
            continue

        key = sample_dedup_key(row)
        if not key[0]:
            invalid_count += 1
            continue

        existing = by_key.get(key)
        if existing is None or source_rank(row) < source_rank(existing):
            by_key[key] = row

    valid_rows = list(by_key.values())
    dupe_count = len(merged) - invalid_count - len(valid_rows)

    out_path = VALIDATED_DIR / "all.jsonl"
    with out_path.open("w", encoding="utf-8") as f:
        for row in sorted(
            valid_rows,
            key=lambda r: (
                source_rank(r),
                r.get("websiteType", ""),
                r.get("pageName", ""),
                r.get("prompt", ""),
            ),
        ):
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    sources: dict[str, int] = {}
    for row in valid_rows:
        src = row.get("source", "unknown")
        sources[src] = sources.get(src, 0) + 1

    if invalid_samples:
        print("  sample validation errors:")
        for msg in invalid_samples:
            print(f"    {msg}")

    print(
        f"Merged {len(merged)} rows from {len(paths)} file(s); "
        f"valid={len(valid_rows)} invalid={invalid_count} dupes={dupe_count}; "
        f"sources={sources}; wrote {out_path}"
    )


if __name__ == "__main__":
    main()
