# OpenNext CMS — LayoutPlan training dataset

Structure-only supervised labels for the MSc layout planner: natural-language `prompt` → CMS-native `LayoutPlan` JSON (`meta`, `page.theme`, `page.blocks[]` with empty `content: {}`).

Covers **all 10 wizard website types** and **19 page archetypes** (Home, About, Pricing, Contact, Menu, Blog, etc.) via templates + real-site homepages + optional synthetic teacher.

## Setup

```bash
pip install -r training/requirements.txt
```

Optional (LLM fallback / synthetic generation):

- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`

## Full pipeline (universal coverage)

```bash
# 1. Template seeds — all 47 (websiteType × pageName) combos
python training/scripts/export_template_blueprints.py

# 2. Real-site homepages (optional but recommended)
python training/scripts/scrape_real_sites.py
python training/scripts/map_outline_to_layout_plan.py
# Optional: python training/scripts/map_outline_to_layout_plan.py --llm-fallback

# 3. Re-scrape failed URLs (empty sections / timeouts)
python training/scripts/scrape_real_sites.py --only-failures
python training/scripts/map_outline_to_layout_plan.py

# 4. Optional synthetic teacher (needs API key)
python training/scripts/generate_blueprint_dataset.py --count 50

# 5. Merge all sources, stratified split, reports
python training/scripts/merge_and_validate.py
python training/scripts/split_dataset.py
python training/scripts/dataset_stats.py
python training/scripts/coverage_report.py
python training/scripts/export_seq2seq.py
```

### Outputs

| File | Purpose |
|------|---------|
| `data/validated/all.jsonl` | All validated samples |
| `data/train.jsonl`, `eval.jsonl`, `test.jsonl` | Stratified 80/10/10 split |
| `data/dataset_report.txt` | Source, page, block statistics |
| `data/coverage_matrix.csv` | websiteType × pageName coverage (target: 47/47 OK) |
| `data/seq2seq/train_seq2seq.jsonl` | FLAN-T5 input_text → target_text |

## LayoutPlan schema (required fields)

Every label's `output.meta` must include:

- `websiteType` — one of: agency, saas, ecommerce, portfolio, personal-brand, corporate, restaurant, real-estate, healthcare, education
- `pageName` — e.g. Home, About, Pricing, Contact, Menu, Blog
- `business`, `style`, `complexity`

Validated by [`training/scripts/lib/validate.py`](scripts/lib/validate.py):

- `blocks[0].type` = `navbar`, last = `footer`
- Every `blocks[].content` = `{}`
- Allowed semantic types in [`training/schema/allowed_types.json`](../schema/allowed_types.json)
- Hero blocks require `layout.variant`
- `page.theme` requires `primaryColor`, `backgroundColor`

## Data sources

| Script | Source tag | Covers |
|--------|------------|--------|
| `export_template_blueprints.py` | `template` | All 10 website types × all page types (~470 rows) |
| `scrape_real_sites.py` + `map_outline_to_layout_plan.py` | `real-site` | Authentic **Home** layouts from 72 curated URLs |
| `generate_blueprint_dataset.py` | `synthetic` | LLM teacher — page-aware prompts (needs API key) |
| `import_review_corrections.py` | `real-site-reviewed` | Manual gold labels (highest merge priority) |

Merge dedupes on `(prompt, websiteType, pageName)`. Priority: `real-site-reviewed` > `real-site` > `synthetic` > `template`.

## Seq2seq training format

```text
Input:  plan layout: Create a premium dental clinic website in Ahmedabad.
Input:  plan page layout: Design the Pricing page for a Modern SaaS (AI Startup).
Target: {"meta":{"websiteType":"saas","pageName":"Pricing",...},"page":{...}}
```

Prefix rules: `plan layout:` for Home, `plan page layout:` for inner pages.

## Audit and review

```bash
# Classify unmapped scrape URLs
python training/scripts/audit_mapping_gaps.py

# Export low-confidence rows for manual CSV review
python training/scripts/export_for_review.py --source real-site --max-confidence 0.7 --count 50
python training/scripts/import_review_corrections.py
```

## Success criteria

- **47/47** (websiteType, pageName) combos in `coverage_matrix.csv` with status OK
- Each combo has ≥ 3 train samples (10 variants per combo in template_seed)
- `export_seq2seq.py` produces 0 validation skips on train split

## Ethics and reproducibility

- Homepage-only fetch for real sites; no login, no paywalls bypass
- Check `robots.txt` before scrape
- Store `scrapedAt` and `contentHash` on each real-site sample
- Sites may change over time — re-run scrape for updated dissertation snapshot

## Layout Planner model (separate module)

Fine-tuning, inference, content filling, and HTML preview live in **[`layout-planner/`](layout-planner/README.md)** — isolated from the Next.js CMS until integration is confirmed.

```bash
pip install -r training/layout-planner/requirements.txt
python training/layout-planner/train.py
python training/layout-planner/pipeline.py --prompt "Create a premium dental clinic website in Ahmedabad." --output-html page.html
```
