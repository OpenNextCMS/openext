# Qwen2.5-1.5B Layout Planner — PROGRESS

> Two-stage AI page pipeline for OpenNext CMS.
> **Stage 1 (this project):** QLoRA fine-tuned `Qwen/Qwen2.5-1.5B-Instruct` maps a
> natural-language brief → **structure-only** `LayoutPlan` JSON (no marketing copy).
> **Stage 2 (existing):** OpenRouter/Gemini filler (`src/app/api/ai/generate-page-json/v2.ts`)
> fills the copy. We do **not** train copy generation.

```
Brief ──► Qwen2.5-1.5B Layout Planner ──► LayoutPlan (structure only)
          (LoRA adapter, run in Python:        │
           transformers + peft)                ▼
                              OpenRouter/Gemini filler ──► Full page JSON ──► CMS editor
```

Legend: `PENDING` · `IN_PROGRESS` · `COMPLETE` · `BLOCKED`

---

## Model pivot: FLAN-T5 → Qwen2.5-1.5B (2026-07-04)

The original planner fine-tuned `google/flan-t5-base`. It proved **too weak at emitting
valid, well-structured JSON** for rich (11–15 block) plans. We switched to
**`Qwen/Qwen2.5-1.5B-Instruct`** because it is:

- markedly stronger at structured / JSON output,
- **Apache-2.0** licensed (free for production),
- small enough to **QLoRA on a free Colab T4** and to run **in-process with Python** (transformers + peft) on CPU or a modest GPU.

**Serving = plain Python (no Ollama, no GGUF).** Training produces a small LoRA **adapter**;
`inference.py` loads base `Qwen/Qwen2.5-1.5B-Instruct` from the HF Hub and attaches that
adapter with `transformers` + `peft`, then `generate()`s the plan. The adapter is either
downloaded from Colab into `outputs/qwen-layout-planner/` or pulled from the HF Hub via the
`LAYOUT_PLANNER_ADAPTER` env var. Because the model runs in Python and the CMS is Node, the
bridge to Next.js is a tiny local Python service (see Phase 5). The old FLAN-T5 notebook
(`notebooks/train_flan_t5_colab.ipynb`) is retained for reference but **superseded**.

---

## Key decisions (read before editing)

1. **Block-type vocabulary.** The LayoutPlan `type` enum is the canonical
   `BlockData['type']` union from [`src/types/index.ts`](../../src/types/index.ts)
   (58 types — the real types the CMS editor renders) **plus** three planner-only
   section types required by the LayoutPlan rules but absent from the union:
   `pricing`, `cta`, `footer`. These three are mapped down to Stage-2 filler
   sections during pipeline integration (Phase 5). The authoritative list lives in
   [`schema/allowed-block-types.json`](schema/allowed-block-types.json); regenerate it
   from `types/index.ts` if that union changes. Stage-2 `convertBlock` already
   normalizes hyphenated/semantic aliases (`hero-centered`, `nav-bar`, `stats`,
   `pricing`, `cta`, `footer`, `gallery`…), so this vocabulary flows into the
   existing filler with minimal glue.
2. **Fixtures location.** The MISSION suggested `training/data/validated/fixtures/`,
   but `training/data/validated/` is gitignored (it holds *generated* data). Hand-written
   fixtures are tracked test assets, so they live in
   [`training/layout-planner/fixtures/`](fixtures/) instead. `validate_layout_plan.py --all`
   scans that dir by default.
3. **Enums reused verbatim** from the wizard ([`src/templates/types.ts`](../../src/templates/types.ts)):
   `meta.style` = `WizardThemeId`, `meta.websiteType` = `WebsiteType`.
4. **The `SYSTEM` prompt is identical at TRAIN and INFERENCE time.** It lives in the notebook
   Config cell (Cell 4) and is copied verbatim into the `SYSTEM` constant in `inference.py`.
   If you change it, change it in both places.

---

## Phase 1 — Schema & validation — COMPLETE
- [x] `schema/layout-plan.schema.json` (JSON Schema draft-07)
- [x] `schema/allowed-block-types.json` (canonical types + section categories, single source for validator)
- [x] `scripts/validate_layout_plan.py` (nav-first, footer-last, empty content, allowed types, hero-order, complexity counts, style variation)
- [x] 5 hand-written fixtures in `fixtures/`
- [x] `python scripts/validate_layout_plan.py --all` passes on all fixtures — **5/5 valid**
- [x] `requirements.txt` (validation runs on stdlib; jsonschema optional cross-check)

**Validation command:** `python training/layout-planner/scripts/validate_layout_plan.py --all` → `5/5 valid`.
Negative test (broken plan via `--stdin`) correctly reports 9 distinct rule violations, so the
validator is not a no-op.

## Phase 2 — Training data — COMPLETE (expanded dataset built via scrape + merge)
Dataset now comes from **scraping real homepages/inner pages** into (brief, plan) pairs and
merging them into the seq2seq splits — no OpenRouter key required for data generation.

