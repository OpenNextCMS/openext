"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ExperienceRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
function Scribble() {
    return ((0, jsx_runtime_1.jsxs)("svg", { className: "bz-scribble bz-scribble--experience", viewBox: "0 0 1200 180", fill: "none", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("path", { d: "M20 90 C120 20, 220 160, 320 90 S520 20, 620 90 820 160, 920 90 1120 20, 1180 90", stroke: "currentColor", strokeWidth: "1.5" }), (0, jsx_runtime_1.jsx)("path", { d: "M40 110 C140 40, 240 170, 340 110 S540 40, 640 110 840 170, 940 110 1120 50, 1160 100", stroke: "currentColor", strokeWidth: "1", opacity: "0.7" })] }));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ExperienceRenderer({ data, block, }) {
    const d = data || block?.data || {};
    const backgroundColor = String(d.backgroundColor || '#e8ecf8');
    const headingColor = String(d.headingColor || '#2b3142');
    const fontColor = String(d.fontColor || '#6b7288');
    const items = Array.isArray(d.items)
        ? d.items
        : [
            {
                title: 'A Diverse Network of Teachers',
                text: 'Learn from experienced guides across traditions, time zones, and teaching styles.',
                image: 'https://images.unsplash.com/photo-1593811167562-9cefbbc5e8d3?auto=format&fit=crop&w=900&q=80',
            },
            {
                title: 'Different Styles for All',
                text: 'From breathwork to gentle yoga flows — find the practice that fits your energy today.',
                image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
            },
            {
                title: 'Livestream Classes',
                text: 'Join live sessions with community energy, or revisit recordings whenever you need calm.',
                image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=80',
            },
        ];
    return ((0, jsx_runtime_1.jsxs)("section", { className: "bz-experience", id: "experience", style: { backgroundColor }, children: [(0, jsx_runtime_1.jsx)(Scribble, {}), (0, jsx_runtime_1.jsxs)("div", { className: "bz-container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bz-experience__heading", children: [(0, jsx_runtime_1.jsx)("h2", { style: { color: headingColor }, children: String(d.title || 'The Breez Experience') }), (0, jsx_runtime_1.jsx)("p", { style: { color: fontColor }, children: String(d.subtitle ||
                                    'A calm, connected practice designed for real life — teachers, styles, and livestreams that meet you where you are.') })] }), (0, jsx_runtime_1.jsx)("div", { className: "bz-experience__grid", children: items.map((item, index) => ((0, jsx_runtime_1.jsxs)("article", { className: "bz-card", children: [(0, jsx_runtime_1.jsx)("img", { src: item.image ||
                                        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80', alt: item.title || 'Breez experience' }), (0, jsx_runtime_1.jsx)("h3", { style: { color: headingColor }, children: item.title || 'Feature' }), (0, jsx_runtime_1.jsx)("p", { style: { color: fontColor }, children: item.text || '' })] }, `${item.title || 'card'}-${index}`))) })] })] }));
}
