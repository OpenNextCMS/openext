#!/usr/bin/env python3
"""Scrape curated real homepage URLs and write PageOutline JSONL."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.paths import RAW_DIR, SOURCES_DIR  # noqa: E402
from lib.scrape_outline import USER_AGENT, scrape_site  # noqa: E402

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None


def load_curated(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return list(data.get("sites", []))


def load_existing_urls(path: Path) -> set[str]:
    urls: set[str] = set()
    if not path.exists():
        return urls
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                if row.get("url"):
                    urls.add(row["url"])
            except json.JSONDecodeError:
                continue
    return urls


def load_jsonl_by_url(path: Path) -> dict[str, dict]:
    by_url: dict[str, dict] = {}
    if not path.exists():
        return by_url
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                if row.get("url"):
                    by_url[row["url"]] = row
            except json.JSONDecodeError:
                continue
    return by_url


def is_failed_outline(row: dict) -> bool:
    if row.get("error") and not row.get("sections"):
        return True
    sections = row.get("sections") or []
    return len(sections) < 3


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape real sites into PageOutline JSONL")
    parser.add_argument(
        "--input",
        type=Path,
        default=SOURCES_DIR / "real_sites_curated.json",
        help="Curated URL registry",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=RAW_DIR / "scrape_outlines.jsonl",
    )
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--limit", type=int, default=0, help="Max sites (0 = all)")
    parser.add_argument("--resume", action="store_true", default=True)
    parser.add_argument("--no-robots", action="store_true", help="Skip robots.txt check")
    parser.add_argument(
        "--only-failures",
        action="store_true",
        help="Re-scrape URLs with empty sections or scrape errors in existing output",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="HTTP client timeout in seconds",
    )
    args = parser.parse_args()

    if httpx is None:
        raise SystemExit("Install httpx: pip install -r training/requirements.txt")

    sites = load_curated(args.input)
    if args.limit > 0:
        sites = sites[: args.limit]

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    existing_by_url = load_jsonl_by_url(args.output) if args.resume or args.only_failures else {}
    existing = set(existing_by_url.keys())

    if args.only_failures:
        failure_urls = {url for url, row in existing_by_url.items() if is_failed_outline(row)}
        sites = [s for s in sites if s["url"] in failure_urls]
        print(f"Re-scraping {len(sites)} failed URL(s)")
        if not sites:
            print("No failed URLs to re-scrape")
            return

    ok = 0
    skipped = 0
    failed = 0

    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    updated: dict[str, dict] = dict(existing_by_url)

    with httpx.Client(headers=headers, timeout=args.timeout, follow_redirects=True) as client:
        for site in sites:
            url = site["url"]
            if url in existing and not args.only_failures:
                skipped += 1
                continue
            row = {"siteMeta": site, **site}
            try:
                outline = scrape_site(
                    url,
                    client,
                    delay_sec=args.delay,
                    check_robots=not args.no_robots,
                )
                row.update(outline)
                if outline.get("error"):
                    failed += 1
                    print(f"FAIL {site['id']}: {outline['error']}")
                elif outline.get("statusCode") != 200:
                    failed += 1
                    print(f"FAIL {site['id']}: HTTP {outline.get('statusCode')}")
                else:
                    ok += 1
                    print(f"OK   {site['id']}: {len(outline.get('sections', []))} sections")
                updated[url] = row
            except Exception as exc:  # noqa: BLE001
                failed += 1
                err_row = {"url": url, "siteMeta": site, **site, "error": str(exc), "sections": []}
                updated[url] = err_row
                print(f"ERR  {site['id']}: {exc}")

    with args.output.open("w", encoding="utf-8") as out_f:
        for row in updated.values():
            out_f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Done. ok={ok} skipped={skipped} failed={failed} -> {args.output}")


if __name__ == "__main__":
    main()
