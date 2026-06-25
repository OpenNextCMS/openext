import base64
import json
import os
import re
import uuid
from typing import Any, Literal

import httpx
from fastapi import Cookie, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api_manager import ApiKeyManager

# Initialize API Key Manager (keys from GROQ_API_KEY / OPENROUTER_API_KEY env vars)
key_manager = ApiKeyManager()

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"
KIMI_CHAT_COMPLETIONS_URL = (
    os.getenv("KIMI_API_BASE_URL", "https://api.moonshot.ai/v1").rstrip("/")
    + "/chat/completions"
)
GEMINI_API_BASE_URL = os.getenv(
    "GEMINI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
).rstrip("/")
def get_env_model(key: str, fallback: str) -> str:
    val = os.getenv(key, fallback)
    decommissioned = [
        "llama-3.2-11b-vision-preview",
        "llama-3.2-90b-vision-preview",
        "google/gemini-flash-1.5",
    ]
    if val in decommissioned:
        print(f"[AI] Ignoring decommissioned model from ENV: {val}. Using fallback: {fallback}")
        return fallback
    return val

GROQ_VISION_MODEL = get_env_model(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
GROQ_TEXT_MODEL = get_env_model("GROQ_TEXT_MODEL", "llama-3.3-70b-versatile")
GROQ_JSON_MODEL = get_env_model("GROQ_JSON_MODEL", GROQ_TEXT_MODEL)
OPENROUTER_MODEL = get_env_model("OPENROUTER_MODEL", "google/gemini-flash-latest")
KIMI_MODEL = os.getenv("KIMI_MODEL", "kimi-k2.6")
KIMI_REVIEW_MODEL = os.getenv("KIMI_REVIEW_MODEL", KIMI_MODEL)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
AI_MIN_QUALITY_SCORE = int(os.getenv("AI_MIN_QUALITY_SCORE", "80"))
MAX_IMAGE_BYTES = 8 * 1024 * 1024

PageContext = Literal["page", "header", "footer"]

app = FastAPI(title="Editor AI Prompt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("AI_API_CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


DEFAULT_IMAGE_RECREATE_PROMPT = (
    "Recreate the uploaded image as closely as possible as a webpage in the editor. "
    "Match the visible layout, sections, colors, spacing, typography, buttons, cards, "
    "icons, and readable text using only editor blocks."
)

STRICT_ANALYSIS_RULES = """
- nav-bar is a standalone block, not a container with children.
- Layout containers are only row, 1-column, 2-column, and 3-column.
- Count side-by-side visual groups before choosing a container.
- If a section shows left content, center metrics/progress, and right timer/text, set containerBlockId:"3-column", columnCount:3.
- If a section is centered with a full-width button/title/subtitle stack, use one 1-column container with alignItems:"center" and textAlign:"center".
- Use stats/progress/countdown blocks for stats, progress bars, and timers.
- Do not invent hidden sections.
"""


def block_id() -> str:
    return str(uuid.uuid4())


def safe_string(value: Any, fallback: str = "") -> str:
    return value if isinstance(value, str) and value else fallback


def sanitize_user_prompt(prompt: str) -> str:
    prompt = (prompt or "").strip()
    if len(prompt) > 5000:
        return prompt[:5000]
    return prompt


def is_dark_color(color: str) -> bool:
    if not isinstance(color, str) or not re.fullmatch(r"#?[0-9a-fA-F]{6}", color.strip()):
        return False
    value = color.strip().lstrip("#")
    r = int(value[0:2], 16)
    g = int(value[2:4], 16)
    b = int(value[4:6], 16)
    brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness < 128


def get_focus_instruction(page_type: PageContext) -> str:
    if page_type == "header":
        return (
            "IMPORTANT CONTEXT - HEADER PAGE:\n"
            "- Output ONLY the visible header/nav portion.\n"
            "- The output should be exactly one nav-bar block.\n"
            "- Do not output body sections or footer content."
        )
    if page_type == "footer":
        return (
            "IMPORTANT CONTEXT - FOOTER PAGE:\n"
            "- Output ONLY the visible footer portion.\n"
            "- Use 2-column or 3-column layouts for visible link groups.\n"
            "- Do not output nav-bars, hero sections, or body content."
        )
    return (
        "IMPORTANT CONTEXT - BODY PAGE:\n"
        "- Recreate only the visible main content sections between header and footer.\n"
        "- Skip browser chrome, sticky nav, and footer unless specifically requested."
    )


def build_analysis_content(
    prompt: str,
    requested_layout_instruction: str,
    focus_instruction: str,
) -> list[dict[str, Any]]:
    return [
        {
            "type": "text",
            "text": f"""You are analyzing a webpage screenshot to map it to an editor block system.

{focus_instruction}

{STRICT_ANALYSIS_RULES}

The editor has these block ids:
CONTAINERS: 1-column, 2-column, 3-column, row
STANDALONE STRUCTURAL BLOCKS: nav-bar
LEAF BLOCKS: text, heading, button, icon, card, image, stats, progress, countdown, shape-divider, input, textarea, radio, checkbox, switch, table, tabs, avatar, separator, skeleton

KEY MAPPING RULES:
- A large number with a label below it = blockId:"stats", statsValue:"200+", statsLabel:"Project Delivered"
- A horizontal bar with a label and percentage = blockId:"progress"
- A timer with days/hours/minutes/seconds = blockId:"countdown"
- A large bold title = blockId:"heading"
- A paragraph of text = blockId:"text"
- A clickable button = blockId:"button"
- Navigation bar with logo and links = standalone blockId:"nav-bar"
- Three side-by-side columns = containerBlockId:"3-column", columnCount:3
- Two side-by-side columns = containerBlockId:"2-column", columnCount:2
- One full-width column = containerBlockId:"1-column", columnCount:1

Return ONLY this JSON:
{{
  "scope": "full-page|section|viewport",
  "sections": [
    {{
      "order": 1,
      "name": "section name",
      "containerBlockId": "1-column|2-column|3-column|nav-bar",
      "columnCount": 3,
      "backgroundColor": "#1e2330",
      "padding": "48px 32px",
      "alignItems": "flex-start",
      "justifyContent": "flex-start",
      "nav": {{
        "logo": "Brand",
        "logoType": "text",
        "logoImage": "",
        "layout": "horizontal",
        "links": [{{"label":"Home","href":"#","onClick":"none","onClickValue":""}}]
      }},
      "elements": [
        {{
          "blockId": "heading|text|button|stats|progress|countdown|icon|card|image",
          "column": 0,
          "text": "visible text only",
          "statsValue": "200+",
          "statsLabel": "Project Delivered",
          "progressLabel": "Delivery Rate",
          "progressPercentage": 100,
          "iconName": "sparkles",
          "cardData": {{"eyebrow":"","title":"","body":"","buttonText":""}},
          "color": "#ffffff",
          "fontSize": "24px",
          "fontWeight": "700",
          "styleNotes": "outline button, centered text, etc"
        }}
      ]
    }}
  ]
}}

User request: {prompt or "Recreate the visible screenshot."}
{f"Layout requirement: {requested_layout_instruction}" if requested_layout_instruction else ""}

Rules:
- List visible sections top-to-bottom.
- Correctly identify columnCount by counting side-by-side groups.
- Assign each element to the correct 0-based column index.
- Do not place all elements into column 0 when the source has multiple visual columns.
- Do not include elements not visible in the image.""",
        }
    ]


def build_review_content(
    prompt: str,
    requested_layout_instruction: str,
    focus_instruction: str,
    visible_analysis: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        {
            "type": "text",
            "text": f"""You are the second-model quality reviewer for a drag-and-drop webpage editor.

Your job is to repair the structured analysis before it becomes user-visible editor JSON.
Do NOT generate final builder blocks. Return only a corrected analysis plan.

{focus_instruction}

{STRICT_ANALYSIS_RULES}

CURRENT ANALYSIS:
{json.dumps(visible_analysis, indent=2)}

User request: {prompt or "Recreate the visible screenshot."}
{f"Layout requirement: {requested_layout_instruction}" if requested_layout_instruction else ""}

Review checklist:
- Keep only sections that are visible or explicitly requested.
- Preserve correct top-to-bottom section order.
- Fix wrong containerBlockId and columnCount by counting visible side-by-side groups.
- Fix every element.column so left/middle/right content lands in the correct column.
- Use nav-bar only for header/navigation, never for normal content sections.
- Use heading/text/button/stats/progress/countdown/icon/card/image/input/textarea/separator/shape-divider block ids only.
- Use stats for number+label groups, progress for labeled bars, countdown for timers.
- On dark sections, choose readable text colors such as #ffffff, #f8fafc, or #cbd5e1.
- Professional output means no unsupported block names, no duplicate sections, no all-content-in-column-0 mistakes, and no unreadable contrast.

Return ONLY this JSON:
{{
  "qualityScore": 0,
  "qualityNotes": ["short issue or repair note"],
  "scope": "full-page|section|viewport",
  "sections": [
    {{
      "order": 1,
      "name": "section name",
      "containerBlockId": "1-column|2-column|3-column|nav-bar",
      "columnCount": 1,
      "backgroundColor": "#ffffff",
      "padding": "48px 32px",
      "alignItems": "flex-start",
      "justifyContent": "flex-start",
      "nav": {{
        "logo": "Brand",
        "logoType": "text",
        "logoImage": "",
        "layout": "horizontal",
        "links": [{{"label":"Home","href":"#","onClick":"none","onClickValue":""}}],
        "ctaLabel": "",
        "ctaHref": "#",
        "ctaColor": "#111827"
      }},
      "elements": [
        {{
          "blockId": "heading|text|button|stats|progress|countdown|icon|card|image|input|textarea|separator|shape-divider",
          "column": 0,
          "text": "visible text only",
          "statsValue": "200+",
          "statsLabel": "Project Delivered",
          "progressLabel": "Delivery Rate",
          "progressPercentage": 100,
          "iconName": "sparkles",
          "cardData": {{"eyebrow":"","title":"","body":"","buttonText":""}},
          "color": "#111827",
          "fontSize": "24px",
          "fontWeight": "700",
          "styleNotes": "short style notes"
        }}
      ]
    }}
  ]
}}

Set qualityScore from 0 to 100 after repairs. Use below 80 only if the analysis is too incomplete to produce professional editor JSON.""",
        }
    ]


async def call_groq_api(api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            GROQ_CHAT_COMPLETIONS_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"temperature": 0.05, **body},
        )

    try:
        payload = response.json()
    except Exception:
        payload = None

    if response.status_code >= 400:
        message = (
            payload.get("error", {}).get("message")
            if isinstance(payload, dict)
            else f"Groq API error {response.status_code}"
        )
        raise RuntimeError(message or f"Groq API error {response.status_code}")

    return payload


async def call_groq_json(api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    try:
        return await call_groq_api(api_key, {**body, "response_format": {"type": "json_object"}})
    except RuntimeError as error:
        message = str(error).lower()
        if (
            "failed_generation" in message
            or "failed to generate" in message
            or "stop_reason" in message
        ):
            return await call_groq_api(api_key, body)
        raise


async def call_openrouter_api(api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            OPENROUTER_CHAT_COMPLETIONS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/open-next/nextcmsmains",
                "X-Title": "NextCMS",
            },
            json={"temperature": 0.05, **body},
        )

    try:
        payload = response.json()
    except Exception:
        payload = None

    if response.status_code >= 400:
        message = (
            payload.get("error", {}).get("message")
            if isinstance(payload, dict)
            else f"OpenRouter API error {response.status_code}"
        )
        raise RuntimeError(message or f"OpenRouter API error {response.status_code}")

    return payload


async def call_openrouter_json(api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    try:
        return await call_openrouter_api(api_key, {**body, "response_format": {"type": "json_object"}})
    except RuntimeError as error:
        message = str(error).lower()
        if (
            "failed_generation" in message
            or "failed to generate" in message
            or "stop_reason" in message
        ):
            return await call_openrouter_api(api_key, body)
        raise


async def call_kimi_api(api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            KIMI_CHAT_COMPLETIONS_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"temperature": 0.05, **body},
        )

    try:
        payload = response.json()
    except Exception:
        payload = None

    if response.status_code >= 400:
        message = (
            payload.get("error", {}).get("message")
            if isinstance(payload, dict)
            else f"Kimi API error {response.status_code}"
        )
        raise RuntimeError(message or f"Kimi API error {response.status_code}")

    return payload


async def call_kimi_json(api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    try:
        return await call_kimi_api(api_key, {**body, "response_format": {"type": "json_object"}})
    except RuntimeError as error:
        message = str(error).lower()
        if (
            "response_format" in message
            or "failed_generation" in message
            or "failed to generate" in message
            or "stop_reason" in message
        ):
            return await call_kimi_api(api_key, body)
        raise


def gemini_part_from_openai_part(part: dict[str, Any]) -> dict[str, Any]:
    if part.get("type") == "text":
        return {"text": part.get("text", "")}

    image_url = part.get("image_url")
    url = image_url.get("url") if isinstance(image_url, dict) else ""
    match = re.match(r"^data:([^;]+);base64,(.+)$", url)
    if not match:
        raise ValueError("Gemini fallback only supports inline base64 image data.")
    return {"inlineData": {"mimeType": match.group(1), "data": match.group(2)}}


async def call_gemini_json(
    api_key: str, model: str, content: list[dict[str, Any]], max_completion_tokens: int
) -> dict[str, Any]:
    url = f"{GEMINI_API_BASE_URL}/models/{model}:generateContent?key={api_key}"
    body = {
        "contents": [{"role": "user", "parts": [gemini_part_from_openai_part(p) for p in content]}],
        "generationConfig": {
            "temperature": 0.05,
            "maxOutputTokens": max_completion_tokens,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(url, headers={"Content-Type": "application/json"}, json=body)

    try:
        payload = response.json()
    except Exception:
        payload = None

    if response.status_code >= 400:
        message = (
            payload.get("error", {}).get("message")
            if isinstance(payload, dict)
            else f"Gemini API error {response.status_code}"
        )
        raise RuntimeError(message or f"Gemini API error {response.status_code}")
    return payload


def get_groq_message_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    message = choices[0].get("message", {})
    return message.get("content", "") if isinstance(message, dict) else ""


def get_gemini_message_content(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return ""
    content = candidates[0].get("content", {})
    parts = content.get("parts") if isinstance(content, dict) else []
    if not isinstance(parts, list):
        return ""
    return "\n".join(part.get("text", "") for part in parts if isinstance(part, dict))


def parse_model_json(content: str) -> dict[str, Any]:
    text = (content or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise ValueError("Model output did not contain valid JSON")
        return json.loads(match.group(0))


def get_analysis_quality_score(analysis: dict[str, Any]) -> int:
    score = analysis.get("qualityScore")
    return score if isinstance(score, int) else 100


def get_analysis_quality_notes(analysis: dict[str, Any]) -> list[str]:
    notes = analysis.get("qualityNotes")
    return [note for note in notes if isinstance(note, str)] if isinstance(notes, list) else []


async def review_analysis_with_second_model(
    prompt: str,
    requested_layout_instruction: str,
    focus_instruction: str,
    visible_analysis: dict[str, Any],
    kimi_api_key: str,
    groq_api_key: str | None = None,
    openrouter_api_key: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any], str]:
    reviewers = ["groq", "openrouter"]
    errors = []

    for provider in reviewers:
        keys_to_try = []
        if provider == "groq":
            if groq_api_key:
                keys_to_try.append(groq_api_key)
            keys_to_try.extend(key_manager.groq_keys)
        elif provider == "openrouter":
            if openrouter_api_key:
                keys_to_try.append(openrouter_api_key)
            keys_to_try.extend(key_manager.openrouter_keys)

        # Unique keys
        unique_keys = []
        seen = set()
        for k in keys_to_try:
            if k and k not in seen:
                unique_keys.append(k)
                seen.add(k)

        for key in unique_keys:
            try:
                if provider == "openrouter":
                    payload = await call_openrouter_json(
                        key,
                        {
                            "model": OPENROUTER_MODEL,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": build_review_content(
                                        prompt=prompt,
                                        requested_layout_instruction=requested_layout_instruction,
                                        focus_instruction=focus_instruction,
                                        visible_analysis=visible_analysis,
                                    ),
                                }
                            ],
                            "max_completion_tokens": 16384,
                        },
                    )
                else:
                    payload = await call_groq_json(
                        key,
                        {
                            "model": GROQ_JSON_MODEL,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": build_review_content(
                                        prompt=prompt,
                                        requested_layout_instruction=requested_layout_instruction,
                                        focus_instruction=focus_instruction,
                                        visible_analysis=visible_analysis,
                                    ),
                                }
                            ],
                            "max_completion_tokens": 16384,
                        },
                    )

                reviewed = parse_model_json(get_groq_message_content(payload))
                sections = reviewed.get("sections")
                if isinstance(sections, list) and sections:
                    return reviewed, payload, provider
                errors.append(f"{provider} review returned no sections")
            except Exception as e:
                errors.append(f"{provider} review failed: {e}")

    raise RuntimeError(f"All review attempts failed: {' | '.join(errors)}")


