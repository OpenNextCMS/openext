# FLAN-T5 Layout Planner (Stage 1)

Fine-tuned **google/flan-t5-base** that turns a natural-language website brief into a
**structure-only** `LayoutPlan` JSON — section types, order, theme colours and per-section
styles, but **no marketing copy** (every `block.content` is `{}`). Copy is filled by the
existing OpenRouter/Gemini **Stage-2** filler, so this model never has to learn to write.

```
Brief ──► FLAN-T5 Layout Planner ──► LayoutPlan (structure only)
                                          │
                                          ▼
                              OpenRouter/Gemini filler ──► Full page JSON ──► CMS editor
```

Why two stages: structure is small, rule-heavy and cheap to learn from ~500 samples on a
250M model; copy is open-ended and better handled by a large hosted model. Splitting them
keeps generations fast, deterministic and on-brand with the CMS block system.

> Live build status and phase checklist live in [`PROGRESS.md`](PROGRESS.md).

## Layout & files

```
training/
  layout-planner/
    schema/
      layout-plan.schema.json      # JSON Schema draft-07 for a LayoutPlan
      allowed-block-types.json      # single source of truth for block types + ordering categories
    scripts/
      brief_bank.py                 # deterministic, balanced brief generator -> data/briefs.jsonl
      generate_training_data.py     # briefs -> OpenRouter -> structure-only plans (raw pairs)
      strip_content.py              # force every content field to {}
      validate_layout_plan.py       # schema + CMS rules; file / dir / --stdin / --jsonl modes
      build_seq2seq.py              # validated pairs -> train/val/test.jsonl (85/10/5)
    notebooks/
      train_flan_t5_colab.ipynb     # HuggingFace Seq2SeqTrainer (Colab GPU)
    fixtures/                       # 5 hand-written valid LayoutPlans (tracked test assets)
    outputs/                        # trained weights (gitignored)
    requirements.txt
  data/
    briefs.jsonl                    # generated brief bank (tracked)
    raw/                            # generated raw pairs (gitignored)
    validated/                      # validated pairs (gitignored)
    seq2seq/                        # train/val/test.jsonl (tracked)
```

## The LayoutPlan block vocabulary

The `type` of every block is drawn from the canonical `BlockData['type']` union in
[`src/types/index.ts`](../../src/types/index.ts) — the real types the CMS editor renders —
**plus** three planner-only section types the layout rules require but the CMS represents
differently: `pricing`, `cta`, `footer`. The authoritative list (and how each maps onto the
Stage-2 `v2.ts` filler) is [`schema/allowed-block-types.json`](schema/allowed-block-types.json).
Regenerate that file if the `BlockData` union changes.

Rules the model must learn (enforced by `validate_layout_plan.py`):
- `blocks[0]` is navigation (`nav-bar`); the last block is `footer`; exactly one of each.
- Exactly one hero, placed before any feature / testimonial / pricing / content / stats section.
- `complexity` sets the block count: `simple` 4–6, `standard` 7–10, `rich` 11–15.
- Every `block.content` is `{}`; ids are kebab-case and unique; theme colours are hex.
- Section backgrounds vary (no single background repeated on every block).

## End-to-end flow

```bash
# 0. deps (local; Colab installs its own GPU stack)
pip install -r training/layout-planner/requirements.txt

# 1. briefs (deterministic)
python training/layout-planner/scripts/brief_bank.py --stats            # -> data/briefs.jsonl

# 2. generate structure-only targets  (needs OPENROUTER_API_KEY in .env)
python training/layout-planner/scripts/generate_training_data.py         # -> data/raw/raw_pairs.jsonl
python training/layout-planner/scripts/strip_content.py    --jsonl data/raw/raw_pairs.jsonl --out data/raw/stripped_pairs.jsonl
python training/layout-planner/scripts/validate_layout_plan.py --jsonl data/raw/stripped_pairs.jsonl --out data/validated/pairs.jsonl
python training/layout-planner/scripts/build_seq2seq.py    --in data/validated/pairs.jsonl   # -> data/seq2seq/{train,val,test}.jsonl

# 3. fine-tune in Colab (see below) -> outputs/layout-planner-flan-t5-base/

# 4. inference — one brief -> LayoutPlan
python training/layout-planner/inference.py "Create a premium dental clinic website in Ahmedabad."

# 5. evaluate structural quality on the held-out test split
python training/layout-planner/scripts/evaluate_model.py --test training/data/seq2seq/test.jsonl

# 6. full two-stage pipeline: brief -> LayoutPlan -> filled page JSON
python training/layout-planner/pipeline.py "Create a premium dental clinic website in Ahmedabad."
```

