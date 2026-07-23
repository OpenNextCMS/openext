"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TogetherRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TogetherRenderer({ data, block, }) {
    const d = data || block?.data || {};
    const backgroundColor = String(d.backgroundColor || '#ffffff');
    const imagePanelColor = String(d.imagePanelColor || '#f4a894');
    const headingColor = String(d.headingColor || '#2b3142');
    const fontColor = String(d.fontColor || '#6b7288');
    const buttonColor = String(d.buttonColor || '#2b3142');
    const buttonTextColor = String(d.buttonTextColor || '#ffffff');
    const image = String(d.image ||
        'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80');
    return ((0, jsx_runtime_1.jsxs)("section", { className: "bz-together", id: "together", children: [(0, jsx_runtime_1.jsx)("div", { className: "bz-together__visual", style: { backgroundColor: imagePanelColor }, children: (0, jsx_runtime_1.jsx)("div", { className: "bz-frame bz-together__frame", children: (0, jsx_runtime_1.jsx)("img", { src: image, alt: "Woman meditating indoors" }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bz-together__copy", style: { backgroundColor }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { color: headingColor }, children: String(d.title || 'Meditate Together Online') }), (0, jsx_runtime_1.jsx)("p", { style: { color: fontColor }, children: String(d.paragraph1 ||
                            'Share stillness with people around the world. Join live group sits, guided journeys, and community check-ins that make mindfulness feel less solitary.') }), (0, jsx_runtime_1.jsx)("p", { style: { color: fontColor }, children: String(d.paragraph2 ||
                            'Whether you are beginning or deepening your practice, Breez keeps you connected — with gentle structure, warm guidance, and space to breathe.') }), (0, jsx_runtime_1.jsx)("a", { className: "bz-btn bz-btn--navy", href: String(d.ctaHref || '#together'), style: { backgroundColor: buttonColor, color: buttonTextColor }, children: String(d.ctaLabel || 'Start Now') })] })] }));
}
