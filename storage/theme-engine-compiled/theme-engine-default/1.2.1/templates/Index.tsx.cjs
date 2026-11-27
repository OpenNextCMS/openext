"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Index;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Theme Engine's built-in default/fallback template (spec §4.13).
 *
 * Deliberately declares no header/footer partials in theme.json — ThemeAPI's
 * own minimal built-in default already covers that. This package only renders
 * the page's actual CMS content — no misleading "fallback" banner on normal
 * renders (that notice is shown by RenderedPublicPage when usedFallback=true).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- theme source is compiled independently of the app's own types (ThemeComponent = React.ComponentType<any>, spec §4.6).
function Index({ theme }) {
    const blocks = theme.blocks();
    return ((0, jsx_runtime_1.jsx)("div", { className: "theme-engine-default-theme", children: (0, jsx_runtime_1.jsx)("main", { children: Array.isArray(blocks) && blocks.length > 0 ? (blocks) : ((0, jsx_runtime_1.jsxs)("section", { style: { padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { margin: '0 0 12px', fontSize: 36 }, children: "Welcome" }), (0, jsx_runtime_1.jsx)("p", { style: { margin: 0, color: '#4b5563' }, children: "This page has no content yet." })] })) }) }));
}
