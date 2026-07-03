"""Fetch real homepages and extract structural PageOutline for layout mapping."""
from __future__ import annotations

import hashlib
import re
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None

try:
    from bs4 import BeautifulSoup, Tag
except ImportError:  # pragma: no cover
    BeautifulSoup = None
    Tag = Any  # type: ignore[misc, assignment]

USER_AGENT = "OpenNextLayoutResearchBot/1.0 (academic dataset; homepage structure only)"
DEFAULT_DELAY_SEC = 2.0
MAX_SECTIONS = 12

PRICE_RE = re.compile(r"\$\s?\d+|\d+\s?/mo|per month|pricing", re.I)
FAQ_RE = re.compile(r"faq|frequently asked|accordion", re.I)
TESTIMONIAL_RE = re.compile(r"testimonial|review|quote|what people say", re.I)
TEAM_RE = re.compile(r"team|our people|leadership|staff", re.I)
NEWSLETTER_RE = re.compile(r"newsletter|subscribe|sign up for", re.I)
CTA_RE = re.compile(r"get started|sign up|book now|contact us|try free", re.I)


def _domain(url: str) -> str:
    return urlparse(url).netloc


def _can_fetch(url: str, client: httpx.Client) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = RobotFileParser()
    try:
        resp = client.get(robots_url, timeout=15.0)
        if resp.status_code >= 400:
            return True
        rp.parse(resp.text.splitlines())
        return rp.can_fetch(USER_AGENT, url)
    except Exception:
        return True


def fetch_html(url: str, client: httpx.Client) -> tuple[int, str, str]:
    """Returns (status_code, html, content_hash)."""
    resp = client.get(url, follow_redirects=True)
    html = resp.text
    content_hash = hashlib.sha256(html.encode("utf-8", errors="ignore")).hexdigest()[:16]
    return resp.status_code, html, content_hash


def _text(el: Tag | None, limit: int = 120) -> str:
    if el is None:
        return ""
    t = " ".join(el.get_text(" ", strip=True).split())
    return t[:limit]


def _class_str(el: Tag) -> str:
    classes = el.get("class") or []
    return " ".join(classes).lower() if isinstance(classes, list) else str(classes).lower()


def _id_str(el: Tag) -> str:
    return (el.get("id") or "").lower()


def _has_large_image(section: Tag) -> bool:
    for img in section.find_all("img", limit=8):
        w = img.get("width") or img.get("data-width") or ""
        if isinstance(w, str) and w.isdigit() and int(w) >= 200:
            return True
        src = (img.get("src") or "").lower()
        if src and "logo" not in src and "icon" not in src:
            return True
    style = section.get("style") or ""
    if "background-image" in str(style).lower():
        return True
    if section.find(style=re.compile(r"background-image", re.I)):
        return True
    return len(section.find_all("img")) > 0


def _grid_column_count(section: Tag) -> int:
    children = [c for c in section.find_all(recursive=False) if isinstance(c, Tag)]
    if len(children) >= 2:
        return min(len(children), 4)
    cards = section.find_all(class_=re.compile(r"card|col-|grid|feature|item", re.I))
    if len(cards) >= 2:
        return min(len(cards), 4)
    lis = section.find_all("li")
    if 2 <= len(lis) <= 8:
        return min(len(lis), 4)
    return 0


def _is_split_layout(section: Tag) -> bool:
    cls = _class_str(section) + " " + _id_str(section)
    if re.search(r"split|two-col|2-col|side-by-side|hero--split", cls):
        return True
    direct = [c for c in section.children if isinstance(c, Tag)]
    has_img = any(c.name == "img" or c.find("img") for c in direct[:4])
    has_text = any(c.find(["h1", "h2", "p"]) for c in direct[:4])
    return has_img and has_text and len(direct) >= 2


