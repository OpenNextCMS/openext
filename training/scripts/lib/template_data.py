"""Embedded wizard template registries from src/templates."""
from __future__ import annotations

HOMEPAGE_TEMPLATES: dict[str, list[str]] = {
    "agency": ["hero-main", "feature-trio", "content-split", "statistics-boxed", "testimonial-main", "contact-simple"],
    "saas": ["hero-centered", "feature-horizontal", "content-detail", "statistics-main", "testimonial-single-large", "contact-simple"],
    "ecommerce": ["hero-main", "content-categories", "ecommerce-grid", "feature-boxed", "testimonial-single", "ecommerce-info"],
    "portfolio": ["hero-centered", "content-split", "content-gallery", "statistics-side-image", "testimonial-single", "contact"],
    "corporate": ["hero-main", "content-trio", "feature-side-image", "statistics-boxed", "testimonial-single-large", "contact-simple"],
    "restaurant": ["hero-main", "content-gallery", "feature-trio", "content-detail", "testimonial-main", "contact"],
    "real-estate": ["hero-main", "statistics-main", "content-gallery", "feature-boxed", "testimonial-main", "contact"],
    "personal-brand": ["hero-centered", "content-split", "feature-trio", "statistics-side-image", "testimonial-single-large", "contact-simple"],
    "healthcare": ["hero-main", "feature-trio", "content-detail", "statistics-boxed", "testimonial-main", "contact-simple"],
    "education": ["hero-centered", "content-trio", "feature-horizontal", "statistics-main", "testimonial-single", "contact"],
}

DEFAULT_PAGES: dict[str, list[str]] = {
    "agency": ["Home", "About", "Services", "Portfolio", "Contact"],
    "saas": ["Home", "Features", "Pricing", "Blog", "Contact"],
    "ecommerce": ["Home", "Shop", "Collections", "About", "Contact"],
    "portfolio": ["Home", "Projects", "About", "Resume", "Contact"],
    "corporate": ["Home", "About", "Services", "Case Studies", "Contact"],
    "restaurant": ["Home", "Menu", "Gallery", "About", "Contact"],
    "real-estate": ["Home", "Listings", "Agents", "About", "Contact"],
    "personal-brand": ["Home", "About", "Work", "Contact"],
    "healthcare": ["Home", "Services", "About", "Contact"],
    "education": ["Home", "Courses", "About", "Contact"],
}

PAGE_BLOCKS: dict[str, list[str]] = {
    "About": ["hero-centered", "content-split", "content-detail", "statistics-boxed"],
    "Services": ["hero-main", "feature-trio", "content-split", "contact-simple"],
    "Portfolio": ["hero-centered", "content-gallery", "testimonial-single"],
    "Projects": ["hero-centered", "content-gallery", "statistics-side-image"],
    "Work": ["hero-centered", "content-gallery", "testimonial-single"],
    "Gallery": ["hero-centered", "content-gallery", "feature-trio"],
    "Contact": ["hero-centered", "contact"],
    "Features": ["hero-main", "feature-horizontal", "statistics-main", "contact-simple"],
    "Pricing": ["hero-centered", "feature-boxed", "contact-simple"],
    "Blog": ["hero-centered", "blog-feed"],
    "Shop": ["hero-main", "content-categories", "ecommerce-grid"],
    "Collections": ["hero-centered", "content-gallery", "ecommerce-grid"],
    "Case Studies": ["hero-centered", "content-gallery", "statistics-boxed", "testimonial-main"],
    "Menu": ["hero-centered", "content-gallery", "feature-trio"],
    "Listings": ["hero-main", "content-gallery", "statistics-main"],
    "Agents": ["hero-centered", "content-trio", "testimonial-main"],
    "Resume": ["hero-centered", "content-detail", "statistics-side-image", "feature-checklist"],
    "Courses": ["hero-centered", "content-trio", "feature-horizontal", "contact-simple"],
}

FALLBACK_PAGE_BLOCKS = ["hero-centered", "content-split", "contact-simple"]


def get_homepage_blocks(website_type: str) -> list[str]:
    return HOMEPAGE_TEMPLATES.get(website_type, HOMEPAGE_TEMPLATES["agency"])


def get_page_blocks(page_name: str) -> list[str]:
    return PAGE_BLOCKS.get(page_name, FALLBACK_PAGE_BLOCKS)
