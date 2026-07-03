#!/usr/bin/env python3
"""
Local (CPU/GPU) fine-tuning for the FLAN-T5 layout planner — the non-Colab path.

Trains google/flan-t5-base on training/data/seq2seq/{train,val}.jsonl and saves
model.safetensors + tokenizer to outputs/layout-planner-flan-t5-base/.

Defensive about transformers version drift (the arg names `eval_strategy` /
`evaluation_strategy` and `processing_class` / `tokenizer` changed across 4.x→5.x):
only kwargs supported by the installed signature are passed.

Usage:
  python train.py                        # defaults (3 epochs)
  python train.py --epochs 4 --batch 4 --max-target 768
  python train.py --limit 40             # train on a subset (quick sanity run)
"""
from __future__ import annotations

import argparse
import inspect
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE.parent / "data" / "seq2seq"
OUT_DIR = HERE / "outputs" / "layout-planner-flan-t5-base"
MODEL_NAME = "google/flan-t5-base"


def _supported(cls, kwargs: dict) -> dict:
    """Keep only kwargs present in the class __init__ signature."""
    params = inspect.signature(cls.__init__).parameters
    return {k: v for k, v in kwargs.items() if k in params}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Fine-tune flan-t5-base locally.")
    ap.add_argument("--train", default=str(DATA_DIR / "train.jsonl"))
    ap.add_argument("--val", default=str(DATA_DIR / "val.jsonl"))
    ap.add_argument("--out", default=str(OUT_DIR))
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--max-source", type=int, default=128)
    ap.add_argument("--max-target", type=int, default=1024)
    ap.add_argument("--limit", type=int, default=0, help="cap train rows (quick sanity run)")
    ap.add_argument("--gen-eval", action="store_true",
                    help="run beam generation during eval (accurate but SLOW on CPU; off by default)")
    args = ap.parse_args(argv)

    if not Path(args.train).is_file():
        print(f"error: {args.train} not found. Build it with build_seq2seq.py first.", file=sys.stderr)
        return 1

    import os
    import torch
    from datasets import load_dataset
    from transformers import (AutoTokenizer, AutoModelForSeq2SeqLM, DataCollatorForSeq2Seq,
                              Seq2SeqTrainingArguments, Seq2SeqTrainer)

    has_cuda = torch.cuda.is_available()
    if not has_cuda:
        torch.set_num_threads(os.cpu_count() or 4)  # use all cores for CPU training
    print(f"device: {'cuda:' + torch.cuda.get_device_name(0) if has_cuda else f'CPU ({os.cpu_count()} threads)'} | "
          f"epochs={args.epochs} batch={args.batch} max_target={args.max_target} gen_eval={args.gen_eval}")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

    files = {"train": args.train}
    if Path(args.val).is_file():
        files["validation"] = args.val
    ds = load_dataset("json", data_files=files)
    if args.limit:
        ds["train"] = ds["train"].select(range(min(args.limit, len(ds["train"]))))
    print("dataset:", {k: len(v) for k, v in ds.items()})

    def preprocess(batch):
        mi = tokenizer(batch["input_text"], max_length=args.max_source, truncation=True)
        labels = tokenizer(text_target=batch["target_text"], max_length=args.max_target, truncation=True)
        mi["labels"] = labels["input_ids"]
        return mi

    tokenized = ds.map(preprocess, batched=True, remove_columns=ds["train"].column_names)
    collator = DataCollatorForSeq2Seq(tokenizer, model=model, padding="longest")

    have_val = "validation" in tokenized
    strat = "eval_strategy" if "eval_strategy" in inspect.signature(
        Seq2SeqTrainingArguments.__init__).parameters else "evaluation_strategy"
    ta_kwargs = {
        "output_dir": args.out,
        "per_device_train_batch_size": args.batch,
        "per_device_eval_batch_size": args.batch,
        "num_train_epochs": args.epochs,
        "learning_rate": args.lr,
        "predict_with_generate": args.gen_eval,
        "generation_max_length": args.max_target,
        "save_strategy": "epoch",
        "logging_steps": 10,
        "fp16": has_cuda,
        "report_to": "none",
        "seed": 42,
        strat: "epoch" if have_val else "no",
        "load_best_model_at_end": have_val,
    }
    args_obj = Seq2SeqTrainingArguments(**_supported(Seq2SeqTrainingArguments, ta_kwargs))

    trainer_kwargs = {
        "model": model, "args": args_obj,
        "train_dataset": tokenized["train"],
        "eval_dataset": tokenized.get("validation"),
        "data_collator": collator,
        "processing_class": tokenizer,   # transformers >=5
        "tokenizer": tokenizer,          # transformers <5 (filtered out if unsupported)
    }
    trainer = Seq2SeqTrainer(**_supported(Seq2SeqTrainer, trainer_kwargs))

    trainer.train()

    Path(args.out).mkdir(parents=True, exist_ok=True)
    trainer.save_model(args.out)
    tokenizer.save_pretrained(args.out)
    sf = Path(args.out) / "model.safetensors"
    print(f"\nsaved -> {args.out}")
    if sf.is_file():
        print(f"model.safetensors: {sf.stat().st_size / 1e6:.0f} MB")
    else:
        print("WARNING: model.safetensors not found in output dir")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
