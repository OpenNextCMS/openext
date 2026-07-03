#!/usr/bin/env python3
"""Fine-tune FLAN-T5 on OpenNext LayoutPlan seq2seq dataset."""
from __future__ import annotations

import argparse
import inspect
import json
import sys
from pathlib import Path

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
)

# Allow running as script from repo root or module dir
_MODULE = Path(__file__).resolve().parent
if str(_MODULE) not in sys.path:
    sys.path.insert(0, str(_MODULE))

from lib.paths import DEFAULT_MODEL_DIR, SEQ2SEQ_DIR  # noqa: E402


def _kwargs_for_callable(fn, **kwargs):
    """Pass only kwargs supported by fn (transformers 4.x vs 5.x API differences)."""
    params = inspect.signature(fn).parameters
    return {k: v for k, v in kwargs.items() if k in params}


def _trainer_tokenizer_kw(tokenizer):
    """Seq2SeqTrainer: tokenizer= (v4) vs processing_class= (v5)."""
    params = inspect.signature(Seq2SeqTrainer.__init__).parameters
    if "processing_class" in params:
        return {"processing_class": tokenizer}
    return {"tokenizer": tokenizer}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Fine-tune OpenNext Layout Planner (FLAN-T5)")
    p.add_argument("--model-name", default="google/flan-t5-base")
    p.add_argument("--output-dir", type=Path, default=DEFAULT_MODEL_DIR)
    p.add_argument("--train-file", type=Path, default=SEQ2SEQ_DIR / "train_seq2seq.jsonl")
    p.add_argument("--eval-file", type=Path, default=SEQ2SEQ_DIR / "eval_seq2seq.jsonl")
    p.add_argument("--epochs", type=int, default=10)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument(
        "--eval-batch-size",
        type=int,
        default=1,
        help="Eval batch size (lower than train saves VRAM on long targets)",
    )
    p.add_argument("--grad-accum", type=int, default=2)
    p.add_argument(
        "--gradient-checkpointing",
        action=argparse.BooleanOptionalAction,
        default=None,
        help="Trade compute for VRAM (default: on when CUDA is available)",
    )
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--warmup-ratio", type=float, default=0.06)
    p.add_argument("--weight-decay", type=float, default=0.01)
    p.add_argument("--max-input-length", type=int, default=128)
    p.add_argument(
        "--max-target-length",
        type=int,
        default=896,
        help="Must cover full LayoutPlan JSON (~95%% of rows need <=896 tokens)",
    )
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--max-steps", type=int, default=-1, help="Quick smoke test (overrides epochs)")
    p.add_argument(
        "--fresh",
        action="store_true",
        help="Do not auto-resume from checkpoints in --output-dir",
    )
    p.add_argument(
        "--resume-from",
        type=Path,
        default=None,
        help="Resume from checkpoint dir (e.g. outputs/.../checkpoint-418)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading dataset from {args.train_file.parent}")
    ds = load_dataset(
        "json",
        data_files={
            "train": str(args.train_file),
            "eval": str(args.eval_file),
        },
    )

    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model_name)
    if getattr(model.config, "tie_word_embeddings", None) is not False:
        model.config.tie_word_embeddings = False

    use_cuda = torch.cuda.is_available()
    use_gradient_checkpointing = (
        args.gradient_checkpointing if args.gradient_checkpointing is not None else use_cuda
    )
    if use_gradient_checkpointing:
        model.gradient_checkpointing_enable()
        model.config.use_cache = False

    def preprocess(batch: dict) -> dict:
        # Pad per-batch in DataCollatorForSeq2Seq — not to max_length here (saves VRAM).
        model_inputs = tokenizer(
            batch["input_text"],
            max_length=args.max_input_length,
            truncation=True,
        )
        labels = tokenizer(
            text_target=batch["target_text"],
            max_length=args.max_target_length,
            truncation=True,
        )
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    tokenized = ds.map(preprocess, batched=True, remove_columns=ds["train"].column_names)

    use_fp16 = use_cuda
    steps_per_epoch = max(
        1, len(tokenized["train"]) // (args.batch_size * args.grad_accum)
    )
    total_steps = args.max_steps if args.max_steps > 0 else steps_per_epoch * args.epochs
    warmup_steps = max(1, int(total_steps * args.warmup_ratio))

    args_common = dict(
        output_dir=str(args.output_dir),
        num_train_epochs=args.epochs,
        max_steps=args.max_steps,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.eval_batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        weight_decay=args.weight_decay,
        fp16=use_fp16,
        seed=args.seed,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        predict_with_generate=False,
        logging_steps=25,
        report_to="none",
        save_total_limit=2,
    )
    ta_params = inspect.signature(Seq2SeqTrainingArguments.__init__).parameters
    if "warmup_steps" in ta_params:
        args_common["warmup_steps"] = warmup_steps
    elif "warmup_ratio" in ta_params:
        args_common["warmup_ratio"] = args.warmup_ratio
    if not use_fp16:
        # CPU / Windows: avoid pin_memory crash and worker spawn issues
        if "dataloader_pin_memory" in ta_params:
            args_common["dataloader_pin_memory"] = False
        if "dataloader_num_workers" in ta_params:
            args_common["dataloader_num_workers"] = 0

    training_args = Seq2SeqTrainingArguments(**args_common)

    data_collator = DataCollatorForSeq2Seq(
        **_kwargs_for_callable(
            DataCollatorForSeq2Seq,
            tokenizer=tokenizer,
            processing_class=tokenizer,
            model=model,
            padding=True,
            label_pad_token_id=-100,
        )
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["eval"],
        data_collator=data_collator,
        **_trainer_tokenizer_kw(tokenizer),
    )

    device_label = "cuda" if use_fp16 else "cpu"
    print(
        f"Training {args.model_name} -> {args.output_dir} "
        f"(fp16={use_fp16}, device={device_label}, "
        f"grad_ckpt={use_gradient_checkpointing}, "
        f"train_bs={args.batch_size}, eval_bs={args.eval_batch_size})"
    )

    resume_from = args.resume_from
    if resume_from is None and not args.fresh:
        # Auto-pick latest checkpoint-N folder in output dir
        ckpts = sorted(args.output_dir.glob("checkpoint-*"), key=lambda p: int(p.name.split("-")[-1]))
        if ckpts:
            resume_from = ckpts[-1]
    elif args.fresh:
        print("Fresh run — ignoring existing checkpoints in output dir")

    if resume_from and Path(resume_from).exists():
        print(f"Resuming from {resume_from}")
        trainer.train(resume_from_checkpoint=str(resume_from))
    else:
        trainer.train()

    best_dir = trainer.state.best_model_checkpoint or str(args.output_dir)
    print(f"Saving model from {best_dir}")
    trainer.save_model(str(args.output_dir))
    model.save_pretrained(str(args.output_dir), safe_serialization=True)
    tokenizer.save_pretrained(str(args.output_dir))

    config_snapshot = {
        "model_name": args.model_name,
        "train_file": str(args.train_file),
        "eval_file": str(args.eval_file),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "eval_batch_size": args.eval_batch_size,
        "grad_accum": args.grad_accum,
        "gradient_checkpointing": use_gradient_checkpointing,
        "lr": args.lr,
        "max_input_length": args.max_input_length,
        "max_target_length": args.max_target_length,
        "seed": args.seed,
    }
    (args.output_dir / "train_config.json").write_text(
        json.dumps(config_snapshot, indent=2), encoding="utf-8"
    )
    print(f"Done. Model saved to {args.output_dir}")


if __name__ == "__main__":
    main()
