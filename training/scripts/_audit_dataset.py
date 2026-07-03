#!/usr/bin/env python3
"""One-off audit of template_seed.jsonl quality."""
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.validate import validate_sample, _load_allowed
from lib.template_data import WEBSITE_TYPES

ROOT = Path(__file__).resolve().parent.parent
rows = [
    json.loads(line)
    for line in (ROOT / "data/raw/template_seed.jsonl").read_text(encoding="utf-8").splitlines()
    if line.strip()
]
allowed = _load_allowed()

print("=== Validation ===")
failures = [(r.get("id"), validate_sample(r, allowed)) for r in rows if validate_sample(r, allowed)]
print(f"Total: {len(rows)}, Failures: {len(failures)}")
if failures[:3]:
    for fid, errs in failures[:3]:
        print(f"  {fid}: {errs}")

print("\n=== Prompts ===")
prompts = [r["prompt"] for r in rows]
print(f"Unique prompts: {len(set(prompts))} / {len(prompts)}")

print("\n=== Content empty check ===")
bad_content = sum(
    1 for r in rows for b in r["output"]["page"]["blocks"] if b.get("content") != {}
)
print(f"Blocks with non-empty content: {bad_content}")

print("\n=== Restaurant Home hero ===")
rest = [r for r in rows if r.get("websiteType") == "restaurant" and r.get("pageName") == "Home"]
variants = Counter()
for r in rest:
    for b in r["output"]["page"]["blocks"]:
        if b["type"] in ("hero", "heroSplit", "heroCentered"):
            variants[b["layout"].get("variant")] += 1
print(dict(variants))

print("\n=== Agency Home hero ===")
agency = [r for r in rows if r.get("websiteType") == "agency" and r.get("pageName") == "Home"][0]
hero = next(
    b
    for b in agency["output"]["page"]["blocks"]
    if b["type"] in ("hero", "heroSplit", "heroCentered")
)
print(f"type={hero['type']} variant={hero['layout'].get('variant')}")

print("\n=== Block types used ===")
used = Counter()
for r in rows:
    for b in r["output"]["page"]["blocks"]:
        used[b["type"]] += 1
cms = set(allowed["semanticBlockTypes"])
unknown = set(used) - cms
print(f"Unknown types: {unknown or 'none'}")
print(f"Missing from data: pricing={used.get('pricing',0)} team={used.get('team',0)} faq={used.get('faq',0)}")

print("\n=== Website type coverage ===")
for wt in WEBSITE_TYPES:
    n = sum(1 for r in rows if r.get("websiteType") == wt)
    print(f"  {wt}: {n}")

print("\n=== Splits ===")
for name in ("train", "eval", "test", "validated/all"):
    p = ROOT / "data" / f"{name}.jsonl"
    if p.exists():
        n = sum(1 for line in p.open(encoding="utf-8") if line.strip())
        print(f"  {name}: {n}")

# Overlap check
train_p = {json.loads(l)["prompt"] for l in (ROOT / "data/train.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()}
eval_p = {json.loads(l)["prompt"] for l in (ROOT / "data/eval.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()}
test_p = {json.loads(l)["prompt"] for l in (ROOT / "data/test.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()}
print(f"\n=== Split leakage ===")
print(f"train∩eval: {len(train_p & eval_p)}, train∩test: {len(train_p & test_p)}, eval∩test: {len(eval_p & test_p)}")