async def run_analysis_provider(
    provider: str,
    api_key: str,
    content: list[dict[str, Any]],
    has_image: bool,
) -> tuple[dict[str, Any], str, dict[str, Any]]:
    print(f"[AI] Running analysis with {provider} and key {api_key[:8]}...")
    
    # HARDCODED MODELS FOR MAY 2026 STABILITY
    GROQ_V_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
    GROQ_T_MODEL = "llama-3.3-70b-versatile"
    OR_MODEL = "google/gemini-pro-1.5"
    GEMINI_M = "gemini-1.5-pro-latest"

    if provider == "gemini":
        payload = await call_gemini_json(api_key, GEMINI_M, content, 2048)
        return payload, GEMINI_M, parse_model_json(get_gemini_message_content(payload))

    if provider == "openrouter":
        payload = await call_openrouter_json(
            api_key,
            {
                "model": OR_MODEL,
                "messages": [{"role": "user", "content": content}],
                "max_completion_tokens": 2048,
            },
        )
        return payload, OR_MODEL, parse_model_json(get_groq_message_content(payload))

    model = GROQ_V_MODEL if has_image else GROQ_T_MODEL
    payload = await call_groq_json(
        api_key,
        {
            "model": model,
            "messages": [{"role": "user", "content": content}],
            "max_completion_tokens": 2048,
        },
    )
    return payload, model, parse_model_json(
        get_groq_message_content(payload)
    )


