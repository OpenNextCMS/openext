"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Header;
const jsx_runtime_1 = require("react/jsx-runtime");
function Header({ theme }) {
    const site = theme.site();
    const nav = theme.navigation('primary');
    return ((0, jsx_runtime_1.jsx)("header", { className: "fn-header", children: (0, jsx_runtime_1.jsxs)("div", { className: "fn-container fn-header__inner", children: [(0, jsx_runtime_1.jsxs)("a", { href: "/", className: "fn-logo", children: [(0, jsx_runtime_1.jsx)("span", { className: "fn-logo__mark", "aria-hidden": "true", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 32 32", width: "28", height: "28", fill: "none", stroke: "currentColor", strokeWidth: "1.6", children: [(0, jsx_runtime_1.jsx)("rect", { x: "6", y: "4", width: "20", height: "24", rx: "2" }), (0, jsx_runtime_1.jsx)("line", { x1: "6", y1: "13", x2: "26", y2: "13" }), (0, jsx_runtime_1.jsx)("line", { x1: "6", y1: "21", x2: "26", y2: "21" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "8.5", x2: "16", y2: "8.5" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "17", x2: "16", y2: "17" })] }) }), (0, jsx_runtime_1.jsxs)("span", { className: "fn-logo__text", children: [(0, jsx_runtime_1.jsx)("strong", { children: site.name || 'Farnic' }), (0, jsx_runtime_1.jsx)("em", { children: "Furniture" })] })] }), (0, jsx_runtime_1.jsx)("nav", { className: "fn-nav", "aria-label": "Primary", children: (nav && nav.length > 0 ? nav : DEFAULT_LINKS).map((item) => ((0, jsx_runtime_1.jsx)("a", { href: item.url || '#', className: "fn-nav__link", children: item.label }, item.id ?? item.url))) }), (0, jsx_runtime_1.jsxs)("div", { className: "fn-header__actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "fn-icon-btn", "aria-label": "Search", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "1.8", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "11", cy: "11", r: "7" }), (0, jsx_runtime_1.jsx)("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }) }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "fn-icon-btn", "aria-label": "Cart", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "1.8", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "9", cy: "21", r: "1" }), (0, jsx_runtime_1.jsx)("circle", { cx: "20", cy: "21", r: "1" }), (0, jsx_runtime_1.jsx)("path", { d: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" })] }) }), (0, jsx_runtime_1.jsx)("a", { href: "/shop", className: "fn-btn fn-btn--primary fn-btn--sm", children: "Shop Now" })] })] }) }));
}
const DEFAULT_LINKS = [
    { id: 'home', label: 'Home', url: '/' },
    { id: 'shop', label: 'Shop', url: '/shop' },
    { id: 'categories', label: 'Categories', url: '/categories' },
    { id: 'blog', label: 'Blog', url: '/blog' },
    { id: 'contact', label: 'Contact', url: '/contact' },
];
