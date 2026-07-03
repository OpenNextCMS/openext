# OpenNext Layout Planner

**Isolated module** — not integrated into the Next.js CMS until further confirmation.

Two-stage website generation:

1. **Layout Planner** (fine-tuned FLAN-T5) — structure, block order, layout variants, theme, styles. Empty `content: {}` on every block.
2. **Content Filler** (OpenRouter or Gemini API) — marketing copy and images merged into each block.

Combined output = full page JSON you can save and preview as HTML.

```
User prompt
    ↓
[FLAN-T5 Layout Planner]  ← trained on training/data/seq2seq/*.jsonl
    ↓
LayoutPlan (structure only)
    ↓
[LLM Content Filler]  ← OPENROUTER_API_KEY or GEMINI_API_KEY
    ↓
Full page JSON + optional HTML preview
```

## Setup

```bash
# From repo root
pip install -r training/requirements.txt
pip install -r training/layout-planner/requirements.txt
```

**For content filling** (stage 2), set one of:

```bash
export OPENROUTER_API_KEY=sk-or-...
# optional: export OPENROUTER_MODEL=google/gemini-2.0-flash-001

# OR
export GEMINI_API_KEY=...
```

**For training** (stage 1), a CUDA GPU is strongly recommended.

## Train on Google Colab (GPU — ~20–45 min for 10 epochs)

1. Open [`colab_train_layout_planner.ipynb`](colab_train_layout_planner.ipynb) in [Google Colab](https://colab.research.google.com/)
2. **Runtime → Change runtime type → GPU** (T4)
3. On your PC, create the upload bundle (no git needed):
   ```bash
   python training/layout-planner/scripts/package_for_colab.py
   ```
   Upload `training-colab-bundle.zip` to Google Drive (`MyDrive/training-colab-bundle.zip`)
4. In Colab config cell: `SETUP_MODE = "zip_drive"` (default)
5. Run all cells — model saves to **Google Drive** and downloads as a zip

**If git clone fails:** use the zip method above (recommended). Git fails when the repo is private or `training/` is not pushed.

**After Colab:** extract the zip to `training/layout-planner/outputs/layout-planner-flan-t5-base/` on your PC.

## 1. Train the layout model (local)

Dataset is already exported at `training/data/seq2seq/` (417 train / 48 eval / 48 test).

```bash
# Full training (~10 epochs)
python training/layout-planner/train.py

# Quick smoke test (50 steps)
python training/layout-planner/train.py --max-steps 50 --epochs 1
```

Checkpoint saved to: `training/layout-planner/outputs/layout-planner-flan-t5-base/`

### Training options

| Flag | Default |
|------|---------|
| `--model-name` | `google/flan-t5-base` |
| `--epochs` | 10 |
| `--batch-size` | 8 |
| `--eval-batch-size` | 1 |
| `--grad-accum` | 2 |
| `--gradient-checkpointing` | on (CUDA) / off (CPU) |
| `--lr` | 3e-4 |
| `--max-target-length` | 896 |

**CUDA OOM on Colab T4 (15 GB):** use `--batch-size 2 --grad-accum 4 --eval-batch-size 1` with `--max-target-length 896`. Effective batch size stays 8; training is slower but fits in VRAM.

Ablation: `--model-name google/flan-t5-large`

## 2. Generate a full webpage (layout + content)

```bash
python training/layout-planner/pipeline.py \
  --prompt "Create a premium dental clinic website in Ahmedabad." \
  --page-name Home \
  --output-json training/layout-planner/outputs/page.json \
  --output-html training/layout-planner/outputs/page.html
```

Open `page.html` in a browser to see the rendered preview.

### Layout only (no API key needed after training)

```bash
python training/layout-planner/pipeline.py \
  --prompt "Design the Pricing page for a Modern SaaS startup in London." \
  --page-name Pricing \
  --layout-only \
  --print-json
```

### Print combined JSON to stdout

```bash
python training/layout-planner/pipeline.py \
  --prompt "Create a luxury restaurant site in London." \
  --print-json
```

## 3. Evaluate (dissertation metrics)

```bash
python training/layout-planner/evaluate.py
```

Writes:

- `outputs/layout-planner-flan-t5-base/eval_report.json` — schema validity, block sequence match, meta accuracy, hero variant accuracy
- `outputs/layout-planner-flan-t5-base/predictions_test.jsonl` — per-sample predictions

## Output JSON shape

The combined output matches the CMS semantic block format:

```json
{
  "meta": {
    "business": "Dental Clinic",
    "style": "Premium",
    "complexity": "High",
    "websiteType": "healthcare",
    "pageName": "Home",
    "location": "Ahmedabad"
  },
  "page": {
    "title": "",
    "theme": {
      "primaryColor": "#0ea5e9",
      "backgroundColor": "#ffffff",
      "fontFamily": "Inter, sans-serif",
      "borderRadius": "12px"
    },
    "blocks": [
      {
        "type": "navbar",
        "order": 0,
        "content": { "logo": "...", "links": [...] },
        "images": {},
        "layout": { "variant": "horizontal" },
        "styles": {}
      }
    ]
  }
}
```

- **From the model:** `meta`, `theme`, `blocks[].type`, `order`, `layout`, `styles`
- **From the API:** `blocks[].content`, `blocks[].images`

## Regenerate training data (if needed)

```bash
pip install -r training/requirements.txt
python training/scripts/export_template_blueprints.py
python training/scripts/merge_and_validate.py
python training/scripts/split_dataset.py
python training/scripts/export_seq2seq.py
```

## Folder structure

```
training/layout-planner/
  train.py           # Fine-tune FLAN-T5
  pipeline.py        # Main entry: prompt → JSON + HTML
  evaluate.py        # Test-set metrics
  requirements.txt
  lib/
    inference.py     # LayoutPlannerModel.plan_layout()
    content_filler.py # LLM content stage
    html_preview.py  # Standalone HTML renderer
    llm_client.py    # OpenRouter / Gemini
    validate.py      # Schema validation
  outputs/           # Model checkpoints + generated pages (gitignored)
```

## Not integrated (by design)

This module does **not** call `src/app/api/ai/generate-page-json` or store pages in MongoDB. That integration is deferred until you confirm.

## Research framing

- **Problem:** General LLMs mix layout planning and copywriting in one shot.
- **Solution:** Supervised seq2seq learns CMS-native structure; a separate LLM fills content per block.
- **Dataset:** 513 samples, 47/47 websiteType × pageName coverage in `training/data/`.
