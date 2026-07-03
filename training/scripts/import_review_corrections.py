#!/usr/bin/env python3
"""Import manual review CSV corrections into validated JSONL."""
from __future__ import annotations

import argparse
import csv
import json
import sys
import uuid
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.coverage import normalize_sample  # noqa: E402
from lib.paths import RAW_DIR, REVIEW_DIR  # noqa: E402
from lib.validate import validate_sample, _load_allowed  # noqa: E402


def _default_review_csv() -> Path:
    if (REVIEW_DIR / "review_batch.csv").exists():
        return REVIEW_DIR / "review_batch.csv"
    candidates = sorted(REVIEW_DIR.glob("review_batch_*.csv"))
    if candidates:
        return candidates[-1]
    return REVIEW_DIR / "review_batch.csv"


def main() -> None:
    parser = argparse.ArgumentParser(description="Import reviewed CSV corrections")
    parser.add_argument(
        "--input",
        type=Path,
        default=None,
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=RAW_DIR / "real_sites_reviewed.jsonl",
    )
    args = parser.parse_args()
    input_path = args.input or _default_review_csv()

    if not input_path.exists():
        raise SystemExit(f"Missing {input_path}")

    allowed = _load_allowed()
    imported = 0
    skipped = 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with input_path.open(encoding="utf-8-sig", newline="") as f_in, args.output.open(
        "w", encoding="utf-8"
    ) as f_out:
        reader = csv.DictReader(f_in)
        for row in reader:
            approved = (row.get("approved") or "").strip().lower()
            if approved not in ("y", "yes", "1", "true"):
                skipped += 1
                continue

            corrected = (row.get("corrected_output_json") or "").strip()
            output_json = (row.get("output_json") or "").strip()
            raw_output = corrected if corrected else output_json
            if not raw_output:
                skipped += 1
                continue

            try:
                output = json.loads(raw_output)
            except json.JSONDecodeError as exc:
                print(f"skip {row.get('id')}: bad JSON — {exc}")
                skipped += 1
                continue

            sample = normalize_sample(
                {
                    "id": row.get("id") or str(uuid.uuid4()),
                    "source": "real-site-reviewed",
                    "prompt": row.get("prompt", ""),
                    "output": output,
                    "confidence": 1.0,
                    "needs_review": False,
                    "reviewNotes": row.get("notes", ""),
                }
            )

            errors = validate_sample(sample, allowed=allowed)
            if errors:
                print(f"skip {sample['id']}: {errors[0]}")
                skipped += 1
                continue

            f_out.write(json.dumps(sample, ensure_ascii=False) + "\n")
            imported += 1

    print(f"Imported {imported} reviewed samples (skipped {skipped}) -> {args.output}")


if __name__ == "__main__":
    main()
