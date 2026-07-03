#!/usr/bin/env python3
"""Print dataset statistics to training/data/dataset_report.txt."""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.paths import DATA_DIR  # noqa: E402


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def summarize(rows: list[dict], label: str) -> list[str]:
    lines = [f"## {label} (n={len(rows)})"]
    if not rows:
        lines.append("(empty)")
        return lines

    sources = Counter(r.get("source", "unknown") for r in rows)
    industries = Counter(
        (r.get("industry") or (r.get("output") or {}).get("meta", {}).get("industry") or "unknown")
        for r in rows
    )
    website_types = Counter(
        r.get("websiteType")
        or (r.get("output") or {}).get("meta", {}).get("websiteType")
        or "n/a"
        for r in rows
    )
    page_names = Counter(
        r.get("pageName") or (r.get("output") or {}).get("meta", {}).get("pageName") or "Home"
        for r in rows
    )
    block_counts = Counter()
    block_types = Counter()
    styles = Counter()
    complexities = Counter()
    confidences: list[float] = []
    needs_review = 0

    for r in rows:
        out = r.get("output") or {}
        meta = out.get("meta") or {}
        styles[meta.get("style", "unknown")] += 1
        complexities[meta.get("complexity", "unknown")] += 1
        if "confidence" in r:
            confidences.append(float(r["confidence"]))
        if r.get("needs_review"):
            needs_review += 1
        blocks = (out.get("page") or {}).get("blocks") or []
        block_counts[len(blocks)] += 1
        for b in blocks:
            block_types[b.get("type", "unknown")] += 1

    lines.append("Sources: " + ", ".join(f"{k}={v}" for k, v in sources.most_common()))
    lines.append("Industries: " + ", ".join(f"{k}={v}" for k, v in industries.most_common(12)))
    if any(wt != "n/a" for wt in website_types):
        lines.append("Website types: " + ", ".join(f"{k}={v}" for k, v in website_types.most_common()))
    lines.append("Page names: " + ", ".join(f"{k}={v}" for k, v in page_names.most_common()))
    lines.append("Meta styles: " + ", ".join(f"{k}={v}" for k, v in styles.most_common()))
    lines.append("Complexity: " + ", ".join(f"{k}={v}" for k, v in complexities.most_common()))
    if confidences:
        avg_conf = sum(confidences) / len(confidences)
        lines.append(f"Confidence: avg={avg_conf:.3f} needs_review={needs_review}")
    lines.append("Block count distribution: " + ", ".join(f"{k}={v}" for k, v in sorted(block_counts.items())))
    lines.append("Top block types: " + ", ".join(f"{k}={v}" for k, v in block_types.most_common(15)))
    for rare in ("pricing", "faq", "team"):
        lines.append(f"  {rare} blocks: {block_types.get(rare, 0)}")
    return lines


def main() -> None:
    report_lines = ["# OpenNext CMS LayoutPlan Dataset Report", ""]
    for name in ("train", "eval", "test"):
        report_lines.extend(summarize(load_jsonl(DATA_DIR / f"{name}.jsonl"), name))
        report_lines.append("")

    all_validated = load_jsonl(DATA_DIR / "validated" / "all.jsonl")
    report_lines.extend(summarize(all_validated, "validated/all"))
    report_lines.append("")

    out_path = DATA_DIR / "dataset_report.txt"
    out_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")
    print("\n".join(report_lines[:25]))


if __name__ == "__main__":
    main()
