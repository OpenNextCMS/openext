#!/usr/bin/env python3
"""
Derive REAL-WORLD LayoutPlans by scraping live websites (no LLM, no API cost).

For each seeded URL we fetch the HTML, walk the section sequence in document
order, classify each section into the CMS block taxonomy with keyword/structural
heuristics, and emit a STRUCTURE-ONLY LayoutPlan (content:{}). Nav-first /
footer-last / single-hero / complexity rules are enforced by construction so the
real section *sequence* is preserved while the plan still validates.

Output: training/data/raw/raw_pairs.jsonl  (same schema as generate_training_data.py)
  {id, brief, websiteType, style, complexity, location, business, source_url, valid, plan}

Usage:
  python scrape_layouts.py                 # all seeds
  python scrape_layouts.py --limit 8       # first 8 (smoke)
  python scrape_layouts.py --delay 1.0     # politeness delay between requests

Respect site terms/robots; this is low-volume research scraping of public pages.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from validate_layout_plan import validate_plan  # noqa: E402

DATA_DIR = HERE.parent.parent / "data"
RAW_OUT = DATA_DIR / "raw" / "raw_pairs.jsonl"

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"}

# inner pages crawled on domains whose homepage worked (each is a different real layout)
INNER_PATHS = ["/pricing", "/about", "/features", "/contact", "/blog", "/solutions",
               "/services", "/products", "/plans", "/company", "/customers", "/about-us",
               "/menu", "/how-it-works", "/enterprise", "/case-studies", "/careers",
               "/for-business", "/reviews", "/faq"]
PATH_KIND = {"/pricing": "pricing", "/about": "about", "/about-us": "about",
             "/features": "features", "/contact": "contact", "/blog": "blog",
             "/solutions": "solutions", "/services": "services", "/products": "products",
             "/plans": "pricing", "/company": "about", "/customers": "customers",
             "/menu": "features", "/how-it-works": "features", "/enterprise": "solutions",
             "/case-studies": "about", "/careers": "about", "/for-business": "solutions",
             "/reviews": "about", "/faq": "contact"}

# ---- seed sites per websiteType (marketing/business homepages that tend to SSR) ----
SEEDS: dict[str, list[str]] = {
    "agency": ["https://www.squarespace.com", "https://basecamp.com", "https://webflow.com",
               "https://www.wix.com", "https://www.framer.com", "https://www.godaddy.com",
               "https://www.wordpress.com", "https://carrd.co", "https://www.hostinger.com",
               "https://www.ionos.com"],
    "saas": ["https://www.notion.so", "https://slack.com", "https://www.dropbox.com",
             "https://www.hubspot.com", "https://www.atlassian.com", "https://mailchimp.com",
             "https://www.zoom.us", "https://www.docusign.com", "https://monday.com",
             "https://asana.com", "https://www.twilio.com", "https://www.cloudflare.com",
             "https://www.digitalocean.com", "https://buffer.com", "https://www.zendesk.com"],
    "ecommerce": ["https://www.shopify.com", "https://www.bigcommerce.com", "https://www.etsy.com",
                  "https://www.gymshark.com", "https://www.allbirds.com", "https://www.warbyparker.com",
                  "https://www.casper.com", "https://www.glossier.com", "https://ruggable.com"],
    "corporate": ["https://www.ibm.com", "https://www.salesforce.com", "https://www.oracle.com",
                  "https://www.accenture.com", "https://www.deloitte.com", "https://www.pwc.com",
                  "https://www.sap.com", "https://www.kpmg.com", "https://www.ey.com"],
    "restaurant": ["https://www.opentable.com", "https://www.toasttab.com", "https://resy.com",
                   "https://www.doordash.com", "https://slicelife.com", "https://www.grubhub.com",
                   "https://www.ubereats.com", "https://www.yelp.com", "https://www.sweetgreen.com",
                   "https://www.chipotle.com", "https://www.panerabread.com", "https://www.dominos.com",
                   "https://www.pizzahut.com", "https://www.olivegarden.com", "https://www.shakeshack.com",
                   "https://www.dennys.com", "https://www.ihop.com", "https://www.cava.com",
                   "https://www.wingstop.com", "https://www.tlocations.com"],
    "real-estate": ["https://www.zillow.com", "https://www.redfin.com", "https://www.realtor.com",
                    "https://www.compass.com", "https://www.apartments.com", "https://www.trulia.com",
                    "https://www.opendoor.com", "https://www.century21.com", "https://www.coldwellbanker.com",
                    "https://www.remax.com", "https://www.homes.com", "https://www.loopnet.com",
                    "https://www.movoto.com", "https://www.homelight.com", "https://www.rockethomes.com",
                    "https://www.point2homes.com", "https://www.landwatch.com"],
    "healthcare": ["https://www.zocdoc.com", "https://www.teladoc.com", "https://www.onemedical.com",
                   "https://www.hims.com", "https://ro.co", "https://www.calm.com",
                   "https://www.headspace.com", "https://www.goodrx.com", "https://www.noom.com",
                   "https://www.forwardpathway.com", "https://cerebral.com", "https://www.talkspace.com",
                   "https://www.betterhelp.com", "https://curology.com", "https://www.lemonaidhealth.com",
                   "https://plushcare.com", "https://www.forhers.com", "https://www.carbonhealth.com"],
    "education": ["https://www.coursera.org", "https://www.udemy.com", "https://www.khanacademy.org",
                  "https://www.edx.org", "https://www.duolingo.com", "https://www.skillshare.com",
                  "https://www.codecademy.com", "https://www.masterclass.com", "https://brilliant.org",
                  "https://outschool.com", "https://www.mathnasium.com", "https://www.chegg.com",
                  "https://quizlet.com", "https://www.pluralsight.com", "https://www.futurelearn.com",
                  "https://alison.com", "https://www.udacity.com", "https://www.datacamp.com",
                  "https://www.thinkful.com", "https://www.varsitytutors.com"],
    "portfolio": ["https://www.behance.net", "https://dribbble.com", "https://readymag.com",
                  "https://www.format.com", "https://www.adobe.com/portfolio", "https://www.cargo.site",
                  "https://pixpa.com", "https://contra.com", "https://super.so", "https://carbonmade.com",
                  "https://www.dunked.com", "https://journoportfolio.com", "https://www.fabrik.io"],
    "personal-brand": ["https://www.patreon.com", "https://substack.com", "https://gumroad.com",
                       "https://beacons.ai", "https://linktr.ee", "https://www.kajabi.com",
                       "https://podia.com", "https://www.teachable.com", "https://convertkit.com",
                       "https://ghost.org", "https://www.buymeacoffee.com", "https://ko-fi.com",
                       "https://memberful.com", "https://mailerlite.com"],
}

# Additional SSR-friendly marketing sites to GROW the dataset beyond the first
# run's ~173 pages. Merged into SEEDS below. Curated toward server-rendered
# marketing/business sites (higher section-yield than JS-only SPAs).
EXTRA_SEEDS: dict[str, list[str]] = {
    "agency": ["https://www.pentagram.com", "https://www.huge.com", "https://www.instrument.com",
               "https://www.ueno.co", "https://www.metalab.com", "https://www.clay.global",
               "https://www.rga.com", "https://www.work-co.com", "https://www.fantasy.co",
               "https://www.hugeinc.com", "https://www.dept.com", "https://www.thoughtbot.com",
               "https://www.10up.com", "https://www.upstatement.com"],
    "saas": ["https://www.airtable.com", "https://linear.app", "https://www.figma.com",
             "https://www.intercom.com", "https://segment.com", "https://www.datadoghq.com",
             "https://www.pagerduty.com", "https://www.gitlab.com", "https://vercel.com",
             "https://www.netlify.com", "https://supabase.com", "https://planetscale.com",
             "https://www.retool.com", "https://www.calendly.com", "https://www.typeform.com",
             "https://www.loom.com", "https://www.miro.com", "https://clickup.com"],
    "ecommerce": ["https://www.mejuri.com", "https://www.brooklinen.com", "https://www.away.com",
                  "https://www.bombas.com", "https://www.mvmt.com", "https://tentree.com",
                  "https://www.rothys.com", "https://www.everlane.com", "https://mudwtr.com",
                  "https://www.olipop.com", "https://www.magicspoon.com", "https://drinkag1.com",
                  "https://www.hedleyandbennett.com", "https://www.thursdayboots.com"],
    "corporate": ["https://www.mckinsey.com", "https://www.bain.com", "https://www.bcg.com",
                  "https://www.gartner.com", "https://www.grantthornton.com", "https://www.bdo.com",
                  "https://www.aon.com", "https://www.marsh.com", "https://www.wework.com",
                  "https://www.jll.com", "https://www.cbre.com", "https://www.aecom.com"],
    "restaurant": ["https://www.blazepizza.com", "https://www.mod-pizza.com", "https://www.honeygrow.com",
                   "https://www.tacobell.com", "https://www.chick-fil-a.com", "https://www.jerseymikes.com",
                   "https://www.firstwatch.com", "https://www.noodles.com", "https://www.potbelly.com",
                   "https://www.qdoba.com", "https://www.eltacoloco.com", "https://www.tropicalsmoothiecafe.com"],
    "real-estate": ["https://www.corcoran.com", "https://www.sothebysrealty.com", "https://www.douglaselliman.com",
                    "https://www.kw.com", "https://www.exp.com", "https://www.weichert.com",
                    "https://www.howardhanna.com", "https://www.baird-warner.com", "https://www.longandfoster.com"],
    "healthcare": ["https://www.oscar.com", "https://www.pelotonhealth.com", "https://www.maven.com",
                   "https://www.included.health", "https://www.omadahealth.com", "https://www.spring.health",
                   "https://www.alto.com", "https://www.capsule.com", "https://www.parsleyhealth.com",
                   "https://www.tiahealth.com", "https://www.everlywell.com", "https://www.function.health"],
    "education": ["https://www.springboard.com", "https://www.generalassemb.ly", "https://www.lambdaschool.com",
                  "https://www.udacity.com", "https://www.educative.io", "https://scrimba.com",
                  "https://frontendmasters.com", "https://teamtreehouse.com", "https://www.365datascience.com",
                  "https://www.memrise.com", "https://www.babbel.com", "https://www.busuu.com"],
    "portfolio": ["https://www.awwwards.com", "https://www.uxfol.io", "https://www.copyfol.io",
                  "https://www.notionfolio.com", "https://www.wixstudio.com", "https://www.semplice.com",
                  "https://www.pixieset.com", "https://www.zenfolio.com", "https://www.smugmug.com",
                  "https://www.crevado.com", "https://www.portfoliobox.net"],
    "personal-brand": ["https://www.circle.so", "https://www.mighty.co", "https://www.thinkific.com",
                       "https://www.learnworlds.com", "https://www.systeme.io", "https://www.stan.store",
                       "https://www.milkshake.app", "https://www.snipfeed.co", "https://www.disco.co",
                       "https://www.searchie.io", "https://www.uscreen.tv"],
}

# Merge the extra seeds in (dedup, preserve order) so both batches are scraped.
for _wt, _urls in EXTRA_SEEDS.items():
    _existing = set(SEEDS.get(_wt, []))
    SEEDS.setdefault(_wt, [])
    SEEDS[_wt].extend(u for u in _urls if u not in _existing)

STYLE_FOR_TYPE = {
    "agency": "creative", "saas": "startup", "ecommerce": "ecommerce", "portfolio": "minimal",
    "personal-brand": "minimal", "corporate": "corporate", "restaurant": "luxury",
    "real-estate": "corporate", "healthcare": "minimal", "education": "modern",
}
KIND_NOUN = {
    "agency": "agency", "saas": "SaaS platform", "ecommerce": "online store",
    "portfolio": "portfolio", "personal-brand": "personal brand", "corporate": "corporate",
    "restaurant": "restaurant", "real-estate": "real estate", "healthcare": "healthcare",
    "education": "education platform",
}
PALETTES = {  # (primary, secondary, background, text, tint)
    "modern": ("#2563eb", "#7c3aed", "#ffffff", "#0f172a", "#f1f5f9"),
    "corporate": ("#1e3a5f", "#475569", "#ffffff", "#0f172a", "#eef2f7"),
    "minimal": ("#111827", "#6b7280", "#ffffff", "#111827", "#f5f5f5"),
    "luxury": ("#b8860b", "#1a1a1a", "#faf8f3", "#1a1a1a", "#f0ebe0"),
    "dark": ("#6366f1", "#22d3ee", "#0b0f19", "#e5e7eb", "#141a2b"),
    "creative": ("#ec4899", "#8b5cf6", "#0f0f17", "#f5f5f5", "#171225"),
    "startup": ("#2563eb", "#06b6d4", "#ffffff", "#0f172a", "#eff6ff"),
    "ecommerce": ("#ea580c", "#16a34a", "#ffffff", "#111827", "#fff7ed"),
}

# keyword -> block type (checked in priority order; first hit wins)
CLASSIFY = [
    ("pricing", ["pricing", "plan", "price", "tier", "subscription", "/mo", "per month"]),
    ("testimonial-main", ["testimonial", "review", "quote", "loved by", "customer stor", "what our"]),
    ("statistics-main", ["by the numbers", "stats", "metric", "results in", "trusted by millions"]),
    ("content-icons", ["trusted by", "as seen", "brands", "partners", "logos", "our clients"]),
    ("content-detail", ["faq", "frequently asked", "questions"]),
    ("content-gallery", ["gallery", "portfolio", "showcase", "our work", "projects", "case stud"]),
    ("content-trio", ["team", "our people", "leadership", "founders", "meet the"]),
    ("cta", ["get started", "sign up", "start free", "ready to", "join now", "try it", "book a demo", "call to action", "cta"]),
    ("contact", ["contact", "get in touch", "reach us", "talk to"]),
    ("feature-trio", ["feature", "benefit", "why ", "capabilit", "what you", "everything you", "how it works", "services", "solutions"]),
]
FAQ_MAP = "content-detail"      # no dedicated faq block type
NEWSLETTER_MAP = "form-block"
HERO_WORDS = ["hero", "banner", "masthead", "jumbotron", "intro", "above-the-fold"]

AFTER_HERO = {"feature-trio", "testimonial-main", "statistics-main", "pricing", "cta",
              "content-gallery", "content-icons", "content-trio", "content-detail",
              "content-features", "form-block", "contact"}

COMPLEXITY = lambda n: "simple" if n <= 6 else ("standard" if n <= 10 else "rich")


def _txt(el) -> str:
    parts = [el.get("id", "") or "", " ".join(el.get("class", []) or []), el.get("aria-label", "") or ""]
    h = el.find(["h1", "h2", "h3"])
    if h:
        parts.append(h.get_text(" ", strip=True)[:120])
    return " ".join(parts).lower()


def classify(el, is_first_content: bool) -> str:
    t = _txt(el)
    if any(w in t for w in HERO_WORDS):
        return "hero-centered"
    if el.find("form") and ("subscrib" in t or "newsletter" in t or "email" in t):
        return NEWSLETTER_MAP
    if "faq" in t or "frequently asked" in t:
        return FAQ_MAP
    for btype, kws in CLASSIFY:
        if kws and any(k in t for k in kws):
            return btype
    if is_first_content:
        return "hero-centered"
    return "content-features"


def find_sections(soup):
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    root = soup.find("main") or soup.body or soup
    secs = [s for s in root.find_all("section") if not s.find_parent("section")]
    if len(secs) >= 3:
        return secs
    cont = soup.find("main") or soup.body or soup
    kids = [c for c in cont.find_all(recursive=False) if getattr(c, "name", None)]
    if len(kids) == 1 and getattr(kids[0], "name", None) == "div":
        kids = [c for c in kids[0].find_all(recursive=False) if getattr(c, "name", None)]
    withhead = [k for k in kids if k.find(["h1", "h2", "h3"])]
    return withhead if len(withhead) >= 3 else (secs or withhead)


def site_name(soup, url: str) -> str:
    og = soup.find("meta", property="og:site_name")
    if og and og.get("content"):
        return og["content"].strip()[:60]
    if soup.title and soup.title.string:
        return re.split(r"[|\-–—:]", soup.title.string.strip())[0].strip()[:60]
    return re.sub(r"^https?://(www\.)?", "", url).split("/")[0]


def build_plan(url: str, wtype: str, soup, page_kind: str = "home") -> dict | None:
    style = STYLE_FOR_TYPE[wtype]
    primary, secondary, bg, text, tint = PALETTES[style]
    business = site_name(soup, url)

    raw_sections = find_sections(soup)
    types: list[str] = []
    for i, el in enumerate(raw_sections):
        bt = classify(el, is_first_content=(i == 0))
        if bt in ("nav-bar", "footer"):
            continue
        types.append(bt)

    # exactly one hero, placed first among content
    heroes = [i for i, t in enumerate(types) if t == "hero-centered"]
    if heroes:
        for j in heroes[1:]:
            types[j] = "content-features"
        hi = heroes[0]
        types.insert(0, types.pop(hi))  # move first hero to front
    else:
        types.insert(0, "hero-centered")

    # drop any afterHero that slipped before hero (hero now at index 0, so fine),
    # then cap to rich max (13 content) and dedup 3+ repeats
    deduped: list[str] = []
    for t in types:
        if len(deduped) >= 2 and deduped[-1] == t == deduped[-2]:
            continue
        deduped.append(t)
    content = deduped[:13]
    # need at least hero + 1 more content section to reach the 4-block minimum
    if len(content) < 2:
        return None

    blocks = [{"id": "nav", "type": "nav-bar", "order": 0,
               "styles": {"backgroundColor": bg, "color": text, "padding": "16px 32px"}, "content": {}}]
    for i, t in enumerate(content):
        section_bg = tint if i % 2 else bg
        if t == "cta":
            section_bg = primary
        blocks.append({
            "id": f"sec-{i}-{t}", "type": t, "order": i + 1,
            "styles": {"backgroundColor": section_bg,
                       "color": text if section_bg != primary else "#ffffff",
                       "padding": "80px 32px"},
            "content": {},
        })
    blocks.append({"id": "footer", "type": "footer", "order": len(blocks),
                   "styles": {"backgroundColor": PALETTES[style][3] if style not in ("dark", "creative", "luxury") else "#0b0f19",
                              "color": "#e2e8f0", "padding": "56px 32px"}, "content": {}})

    return {
        "meta": {"business": business or "Brand", "style": style, "websiteType": wtype,
                 "pageName": page_kind.capitalize(), "location": "", "complexity": COMPLEXITY(len(blocks))},
        "page": {"theme": {"primaryColor": primary, "secondaryColor": secondary,
                           "backgroundColor": bg, "textColor": text,
                           "fontFamily": "Inter, sans-serif", "borderRadius": "8px"},
                 "blocks": blocks},
    }


def make_brief(wtype: str, business: str, style: str, page_kind: str = "home") -> str:
    who = f" for {business}" if business and business.lower() not in ("brand", "home") else ""
    if page_kind in ("pricing", "contact", "about", "features", "services"):
        return f"Create a {style} {page_kind} page for a {KIND_NOUN[wtype]}{who}."
    return f"Create a {style} {KIND_NOUN[wtype]} website{who}."


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Scrape real websites into LayoutPlans.")
    ap.add_argument("--out", default=str(RAW_OUT))
    ap.add_argument("--limit", type=int, default=0, help="cap homepages (0 = all)")
    ap.add_argument("--delay", type=float, default=0.8, help="seconds between requests")
    ap.add_argument("--no-inner", action="store_true", help="skip Phase 2 inner-page crawl")
    args = ap.parse_args(argv)

    try:
        import requests
        from bs4 import BeautifulSoup
    except Exception:
        print("error: pip install requests beautifulsoup4 lxml", file=sys.stderr)
        return 1

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    done_urls = set()
    if out.is_file():
        for line in out.read_text(encoding="utf-8").splitlines():
            try:
                done_urls.add(json.loads(line).get("source_url"))
            except Exception:
                pass

    session = requests.Session()
    counter = {"n": 0}
    stats = {"ok": 0, "valid": 0, "fail": 0}

    def process(fout, wtype: str, url: str, page_kind: str) -> bool:
        """Fetch + build + write one page. Returns True if a valid plan was written."""
        if url in done_urls:
            return False
        done_urls.add(url)
        counter["n"] += 1
        i = counter["n"]
        try:
            r = session.get(url, headers=UA, timeout=25)
            if r.status_code >= 400:
                stats["fail"] += 1
                print(f"[{i}] {url} HTTP {r.status_code}")
                return False
            soup = BeautifulSoup(r.text, "lxml")
            plan = build_plan(url, wtype, soup, page_kind)
        except Exception as exc:
            stats["fail"] += 1
            print(f"[{i}] {url} ERR {str(exc)[:60]}")
            return False
        if plan is None:
            stats["fail"] += 1
            print(f"[{i}] {url} SKIP (too few sections)")
            return False
        rep = validate_plan(plan, url)
        rec = {"id": f"scrape-{i:04d}",
               "brief": make_brief(wtype, plan["meta"]["business"], plan["meta"]["style"], page_kind),
               "websiteType": wtype, "style": plan["meta"]["style"], "complexity": plan["meta"]["complexity"],
               "location": "", "business": plan["meta"]["business"], "source_url": url,
               "valid": rep.ok, "plan": plan}
        fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
        fout.flush()
        stats["ok"] += 1
        stats["valid"] += int(rep.ok)
        print(f"[{i}] {url} ({page_kind}) -> {'valid' if rep.ok else 'INVALID'} "
              f"{len(plan['page']['blocks'])} blocks")
        time.sleep(args.delay)
        return rep.ok

    homepages = [(wt, url) for wt, urls in SEEDS.items() for url in urls]
    if args.limit:
        homepages = homepages[:args.limit]

    with out.open("a", encoding="utf-8") as fout:
        # Phase 1: homepages
        print(f"=== Phase 1: {len(homepages)} homepages ===")
        working = []
        for wt, base in homepages:
            if process(fout, wt, base, "home"):
                working.append((wt, base))
        # Phase 2: inner pages of domains whose homepage worked
        if not args.no_inner:
            print(f"\n=== Phase 2: inner pages of {len(working)} working domains ===")
            for wt, base in working:
                for path in INNER_PATHS:
                    url = base.rstrip("/") + path
                    process(fout, wt, url, PATH_KIND.get(path, "page"))

    print(f"\nTOTAL: {stats['ok']} pages written ({stats['valid']} valid, "
          f"{stats['ok'] - stats['valid']} invalid), {stats['fail']} failed/skipped -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
