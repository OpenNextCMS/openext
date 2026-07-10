#!/usr/bin/env python3
"""
Interactive two-stage runner: type a brief, get BOTH stages' full JSON.

  Stage 1  (trained Qwen LoRA)     brief  -> LayoutPlan (structure only)
  Stage 2  (OpenRouter filler)     plan   -> filled v2 page JSON (copy added)

Runs locally with transformers + peft (auto CPU/GPU — fp16 on CUDA, fp32 on CPU).
Stage 2 needs OPENROUTER_API_KEY (read from ../../.env or the environment).

Usage:
  python run_both_stages.py                 # prompts you for the brief
  python run_both_stages.py "Create a premium dental clinic website in Ahmedabad."
  python run_both_stages.py --stage1-only "..."     # skip the copy fill
  python run_both_stages.py --out page.json "..."   # also save the result JSON
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "scripts"))


def _utf8_stdio() -> None:
    """Filled copy may contain emoji / non-Latin text — force UTF-8 so printing
    never dies with a cp1252 UnicodeEncodeError on Windows."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except (AttributeError, ValueError):
            pass


def _load_env() -> None:
    """Best-effort load of the repo .env so OPENROUTER_API_KEY is available."""
    env = REPO_ROOT / ".env"
    if not env.is_file():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main(argv: list[str] | None = None) -> int:
    _utf8_stdio()
    ap = argparse.ArgumentParser(description="Interactive two-stage brief -> filled page.")
    ap.add_argument("brief", nargs="*", help="the website brief (omit to be prompted)")
    ap.add_argument("--stage1-only", action="store_true", help="stop after Stage 1 (no copy fill)")
    ap.add_argument("--model-dir", default=None, help="LoRA adapter dir or merged model dir")
    ap.add_argument("--out", default=None, help="also write the combined result to this JSON file")
    args = ap.parse_args(argv)

    _load_env()
    import pipeline  # noqa: E402  (heavy import: pulls torch/transformers lazily)
    from inference import LayoutPlanner, INPUT_PREFIX  # noqa: E402
    from validate_layout_plan import validate_plan  # noqa: E402

    brief = " ".join(args.brief).strip()
    if not brief:
        brief = input("Describe the website you want: ").strip()
    if brief.startswith(INPUT_PREFIX):
        brief = brief[len(INPUT_PREFIX):]
    if not brief:
        print("error: empty brief", file=sys.stderr)
        return 1

    # ---- load model ----
    print(f"\nBrief: {brief}", flush=True)
    print("Loading model (base Qwen2.5-1.5B + LoRA adapter)...", flush=True)
    t0 = time.time()
    try:
        planner = LayoutPlanner(args.model_dir) if args.model_dir else LayoutPlanner()
    except FileNotFoundError as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"  model ready in {time.time()-t0:.0f}s", flush=True)

    # ---- Stage 1 ----
    t1 = time.time()
    plan, source = pipeline.get_layout_plan(brief, planner, log=lambda m: print(m, flush=True))
    ok = validate_plan(plan, "run").ok
    print(f"\nStage 1: source={source}  valid={ok}  ({time.time()-t1:.1f}s)", flush=True)
    print("\n===== STAGE 1 — LAYOUT PLAN (structure only, model output) =====", flush=True)
    print(json.dumps(plan, indent=2, ensure_ascii=False), flush=True)

    result: dict = {"brief": brief, "stage1_source": source, "stage1_valid": ok,
                    "stage1_layout_plan": plan}

    if args.stage1_only:
        if args.out:
            Path(args.out).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"\nsaved -> {args.out}", flush=True)
        return 0

    # ---- Stage 2 ----
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        print("\nStage 2 skipped: no OPENROUTER_API_KEY (set it in .env or the environment).", file=sys.stderr)
        return 0
    skeleton = pipeline.to_v2_skeleton(plan)
    model_id = os.environ.get("OPENROUTER_MODEL", pipeline.DEFAULT_MODEL)
    print(f"\nStage 2: filling copy via {model_id} ...", flush=True)
    t2 = time.time()
    try:
        filled = pipeline.fill_content(skeleton, brief, api_key, model_id)
    except Exception as exc:  # network / model / auth errors
        print(f"error: Stage 2 fill failed: {exc}", file=sys.stderr)
        return 1
    print(f"  filled in {time.time()-t2:.1f}s", flush=True)
    print("\n===== STAGE 2 — FILLED v2 PAGE JSON (copy added) =====", flush=True)
    print(json.dumps(filled, indent=2, ensure_ascii=False), flush=True)

    result["stage2_filled_page"] = filled
    if args.out:
        Path(args.out).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nsaved -> {args.out}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
