"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema = {
    fields: [
        {
            key: 'title',
            label: 'Headline',
            type: 'text',
            default: 'Mindfulness for Everyone, Anywhere',
        },
        {
            key: 'description',
            label: 'Description',
            type: 'textarea',
            default: 'Find calm in every moment with guided sessions, live classes, and a community built for everyday mindfulness — at home or on the go.',
        },
        { key: 'backgroundColor', label: 'Background color', type: 'color', default: '#ffffff' },
        { key: 'headingColor', label: 'Heading color', type: 'color', default: '#2b3142' },
        { key: 'fontColor', label: 'Body font color', type: 'color', default: '#6b7288' },
        { key: 'buttonColor', label: 'Button background', type: 'color', default: '#2b3142' },
        { key: 'buttonTextColor', label: 'Button text color', type: 'color', default: '#ffffff' },
        { key: 'ctaLabel', label: 'Primary button', type: 'text', default: 'Start Now' },
        { key: 'ctaHref', label: 'Primary link', type: 'url', default: '#start' },
        {
            key: 'videoLabel',
            label: 'Video link label',
            type: 'text',
            default: 'Watch video presentation',
        },
        { key: 'videoHref', label: 'Video link', type: 'url', default: '#video' },
        {
            key: 'portraitImage',
            label: 'Framed portrait image',
            type: 'image',
            default: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
        },
        {
            key: 'skyImage',
            label: 'Sky background image',
            type: 'image',
            default: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80',
        },
    ],
};
exports.default = schema;
