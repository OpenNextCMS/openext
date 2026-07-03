"""Render a standalone HTML preview from a filled page document."""
from __future__ import annotations

import html
import json
from typing import Any


def _esc(text: str) -> str:
    return html.escape(str(text or ""))


def _theme_css(theme: dict[str, Any]) -> str:
    primary = theme.get("primaryColor", "#2563eb")
    bg = theme.get("backgroundColor", "#ffffff")
    font = theme.get("fontFamily", "Inter, system-ui, sans-serif")
    radius = theme.get("borderRadius", "8px")
    return f"""
:root {{
  --primary: {primary};
  --bg: {bg};
  --font: {font};
  --radius: {radius};
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: var(--font); background: var(--bg); color: #0f172a; line-height: 1.6; }}
a {{ color: var(--primary); text-decoration: none; }}
img {{ max-width: 100%; height: auto; border-radius: var(--radius); }}
.container {{ max-width: 1100px; margin: 0 auto; padding: 0 24px; }}
section {{ padding: 64px 24px; }}
section.dark {{ background: #0f172a; color: #f8fafc; }}
.btn {{ display: inline-block; padding: 12px 24px; background: var(--primary); color: #fff; border-radius: var(--radius); font-weight: 600; margin-right: 12px; }}
.btn.outline {{ background: transparent; border: 2px solid var(--primary); color: var(--primary); }}
.grid {{ display: grid; gap: 24px; }}
.grid-2 {{ grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }}
.grid-3 {{ grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }}
.card {{ background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius); padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }}
nav {{ display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; background: #fff; position: sticky; top: 0; z-index: 10; }}
nav .logo {{ font-weight: 700; font-size: 1.25rem; color: var(--primary); }}
nav ul {{ display: flex; gap: 24px; list-style: none; }}
.hero {{ display: grid; gap: 48px; align-items: center; }}
.hero.split {{ grid-template-columns: 1fr 1fr; }}
.hero.center {{ text-align: center; }}
.hero h1 {{ font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1.15; margin-bottom: 16px; }}
.hero .sub {{ font-size: 1.125rem; color: #475569; margin-bottom: 24px; max-width: 560px; }}
.hero.center .sub {{ margin-left: auto; margin-right: auto; }}
.eyebrow {{ text-transform: uppercase; letter-spacing: .08em; font-size: .75rem; color: var(--primary); font-weight: 600; margin-bottom: 12px; }}
footer {{ background: #0f172a; color: #94a3b8; padding: 48px 24px; }}
footer h4 {{ color: #f8fafc; margin-bottom: 12px; }}
footer .cols {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 32px; margin-top: 24px; }}
@media (max-width: 768px) {{ .hero.split {{ grid-template-columns: 1fr; }} nav ul {{ display: none; }} }}
"""


