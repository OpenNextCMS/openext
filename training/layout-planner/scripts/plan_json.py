#!/usr/bin/env python3
"""
Shared helper: robustly parse a LayoutPlan JSON object out of raw model text.

Model output is usually clean minified JSON, but can arrive wrapped in ```json
fences, trailed by prose, or with small syntax slips. Recovery ladder:
  1. strip ``` fences, json.loads
  2. json_repair (if installed) — fixes trailing commas, quotes, etc.
  3. slice between the first '{' and last '}' and retry
Returns a dict, or None if nothing parses.
"""
from __future__ import annotations

import json
from typing import Any


def parse_plan_json(text: Any) -> dict | None:
    if not isinstance(text, str):
        return None
    t = text.strip()

    # 1. strip a leading ```/```json fence and a trailing ```
    if t.startswith("```"):
        t = t[3:]
        if t[:4].lower() == "json":
            t = t[4:]
        if t.endswith("```"):
            t = t[:-3]
        t = t.strip()
    try:
        obj = json.loads(t)
        return obj if isinstance(obj, dict) else None
    except Exception:
        pass

    # 2. json_repair (optional dependency)
    try:
        from json_repair import repair_json  # type: ignore
        obj = json.loads(repair_json(t))
        return obj if isinstance(obj, dict) else None
    except Exception:
        pass

    # 3. brace-slice fallback (drops leading/trailing prose)
    i, j = t.find("{"), t.rfind("}")
    if i != -1 and j > i:
        try:
            obj = json.loads(t[i:j + 1])
            return obj if isinstance(obj, dict) else None
        except Exception:
            return None
    return None
