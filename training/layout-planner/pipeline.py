#!/usr/bin/env python3
"""
Full pipeline: user prompt → layout (trained model) + content (LLM API) → combined JSON + HTML preview.

This module is isolated under training/layout-planner/ — NOT integrated into the Next.js CMS.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_MODULE = Path(__file__).resolve().parent
if str(_MODULE) not in sys.path:
    sys.path.insert(0, str(_MODULE))

# Load repo-root .env (OPENROUTER_API_KEY, etc.) when running pipeline locally
try:
    from dotenv import load_dotenv

    load_dotenv(_MODULE.parent.parent / ".env")
except ImportError:
    pass

from lib.content_filler import fill_content  # noqa: E402
from lib.html_preview import render_html, save_preview  # noqa: E402
from lib.inference import LayoutPlannerModel, plan_layout_fast  # noqa: E402
from lib.json_utils import to_compact_json  # noqa: E402
from lib.paths import DEFAULT_MODEL_DIR  # noqa: E402
from lib.layout_validate import validate_filled_page  # noqa: E402


def generate_page(
    prompt: str,
    *,
    page_name: str = "Home",
    model_dir: Path = DEFAULT_MODEL_DIR,
    skip_content: bool = False,
    provider: str | None = None,
    llm_model: str | None = None,
    fast_layout: bool = False,
) -> dict:
    """
    Two-stage generation:
      1. Layout Planner (fine-tuned FLAN-T5) → structure + theme + styles
      2. Content Filler (OpenRouter/Gemini API) → marketing copy + images

    Returns combined page document ready to paste as JSON or open as HTML.
    """
    if fast_layout:
        layout_result = plan_layout_fast(prompt, page_name=page_name)
    else:
        planner = LayoutPlannerModel(model_dir=model_dir)
        layout_result = planner.plan_layout(prompt, page_name=page_name)

    layout_plan = layout_result.get("layoutPlan")
    if not layout_plan:
        return {
            "success": False,
            "stage": "layout",
            "errors": layout_result.get("errors", ["no layout produced"]),
        }

    layout_source = layout_result.get("source", "unknown")

    if skip_content:
        return {
            "success": True,
            "stage": "layout_only",
            "page": layout_plan,
            "layoutValid": layout_result.get("valid", True),
            "layoutSource": layout_source,
        }

    fill_result = fill_content(
        layout_plan,
        prompt,
        provider=provider,  # type: ignore[arg-type]
        model=llm_model,
    )

    page_doc = fill_result["page"]
    fill_errors = fill_result.get("errors") or []
    validation_errors = validate_filled_page(page_doc)

    return {
        "success": fill_result["valid"] and not validation_errors,
        "stage": "complete",
        "page": page_doc,
        "layoutValid": layout_result.get("valid", True),
        "layoutSource": layout_source,
        "contentFillErrors": fill_errors,
        "validationErrors": validation_errors,
        "meta": {
            "prompt": prompt,
            "pageName": page_name,
            "websiteType": page_doc.get("meta", {}).get("websiteType"),
            "business": page_doc.get("meta", {}).get("business"),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="OpenNext Layout Planner - prompt to layout (model) + content (API) to JSON + HTML"
    )
    parser.add_argument("--prompt", required=True, help="User website brief")
    parser.add_argument("--page-name", default="Home", help="Home | About | Pricing | Contact | ...")
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--output-json", type=Path, help="Save combined page JSON here")
    parser.add_argument("--output-html", type=Path, help="Save standalone HTML preview here")
    parser.add_argument("--layout-only", action="store_true", help="Skip LLM content filling")
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Skip model inference; use training retrieval / wizard template (instant valid JSON)",
    )
    parser.add_argument("--provider", choices=["openrouter", "gemini"], default=None)
    parser.add_argument("--llm-model", default=None, help="Override LLM model id")
    parser.add_argument("--print-json", action="store_true", help="Print compact JSON to stdout")
    args = parser.parse_args()

    result = generate_page(
        args.prompt,
        page_name=args.page_name,
        model_dir=args.model_dir,
        skip_content=args.layout_only,
        provider=args.provider,
        llm_model=args.llm_model,
        fast_layout=args.fast,
    )

    if not result.get("success") and result.get("stage") == "layout":
        print("Layout planning failed:", result.get("errors"), file=sys.stderr)
        sys.exit(1)

    if (
        result.get("layoutSource")
        and result.get("layoutSource") != "model"
        and not args.fast
    ):
        print(
            f"Note: layout structure from {result['layoutSource']} fallback "
            f"(model output did not pass validation).",
            file=sys.stderr,
        )

    page_doc = result.get("page")
    if page_doc is None:
        print("No page output produced.", file=sys.stderr)
        sys.exit(1)

    compact = to_compact_json(page_doc)

    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(page_doc, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"JSON saved -> {args.output_json}")

    if args.output_html:
        save_preview(page_doc, str(args.output_html))
        print(f"HTML preview -> {args.output_html}")

    if args.print_json or (not args.output_json and not args.output_html):
        print(compact)

    if result.get("validationErrors"):
        print("Validation warnings:", result["validationErrors"], file=sys.stderr)

    if not result.get("success"):
        sys.exit(2)


if __name__ == "__main__":
    main()