async def generate_reviewed_analysis_with_fallback(
    content: list[dict[str, Any]],
    has_image: bool,
    prompt: str,
    requested_layout_instruction: str,
    focus_instruction: str,
    kimi_api_key: str,
    gemini_api_key: str | None,
    groq_api_key: str | None,
    openrouter_api_key: str | None = None,
) -> dict[str, Any]:
    providers = ["gemini", "groq", "openrouter"]
    errors: list[str] = []

    for provider in providers:
        keys_to_try = []
        if provider == "gemini":
            if gemini_api_key:
                keys_to_try.append(gemini_api_key)
        elif provider == "groq":
            if groq_api_key:
                keys_to_try.append(groq_api_key)
            keys_to_try.extend(key_manager.groq_keys)
        elif provider == "openrouter":
            if openrouter_api_key:
                keys_to_try.append(openrouter_api_key)
            keys_to_try.extend(key_manager.openrouter_keys)

        # Unique keys
        unique_keys = []
        seen = set()
        for k in keys_to_try:
            if k and k not in seen:
                unique_keys.append(k)
                seen.add(k)

        for key in unique_keys:
            try:
                payload, model, initial_analysis = await run_analysis_provider(
                    provider, key, content, has_image
                )
                reviewed, review_payload, reviewer_provider = await review_analysis_with_second_model(
                    prompt=prompt,
                    requested_layout_instruction=requested_layout_instruction,
                    focus_instruction=focus_instruction,
                    visible_analysis=initial_analysis,
                    kimi_api_key=kimi_api_key,
                    groq_api_key=groq_api_key,
                    openrouter_api_key=openrouter_api_key,
                )
                quality_score = get_analysis_quality_score(reviewed)
                if quality_score >= AI_MIN_QUALITY_SCORE:
                    return {
                        "provider": provider,
                        "model": model,
                        "payload": payload,
                        "reviewedAnalysis": reviewed,
                        "reviewPayload": review_payload,
                        "qualityScore": quality_score,
                        "reviewerProvider": reviewer_provider,
                    }
                errors.append(f"{provider} quality score {quality_score} was below {AI_MIN_QUALITY_SCORE}")
            except Exception as error:
                errors.append(f"{provider} failed: {error}")

    raise RuntimeError(
        f"No provider produced professional output. {' | '.join(errors) if errors else ''}"
    )