def _img_before_h1(section: Tag) -> bool:
    first_img = section.find("img")
    first_h1 = section.find("h1")
    if not first_img or not first_h1:
        return False
    # Document order compare via sourcepos not available; use find_all order
    for el in section.find_all(["img", "h1"], limit=20):
        if el.name == "img":
            return True
        if el.name == "h1":
            return False
    return False


def _detect_signals(section: Tag, is_first_content: bool) -> list[str]:
    signals: list[str] = []
    cls = _class_str(section) + " " + _id_str(section)
    text_blob = _text(section, 500).lower()

    if section.find("h1"):
        signals.append("h1")
    if section.find("h2"):
        signals.append("h2")
    if section.find("h3"):
        signals.append("h3")

    if _has_large_image(section):
        signals.append("hero-image")
    if is_first_content and section.find("h1"):
        signals.append("hero-candidate")

    if _is_split_layout(section):
        signals.append("split-layout")
    if _img_before_h1(section):
        signals.append("stacked-image-top")

    cols = _grid_column_count(section)
    if cols == 2:
        signals.append("2-column-grid")
    elif cols == 3:
        signals.append("3-column-grid")
    elif cols >= 4:
        signals.append("4-column-grid")
    if section.find(class_=re.compile(r"icon|svg", re.I)) or section.find("svg"):
        signals.append("icons")
    if section.find(class_=re.compile(r"card", re.I)):
        signals.append("card-grid")

    if section.find("blockquote") or TESTIMONIAL_RE.search(cls + text_blob):
        signals.append("testimonial")
    if section.find("details") or section.find(class_=re.compile(r"accordion", re.I)) or FAQ_RE.search(cls + text_blob):
        signals.append("faq")
    if PRICE_RE.search(text_blob) or re.search(r"pricing|plan", cls):
        signals.append("pricing-table")
    if section.find("form") or section.find("input"):
        if section.find("form") and (section.find("textarea") or section.find("input")):
            signals.append("contact-form")
    if NEWSLETTER_RE.search(text_blob):
        signals.append("newsletter")
    if CTA_RE.search(text_blob) and is_first_content is False:
        signals.append("cta-banner")
    if TEAM_RE.search(cls + text_blob):
        signals.append("team-grid")
    if section.find_all("img") and len(section.find_all("img")) >= 4 and "gallery" in cls:
        signals.append("image-gallery")
    elif len(section.find_all("img")) >= 6:
        signals.append("image-gallery")
    if re.search(r"logo|client|trusted|partner", cls + text_blob):
        signals.append("logo-strip")
    if re.search(r"stat|metric|number|counter|\d+\+", cls + text_blob):
        signals.append("statistics")
    if re.search(r"blog|article|post|news", cls + text_blob):
        signals.append("blog-list")
    if re.search(r"step|process|how it works", cls + text_blob):
        signals.append("process-steps")

    align = section.get("style") or ""
    if "center" in str(align).lower() or "text-align:center" in cls:
        signals.append("centered-text")

    return list(dict.fromkeys(signals))


def _collect_style_hints(soup: BeautifulSoup) -> dict[str, Any]:
    hints: dict[str, Any] = {"backgroundColors": [], "fontFamilies": [], "isDark": False}
    body = soup.find("body")
    if body:
        bg = body.get("style") or ""
        m = re.search(r"background(?:-color)?\s*:\s*([^;]+)", str(bg), re.I)
        if m:
            hints["backgroundColors"].append(m.group(1).strip())
    for link in soup.find_all("link", href=re.compile(r"fonts\.googleapis", re.I), limit=2):
        hints["fontFamilies"].append("Google Fonts")
    html = soup.find("html")
    if html and "dark" in _class_str(html):
        hints["isDark"] = True
    return hints