## Inference, evaluation & the two-stage pipeline

**`inference.py`** loads `outputs/layout-planner-flan-t5-base/` and turns a brief into a
LayoutPlan. `--raw` prints the undecoded model text; the default parses it (with a
fence-strip → `json_repair` → brace-slice recovery ladder).

**`scripts/evaluate_model.py`** reports three structural metrics — `valid_json_rate`,
`schema_pass_rate` (target **≥ 0.80**), and `nav_footer_order_rate`:
- `--test test.jsonl` runs the trained model over the held-out split.
- `--predictions preds.jsonl` scores pre-generated outputs offline.
- `--self-test` exercises the metric logic with **no model** (used in CI/dev): expects counts `8/7/7`.

**`pipeline.py`** is the end-to-end orchestrator:
1. FLAN-T5 → LayoutPlan (`inference.LayoutPlanner`).
2. Invalid plan → one retry (`num_beams=1`); still invalid → **retrieval fallback**: the closest
   `fixtures/*.json` by count-weighted keyword hints (e.g. "coffee shop bakery" → restaurant).
3. `to_v2_skeleton()` translates block types to the v2 filler vocabulary via
   `schema/allowed-block-types.json` `stage2Aliases` and empties `data`; the `FILLER_SYSTEM`
   prompt injects that fixed structure and asks OpenRouter/Gemini to fill **copy only**.
4. Returns a v2 document `{meta, theme, blocks:[{id,type,styles,data}]}` — the exact shape the
   CMS's `normalizeV2Document()` already consumes.

```bash
python pipeline.py "..."               # live: needs weights + OPENROUTER_API_KEY
python pipeline.py --plan-only "..."   # stop after Stage 1, print the LayoutPlan
python pipeline.py --offline "..."     # no model/API: retrieval plan + unfilled skeleton (dev/CI)
```

## CMS integration hook point

The single-stage generator lives in `buildAnalysisContent()` in
[`src/app/api/ai/generate-page-json/route.ts`](../../src/app/api/ai/generate-page-json/route.ts)
(~line 2408) — it asks OpenRouter for structure **and** copy at once via `AI_STRUCTURE_PROMPT_V2`.
A doc comment there marks where the two-stage path slots in: for the text (non-image) path, run
the planner for structure, translate types via `stage2Aliases`, and send a fill-only prompt. The
output still flows through `normalizeV2Document()` unchanged, so no downstream translator changes
are needed. This wiring is intentionally **not** applied yet (documented hook only).

## Fine-tuning in Google Colab

The notebook is [`notebooks/train_flan_t5_colab.ipynb`](notebooks/train_flan_t5_colab.ipynb).

1. Open it in Colab (upload it, or File ▸ Open notebook ▸ GitHub/Upload).
2. **Runtime ▸ Change runtime type ▸ T4 GPU**, then Save.
3. **Cell 1** installs `transformers`, `datasets`, `accelerate`, `sentencepiece`, `safetensors`.
4. **Cell 2 (data)** — run **one** of:
   - *Option A (upload):* runs `files.upload()`; select `train.jsonl` and `val.jsonl` from your
     local `training/data/seq2seq/`.
   - *Option B (Drive):* uncomment the `drive.mount(...)` cell and point `DATA_DIR` at the folder
     where you stored the two JSONL files.
5. Run the remaining cells top-to-bottom. Training uses `max_source_length=128`,
   `max_target_length=1024`, `batch_size=4` (**auto-falls back to 1 + gradient-accumulation on a
   CUDA out-of-memory error**), `num_train_epochs=4`, fp16, and `predict_with_generate`.
6. The save cell writes `model.safetensors` (~990 MB) + tokenizer to
   `layout-planner-flan-t5-base/`. The last cell zips it for download (or copies to Drive).
7. Extract the folder locally to `training/layout-planner/outputs/layout-planner-flan-t5-base/`
   (gitignored) for `inference.py`.

**VRAM / hardware:** `flan-t5-base` at these settings uses well under **8 GB**, so the free
Colab **T4 (16 GB)** is comfortable. CPU-only works but is slow; a GPU is strongly recommended
for training. Local *inference* runs fine on CPU.

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `OPENROUTER_API_KEY` | `generate_training_data.py`, Stage-2 filler | data generation + copy filling |
| `OPENROUTER_MODEL` | same | model id (default `google/gemini-2.0-flash-001`) |

Read from the repo [`.env`](../../.env) (never committed). The scripts also accept
`python-dotenv` if installed but fall back to a minimal `.env` parser.
