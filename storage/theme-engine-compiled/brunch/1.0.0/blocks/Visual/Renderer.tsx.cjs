"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VisualRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VisualRenderer({ data, block }) {
    const d = data || block?.data || {};
    const bg = String(d.backgroundImage ||
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1920&q=80');
    return (0, jsx_runtime_1.jsx)("section", { className: "br-visual", style: { backgroundImage: `url('${bg}')` }, "aria-hidden": "true" });
}