def element_content(element: dict[str, Any], block_id_value: str) -> str:
    text = safe_string(element.get("text"))
    if block_id_value == "stats":
        return json.dumps(
            {
                "value": element.get("statsValue") or text or "0",
                "label": element.get("statsLabel") or element.get("label") or "",
            }
        )
    if block_id_value == "progress":
        return json.dumps(
            {
                "label": element.get("progressLabel") or text or "Progress",
                "percentage": element.get("progressPercentage")
                if isinstance(element.get("progressPercentage"), int)
                else 100,
                "barColor": "#22d3ee",
            }
        )
    if block_id_value == "countdown":
        return json.dumps({"days": "0", "hours": "00", "minutes": "00", "seconds": "00"})
    if block_id_value == "icon":
        return safe_string(element.get("iconName"), "sparkles")
    if block_id_value == "card":
        return json.dumps(
            element.get("cardData")
            if isinstance(element.get("cardData"), dict)
            else {"image": "", "eyebrow": "", "title": text, "body": "", "buttonText": ""}
        )
    if block_id_value == "image":
        return json.dumps({"src": "", "alt": text or "Image", "caption": ""})
    if block_id_value == "button":
        return text or "Click Me"
    return text


def element_style(
    element: dict[str, Any], section: dict[str, Any], block_id_value: str
) -> dict[str, Any]:
    dark = is_dark_color(safe_string(section.get("backgroundColor")))
    base_color = safe_string(element.get("color"), "#f8fafc" if dark else "#111827")
    font_size = safe_string(
        element.get("fontSize"),
        "48px" if block_id_value == "heading" else "18px",
    )
    font_weight = element.get("fontWeight") or (600 if block_id_value == "heading" else 400)
    style_notes = safe_string(element.get("styleNotes")).lower()

    if block_id_value == "button" and re.search(r"outline|outlined|ghost|transparent", style_notes):
        return {
            "color": base_color,
            "backgroundColor": "transparent",
            "border": f"1px solid {base_color}",
            "borderRadius": "50px",
            "padding": "16px 28px",
            "textAlign": "center",
            "fontWeight": 500,
            "lineHeight": "1",
        }

    if block_id_value == "button":
        return {
            "color": "#ffffff",
            "backgroundColor": "#3b82f6",
            "border": "none",
            "borderRadius": "8px",
            "padding": "10px 18px",
            "textAlign": "center",
            "lineHeight": "1",
        }

    return {
        "color": base_color,
        "fontSize": font_size,
        "fontWeight": font_weight,
        "lineHeight": "1" if block_id_value == "heading" else "1.7",
        "textAlign": "left",
    }


