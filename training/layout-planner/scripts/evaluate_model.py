#!/usr/bin/env python3
"""
Evaluate the layout planner's structural quality.

Metrics (all "higher is better", target >= 0.80 schema_pass_rate before Phase 5):
  * valid_json_rate       — model output parses into a JSON object
  * schema_pass_rate      — parsed plan passes validate_layout_plan (schema + CMS rules)
  * nav_footer_order_rate — blocks[0] is nav-bar AND the last block is footer

Modes:
  # against the trained model (needs outputs/layout-planner-flan-t5-base/):
  python evaluate_model.py --test ../../data/seq2seq/test.jsonl

  # against a file of pre-generated raw outputs (one JSON per line under key "prediction"):
  python evaluate_model.py --predictions preds.jsonl

  # offline self-test of the metric logic (no model, no weights):
  python evaluate_model.py --self-test
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from plan_json import parse_plan_json  # noqa: E402
from validate_layout_plan import validate_plan, REGISTRY  # noqa: E402

PLANNER_ROOT = HERE.parent
DEFAULT_TEST = PLANNER_ROOT.parent / "data" / "seq2seq" / "test.jsonl"
FIXTURES = PLANNER_ROOT / "fixtures"
INPUT_PREFIX = "plan layout: "
TARGET_SCHEMA_PASS = 0.80


def score_raw(raw: str) -> dict:
    """Score one raw model output string."""
    plan = parse_plan_json(raw)
    valid_json = plan is not None
    schema_pass = bool(valid_json and validate_plan(plan, "pred").ok)
    nav_footer_ok = False
    if valid_json:
        blocks = (plan.get("page") or {}).get("blocks") if isinstance(plan.get("page"), dict) else None
        if isinstance(blocks, list) and blocks:
            first = blocks[0].get("type") if isinstance(blocks[0], dict) else None
            last = blocks[-1].get("type") if isinstance(blocks[-1], dict) else None
            nav_footer_ok = first in REGISTRY["_nav"] and last in REGISTRY["_footer"]
    return {"valid_json": valid_json, "schema_pass": schema_pass, "nav_footer_ok": nav_footer_ok}


def aggregate(scores: list[dict]) -> dict:
    n = len(scores) or 1
    return {
        "n": len(scores),
        "valid_json_rate": sum(s["valid_json"] for s in scores) / n,
        "schema_pass_rate": sum(s["schema_pass"] for s in scores) / n,
        "nav_footer_order_rate": sum(s["nav_footer_ok"] for s in scores) / n,
    }


def print_metrics(m: dict) -> None:
    print(f"samples:                {m['n']}")
    print(f"valid_json_rate:        {m['valid_json_rate']:.1%}")
    print(f"schema_pass_rate:       {m['schema_pass_rate']:.1%}  (target >= {TARGET_SCHEMA_PASS:.0%})")
    print(f"nav_footer_order_rate:  {m['nav_footer_order_rate']:.1%}")
    verdict = "PASS" if m["schema_pass_rate"] >= TARGET_SCHEMA_PASS else "BELOW TARGET"
    print(f"=> {verdict}")


def _minify(plan: dict) -> str:
    return json.dumps(plan, separators=(",", ":"), ensure_ascii=False)


def self_test() -> int:
    """Exercise the metric logic on synthetic outputs — no model required."""
    fixtures = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(FIXTURES.glob("*.json"))]
    assert len(fixtures) == 5, f"expected 5 fixtures, found {len(fixtures)}"

    raws: list[str] = [_minify(f) for f in fixtures]                    # 5 clean
    raws.append("```json\n" + _minify(fixtures[0]) + "\n```")           # fenced -> ok
    raws.append(_minify(fixtures[1]) + "\n\nHere is your layout!")      # trailing prose -> ok
    raws.append("sorry, I can't do that")                              # not json
    raws.append(_minify({                                               # parses but fails schema
        "meta": {"business": "x", "style": "modern", "websiteType": "saas",
                 "pageName": "Home", "complexity": "simple"},
        "page": {"theme": {"primaryColor": "#111111", "secondaryColor": "#222222",
                           "backgroundColor": "#ffffff", "textColor": "#000000"},
                 "blocks": [{"id": f"b{i}", "type": "card", "order": i, "content": {}} for i in range(4)]}}))

    scores = [score_raw(r) for r in raws]
    m = aggregate(scores)
    print_metrics(m)

    exp = {"valid_json": 8, "schema_pass": 7, "nav_footer_ok": 7}
    got = {k: sum(s[k] for s in scores) for k in exp}
    ok = got == exp
    print(f"\nself-test counts: got={got} expected={exp}  ->  {'OK' if ok else 'MISMATCH'}")
    return 0 if ok else 1


def eval_model(test_path: Path, limit: int | None = None, max_new_tokens: int = 1024) -> int:
    if not test_path.is_file():
        print(f"error: test file not found: {test_path} (build it with build_seq2seq.py)", file=sys.stderr)
        return 1
    try:
        sys.path.insert(0, str(PLANNER_ROOT))
        from inference import LayoutPlanner  # noqa: E402
        planner = LayoutPlanner()
    except FileNotFoundError as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    scores = []
    for line in test_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        if limit is not None and len(scores) >= limit:
            break
        rec = json.loads(line)
        brief = rec["input_text"]
        if brief.startswith(INPUT_PREFIX):
            brief = brief[len(INPUT_PREFIX):]
        scores.append(score_raw(planner.generate_text(brief, max_new_tokens=max_new_tokens)))
    print_metrics(aggregate(scores))
    return 0


def eval_predictions(pred_path: Path) -> int:
    if not pred_path.is_file():
        print(f"error: predictions file not found: {pred_path}", file=sys.stderr)
        return 1
    scores = []
    for line in pred_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        raw = rec.get("prediction") if isinstance(rec, dict) else str(rec)
        scores.append(score_raw(raw if isinstance(raw, str) else json.dumps(raw)))
    print_metrics(aggregate(scores))
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Evaluate layout planner structural quality.")
    ap.add_argument("--test", default=str(DEFAULT_TEST), help="test.jsonl (model mode)")
    ap.add_argument("--predictions", help="jsonl of pre-generated raw outputs (offline)")
    ap.add_argument("--self-test", action="store_true", help="offline metric-logic check (no model)")
    ap.add_argument("--limit", type=int, default=None, help="max test samples to run (fast smoke eval)")
    ap.add_argument("--max-new-tokens", type=int, default=512, help="generation cap per sample (default 512)")
    args = ap.parse_args(argv)

    if args.self_test:
        return self_test()
    if args.predictions:
        return eval_predictions(Path(args.predictions))
    return eval_model(Path(args.test), limit=args.limit, max_new_tokens=args.max_new_tokens)


if __name__ == "__main__":
    raise SystemExit(main())
