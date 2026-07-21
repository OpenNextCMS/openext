"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Header;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Header({ theme }) {
    const settings = theme.settings();
    const brand = String(settings.brandName || theme.site().name || 'BRUNCH');
    const items = theme.navigation('primary');
    const defaultNav = [
        { id: 'welcome', label: 'Welcome', url: '#top' },
        { id: 'menu', label: 'Menu', url: '#menu' },
        { id: 'events', label: 'Events', url: '#events' },
        { id: 'contact', label: 'Contact', url: '#contact' },
    ];
    const navItems = items.length > 0 ? items : defaultNav;
    return ((0, jsx_runtime_1.jsx)("header", { className: "br-header", children: (0, jsx_runtime_1.jsxs)("div", { className: "br-container br-header__inner", children: [(0, jsx_runtime_1.jsx)("a", { className: "br-logo", href: "/", children: brand.toUpperCase() }), (0, jsx_runtime_1.jsx)("nav", { "aria-label": "Primary", children: (0, jsx_runtime_1.jsx)("ul", { className: "br-nav", children: navItems.map((item) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsx)("a", { href: item.url, children: item.label.toUpperCase() }) }, item.id))) }) }), (0, jsx_runtime_1.jsxs)("button", { className: "br-menu-toggle", type: "button", "aria-label": "Open menu", children: [(0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)("span", {})] })] }) }));
}