def build_element_block(element: dict[str, Any], section: dict[str, Any]) -> dict[str, Any] | None:
    requested = safe_string(element.get("blockId"), "text")
    block_id_value = "text" if requested == "heading" else requested
    block_type = {
        "heading": "text",
        "text": "text",
        "button": "button",
        "stats": "stats",
        "progress": "progress",
        "countdown": "countdown",
        "icon": "icon",
        "card": "card",
        "image": "image",
        "shape-divider": "shape-divider",
        "input": "input",
        "textarea": "textarea",
        "radio": "radio",
        "checkbox": "checkbox",
        "switch": "switch",
        "table": "table",
        "tabs": "tabs",
        "avatar": "avatar",
        "separator": "separator",
        "skeleton": "skeleton",
    }.get(requested, "text")

    return {
        "uniqueId": block_id(),
        "id": "heading" if requested == "heading" else requested,
        "label": {
            "heading": "Heading Block",
            "text": "Text Block",
            "button": "Button",
            "stats": "Stats Block",
            "progress": "Progress Bar",
            "countdown": "Countdown Timer",
            "icon": "Icon Block",
            "card": "Card Block",
            "image": "Image Block",
        }.get(requested, requested),
        "description": safe_string(element.get("styleNotes")),
        "content": element_content(element, requested),
        "type": block_type,
        "style": element_style(element, section, requested),
    }


