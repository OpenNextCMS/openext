"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Header;
const jsx_runtime_1 = require("react/jsx-runtime");
function LogoMark() {
    return ((0, jsx_runtime_1.jsxs)("svg", { className: "bz-logo__mark", viewBox: "0 0 32 32", fill: "none", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("path", { d: "M16 4 L28 26 H4 Z", stroke: "currentColor", strokeWidth: "2.2", strokeLinejoin: "round" }), (0, jsx_runtime_1.jsx)("path", { d: "M16 11 L22 23 H10 Z", fill: "currentColor", opacity: "0.18" })] }));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Header({ theme }) {
    const settings = theme.settings();
    const brand = String(settings.brandName || theme.site().name || 'BREEZ');
    const coral = String(settings.accentCoral || '#F07A64');
    return ((0, jsx_runtime_1.jsx)("header", { className: "bz-header", children: (0, jsx_runtime_1.jsxs)("div", { className: "bz-container bz-header__inner", children: [(0, jsx_runtime_1.jsxs)("a", { className: "bz-logo", href: "/", children: [(0, jsx_runtime_1.jsx)(LogoMark, {}), (0, jsx_runtime_1.jsx)("span", { children: brand.toUpperCase() })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bz-header__actions", children: [(0, jsx_runtime_1.jsx)("a", { className: "bz-header__link", href: "#login", children: "Login" }), (0, jsx_runtime_1.jsx)("a", { className: "bz-btn bz-btn--coral", href: "#join", style: { background: coral }, children: "Join Now" }), (0, jsx_runtime_1.jsxs)("button", { className: "bz-menu-btn", type: "button", "aria-label": "Open menu", children: [(0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {})] })] })] }) }));
}