def extract_page_outline(url: str, html: str, status_code: int) -> dict[str, Any]:
    if BeautifulSoup is None:
        raise RuntimeError("beautifulsoup4 is required")

    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    title = _text(soup.find("title"), 200)
    nav_el = soup.find("header") or soup.find("nav") or soup.find(attrs={"role": "banner"})
    footer_el = soup.find("footer") or soup.find(attrs={"role": "contentinfo"})

    sections: list[dict[str, Any]] = []
    idx = 0

    if nav_el:
        sections.append(
            {
                "index": idx,
                "tag": nav_el.name,
                "headings": [_text(h) for h in nav_el.find_all(["h1", "h2"], limit=2) if _text(h)],
                "signals": ["logo", "nav-links"],
            }
        )
        idx += 1

    candidates: list[Tag] = []
    main = soup.find("main") or soup.find(attrs={"role": "main"})
    if main:
        candidates.extend(
            [el for el in main.find_all(["section", "article", "div"], recursive=False, limit=MAX_SECTIONS) if isinstance(el, Tag)]
        )
    if len(candidates) < 3:
        candidates = [el for el in soup.find_all("section", limit=MAX_SECTIONS) if isinstance(el, Tag)]
    if len(candidates) < 3:
        candidates = [
            el
            for el in soup.find_all(["section", "article"], limit=MAX_SECTIONS)
            if isinstance(el, Tag) and el != nav_el and el != footer_el
        ]
    if len(candidates) < 3 and main:
        candidates = [
            el
            for el in main.find_all(["div", "article"], recursive=False, limit=MAX_SECTIONS)
            if isinstance(el, Tag)
        ]
    if len(candidates) < 3:
        for el in soup.find_all(["div", "article"], limit=MAX_SECTIONS * 2):
            if not isinstance(el, Tag) or el == nav_el or el == footer_el:
                continue
            cls = _class_str(el) + " " + _id_str(el)
            if re.search(r"hero|banner|jumbotron|masthead|showcase|content|wrapper", cls):
                candidates.append(el)
    if len(candidates) < 3:
        body = soup.find("body")
        if body:
            for child in body.children:
                if not isinstance(child, Tag):
                    continue
                if child in (nav_el, footer_el) or child.name not in ("div", "article", "section"):
                    continue
                candidates.append(child)
                if len(candidates) >= MAX_SECTIONS:
                    break

    content_index = 0
    for el in candidates:
        if el == nav_el or el == footer_el:
            continue
        if len(sections) >= MAX_SECTIONS + 2:
            break
        text_len = len(_text(el))
        if text_len < 20 and not el.find("img"):
            continue
        is_first = content_index == 0
        signals = _detect_signals(el, is_first)
        if not signals and not el.find(["h1", "h2", "img"]):
            continue
        sections.append(
            {
                "index": idx,
                "tag": el.name,
                "headings": [_text(h) for h in el.find_all(["h1", "h2", "h3"], limit=3) if _text(h)],
                "signals": signals or ["content-block"],
            }
        )
        idx += 1
        content_index += 1

    if footer_el:
        sections.append(
            {
                "index": idx,
                "tag": footer_el.name,
                "headings": [_text(h) for h in footer_el.find_all(["h2", "h3"], limit=2) if _text(h)],
                "signals": ["footer-links"],
            }
        )

    return {
        "url": url,
        "statusCode": status_code,
        "title": title,
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "navDetected": nav_el is not None,
        "footerDetected": footer_el is not None,
        "sections": sections,
        "styleHints": _collect_style_hints(soup),
    }


def scrape_site(
    url: str,
    client: httpx.Client,
    *,
    delay_sec: float = DEFAULT_DELAY_SEC,
    check_robots: bool = True,
) -> dict[str, Any]:
    if httpx is None:
        raise RuntimeError("httpx is required; pip install -r training/requirements.txt")

    if check_robots and not _can_fetch(url, client):
        return {
            "url": url,
            "statusCode": 0,
            "error": "robots_txt_disallowed",
            "sections": [],
            "navDetected": False,
            "footerDetected": False,
        }

    time.sleep(delay_sec)
    status, html, content_hash = fetch_html(url, client)
    outline = extract_page_outline(url, html, status)
    outline["contentHash"] = content_hash
    return outline