def build_nav_bar_block(section: dict[str, Any]) -> dict[str, Any]:
    nav = section.get("nav") if isinstance(section.get("nav"), dict) else {}
    background = safe_string(section.get("backgroundColor"), "#ffffff")
    dark = is_dark_color(background)
    return {
        "uniqueId": block_id(),
        "id": "nav-bar",
        "label": "Nav Bar",
        "description": safe_string(section.get("name"), "Navigation bar"),
        "content": json.dumps(
            {
                "logo": nav.get("logo") or "Brand",
                "logoType": nav.get("logoType") or "text",
                "logoImage": nav.get("logoImage") or "",
                "layout": nav.get("layout") or "horizontal",
                "links": nav.get("links")
                if isinstance(nav.get("links"), list)
                else [
                    {"label": "Home", "href": "#", "onClick": "none", "onClickValue": ""},
                    {"label": "About", "href": "#", "onClick": "none", "onClickValue": ""},
                    {"label": "Contact", "href": "#", "onClick": "none", "onClickValue": ""},
                ],
                "ctaLabel": nav.get("ctaLabel") or "",
                "ctaHref": nav.get("ctaHref") or "#",
                "ctaColor": nav.get("ctaColor") or "#111827",
            }
        ),
        "type": "nav-bar",
        "style": {
            "width": "100%",
            "backgroundColor": background,
            "color": "#f8fafc" if dark else "#111827",
            "padding": safe_string(section.get("padding"), "20px 48px"),
            "border": "0px none transparent",
            "boxShadow": "none",
        },
    }