- [x] `scripts/brief_bank.py` — deterministic, balanced brief generator, **expanded 600 → 1,200 briefs** (100 per website type) to reduce overfitting
- [x] `scripts/strip_content.py` — recursively force every `content` → `{}` (jsonl / dir / stdin modes)
- [x] `scripts/build_seq2seq.py` — re-validates + 85/10/5 split → `train.jsonl` / `val.jsonl` / `test.jsonl`
- [x] `scripts/scrape_layouts.py` — full scrape run: **291 valid pages** written → `data/raw/raw_pairs.jsonl` (3,078 failed/skipped, mostly connection errors)
- [x] `scripts/merge_dataset.py` — merges existing splits + scraped pairs, re-validates, dedups, backs up old splits, rebuilds train/val/test
- [x] **Merge run (2026-07-04):** kept 376 existing + added **141 new** scraped, dropped 198 dup / 0 invalid → **517 examples total**
- [x] `validate_layout_plan.py --jsonl` batch mode available; scraped plans validated at merge time (0 invalid)

**Current dataset — `training/data/seq2seq/`:**

| split | before merge | after merge |
|-------|-------------:|------------:|
| train | 360 | **439** |
| val   | 42  | **51**  |
| test  | 22  | **27**  |
| total | 424 | **517** |

Old splits backed up to `data/seq2seq/backup_0/`.

**Rebuild command (re-run after more scraping):**
```
python training/layout-planner/scripts/scrape_layouts.py    # -> data/raw/raw_pairs.jsonl
python training/layout-planner/scripts/merge_dataset.py      # merge + dedup + re-split (backs up old)
```

> Note: the earlier OpenRouter-generation path (`generate_training_data.py`, blocked on
> `OPENROUTER_API_KEY`) is superseded by the scrape+merge pipeline for Stage-1 data.
> That key is still only needed for the **Stage-2 copy filler**, not for training.

## Phase 3 — Colab fine-tuning notebook — COMPLETE
- [x] `notebooks/train_qwen_lora_colab.ipynb` — 21 cells (11 md / 10 code), **QLoRA on Qwen2.5-1.5B-Instruct**:
  - 4-bit NF4 load (`bitsandbytes`, double-quant, fp16 compute) + LoRA `r=16, alpha=32, dropout=0.05` on all attn+MLP projections
  - chat-template tokenization with **prompt tokens masked (`-100`)** so loss is on the JSON only; `MAX_LEN=2048`
  - `EPOCHS=3`, `LR=2e-4`, train batch 2 × grad-accum 8 (**eff. batch 16**), cosine schedule, `weight_decay=0.01`, warmup 0.03, gradient checkpointing
  - **anti-overfitting built in:** per-epoch eval on held-out val, `load_best_model_at_end` on `eval_loss`, **early stopping (patience 2)**, LoRA dropout, weight decay, only 3 epochs, plus a **train-vs-val loss-curve cell**
  - save LoRA adapter → smoke-test (3 briefs, JSON-parse + nav-first/footer-last check)
  - **pure-Python usage cell:** reload base + adapter with transformers/peft and generate (mirrors `inference.py`)
  - **adapter export:** zip + download the adapter folder, **or** `push_to_hub` to pull it later via `from_pretrained`
- [x] Consumes `train.jsonl` / `val.jsonl` from `training/data/seq2seq/` (upload or Drive-mount)
- [x] Notebook parses as nbformat 4; all code cells compile (Cell 2 is a `!pip` shell magic, not Python)
- [x] No Ollama / GGUF — serving is plain Python (see Phase 4/5)

**Old FLAN-T5 notebook** (`notebooks/train_flan_t5_colab.ipynb`) retained but superseded.

## Phase 4 — Local inference / eval — CODE COMPLETE (real metrics BLOCKED on adapter)
- [x] `scripts/plan_json.py` — shared robust parser (fence-strip → json_repair → brace-slice)
- [x] `inference.py` — **repointed to Qwen**: lazy-loaded `LayoutPlanner` loads base `Qwen/Qwen2.5-1.5B-Instruct` + LoRA adapter via transformers/peft, chat-template + shared `SYSTEM`, greedy `generate()` → parse. Same public interface (`generate_text` / `plan_layout`) `pipeline.py` uses. Auto CPU/GPU (fp32/fp16), optional `--load-4bit`, accepts an adapter dir *or* a merged model dir, `LAYOUT_PLANNER_BASE` / `LAYOUT_PLANNER_ADAPTER` env overrides. Blocks (exit 2) with a clear message when the adapter is absent.
- [x] `scripts/evaluate_model.py` — `valid_json_rate`, `schema_pass_rate`, `nav_footer_order_rate`; model / `--predictions` / `--self-test` modes; PASS/BELOW-TARGET verdict vs 0.80
- [x] Offline-tested: parser recovery cases assert OK; `--self-test` counts match expected **8/7/7** exactly
- [ ] **Real ≥80% schema_pass_rate on `test.jsonl`** — BLOCKED: needs the trained Qwen adapter (Phase 3 Colab run)

