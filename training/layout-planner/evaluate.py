#!/usr/bin/env python3
"""Evaluate layout planner on test set — dissertation metrics."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

_MODULE = Path(__file__).resolve().parent
if str(_MODULE) not in sys.path:
    sys.path.insert(0, str(_MODULE))

from lib.inference import LayoutPlannerModel  # noqa: E402
from lib.json_utils import parse_json_loose  # noqa: E402
from lib.paths import DEFAULT_MODEL_DIR, SEQ2SEQ_DIR  # noqa: E402
from lib.layout_validate import _load_allowed, validate_layout_plan_output  # noqa: E402


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def gold_layout(row: dict) -> dict:
    return parse_json_loose(row["target_text"])


def block_types(plan: dict) -> list[str]:
    blocks = plan.get("page", {}).get("blocks", [])
    return [b.get("type", "") for b in blocks if isinstance(b, dict)]


def hero_variants(plan: dict) -> list[tuple[str, str]]:
    out = []
    for b in plan.get("page", {}).get("blocks", []):
        if not isinstance(b, dict):
            continue
        if b.get("type") in ("hero", "heroSplit", "heroCentered"):
            layout = b.get("layout") or {}
            out.append((b["type"], layout.get("variant", "")))
    return out


def meta_field(plan: dict, key: str) -> str:
    meta = plan.get("meta") or {}
    return str(meta.get(key, ""))


def evaluate(rows: list[dict], planner: LayoutPlannerModel) -> dict[str, Any]:
    allowed = _load_allowed()
    n = len(rows)
    schema_valid = 0
    repair_valid = 0
    wt_correct = 0
    pn_correct = 0
    style_correct = 0
    complexity_correct = 0
    seq_match = 0
    hero_correct = 0
    hero_total = 0

    all_pred_types: list[str] = []
    all_gold_types: list[str] = []
    predictions: list[dict] = []

    for row in rows:
        page_name = row.get("pageName", "Home")
        prompt = row["input_text"]
        # Strip prefix to recover user prompt for logging
        if prompt.startswith("plan page layout: "):
            user_prompt = prompt[len("plan page layout: ") :]
        elif prompt.startswith("plan layout: "):
            user_prompt = prompt[len("plan layout: ") :]
        else:
            user_prompt = prompt

        gold = gold_layout(row)
        result = planner.plan_layout(
            user_prompt,
            page_name=page_name,
            max_attempts=2,
            use_fallback=False,
        )
        pred = result.get("layoutPlan")

        pred_valid = False
        parse_no_repair = False
        if pred and isinstance(pred, dict):
            errs = validate_layout_plan_output(pred, allowed=allowed)
            pred_valid = len(errs) == 0
            parse_no_repair = result["valid"]

        if parse_no_repair:
            schema_valid += 1
        if pred_valid:
            repair_valid += 1

        if pred and isinstance(pred, dict):
            if meta_field(pred, "websiteType") == meta_field(gold, "websiteType"):
                wt_correct += 1
            if meta_field(pred, "pageName") == meta_field(gold, "pageName"):
                pn_correct += 1
            if meta_field(pred, "style") == meta_field(gold, "style"):
                style_correct += 1
            if meta_field(pred, "complexity") == meta_field(gold, "complexity"):
                complexity_correct += 1

            pt = block_types(pred)
            gt = block_types(gold)
            all_pred_types.extend(pt)
            all_gold_types.extend(gt)
            if pt == gt:
                seq_match += 1

            pv = dict(hero_variants(pred))
            for htype, variant in hero_variants(gold):
                hero_total += 1
                if pv.get(htype) == variant:
                    hero_correct += 1

        predictions.append(
            {
                "id": row.get("id"),
                "input_text": row["input_text"],
                "valid": result["valid"],
                "errors": result.get("errors"),
                "predicted_types": block_types(pred) if pred else [],
                "gold_types": block_types(gold),
            }
        )

    # Micro block-type F1 via sklearn if available
    block_f1 = None
    try:
        from sklearn.metrics import f1_score

        # Pad to same length per sample for micro — use all tokens flattened
        labels = sorted(set(all_gold_types + all_pred_types))
        if labels and len(all_pred_types) == len(all_gold_types):
            block_f1 = float(
                f1_score(all_gold_types, all_pred_types, average="micro", zero_division=0)
            )
    except Exception:  # noqa: BLE001
        pass

    def pct(x: int) -> float:
        return round(100.0 * x / n, 2) if n else 0.0

    return {
        "samples": n,
        "schema_validity_pct": pct(schema_valid),
        "repair_validity_pct": pct(repair_valid),
        "websiteType_accuracy_pct": pct(wt_correct),
        "pageName_accuracy_pct": pct(pn_correct),
        "style_accuracy_pct": pct(style_correct),
        "complexity_accuracy_pct": pct(complexity_correct),
        "block_sequence_match_pct": pct(seq_match),
        "hero_variant_accuracy_pct": round(100.0 * hero_correct / hero_total, 2) if hero_total else None,
        "block_type_micro_f1": block_f1,
        "predictions": predictions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate Layout Planner on test set")
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--test-file", type=Path, default=SEQ2SEQ_DIR / "test_seq2seq.jsonl")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--limit", type=int, default=None, help="Evaluate first N test rows only")
    args = parser.parse_args()

    rows = load_jsonl(args.test_file)
    if args.limit:
        rows = rows[: args.limit]
    planner = LayoutPlannerModel(model_dir=args.model_dir)
    report = evaluate(rows, planner)

    # Save without full per-sample list in summary
    summary = {k: v for k, v in report.items() if k != "predictions"}
    out_path = args.output or (args.model_dir / "eval_report.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {**summary, "predictions_file": str(out_path.with_name("predictions_test.jsonl"))}
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    pred_path = out_path.with_name("predictions_test.jsonl")
    with pred_path.open("w", encoding="utf-8") as f:
        for p in report["predictions"]:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")

    print(json.dumps(summary, indent=2))
    print(f"Report → {out_path}")


if __name__ == "__main__":
    main()