def build_section_block(section: dict[str, Any]) -> dict[str, Any] | None:
    container_id = safe_string(section.get("containerBlockId"), "1-column")
    if container_id == "nav-bar":
        return build_nav_bar_block(section)

    if container_id not in {"1-column", "2-column", "3-column"}:
        container_id = "1-column"

    column_count = section.get("columnCount")
    if not isinstance(column_count, int):
        column_count = {"1-column": 1, "2-column": 2, "3-column": 3}[container_id]
    column_count = max(1, min(column_count, 3))

    children: list[list[dict[str, Any]]] = [[] for _ in range(column_count)]
    elements = section.get("elements") if isinstance(section.get("elements"), list) else []
    for index, element in enumerate(elements):
        if not isinstance(element, dict):
            continue
        block = build_element_block(element, section)
        if not block:
            continue
        column = element.get("column") if isinstance(element.get("column"), int) else index
        column = max(0, min(column, column_count - 1))
        children[column].append(block)

    return {
        "uniqueId": block_id(),
        "id": container_id,
        "label": {
            "1-column": "1 Column Layout",
            "2-column": "2 Column Layout",
            "3-column": "3 Column Layout",
        }[container_id],
        "description": safe_string(section.get("name")),
        "content": "",
        "type": "column",
        "children": children,
        "style": {
            "padding": safe_string(section.get("padding"), "48px 32px"),
            "backgroundColor": safe_string(section.get("backgroundColor"), "transparent"),
            "display": "flex",
            "flexDirection": "column" if column_count == 1 else "row",
            "gap": "32px",
            "width": "100%",
            "alignItems": safe_string(section.get("alignItems"), "flex-start"),
            "justifyContent": safe_string(section.get("justifyContent"), "flex-start"),
        },
    }


def enforce_page_scope(blocks: list[dict[str, Any]], page_type: PageContext) -> list[dict[str, Any]]:
    if page_type == "header":
        nav_blocks = [block for block in blocks if block.get("type") == "nav-bar"]
        return nav_blocks[:1]
    if page_type == "footer":
        return [block for block in blocks if block.get("type") != "nav-bar"]
    return [block for block in blocks if block.get("type") != "nav-bar"]


def build_components_from_analysis(analysis: dict[str, Any], page_type: PageContext) -> list[dict[str, Any]]:
    sections = analysis.get("sections") if isinstance(analysis.get("sections"), list) else []
    sections = sorted(
        [section for section in sections if isinstance(section, dict)],
        key=lambda section: section.get("order") if isinstance(section.get("order"), int) else 0,
    )
    blocks = [block for section in sections if (block := build_section_block(section))]
    return enforce_page_scope(blocks, page_type)


def repair_dark_section_contrast(block: dict[str, Any], parent_is_dark: bool = False) -> dict[str, Any]:
    style = block.get("style") if isinstance(block.get("style"), dict) else {}
    is_dark_section = is_dark_color(safe_string(style.get("backgroundColor"))) or parent_is_dark
    color = safe_string(style.get("color"))
    if is_dark_section and block.get("type") in {"text", "button", "stats", "progress", "countdown"}:
        if not color or is_dark_color(color):
            style["color"] = "#f8fafc"
    block["style"] = style
    if isinstance(block.get("children"), list):
        block["children"] = [
            [
                repair_dark_section_contrast(child, is_dark_section)
                for child in column
                if isinstance(child, dict)
            ]
            for column in block["children"]
            if isinstance(column, list)
        ]
    return block


