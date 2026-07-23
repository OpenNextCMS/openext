"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlansRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
function Scribble() {
    return ((0, jsx_runtime_1.jsxs)("svg", { className: "bz-scribble bz-scribble--plans", viewBox: "0 0 600 220", fill: "none", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("path", { d: "M20 160 C80 40, 160 200, 240 100 S400 20, 480 120 560 200, 590 90", stroke: "currentColor", strokeWidth: "1.4" }), (0, jsx_runtime_1.jsx)("path", { d: "M40 180 C120 60, 200 210, 290 120 S450 40, 560 150", stroke: "currentColor", strokeWidth: "1", opacity: "0.65" })] }));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlansRenderer({ data, block }) {
    const d = data || block?.data || {};
    const backgroundColor = String(d.backgroundColor || '#ffffff');
    const panelBackgroundColor = String(d.panelBackgroundColor || '#e4f3ee');
    const headingColor = String(d.headingColor || '#2b3142');
    const fontColor = String(d.fontColor || '#6b7288');
    const cardBackgroundColor = String(d.cardBackgroundColor || '#2b3142');
    const cardFontColor = String(d.cardFontColor || '#ffffff');
    const plans = Array.isArray(d.plans)
        ? d.plans
        : [
            {
                label: 'Monthly Plan',
                description: 'Flexible access with new classes every week. Cancel anytime.',
                price: '$29',
                ctaLabel: 'Get Now',
                ctaHref: '#monthly',
            },
            {
                label: 'Yearly Plan',
                description: 'Best value for dedicated practice. Limited-time savings.',
                price: '$250',
                ctaLabel: 'Get Now',
                ctaHref: '#yearly',
            },
        ];
    return ((0, jsx_runtime_1.jsxs)("section", { className: "bz-plans", id: "plans", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bz-plans__copy", style: { backgroundColor }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { color: headingColor }, children: String(d.title || 'Our Plans') }), (0, jsx_runtime_1.jsx)("p", { style: { color: fontColor }, children: String(d.description ||
                            'Choose a membership that fits your rhythm. Cancel anytime on monthly, or save with a yearly practice commitment.') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bz-plans__panel", style: { backgroundColor: panelBackgroundColor }, children: [(0, jsx_runtime_1.jsx)(Scribble, {}), (0, jsx_runtime_1.jsx)("div", { className: "bz-plans__cards", children: plans.map((plan, index) => ((0, jsx_runtime_1.jsxs)("article", { className: "bz-price-card", style: { backgroundColor: cardBackgroundColor, color: cardFontColor }, children: [(0, jsx_runtime_1.jsx)("p", { className: "bz-price-card__label", children: plan.label || 'Plan' }), (0, jsx_runtime_1.jsx)("p", { className: "bz-price-card__desc", children: plan.description || '' }), (0, jsx_runtime_1.jsx)("div", { className: "bz-price-card__price", children: plan.price || '$0' }), (0, jsx_runtime_1.jsx)("a", { className: "bz-btn bz-btn--ghost-light", href: plan.ctaHref || '#', children: plan.ctaLabel || 'Get Now' })] }, `${plan.label || 'plan'}-${index}`))) })] })] }));
}
