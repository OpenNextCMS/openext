#!/usr/bin/env python3
"""Export validated JSONL to seq2seq training format (input_text → target_text)."""
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.coverage import sample_dedup_key  # noqa: E402
from lib.paths import DATA_DIR  # noqa: E402
from lib.validate import validate_layout_plan_output, _load_allowed  # noqa: E402

STRIP_BLOCK_KEYS = frozenset({"confidence"})


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def clean_output(output: dict) -> dict:
    """Strip training metadata from blocks for compact seq2seq targets."""
    cleaned = copy.deepcopy(output)
    blocks = cleaned.get("page", {}).get("blocks") or []
    for block in blocks:
        for key in STRIP_BLOCK_KEYS:
            block.pop(key, None)
    return cleaned


def input_prefix(page_name: str) -> str:
    return "plan layout:" if page_name == "Home" else "plan page layout:"


def to_seq2seq_row(sample: dict, allowed: dict) -> dict | None:
    prompt = (sample.get("prompt") or "").strip()
    output = sample.get("output")
    if not prompt or not isinstance(output, dict):
        return None

    _, _, page_name = sample_dedup_key(sample)
    cleaned = clean_output(output)
    errors = validate_layout_plan_output(cleaned, allowed=allowed)
    if errors:
        return None

    target_text = json.dumps(cleaned, ensure_ascii=False, separators=(",", ":"))
    input_text = f"{input_prefix(page_name)} {prompt}"

    return {
        "id": sample.get("id", ""),
        "input_text": input_text,
        "target_text": target_text,
        "websiteType": sample.get("websiteType") or cleaned.get("meta", {}).get("websiteType"),
        "pageName": page_name,
        "source": sample.get("source", ""),
    }


def export_split(name: str, allowed: dict, output_dir: Path) -> int:
    src = DATA_DIR / f"{name}.jsonl"
    rows = load_jsonl(src)
    out_rows: list[dict] = []
    skipped = 0

    for sample in rows:
        row = to_seq2seq_row(sample, allowed)
        if row is None:
            skipped += 1
            continue
        out_rows.append(row)

    out_path = output_dir / f"{name}_seq2seq.jsonl"
    with out_path.open("w", encoding="utf-8") as f:
        for row in out_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"  {name}: {len(out_rows)} rows -> {out_path} (skipped {skipped})")
    return len(out_rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export seq2seq JSONL for FLAN-T5 training")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DATA_DIR / "seq2seq",
    )
    args = parser.parse_args()

    allowed = _load_allowed()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    for split in ("train", "eval", "test"):
        total += export_split(split, allowed, args.output_dir)

    print(f"Done. {total} seq2seq rows in {args.output_dir}")


if __name__ == "__main__":
    main()
