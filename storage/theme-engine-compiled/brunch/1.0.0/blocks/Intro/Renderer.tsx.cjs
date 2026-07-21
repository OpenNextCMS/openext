"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IntroRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
function Mandala({ className }) {
    return ((0, jsx_runtime_1.jsxs)("svg", { className: className, viewBox: "0 0 100 100", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "45", fill: "none", stroke: "currentColor", strokeWidth: "0.5" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "35", fill: "none", stroke: "currentColor", strokeWidth: "0.5" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "25", fill: "none", stroke: "currentColor", strokeWidth: "0.5" }), [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => ((0, jsx_runtime_1.jsx)("line", { x1: "50", y1: "5", x2: "50", y2: "95", stroke: "currentColor", strokeWidth: "0.5", transform: `rotate(${deg} 50 50)` }, deg)))] }));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IntroRenderer({ data, block }) {
    const d = data || block?.data || {};
    const heading = String(d.heading || 'Indian traditional flavours');
    const body = String(d.body ||
        'Experience authentic spices, time-honoured recipes, and the warmth of Indian hospitality.');
    const inset = String(d.insetImage ||
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&q=80');
    return ((0, jsx_runtime_1.jsxs)("section", { className: "br-intro", id: "welcome", children: [(0, jsx_runtime_1.jsx)(Mandala, { className: "br-intro__mandala br-intro__mandala--tl" }), (0, jsx_runtime_1.jsx)(Mandala, { className: "br-intro__mandala br-intro__mandala--tr" }), (0, jsx_runtime_1.jsxs)("div", { className: "br-intro__inner", children: [(0, jsx_runtime_1.jsxs)("div", { className: "br-intro__copy", children: [(0, jsx_runtime_1.jsx)("h2", { children: heading }), (0, jsx_runtime_1.jsx)("p", { children: body }), (0, jsx_runtime_1.jsxs)("div", { className: "br-intro__dots", children: [(0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {})] })] }), (0, jsx_runtime_1.jsx)("div", { className: "br-intro__image", children: (0, jsx_runtime_1.jsx)("img", { src: inset, alt: "" }) })] })] }));
}
