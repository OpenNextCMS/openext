"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FeaturesRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
function FeatureIcon({ index }) {
    if (index === 1) {
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "24", cy: "24", r: "18", stroke: "currentColor", strokeWidth: "1.5", fill: "none" }), (0, jsx_runtime_1.jsx)("path", { d: "M24 12 V24 L32 28", stroke: "currentColor", strokeWidth: "1.5" })] }));
    }
    if (index === 2) {
        return (0, jsx_runtime_1.jsx)("path", { d: "M8 36 Q24 8 40 36", stroke: "currentColor", strokeWidth: "1.5", fill: "none" });
    }
    return (0, jsx_runtime_1.jsx)("path", { d: "M24 4 L44 40 H4 Z", stroke: "currentColor", strokeWidth: "1.5", fill: "none" });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FeaturesRenderer({ data, block, }) {
    const d = data || block?.data || {};
    const items = Array.isArray(d.items)
        ? d.items
        : [
            { title: 'Best Quality', text: 'Fresh ingredients sourced daily.' },
            { title: 'Traditional Recipes', text: 'Authentic family recipes.' },
            { title: 'Warm Atmosphere', text: 'A welcoming space for every guest.' },
        ];
    return ((0, jsx_runtime_1.jsx)("section", { className: "br-features", children: (0, jsx_runtime_1.jsx)("div", { className: "br-container", children: (0, jsx_runtime_1.jsx)("div", { className: "br-features__grid", children: items.map((item, i) => ((0, jsx_runtime_1.jsxs)("article", { className: "br-feature", children: [(0, jsx_runtime_1.jsx)("svg", { className: "br-feature__icon", viewBox: "0 0 48 48", fill: "none", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)(FeatureIcon, { index: i }) }), (0, jsx_runtime_1.jsx)("h3", { children: String(item.title || '') }), (0, jsx_runtime_1.jsx)("p", { children: String(item.text || '') })] }, item.title || i))) }) }) }));
}
