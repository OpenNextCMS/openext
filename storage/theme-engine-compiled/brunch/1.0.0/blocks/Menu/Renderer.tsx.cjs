"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MenuRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MenuRenderer({ data, block }) {
    const d = data || block?.data || {};
    const heading = String(d.heading || 'Discover');
    const emphasis = String(d.headingEmphasis || 'our new menu');
    const circle = String(d.circleImage ||
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80');
    const items = Array.isArray(d.items)
        ? d.items
        : [];
    return ((0, jsx_runtime_1.jsx)("section", { className: "br-menu", id: "menu", children: (0, jsx_runtime_1.jsxs)("div", { className: "br-container", children: [(0, jsx_runtime_1.jsx)("div", { className: "br-menu__heading", children: (0, jsx_runtime_1.jsxs)("h2", { children: [heading, " ", (0, jsx_runtime_1.jsx)("em", { children: emphasis })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "br-menu__layout", children: [(0, jsx_runtime_1.jsx)("div", { className: "br-menu__circle", children: (0, jsx_runtime_1.jsx)("img", { src: circle, alt: "" }) }), (0, jsx_runtime_1.jsx)("div", { className: "br-menu__list", children: items.map((item) => ((0, jsx_runtime_1.jsxs)("article", { className: "br-menu-item", children: [(0, jsx_runtime_1.jsx)("div", { className: "br-menu-item__thumb", children: (0, jsx_runtime_1.jsx)("img", { src: String(item.image || ''), alt: String(item.name || '') }) }), (0, jsx_runtime_1.jsxs)("div", { className: "br-menu-item__body", children: [(0, jsx_runtime_1.jsx)("h4", { children: String(item.name || '') }), (0, jsx_runtime_1.jsx)("p", { children: String(item.description || '') }), (0, jsx_runtime_1.jsx)("span", { className: "br-menu-item__price", children: String(item.price || '') })] })] }, item.name))) })] })] }) }));
}
