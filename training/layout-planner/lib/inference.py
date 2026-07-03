"""FLAN-T5 layout planning inference (structure + styles only, empty content)."""
from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from .json_utils import parse_json_loose
from .layout_fallback import guaranteed_layout_plan
from .layout_normalize import normalize_layout_plan
from .paths import DEFAULT_MODEL_DIR
from .layout_validate import validate_layout_plan_output, _load_allowed


def input_prefix(page_name: str) -> str:
    return "plan layout: " if page_name == "Home" else "plan page layout: "


class LayoutPlannerModel:
    """Loads a fine-tuned seq2seq checkpoint and generates LayoutPlan JSON."""

    def __init__(self, model_dir: Path | str = DEFAULT_MODEL_DIR, device: str | None = None):
        self.model_dir = Path(model_dir)
        if not self.model_dir.exists():
            raise FileNotFoundError(
                f"Model not found at {self.model_dir}. Run train.py first."
            )
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_dir)
        self.model.to(self.device)
        self.model.eval()

    def generate_raw(
        self,
        input_text: str,
        *,
        max_new_tokens: int = 768,
        num_beams: int = 6,
    ) -> str:
        inputs = self.tokenizer(
            input_text,
            return_tensors="pt",
            max_length=128,
            truncation=True,
        ).to(self.device)
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                num_beams=num_beams,
                length_penalty=0.8,
                early_stopping=True,
                no_repeat_ngram_size=3,
            )
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

    def _try_parse_and_validate(
        self,
        raw: str,
        *,
        prompt: str,
        page_name: str,
        allowed: dict[str, Any],
    ) -> tuple[dict[str, Any] | None, list[str]]:
        try:
            parsed = parse_json_loose(raw)
        except Exception as exc:  # noqa: BLE001
            return None, [f"JSON parse failed: {exc}"]

        if not isinstance(parsed, dict):
            return None, ["output is not a JSON object"]

        normalized = normalize_layout_plan(parsed, prompt=prompt, page_name=page_name)
        errors = validate_layout_plan_output(normalized, allowed=allowed)
        if errors:
            return normalized, errors
        return normalized, []

    def plan_layout(
        self,
        user_prompt: str,
        page_name: str = "Home",
        *,
        max_new_tokens: int = 768,
        num_beams: int = 6,
        max_attempts: int = 1,
        use_fallback: bool = True,
    ) -> dict[str, Any]:
        """
        Generate a schema-valid LayoutPlan for the prompt.

        Pipeline: model (retry) -> normalize -> validate -> retrieval/template fallback.
        With use_fallback=True (default), always returns valid JSON.
        """
        prefix = input_prefix(page_name)
        input_text = prefix + user_prompt.strip()
        allowed = _load_allowed()

        beams = num_beams
        last_errors: list[str] = []
        last_plan: dict[str, Any] | None = None
        raw_output: str | None = None

        for attempt in range(max_attempts):
            raw_output = self.generate_raw(
                input_text,
                max_new_tokens=max_new_tokens,
                num_beams=beams,
            )
            plan, errors = self._try_parse_and_validate(
                raw_output,
                prompt=user_prompt,
                page_name=page_name,
                allowed=allowed,
            )
            last_plan = plan
            last_errors = errors
            if not errors and plan is not None:
                return {
                    "layoutPlan": plan,
                    "valid": True,
                    "errors": [],
                    "input_text": input_text,
                    "source": "model",
                    "attempt": attempt + 1,
                }
            beams = min(beams + 2, 12)

        if use_fallback:
            fallback_plan, source = guaranteed_layout_plan(user_prompt, page_name)
            fb_errors = validate_layout_plan_output(fallback_plan, allowed=allowed)
            if not fb_errors:
                return {
                    "layoutPlan": fallback_plan,
                    "valid": True,
                    "errors": [],
                    "input_text": input_text,
                    "source": source,
                    "modelErrors": last_errors,
                    "attempt": max_attempts,
                }

        return {
            "layoutPlan": last_plan,
            "valid": False,
            "errors": last_errors,
            "input_text": input_text,
            "source": "model",
            "raw": (raw_output or "")[:500],
        }


def plan_layout_fast(user_prompt: str, page_name: str = "Home") -> dict[str, Any]:
    """Skip model — use training retrieval or wizard template (instant, always valid)."""
    allowed = _load_allowed()
    plan, source = guaranteed_layout_plan(user_prompt, page_name)
    errors = validate_layout_plan_output(plan, allowed=allowed)
    return {
        "layoutPlan": plan,
        "valid": len(errors) == 0,
        "errors": errors,
        "source": source,
        "input_text": input_prefix(page_name) + user_prompt.strip(),
    }


def plan_layout(
    user_prompt: str,
    page_name: str = "Home",
    model_dir: Path | str = DEFAULT_MODEL_DIR,
    **kwargs: Any,
) -> dict[str, Any]:
    """One-shot layout planning (loads model each call — use LayoutPlannerModel for batches)."""
    planner = LayoutPlannerModel(model_dir=model_dir)
    return planner.plan_layout(user_prompt, page_name=page_name, **kwargs)


def skeleton_for_content_fill(layout_plan: dict[str, Any]) -> dict[str, Any]:
    """Deep-copy layout plan ensuring every block has content/images keys for the filler."""
    doc = copy.deepcopy(layout_plan)
    for block in doc.get("page", {}).get("blocks", []):
        block.setdefault("content", {})
        block.setdefault("images", {})
    return doc