def _block_html(block: dict[str, Any], theme: dict[str, Any]) -> str:
    btype = (block.get("type") or "").lower()
    content = block.get("content") or {}
    images = block.get("images") or {}
    styles = block.get("styles") or {}
    bg = styles.get("backgroundColor", "")
    extra_style = f' style="background:{bg};"' if bg else ""
    pad = styles.get("padding", "")
    if pad:
        extra_style = f' style="background:{bg or "inherit"};padding:{pad};"'

    def hero_img() -> str:
        src = images.get("heroImage") or images.get("image") or ""
        if src:
            return f'<img src="{_esc(src)}" alt="Hero" />'
        return ""

    if btype == "navbar":
        logo = _esc(content.get("logo") or content.get("brand") or "Brand")
        links = content.get("links") or []
        links_html = "".join(
            f'<li><a href="{_esc(l.get("href", "#"))}">{_esc(l.get("label", ""))}</a></li>'
            for l in links
            if isinstance(l, dict)
        )
        cta = content.get("cta") or {}
        cta_html = ""
        if isinstance(cta, dict) and cta.get("label"):
            cta_html = f'<a class="btn" href="{_esc(cta.get("href", "#"))}">{_esc(cta["label"])}</a>'
        return f'<nav><div class="container" style="display:flex;align-items:center;justify-content:space-between;width:100%"><span class="logo">{logo}</span><ul>{links_html}</ul>{cta_html}</div></nav>'

    if btype in ("hero", "herosplit", "herocentered"):
        variant = "center" if btype == "herocentered" else ("split" if btype == "herosplit" else "")
        layout = block.get("layout") or {}
        if layout.get("variant") == "centered":
            variant = "center"
        elif "split" in str(layout.get("variant", "")):
            variant = "split"
        eyebrow = content.get("eyebrow", "")
        headline = _esc(content.get("headline") or content.get("title") or "Welcome")
        sub = _esc(content.get("subheadline") or content.get("subtitle") or "")
        p_btn = content.get("primaryButton") or content.get("primaryCta") or ""
        s_btn = content.get("secondaryButton") or content.get("secondaryCta") or ""
        btns = ""
        if p_btn:
            btns += f'<a class="btn" href="#">{_esc(p_btn)}</a>'
        if s_btn:
            btns += f'<a class="btn outline" href="#">{_esc(s_btn)}</a>'
        text = f'<div><p class="eyebrow">{_esc(eyebrow)}</p><h1>{headline}</h1><p class="sub">{sub}</p><div>{btns}</div></div>'
        img = hero_img()
        if variant == "split" and img:
            inner = f'<div class="hero split"><div>{text}</div><div>{img}</div></div>'
        elif variant == "center":
            inner = f'<div class="hero center">{text}{img}</div>'
        else:
            inner = f'<div class="hero">{text}{img}</div>'
        return f'<section{extra_style}><div class="container">{inner}</div></section>'

    if btype in ("featuregrid", "featurecards", "services", "features"):
        title = _esc(content.get("title") or content.get("heading") or "Features")
        subtitle = _esc(content.get("subtitle") or content.get("description") or "")
        items = content.get("items") or content.get("features") or []
        cards = ""
        for item in items:
            if not isinstance(item, dict):
                continue
            cards += f'<div class="card"><h3>{_esc(item.get("title", ""))}</h3><p>{_esc(item.get("description", item.get("body", "")))}</p></div>'
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><p style="margin:12px 0 32px;color:#64748b">{subtitle}</p><div class="grid grid-3">{cards}</div></div></section>'

    if btype == "about":
        title = _esc(content.get("title") or content.get("heading") or "About Us")
        body = _esc(content.get("description") or content.get("body") or "")
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><p style="margin-top:16px;max-width:720px">{body}</p></div></section>'

    if btype == "stats":
        title = _esc(content.get("title") or "Our Impact")
        items = content.get("items") or content.get("stats") or []
        cells = "".join(
            f'<div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:700;color:var(--primary)">{_esc(it.get("value",""))}</div><div>{_esc(it.get("label",""))}</div></div>'
            for it in items
            if isinstance(it, dict)
        )
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><div class="grid grid-3" style="margin-top:32px">{cells}</div></div></section>'

    if btype == "testimonials":
        title = _esc(content.get("title") or "Testimonials")
        items = content.get("items") or []
        cards = ""
        for it in items:
            if not isinstance(it, dict):
                continue
            quote = _esc(it.get("feedback") or it.get("quote") or "")
            name = _esc(it.get("name", ""))
            role = _esc(it.get("role") or it.get("company") or "")
            cards += f'<div class="card"><p>"{quote}"</p><p style="margin-top:16px;font-weight:600">{name}</p><p style="color:#64748b;font-size:.875rem">{role}</p></div>'
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><div class="grid grid-2" style="margin-top:32px">{cards}</div></div></section>'

    if btype == "pricing":
        title = _esc(content.get("title") or "Pricing")
        plans = content.get("plans") or content.get("items") or []
        cards = ""
        for p in plans:
            if not isinstance(p, dict):
                continue
            feats = p.get("features") or []
            feat_html = "".join(f"<li>{_esc(f)}</li>" for f in feats)
            cards += f'<div class="card"><h3>{_esc(p.get("name",""))}</h3><p style="font-size:1.5rem;font-weight:700;margin:12px 0">{_esc(p.get("price",""))}</p><ul style="margin:16px 0;padding-left:20px">{feat_html}</ul><a class="btn" href="#">{_esc(p.get("cta","Choose"))}</a></div>'
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><div class="grid grid-3" style="margin-top:32px">{cards}</div></div></section>'

    if btype == "faq":
        title = _esc(content.get("title") or "FAQ")
        items = content.get("items") or []
        qa = ""
        for it in items:
            if not isinstance(it, dict):
                continue
            qa += f'<details class="card" style="margin-bottom:12px"><summary style="font-weight:600;cursor:pointer">{_esc(it.get("question",""))}</summary><p style="margin-top:12px;color:#475569">{_esc(it.get("answer",""))}</p></details>'
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><div style="margin-top:24px">{qa}</div></div></section>'

    if btype == "contact":
        title = _esc(content.get("title") or "Contact")
        subtitle = _esc(content.get("subtitle") or "")
        email = _esc(content.get("email", ""))
        phone = _esc(content.get("phone", ""))
        address = _esc(content.get("address", ""))
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><p style="margin:12px 0 24px;color:#64748b">{subtitle}</p><p><strong>Email:</strong> {email}</p><p><strong>Phone:</strong> {phone}</p><p><strong>Address:</strong> {address}</p></div></section>'

    if btype == "cta":
        title = _esc(content.get("title") or content.get("headline") or "Get Started")
        sub = _esc(content.get("subtitle") or "")
        btn = _esc(content.get("primaryButton") or content.get("buttonText") or "Contact Us")
        return f'<section class="dark"{extra_style}><div class="container" style="text-align:center"><h2>{title}</h2><p style="margin:16px 0 24px;opacity:.85">{sub}</p><a class="btn" href="#">{btn}</a></div></section>'

    if btype == "gallery":
        title = _esc(content.get("title") or "Gallery")
        items = content.get("items") or []
        imgs = ""
        for it in items:
            if isinstance(it, dict):
                src = it.get("src") or it.get("url") or ""
                if src:
                    imgs += f'<img src="{_esc(src)}" alt="{_esc(it.get("alt",""))}" />'
        return f'<section{extra_style}><div class="container"><h2>{title}</h2><div class="grid grid-3" style="margin-top:24px">{imgs}</div></div></section>'

    if btype == "footer":
        brand = _esc(content.get("brand") or content.get("logo") or "Brand")
        copyright_ = _esc(content.get("copyright") or f"© {brand}")
        cols = content.get("columns") or []
        cols_html = ""
        for col in cols:
            if not isinstance(col, dict):
                continue
            links = col.get("links") or []
            link_html = "".join(
                f'<li><a href="{_esc(l.get("href","#"))}">{_esc(l.get("label",""))}</a></li>'
                for l in links
                if isinstance(l, dict)
            )
            cols_html += f'<div><h4>{_esc(col.get("title",""))}</h4><ul style="list-style:none;margin-top:8px">{link_html}</ul></div>'
        return f'<footer{extra_style}><div class="container"><div class="logo" style="color:#f8fafc">{brand}</div><div class="cols">{cols_html}</div><p style="margin-top:32px;font-size:.875rem">{copyright_}</p></div></footer>'

    title = _esc(content.get("title") or btype)
    return f'<section{extra_style}><div class="container"><h2>{title}</h2></div></section>'


def render_html(page_doc: dict[str, Any]) -> str:
    """Build a complete standalone HTML page from a filled page document."""
    meta = page_doc.get("meta") or {}
    page = page_doc.get("page") or {}
    theme = page.get("theme") or {}
    blocks = sorted(
        page.get("blocks") or [],
        key=lambda b: b.get("order", 0) if isinstance(b, dict) else 0,
    )
    business = _esc(meta.get("business") or "Website")
    title = _esc(page.get("title") or meta.get("pageName") or business)
    body = "".join(_block_html(b, theme) for b in blocks if isinstance(b, dict))
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — {business}</title>
  <style>{_theme_css(theme)}</style>
</head>
<body>
{body}
</body>
</html>"""


def save_preview(page_doc: dict[str, Any], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(render_html(page_doc))