async def generate_for_focus(
    api_key: str | None,
    kimi_api_key: str,
    gemini_api_key: str | None,
    image_data_url: str,
    focus: PageContext,
) -> list[dict[str, Any]] | None:
    try:
        focused_parts = build_analysis_content(
            prompt=f"Extract ONLY the {focus} of the image.",
            requested_layout_instruction="",
            focus_instruction=get_focus_instruction(focus),
        )
        result = await generate_reviewed_analysis_with_fallback(
            content=[
                *focused_parts,
                {"type": "image_url", "image_url": {"url": image_data_url}},
            ],
            has_image=True,
            kimi_api_key=kimi_api_key,
            gemini_api_key=gemini_api_key,
            groq_api_key=api_key,
            openrouter_api_key=None,  # Will use manager
            prompt=f"Extract ONLY the {focus} of the image.",
            requested_layout_instruction="",
            focus_instruction=get_focus_instruction(focus),
        )
        analysis = result["reviewedAnalysis"]
        if get_analysis_quality_score(analysis) < AI_MIN_QUALITY_SCORE:
            return None
        components = [
            repair_dark_section_contrast(block)
            for block in build_components_from_analysis(analysis, focus)
        ]
        return components or None
    except Exception:
        return None


@app.post("/api/ai/generate-page-json")
async def generate_page_json(
    prompt: str = Form(""),
    pageType: str = Form("page"),
    image: UploadFile | None = File(None),
    token: str | None = Cookie(default=None),
) -> JSONResponse:
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    api_key = os.getenv("GROQ_API_KEY")
    kimi_api_key = os.getenv("KIMI_API_KEY") or os.getenv("MOONSHOT_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not kimi_api_key:
        raise HTTPException(status_code=500, detail="Missing KIMI_API_KEY server environment variable")

    page_type: PageContext = "header" if pageType == "header" else "footer" if pageType == "footer" else "page"
    user_prompt = sanitize_user_prompt(prompt)
    has_image = image is not None and bool(image.filename)
    final_prompt = user_prompt or (DEFAULT_IMAGE_RECREATE_PROMPT if has_image else "")
    image_data_url = ""

    if has_image and image is not None:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are supported")
        image_bytes = await image.read()
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="Image is too large. Maximum size is 8MB.")
        encoded = base64.b64encode(image_bytes).decode("ascii")
        image_data_url = f"data:{image.content_type};base64,{encoded}"

    analysis_parts = build_analysis_content(
        prompt=final_prompt,
        requested_layout_instruction="",
        focus_instruction=get_focus_instruction(page_type),
    )
    content: list[dict[str, Any]] = analysis_parts
    if has_image:
        content = [*analysis_parts, {"type": "image_url", "image_url": {"url": image_data_url}}]

    result = await generate_reviewed_analysis_with_fallback(
        content=content,
        has_image=has_image,
        prompt=final_prompt,
        requested_layout_instruction="",
        focus_instruction=get_focus_instruction(page_type),
        kimi_api_key=kimi_api_key,
        gemini_api_key=gemini_api_key,
        groq_api_key=api_key,
        openrouter_api_key=None,  # Will use manager
    )
    visible_analysis = result["reviewedAnalysis"]
    review_payload = result["reviewPayload"]
    quality_score = get_analysis_quality_score(visible_analysis)

    if quality_score < AI_MIN_QUALITY_SCORE:
        return JSONResponse(
            status_code=422,
            content={
                "message": "The AI result did not pass the quality check. Try a clearer prompt or a higher-resolution image.",
                "qualityScore": quality_score,
                "qualityNotes": get_analysis_quality_notes(visible_analysis),
            },
        )

    components = [
        repair_dark_section_contrast(block)
        for block in build_components_from_analysis(visible_analysis, page_type)
    ]

    if not components:
        raise HTTPException(
            status_code=422,
            detail="Groq returned JSON, but no valid builder components were found.",
        )

    header_components = None
    footer_components = None
    if page_type == "page" and has_image:
        header_components = await generate_for_focus(
            api_key, kimi_api_key, gemini_api_key, image_data_url, "header"
        )
        footer_components = await generate_for_focus(
            api_key, kimi_api_key, gemini_api_key, image_data_url, "footer"
        )

    return JSONResponse(
        {
            "components": components,
            "headerComponents": header_components,
            "footerComponents": footer_components,
            "analysis": visible_analysis,
            "requestedLayout": "auto",
            "pageType": page_type,
            "provider": result["provider"],
            "model": result["model"],
            "reviewModel": KIMI_REVIEW_MODEL,
            "reviewProvider": result.get("reviewerProvider", "kimi"),
            "qualityScore": quality_score,
            "qualityNotes": get_analysis_quality_notes(visible_analysis),
            "usage": {
                "analysis": result["payload"].get("usage"),
                "review": review_payload.get("usage"),
            },
        }
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"ok": "true"}
