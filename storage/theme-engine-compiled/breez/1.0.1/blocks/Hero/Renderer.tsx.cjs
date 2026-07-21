"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HeroRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeroRenderer({ data, block }) {
    const d = data || block?.data || {};
    const title = String(d.title || 'Mindfulness for Everyone, Anywhere');
    const description = String(d.description ||
        'Find calm in every moment with guided sessions, live classes, and a community built for everyday mindfulness — at home or on the go.');
    const ctaLabel = String(d.ctaLabel || 'Start Now');
    const ctaHref = String(d.ctaHref || '#start');
    const videoLabel = String(d.videoLabel || 'Watch video presentation');
    const videoHref = String(d.videoHref || '#video');
    const backgroundColor = String(d.backgroundColor || '#ffffff');
    const headingColor = String(d.headingColor || '#2b3142');
    const fontColor = String(d.fontColor || '#6b7288');
    const buttonColor = String(d.buttonColor || '#2b3142');
    const buttonTextColor = String(d.buttonTextColor || '#ffffff');
    const portrait = String(d.portraitImage ||
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80');
    const sky = String(d.skyImage ||
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80');
    return ((0, jsx_runtime_1.jsxs)("section", { className: "bz-hero", id: "top", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bz-hero__copy", style: { backgroundColor }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { color: headingColor }, children: title }), (0, jsx_runtime_1.jsx)("p", { style: { color: fontColor }, children: description }), (0, jsx_runtime_1.jsxs)("div", { className: "bz-hero__cta-row", children: [(0, jsx_runtime_1.jsx)("a", { className: "bz-btn bz-btn--navy", href: ctaHref, style: { backgroundColor: buttonColor, color: buttonTextColor }, children: ctaLabel }), (0, jsx_runtime_1.jsxs)("a", { className: "bz-video-link", href: videoHref, style: { color: headingColor }, children: [(0, jsx_runtime_1.jsx)("span", { className: "bz-video-link__icon", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { d: "M2 1.5v7l6-3.5z" }) }) }), videoLabel] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "bz-hero__visual", style: {
                    backgroundImage: `linear-gradient(160deg, rgba(255,186,160,0.35), rgba(244,168,148,0.12)), url('${sky}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }, children: (0, jsx_runtime_1.jsx)("div", { className: "bz-frame bz-hero__frame", children: (0, jsx_runtime_1.jsx)("img", { src: portrait, alt: "Couple meditating on the beach" }) }) })] }));
}
