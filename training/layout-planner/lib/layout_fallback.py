"""Guaranteed valid LayoutPlan when model output fails validation."""
from __future__ import annotations

import copy
import importlib.util
import json
import sys
import types
from functools import lru_cache
from pathlib import Path
from typing import Any

from .json_utils import parse_json_loose
from .paths import DATA_DIR, TRAINING_ROOT
from .prompt_hints import hints_from_prompt

_SCRIPTS_LIB = TRAINING_ROOT / "scripts" / "lib"


def _load_training_lib_module(name: str):
    """Import training/scripts/lib modules without clashing with layout-planner/lib."""
    full = f"opennext_training_lib.{name}"
    if full in sys.modules:
        return sys.modules[full]
    if "opennext_training_lib" not in sys.modules:
        pkg = types.ModuleType("opennext_training_lib")
        pkg.__path__ = [str(_SCRIPTS_LIB)]
        sys.modules["opennext_training_lib"] = pkg
    path = _SCRIPTS_LIB / f"{name}.py"
    spec = importlib.util.spec_from_file_location(full, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    module.__package__ = "opennext_training_lib"
    sys.modules[full] = module
    spec.loader.exec_module(module)
    return module


def _build_layout_plan(**kwargs: Any) -> dict[str, Any]:
    _load_training_lib_module("paths")
    mod = _load_training_lib_module("build_layout_plan")
    return mod.build_layout_plan(**kwargs)


def _get_homepage_blocks(website_type: str) -> list[str]:
    mod = _load_training_lib_module("template_data")
    return mod.get_homepage_blocks(website_type)


def _get_page_blocks(page_name: str) -> list[str]:
    mod = _load_training_lib_module("template_data")
    return mod.get_page_blocks(page_name)


@lru_cache(maxsize=1)
def _load_train_samples() -> list[dict[str, Any]]:
    path = DATA_DIR / "train.jsonl"
    rows: list[dict[str, Any]] = []
    if not path.exists():
        return rows
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _score_sample(sample: dict[str, Any], hints: dict[str, Any]) -> int:
    output = sample.get("output") or {}
    meta = output.get("meta") or {}
    score = 0
    if meta.get("websiteType") == hints.get("websiteType"):
        score += 10
    if meta.get("pageName") == hints.get("pageName"):
        score += 10
    if meta.get("style") == hints.get("style"):
        score += 3
    prompt = (sample.get("prompt") or "").lower()
    business = (hints.get("business") or "").lower()
    if business and business in prompt:
        score += 2
    return score


def retrieve_layout_plan(prompt: str, page_name: str = "Home") -> dict[str, Any] | None:
    """Pick best matching gold layout from training set."""
    hints = hints_from_prompt(prompt, page_name)
    samples = _load_train_samples()
    if not samples:
        return None
    ranked = sorted(samples, key=lambda s: _score_sample(s, hints), reverse=True)
    best = ranked[0]
    if _score_sample(best, hints) < 10:
        return None
    output = copy.deepcopy(best.get("output") or {})
    meta = dict(output.get("meta") or {})
    for k, v in hints.items():
        meta[k] = v
    output["meta"] = meta
    return output


def template_layout_plan(prompt: str, page_name: str = "Home") -> dict[str, Any]:
    """Rule-based LayoutPlan from wizard templates (always schema-valid)."""
    hints = hints_from_prompt(prompt, page_name)
    website_type = hints["websiteType"]
    page = hints["pageName"]

    if page == "Home":
        wizard_blocks = _get_homepage_blocks(website_type)
    else:
        wizard_blocks = _get_page_blocks(page)

    plan = _build_layout_plan(
        wizard_blocks=wizard_blocks,
        website_type=website_type,
        page_name=page,
        page_title=page if page != "Home" else "",
        business=hints["business"],
        style=hints["style"],
        complexity=hints["complexity"],
        location=hints.get("location", ""),
        industry=hints.get("industry"),
    )
    return plan


def guaranteed_layout_plan(prompt: str, page_name: str = "Home") -> tuple[dict[str, Any], str]:
    """
    Return (layout_plan, source) where source is 'retrieval' or 'template'.
    Always produces a valid structure-only LayoutPlan.
    """
    retrieved = retrieve_layout_plan(prompt, page_name)
    if retrieved is not None:
        return retrieved, "retrieval"
    return template_layout_plan(prompt, page_name), "template"


def layout_from_seq2seq_target(target_text: str) -> dict[str, Any]:
    return parse_json_loose(target_text)