**Validation command:** `python training/layout-planner/scripts/evaluate_model.py --self-test` → counts `8/7/7`, exit 0.
Once the adapter exists: `python training/layout-planner/scripts/evaluate_model.py --test training/data/seq2seq/test.jsonl`.

## Phase 5 — Pipeline integration — CODE COMPLETE (live model + filler BLOCKED on adapter/key)
- [x] `pipeline.py`: (1) planner → LayoutPlan via `inference.LayoutPlanner`; (2) invalid → retry → **retrieval fallback** (count-weighted hint scoring over `fixtures/`); (3) `to_v2_skeleton()` translates types via `stage2Aliases` + `FILLER_SYSTEM` structure-injection prompt fills `data` only; (4) returns a v2 doc `{meta,theme,blocks:[{id,type,styles,data}]}` — the exact shape `normalizeV2Document()` consumes
- [x] CLI: `python pipeline.py "..."` + `--offline` (retrieval + unfilled skeleton) + `--plan-only`
- [x] Offline-tested: retrieval correct on 6 briefs; type translation nav-bar→navigation / feature-trio→featureGrid / footer→footer; `--offline` + `--plan-only` assert OK
- [x] `pipeline.py` runs the Qwen planner automatically — it calls `inference.LayoutPlanner` (now Qwen), so no change needed once the adapter exists
- [ ] **Node↔Python bridge:** wrap `pipeline.py` in a tiny local Python service (FastAPI/Flask, one `/plan` endpoint) and POST to it from `generate-page-json/route.ts` (the documented hook), validate + retry-once + API fallback
- [ ] Live end-to-end (real adapter + real filler) — BLOCKED on Colab adapter + `OPENROUTER_API_KEY`

**CMS hook point:** doc comment on `buildAnalysisContent` in
`src/app/api/ai/generate-page-json/route.ts` (~line 2408) pointing at `pipeline.py`.

**Validation command:** `python training/layout-planner/pipeline.py --offline "Create a premium dental clinic website in Ahmedabad."` → retrieval plan + unfilled v2 skeleton (7 blocks).

## Phase 6 — Docs & smoke test — CODE COMPLETE (live smoke BLOCKED on adapter/key)
- [x] README: architecture, file map, block-vocabulary, env vars, train → infer → eval → pipeline flow, Colab guide, CMS hook point
- [x] **Offline** end-to-end smoke on 3 diverse briefs (`pipeline.py --offline`): dental→7 blocks, saas→8 (incl. pricing+cta), fashion→8 — all nav-first/footer-last, `data` empty
- [x] Full regression sweep green: `validate_layout_plan.py --all` (5/5), `evaluate_model.py --self-test` (8/7/7)
- [ ] **Live** end-to-end smoke (3 briefs → filled page, no retrieval fallback) + real `schema_pass_rate ≥ 0.80` on `test.jsonl`

---

## Status: dataset + notebook COMPLETE. Remaining work is the GPU run + serving wiring.
All offline-authorable Stage-1 work is done. The expanded **517-example** dataset is built and
the **Qwen2.5-1.5B QLoRA notebook** is ready. Remaining steps (mostly user-owned / GPU):

1. **Run `notebooks/train_qwen_lora_colab.ipynb` on a Colab T4** → trains the LoRA adapter,
   shows the train/val loss curve, smoke-tests it in pure Python, and lets you download the
   adapter folder (or `push_to_hub`).
2. **Put the adapter in the repo:** unzip into `outputs/qwen-layout-planner/`, **or** push it
   to the HF Hub and set `LAYOUT_PLANNER_ADAPTER=<user>/qwen-layout-planner`.
3. **Run it in Python** (already wired):
   ```
   python training/layout-planner/inference.py "Create a premium dental clinic website in Ahmedabad."
   python training/layout-planner/scripts/evaluate_model.py --test training/data/seq2seq/test.jsonl  # expect >= 0.80
   ```
4. **CMS integration:** wrap `pipeline.py` in a small local Python service and call it from
   `src/app/api/ai/generate-page-json/route.ts` (documented hook); then the existing `v2.ts`
   filler fills the copy.

Then flip Phase 4 / 5 / 6 to fully COMPLETE.

## Blockers
- **Trained Qwen adapter** requires the user to run the Colab GPU notebook (Phase 3). All
  inference/eval/pipeline code is written and repointed to Qwen (transformers + peft); it just
  needs the adapter to produce real metrics.
- **Phase 5/6 live filler:** `OPENROUTER_API_KEY` in `.env` (Stage-2 copy filler only — not needed for training).
