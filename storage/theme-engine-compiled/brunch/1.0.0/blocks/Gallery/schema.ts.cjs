"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema = {
    fields: [
        { key: 'heading', label: 'Heading', type: 'text', default: 'India' },
        { key: 'headingEmphasis', label: 'Heading emphasis', type: 'text', default: 'on your plate' },
        {
            key: 'images',
            label: 'Gallery images',
            type: 'list',
            default: [
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
            ],
            itemFields: [
                { key: 'image', label: 'Image', type: 'image' },
                { key: 'alt', label: 'Alt text', type: 'text' },
            ],
        },
    ],
};
exports.default = schema;
