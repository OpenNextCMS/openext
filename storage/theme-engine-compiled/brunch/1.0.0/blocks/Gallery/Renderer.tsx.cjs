"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GalleryRenderer;
const jsx_runtime_1 = require("react/jsx-runtime");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GalleryRenderer({ data, block }) {
    const d = data || block?.data || {};
    const heading = String(d.heading || 'India');
    const emphasis = String(d.headingEmphasis || 'on your plate');
    const images = Array.isArray(d.images)
        ? d.images
        : [
            {
                image: 'https://images.unsplash.com/photo-1601050690597-df0565f70950?auto=format&fit=crop&w=500&q=80',
                alt: 'Samosas',
            },
            {
                image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
                alt: 'Curry',
            },
            {
                image: 'https://images.unsplash.com/photo-1563379091339-03246963d29a?auto=format&fit=crop&w=500&q=80',
                alt: 'Biryani',
            },
        ];
    return ((0, jsx_runtime_1.jsx)("section", { className: "br-gallery", children: (0, jsx_runtime_1.jsxs)("div", { className: "br-container", children: [(0, jsx_runtime_1.jsx)("div", { className: "br-gallery__heading", children: (0, jsx_runtime_1.jsxs)("h2", { children: [heading, " ", (0, jsx_runtime_1.jsx)("em", { children: emphasis })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "br-gallery__grid", children: images.map((item, i) => ((0, jsx_runtime_1.jsx)("div", { className: `br-gallery__item${i === 1 ? ' br-gallery__item--center' : ''}`, children: (0, jsx_runtime_1.jsx)("img", { src: String(item.image || ''), alt: String(item.alt || '') }) }, item.alt || i))) })] }) }));
}
