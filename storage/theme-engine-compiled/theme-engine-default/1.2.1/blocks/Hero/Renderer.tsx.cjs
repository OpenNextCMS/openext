"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HeroRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeroRenderer({ data, block }) {
    const d = data || block?.data || {};
    return ((0, jsx_runtime_1.jsxs)("section", { style: { padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { margin: '0 0 12px', fontSize: 36 }, children: String(d.title || 'Welcome') }), (0, jsx_runtime_1.jsx)("p", { style: { margin: 0, color: '#4b5563', maxWidth: 640 }, children: String(d.description || '') })] }));
}
