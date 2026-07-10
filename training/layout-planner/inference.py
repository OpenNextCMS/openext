#!/usr/bin/env python3
"""
Local inference for the fine-tuned Qwen2.5-1.5B layout planner.

Runs entirely in Python with transformers + peft (no Ollama, no HTTP). Loads the
base `Qwen/Qwen2.5-1.5B-Instruct` and attaches the LoRA adapter produced by the
Colab notebook (notebooks/train_qwen_lora_colab.ipynb), then turns a brief into a
LayoutPlan dict. If `--model-dir` points at a *merged* full model (no adapter
config) it is loaded directly instead. transformers/torch/peft are imported lazily
so the module can be imported (and its parsing reused) on machines without them.

CLI:
  python inference.py "Create a premium dental clinic website in Ahmedabad."
  python inference.py --raw "..."               # print the raw decoded string
  python inference.py --model-dir path "..."    # adapter dir OR merged model dir
  python inference.py --load-4bit "..."         # 4-bit load (needs CUDA + bitsandbytes)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "scripts"))
from plan_json import parse_plan_json  # noqa: E402

# Base checkpoint pulled from the HF Hub (cached after first download).
BASE_MODEL = os.environ.get("LAYOUT_PLANNER_BASE", "Qwen/Qwen2.5-1.5B-Instruct")
# The LoRA adapter folder downloaded from Colab (contains adapter_config.json).
DEFAULT_MODEL_DIR = Path(
    os.environ.get("LAYOUT_PLANNER_ADAPTER", str(HERE / "outputs" / "qwen-layout-planner"))
)
INPUT_PREFIX = "plan layout: "

# System prompt — MUST stay byte-identical to the notebook's Config cell (train time).
SYSTEM = (
    "You are a website STRUCTURE planner for OpenNext CMS. "
    "Given a brief, return ONE minified JSON LayoutPlan and nothing else. "
    "Shape: {meta:{business,style,websiteType,pageName,location,complexity},"
    "page:{theme:{primaryColor,secondaryColor,backgroundColor,textColor,fontFamily,borderRadius},"
    "blocks:[{id,type,order,styles,content}]}}. "
    "Rules: blocks[0] is a navigation bar and the last block is a footer (exactly one each); "
    "exactly one hero, placed before any feature/testimonial/pricing/content/stats section; "
    "every block.content is {} (NO copy); ids are unique kebab-case; order is 0..n-1; "
    "colours are hex and section backgrounds vary; "
    "complexity simple=4-6 blocks, standard=7-10, rich=11-15."
)


class LayoutPlanner:
    """Lazy-loaded Qwen wrapper. Construction loads the base model + LoRA adapter."""

    def __init__(self, model_dir: str | Path = DEFAULT_MODEL_DIR, load_4bit: bool = False):
        self.model_dir = Path(model_dir)
        if not self.model_dir.exists():
            raise FileNotFoundError(
                f"model dir not found: {self.model_dir}\n"
                "Train it with notebooks/train_qwen_lora_colab.ipynb, then download the "
                "adapter folder (qwen-layout-planner) here — or pass --model-dir."
            )
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM  # type: ignore
            import torch  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(
                "transformers/torch not installed. pip install -r requirements.txt"
            ) from exc
        self._torch = torch

        is_adapter = (self.model_dir / "adapter_config.json").is_file()
        # Tokenizer lives with the adapter if saved there, else falls back to the base.
        tok_src = self.model_dir if (self.model_dir / "tokenizer_config.json").is_file() else BASE_MODEL
        self.tokenizer = AutoTokenizer.from_pretrained(str(tok_src))
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        load_kw: dict = {"torch_dtype": torch.float16 if torch.cuda.is_available() else torch.float32}
        if torch.cuda.is_available():
            load_kw["device_map"] = "auto"
        if load_4bit:
            if not torch.cuda.is_available():
                raise RuntimeError("--load-4bit requires a CUDA GPU (bitsandbytes).")
            from transformers import BitsAndBytesConfig  # type: ignore
            load_kw["quantization_config"] = BitsAndBytesConfig(
                load_in_4bit=True, bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True,
            )
            load_kw.pop("torch_dtype", None)

        if is_adapter:
            # adapter dir -> load base from the Hub, then attach the LoRA weights.
            try:
                from peft import PeftModel  # type: ignore
            except Exception as exc:  # pragma: no cover
                raise RuntimeError("peft not installed. pip install -r requirements.txt") from exc
            base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, **load_kw)
            self.model = PeftModel.from_pretrained(base, str(self.model_dir))
        else:
            # merged / full model dir -> load directly.
            self.model = AutoModelForCausalLM.from_pretrained(str(self.model_dir), **load_kw)

        if not torch.cuda.is_available():
            self.model.to("cpu")
        self.model.eval()

    def generate_text(self, brief: str, max_new_tokens: int = 1024, num_beams: int = 1,
                      do_sample: bool = False, temperature: float = 1.0) -> str:
        """Return ONLY the newly generated completion (the LayoutPlan JSON).

        Greedy by default (deterministic). Pass do_sample=True (with a temperature)
        for a genuinely different draw — used by the pipeline's retry so it does not
        just reproduce the same invalid plan.
        """
        msgs = [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"{INPUT_PREFIX}{brief.strip()}"},
        ]
        # return_dict=True so we get a BatchEncoding (input_ids + attention_mask),
        # not a bare tensor — some transformers versions return a dict here, and
        # passing that positionally to generate() breaks on `inputs_tensor.shape`.
        enc = self.tokenizer.apply_chat_template(
            msgs, add_generation_prompt=True, return_tensors="pt", return_dict=True
        ).to(self.model.device)
        gen_kw: dict = {
            "max_new_tokens": max_new_tokens,
            "num_beams": num_beams,
            "do_sample": do_sample,
            "pad_token_id": self.tokenizer.pad_token_id,
        }
        if do_sample:
            gen_kw["temperature"] = temperature
        with self._torch.no_grad():
            out = self.model.generate(**enc, **gen_kw)
        # Strip the prompt tokens; decode only the completion.
        return self.tokenizer.decode(out[0][enc["input_ids"].shape[1]:], skip_special_tokens=True)

    def plan_layout(self, brief: str, **kw) -> dict | None:
        """Generate and parse. Returns a LayoutPlan dict, or None if unparseable."""
        return parse_plan_json(self.generate_text(brief, **kw))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate a LayoutPlan from a brief.")
    ap.add_argument("brief", nargs="+", help="the website brief")
    ap.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR),
                    help="LoRA adapter dir (default) or a merged full-model dir")
    ap.add_argument("--load-4bit", action="store_true", help="4-bit load (needs CUDA + bitsandbytes)")
    ap.add_argument("--raw", action="store_true", help="print raw decoded text, not parsed JSON")
    ap.add_argument("--max-new-tokens", type=int, default=1024)
    ap.add_argument("--num-beams", type=int, default=1)
    args = ap.parse_args(argv)

    brief = " ".join(args.brief)
    try:
        planner = LayoutPlanner(args.model_dir, load_4bit=args.load_4bit)
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
