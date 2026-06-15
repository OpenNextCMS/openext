# Python AI Prompt API

This is a standalone Python/FastAPI version of the editor prompt API.

It mirrors the current Next.js endpoint:

- `POST /api/ai/generate-page-json`
- form fields: `prompt`, `pageType`, optional `image`
- cookie auth: requires a `token` cookie
- env vars: `KIMI_API_KEY`, optional `GEMINI_API_KEY`, `GROQ_API_KEY`, `KIMI_MODEL`, `KIMI_REVIEW_MODEL`, `GEMINI_MODEL`, `GROQ_VISION_MODEL`, `GROQ_TEXT_MODEL`, `GROQ_JSON_MODEL`

Run:

```bash
pip install -r python_api/requirements.txt
<<<<<<< HEAD
=======
cp python_api/api_keys.txt.example python_api/api_keys.txt  # then add keys locally (never commit)
>>>>>>> khadija
uvicorn python_api.generate_page_json_api:app --host 0.0.0.0 --port 8000 --reload
```

Default models:

- primary vision/text/json: `kimi-k2.6` through the Kimi/Moonshot API
- fallback: `gemini-1.5-pro` when `GEMINI_API_KEY` is configured
- final fallback: Groq models when `GROQ_API_KEY` is configured
- review/quality gate: `kimi-k2.6`

Optional quality gate:

- `KIMI_API_BASE_URL`, default `https://api.moonshot.ai/v1`
- `GEMINI_API_BASE_URL`, default `https://generativelanguage.googleapis.com/v1beta`
- `KIMI_MODEL`
- `KIMI_REVIEW_MODEL`
- `GEMINI_MODEL`
- `AI_MIN_QUALITY_SCORE`, default `80`
