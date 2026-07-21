"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Footer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Footer({ theme }) {
    const name = String(theme.settings().brandName || theme.site().name || 'Breez');
    return ((0, jsx_runtime_1.jsx)("footer", { className: "bz-footer", children: (0, jsx_runtime_1.jsxs)("div", { className: "bz-container bz-footer__inner", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\u00A9 ", new Date().getFullYear(), " ", name, ". Mindfulness for everyone."] }), (0, jsx_runtime_1.jsx)("a", { href: "#top", children: "Back to top" })] }) }));
}
