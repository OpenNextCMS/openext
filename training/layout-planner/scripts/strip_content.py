#!/usr/bin/env python3
"""
Enforce the structure-only invariant: recursively replace every `content` value
with an empty object `{}`. Runs after generation, before validation, so a model
that leaked marketing copy into `content` still produces a clean structure-only
target.

Works on either:
  * a JSONL of pairs, stripping the `plan` field of each line (default), or
  * a directory of standalone LayoutPlan *.json files.

Usage:
  python strip_content.py --jsonl ../../data/raw/raw_pairs.jsonl --out ../../data/raw/stripped_pairs.jsonl
  python strip_content.py --dir ../../data/raw            # strips *.json in place
  echo '{...plan...}' | python strip_content.py --stdin    # print stripped plan
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def strip_content(obj: Any) -> Any:
    """Recursively force every `content` key to {} (structure-only)."""
    if isinstance(obj, dict):
        out: dict[str, Any] = {}
        for k, v in obj.items():
            if k == "content":
                out[k] = {}
            else:
                out[k] = strip_content(v)
        return out
    if isinstance(obj, list):
        return [strip_content(v) for v in obj]
    return obj


def _strip_jsonl(inp: Path, out: Path, field: str) -> int:
    n = 0
    with inp.open(encoding="utf-8") as fin, out.open("w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            if field in rec:
                rec[field] = strip_content(rec[field])
            else:  # bare plan object per line
                rec = strip_content(rec)
            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            n += 1
    return n


def _strip_dir(d: Path) -> int:
    n = 0
    for f in sorted(d.glob("*.json")):
        plan = json.loads(f.read_text(encoding="utf-8"))
        f.write_text(json.dumps(strip_content(plan), ensure_ascii=False, indent=2), encoding="utf-8")
        n += 1
    return n


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Force every content field to {} (structure-only).")
    ap.add_argument("--jsonl", help="input JSONL of pairs")
    ap.add_argument("--out", help="output JSONL (required with --jsonl)")
    ap.add_argument("--field", default="plan", help="record field holding the plan (default: plan)")
    ap.add_argument("--dir", help="directory of *.json plans to strip in place")
    ap.add_argument("--stdin", action="store_true", help="strip one plan read from stdin")
    args = ap.parse_args(argv)

    if args.stdin:
        plan = json.load(sys.stdin)
        json.dump(strip_content(plan), sys.stdout, ensure_ascii=False)
        print()
        return 0
    if args.jsonl:
        if not args.out:
            ap.error("--out is required with --jsonl")
        n = _strip_jsonl(Path(args.jsonl), Path(args.out), args.field)
        print(f"stripped {n} records -> {args.out}")
        return 0
    if args.dir:
        n = _strip_dir(Path(args.dir))
        print(f"stripped {n} files in {args.dir}")
        return 0
    ap.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
