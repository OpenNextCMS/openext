#!/usr/bin/env python3
"""
Local inference for the fine-tuned FLAN-T5 layout planner.

Loads outputs/layout-planner-flan-t5-base/ (produced by the Colab notebook) and
turns a brief into a LayoutPlan dict. transformers/torch are imported lazily so
the module can be imported (and its parsing reused) even on machines without them.

CLI:
  python inference.py "Create a premium dental clinic website in Ahmedabad."
  python inference.py --raw "..."          # print the raw decoded string
  python inference.py --model-dir path "..."
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "scripts"))
from plan_json import parse_plan_json  # noqa: E402

DEFAULT_MODEL_DIR = HERE / "outputs" / "layout-planner-flan-t5-base"
INPUT_PREFIX = "plan layout: "


class LayoutPlanner:
    """Lazy-loaded FLAN-T5 wrapper. Construction loads the weights."""

    def __init__(self, model_dir: str | Path = DEFAULT_MODEL_DIR):
        self.model_dir = Path(model_dir)
        if not self.model_dir.exists():
            raise FileNotFoundError(
                f"model dir not found: {self.model_dir}\n"
                "Train it with notebooks/train_flan_t5_colab.ipynb and extract the folder here."
            )
        try:
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM  # type: ignore
            import torch  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(
                "transformers/torch not installed. pip install -r requirements.txt"
            ) from exc
        self._torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_dir))
        self.model = AutoModelForSeq2SeqLM.from_pretrained(str(self.model_dir))
        self.model.eval()

    def generate_text(self, brief: str, max_new_tokens: int = 1024, num_beams: int = 4) -> str:
        prompt = f"{INPUT_PREFIX}{brief.strip()}"
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=128)
        with self._torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=max_new_tokens, num_beams=num_beams)
        return self.tokenizer.decode(out[0], skip_special_tokens=True)

    def plan_layout(self, brief: str, **kw) -> dict | None:
        """Generate and parse. Returns a LayoutPlan dict, or None if unparseable."""
        return parse_plan_json(self.generate_text(brief, **kw))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate a LayoutPlan from a brief.")
    ap.add_argument("brief", nargs="+", help="the website brief")
    ap.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    ap.add_argument("--raw", action="store_true", help="print raw decoded text, not parsed JSON")
    ap.add_argument("--max-new-tokens", type=int, default=1024)
    ap.add_argument("--num-beams", type=int, default=4)
    args = ap.parse_args(argv)

    brief = " ".join(args.brief)
    try:
        planner = LayoutPlanner(args.model_dir)
    except FileNotFoundError as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    text = planner.generate_text(brief, max_new_tokens=args.max_new_tokens, num_beams=args.num_beams)
    if args.raw:
        print(text)
        return 0
    plan = parse_plan_json(text)
    if plan is None:
        print("error: model output did not parse as JSON. Raw output:", file=sys.stderr)
        print(text, file=sys.stderr)
        return 1
    print(json.dumps(plan, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
