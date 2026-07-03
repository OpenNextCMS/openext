#!/usr/bin/env python3
"""Audit scraped outlines vs real_sites labels — classify mapping gaps."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.map_outline import outline_to_layout_plan  # noqa: E402
from lib.paths import RAW_DIR  # noqa: E402
from lib.validate import validate_sample, _load_allowed  # noqa: E402

ACTIONS = {
    "scrape_error": "rescrape",
    "empty_sections": "rescrape",
    "too_few_blocks": "llm_fallback",
    "validation_error": "llm_fallback",
    "mapped_ok": "none",
}


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


def classify_outline(outline: dict, site_meta: dict, allowed: dict) -> tuple[str, str, int, float | None]:
    if outline.get("error") and not outline.get("sections"):
        return "scrape_error", str(outline.get("error", ""))[:120], 0, None

    sections = outline.get("sections") or []
    if not sections:
        return "empty_sections", "no sections extracted", 0, None

    try:
        output, confidence, warnings = outline_to_layout_plan(outline, site_meta)
        from lib.map_outline import outline_to_sample  # noqa: WPS433

        sample = outline_to_sample(outline, site_meta)
        errors = validate_sample(sample, allowed=allowed)
        if errors:
            return "validation_error", errors[0], len(sections), confidence
        if len(output.get("page", {}).get("blocks", [])) < 4:
            return "too_few_blocks", f"blocks={len(output['page']['blocks'])}", len(sections), confidence
        warn = ",".join(warnings) if warnings else ""
        return "mapped_ok", warn, len(sections), confidence
    except Exception as exc:  # noqa: BLE001
        return "validation_error", str(exc)[:120], len(sections), None


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit real-site mapping gaps")
    parser.add_argument("--outlines", type=Path, default=RAW_DIR / "scrape_outlines.jsonl")
    parser.add_argument("--mapped", type=Path, default=RAW_DIR / "real_sites.jsonl")
    parser.add_argument("--output", type=Path, default=RAW_DIR / "mapping_gaps.csv")
    args = parser.parse_args()

    allowed = _load_allowed()
    outlines = load_jsonl(args.outlines)
    mapped_urls = {r.get("url") for r in load_jsonl(args.mapped) if r.get("url")}

    args.output.parent.mkdir(parents=True, exist_ok=True)
    reason_counts: dict[str, int] = {}

    with args.output.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "siteId",
                "url",
                "industry",
                "in_real_sites",
                "reason",
                "detail",
                "section_count",
                "confidence",
                "suggested_action",
            ],
        )
        writer.writeheader()

        for outline in outlines:
            url = outline.get("url", "")
            site_meta = outline.get("siteMeta") or {
                "id": outline.get("id"),
                "url": url,
                "industry": outline.get("industry", "saas"),
                "business": outline.get("business", "Business"),
                "expectedStyle": outline.get("expectedStyle", "Modern"),
            }
            in_mapped = url in mapped_urls
            reason, detail, sec_count, conf = classify_outline(outline, site_meta, allowed)
            if not in_mapped and reason == "mapped_ok":
                reason = "validation_error"
                detail = "not in real_sites.jsonl"

            if not in_mapped:
                reason_counts[reason] = reason_counts.get(reason, 0) + 1
                action = ACTIONS.get(reason, "manual_review")
            else:
                action = "none"

            writer.writerow(
                {
                    "siteId": site_meta.get("id", outline.get("id", "")),
                    "url": url,
                    "industry": site_meta.get("industry", ""),
                    "in_real_sites": "y" if in_mapped else "n",
                    "reason": reason if in_mapped else reason,
                    "detail": detail,
                    "section_count": sec_count,
                    "confidence": f"{conf:.3f}" if conf is not None else "",
                    "suggested_action": action,
                }
            )

    print(f"Wrote {args.output}")
    if reason_counts:
        print("Unmapped breakdown:", reason_counts)
    else:
        print("All outlines mapped to real_sites.jsonl")


if __name__ == "__main__":
    main()
