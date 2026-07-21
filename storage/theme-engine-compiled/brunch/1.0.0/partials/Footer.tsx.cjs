"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Footer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Footer({ theme }) {
    const name = String(theme.settings().brandName || theme.site().name || 'Brunch');
    const year = new Date().getFullYear();
    return ((0, jsx_runtime_1.jsx)("footer", { className: "br-footer", id: "contact", children: (0, jsx_runtime_1.jsxs)("div", { className: "br-container br-footer__inner", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\u00A9 ", year, " ", name, ". Indian traditional flavours."] }), (0, jsx_runtime_1.jsx)("a", { href: "#top", children: "Back to top" })] }) }));
}
