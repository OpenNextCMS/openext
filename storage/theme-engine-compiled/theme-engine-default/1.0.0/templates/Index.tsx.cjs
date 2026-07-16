"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Index;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Theme Engine's built-in default/fallback template (spec §4.13).
 *
 * Deliberately declares no header/footer partials in theme.json — ThemeAPI's
 * own minimal built-in default (site name + a copyright line, spec §4.10's
 * "render Header/Footer (or default)") already covers that, so this package
 * only needs to render the page's actual content.
 */
function Index({ theme }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "theme-engine-default-theme", children: [(0, jsx_runtime_1.jsx)("p", { "data-theme-engine-fallback-notice": "true", style: { padding: '8px 16px', fontSize: '13px', background: '#fef3c7', color: '#92400e', margin: 0 }, children: "This page is showing the default fallback theme because the active theme failed to render." }), (0, jsx_runtime_1.jsx)("main", { children: theme.blocks() })] }));
}
