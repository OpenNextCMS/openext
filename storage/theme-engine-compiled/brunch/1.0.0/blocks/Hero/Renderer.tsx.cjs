"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HeroRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeroRenderer({ data, block }) {
    const d = data || block?.data || {};
    const title = String(d.title || 'Brunch');
    const emphasis = String(d.titleEmphasis || 'Full Website');
    const subtitle = String(d.subtitle || 'Indian Cuisine');
    const ctaLabel = String(d.ctaLabel || 'Read More');
    const ctaHref = String(d.ctaHref || '#menu');
    const bg = String(d.backgroundImage ||
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1920&q=80');
    return ((0, jsx_runtime_1.jsx)("section", { className: "br-hero", id: "top", style: { backgroundImage: `url('${bg}')` }, children: (0, jsx_runtime_1.jsxs)("div", { className: "br-hero__card", children: [(0, jsx_runtime_1.jsxs)("h1", { children: [title, " ", (0, jsx_runtime_1.jsx)("em", { children: emphasis })] }), (0, jsx_runtime_1.jsx)("p", { children: subtitle }), (0, jsx_runtime_1.jsx)("a", { className: "br-btn br-btn--dark", href: ctaHref, children: ctaLabel })] }) }));
}
