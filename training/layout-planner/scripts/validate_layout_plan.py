#!/usr/bin/env python3
"""
Validate LayoutPlan JSON against the OpenNext CMS structure rules (Stage 1).

The planner emits STRUCTURE ONLY: every block.content must be {} (empty).
This validator enforces both the JSON shape and the CMS layout rules the model
must learn:

  * nav-bar first, footer last
  * a hero exists and appears before any feature / testimonial / pricing / content section
  * complexity drives block count (simple 4-6, standard 7-10, rich 11-15)
  * ids are kebab-case and unique
  * every block.content is an empty object
  * allowed types come from schema/allowed-block-types.json (canonical CMS union
    + planner-only section types)
  * styles vary between sections (not one identical background on every block)

Usage:
  python validate_layout_plan.py path/to/plan.json           # validate one file
  python validate_layout_plan.py --all [dir]                 # validate every *.json in dir (default: ../fixtures)
  python validate_layout_plan.py --stdin                     # read a single plan from stdin
  python validate_layout_plan.py --schema                    # print the JSON Schema path and exit

Exit code 0 = all valid, 1 = at least one invalid / error.

If the `jsonschema` package is installed it is used as an extra cross-check;
otherwise the pure-Python rules below run standalone (no pip install required).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
PLANNER_ROOT = HERE.parent
SCHEMA_DIR = PLANNER_ROOT / "schema"
SCHEMA_FILE = SCHEMA_DIR / "layout-plan.schema.json"
TYPES_FILE = SCHEMA_DIR / "allowed-block-types.json"
DEFAULT_FIXTURES = PLANNER_ROOT / "fixtures"

KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HEX_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")

STYLE_ENUM = {"modern", "corporate", "minimal", "luxury", "dark", "creative", "startup", "ecommerce"}
WEBSITE_TYPE_ENUM = {
    "agency", "saas", "ecommerce", "portfolio", "personal-brand",
    "corporate", "restaurant", "real-estate", "healthcare", "education",
}
COMPLEXITY_RANGES = {"simple": (4, 6), "standard": (7, 10), "rich": (11, 15)}


def _load_type_registry() -> dict[str, Any]:
    with TYPES_FILE.open(encoding="utf-8") as fh:
        reg = json.load(fh)
    reg["allowedTypes"] = set(reg["primitiveTypes"]) | set(reg["plannerSectionTypes"])
    reg["_nav"] = set(reg["categories"]["navigation"])
    reg["_hero"] = set(reg["categories"]["hero"])
    reg["_footer"] = set(reg["categories"]["footer"])
    reg["_afterHero"] = set(reg["categories"]["afterHero"])
    return reg


REGISTRY = _load_type_registry()


class Report:
    def __init__(self, name: str):
        self.name = name
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors


def validate_plan(plan: Any, name: str = "<plan>") -> Report:
    r = Report(name)

    if not isinstance(plan, dict):
        r.err("top-level value is not a JSON object")
        return r

    # ---- meta ----------------------------------------------------------
    meta = plan.get("meta")
    if not isinstance(meta, dict):
        r.err("missing or non-object 'meta'")
        meta = {}
    else:
        for field in ("business", "pageName"):
            if not isinstance(meta.get(field), str) or not meta.get(field, "").strip():
                r.err(f"meta.{field} must be a non-empty string")
        if meta.get("style") not in STYLE_ENUM:
            r.err(f"meta.style '{meta.get('style')}' not in {sorted(STYLE_ENUM)}")
        if meta.get("websiteType") not in WEBSITE_TYPE_ENUM:
            r.err(f"meta.websiteType '{meta.get('websiteType')}' not in {sorted(WEBSITE_TYPE_ENUM)}")
        if meta.get("complexity") not in COMPLEXITY_RANGES:
            r.err(f"meta.complexity '{meta.get('complexity')}' not in {sorted(COMPLEXITY_RANGES)}")

    # ---- page / theme --------------------------------------------------
    page = plan.get("page")
    if not isinstance(page, dict):
        r.err("missing or non-object 'page'")
        return r

    theme = page.get("theme")
    if not isinstance(theme, dict):
        r.err("missing or non-object 'page.theme'")
    else:
        for c in ("primaryColor", "secondaryColor", "backgroundColor", "textColor"):
            val = theme.get(c)
            if not isinstance(val, str) or not HEX_RE.match(val):
                r.err(f"page.theme.{c} must be a hex colour (got {val!r})")

    # ---- blocks --------------------------------------------------------
    blocks = page.get("blocks")
    if not isinstance(blocks, list) or not blocks:
        r.err("page.blocks must be a non-empty array")
        return r

    seen_ids: set[str] = set()
    bg_values: list[str] = []
    hero_idx: int | None = None
    first_after_hero_idx: int | None = None

    for i, b in enumerate(blocks):
        loc = f"blocks[{i}]"
        if not isinstance(b, dict):
            r.err(f"{loc} is not an object")
            continue

        bid = b.get("id")
        if not isinstance(bid, str) or not KEBAB_RE.match(bid or ""):
            r.err(f"{loc}.id '{bid}' is not kebab-case")
        elif bid in seen_ids:
            r.err(f"{loc}.id '{bid}' is duplicated")
        else:
            seen_ids.add(bid)

        btype = b.get("type")
        if btype not in REGISTRY["allowedTypes"]:
            r.err(f"{loc}.type '{btype}' is not an allowed block type")

        if not isinstance(b.get("order"), int):
            r.err(f"{loc}.order must be an integer (got {b.get('order')!r})")

        content = b.get("content")
        if not isinstance(content, dict):
            r.err(f"{loc}.content must be an object (structure-only)")
        elif content:
            r.err(f"{loc}.content must be EMPTY {{}} - structure-only plan carries no copy")

        styles = b.get("styles")
        if isinstance(styles, dict) and isinstance(styles.get("backgroundColor"), str):
            bg_values.append(styles["backgroundColor"].lower())

        if btype in REGISTRY["_hero"] and hero_idx is None:
            hero_idx = i
        if btype in REGISTRY["_afterHero"] and first_after_hero_idx is None:
            first_after_hero_idx = i

    # ---- ordering rules ------------------------------------------------
    first_type = blocks[0].get("type") if isinstance(blocks[0], dict) else None
    last_type = blocks[-1].get("type") if isinstance(blocks[-1], dict) else None
    if first_type not in REGISTRY["_nav"]:
        r.err(f"blocks[0] must be navigation ({sorted(REGISTRY['_nav'])}), got '{first_type}'")
    if last_type not in REGISTRY["_footer"]:
        r.err(f"last block must be footer ({sorted(REGISTRY['_footer'])}), got '{last_type}'")

    if hero_idx is None:
        r.err("no hero block found (expected one of %s)" % sorted(REGISTRY["_hero"]))
    elif first_after_hero_idx is not None and first_after_hero_idx < hero_idx:
        r.err(
            f"a content/feature/testimonial/pricing section (blocks[{first_after_hero_idx}]) "
            f"appears before the hero (blocks[{hero_idx}])"
        )

    # footer must be unique and only at the end
    footer_positions = [i for i, b in enumerate(blocks)
                        if isinstance(b, dict) and b.get("type") in REGISTRY["_footer"]]
    if len(footer_positions) > 1:
        r.err(f"multiple footer blocks at positions {footer_positions}; only the last block may be footer")
    nav_positions = [i for i, b in enumerate(blocks)
                     if isinstance(b, dict) and b.get("type") in REGISTRY["_nav"]]
    if len(nav_positions) > 1:
        r.err(f"multiple navigation blocks at positions {nav_positions}; expected exactly one")

    # ---- complexity → block count -------------------------------------
    complexity = meta.get("complexity")
    if complexity in COMPLEXITY_RANGES:
        lo, hi = COMPLEXITY_RANGES[complexity]
        if not (lo <= len(blocks) <= hi):
            r.err(f"complexity '{complexity}' expects {lo}-{hi} blocks, got {len(blocks)}")

    # ---- style variation ----------------------------------------------
    if len(blocks) >= 3 and len(bg_values) == len(blocks) and len(set(bg_values)) == 1:
        r.err("every block shares one identical backgroundColor; sections must vary visually")
    elif 0 < len(bg_values) < len(blocks):
        r.warn(f"only {len(bg_values)}/{len(blocks)} blocks declare a backgroundColor")

    return r


def _jsonschema_check(plan: Any, r: Report) -> None:
    """Optional extra pass if the jsonschema package is available."""
    try:
        import jsonschema  # type: ignore
    except Exception:
        return
    try:
        schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
        jsonschema.validate(plan, schema)
    except jsonschema.ValidationError as exc:  # type: ignore[attr-defined]
        r.err(f"[jsonschema] {exc.message} at {list(exc.absolute_path)}")
    except Exception as exc:  # pragma: no cover
        r.warn(f"[jsonschema] validator unavailable: {exc}")


def _validate_file(path: Path) -> Report:
    try:
        plan = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        r = Report(path.name)
        r.err(f"invalid JSON: {exc}")
        return r
    r = validate_plan(plan, path.name)
    _jsonschema_check(plan, r)
    return r


def _print_report(r: Report) -> None:
    status = "PASS" if r.ok else "FAIL"
    print(f"[{status}] {r.name}")
    for w in r.warnings:
        print(f"    warn: {w}")
    for e in r.errors:
        print(f"    error: {e}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Validate LayoutPlan JSON.")
    ap.add_argument("file", nargs="?", help="path to a single LayoutPlan JSON file")
    ap.add_argument("--all", nargs="?", const=str(DEFAULT_FIXTURES), metavar="DIR",
                    help="validate every *.json in DIR (default: fixtures/)")
    ap.add_argument("--stdin", action="store_true", help="read one plan from stdin")
    ap.add_argument("--jsonl", metavar="FILE", help="validate the plan in each line of a pairs JSONL")
    ap.add_argument("--field", default="plan", help="record field holding the plan (default: plan)")
    ap.add_argument("--out", metavar="FILE", help="with --jsonl: write only the valid lines here")
    ap.add_argument("--schema", action="store_true", help="print schema path and exit")
    args = ap.parse_args(argv)

    if args.schema:
        print(SCHEMA_FILE)
        return 0

    reports: list[Report] = []

    if args.jsonl:
        src = Path(args.jsonl)
        if not src.is_file():
            print(f"error: file not found: {src}")
            return 1
        out_fh = Path(args.out).open("w", encoding="utf-8") if args.out else None
        valid = total = 0
        invalid_examples: list[Report] = []
        with src.open(encoding="utf-8") as fh:
            for ln, line in enumerate(fh, 1):
                line = line.strip()
                if not line:
                    continue
                total += 1
                rec = json.loads(line)
                plan = rec.get(args.field, rec)
                r = validate_plan(plan, f"{src.name}:{ln}")
                if r.ok:
                    valid += 1
                    if out_fh:
                        out_fh.write(line + "\n")
                elif len(invalid_examples) < 10:
                    invalid_examples.append(r)
        if out_fh:
            out_fh.close()
        for r in invalid_examples:
            _print_report(r)
        if len(invalid_examples) == 10 and total - valid > 10:
            print(f"    ... and {total - valid - 10} more invalid")
        print(f"\n{valid}/{total} valid" + (f"  -> {args.out}" if args.out else ""))
        return 0 if valid == total else 1

    if args.stdin:
        try:
            plan = json.load(sys.stdin)
        except json.JSONDecodeError as exc:
            print(f"[FAIL] <stdin>\n    error: invalid JSON: {exc}")
            return 1
        r = validate_plan(plan, "<stdin>")
        _jsonschema_check(plan, r)
        reports.append(r)
    elif args.all is not None:
        d = Path(args.all)
        if not d.is_dir():
            print(f"error: directory not found: {d}")
            return 1
        files = sorted(d.glob("*.json"))
        if not files:
            print(f"error: no *.json files in {d}")
            return 1
        reports.extend(_validate_file(f) for f in files)
    elif args.file:
        reports.append(_validate_file(Path(args.file)))
    else:
        ap.print_help()
        return 1

    passed = sum(1 for r in reports if r.ok)
    for r in reports:
        _print_report(r)
    print(f"\n{passed}/{len(reports)} valid")
    return 0 if passed == len(reports) else 1


if __name__ == "__main__":
    raise SystemExit(main())
