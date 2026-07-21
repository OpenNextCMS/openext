"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema = {
    fields: [
        { key: 'title', label: 'Section title', type: 'text', default: 'The Breez Experience' },
        {
            key: 'subtitle',
            label: 'Section subtitle',
            type: 'textarea',
            default: 'A calm, connected practice designed for real life — teachers, styles, and livestreams that meet you where you are.',
        },
        { key: 'backgroundColor', label: 'Background color', type: 'color', default: '#e8ecf8' },
        { key: 'headingColor', label: 'Heading color', type: 'color', default: '#2b3142' },
        { key: 'fontColor', label: 'Body font color', type: 'color', default: '#6b7288' },
        {
            key: 'items',
            label: 'Feature cards',
            type: 'list',
            default: [
                {
                    title: 'A Diverse Network of Teachers',
                    text: 'Learn from experienced guides across traditions, time zones, and teaching styles.',
                    image: 'https://images.unsplash.com/photo-1593811167562-9cefbbc5e8d3?auto=format&fit=crop&w=900&q=80',
                },
                {
                    title: 'Different Styles for All',
                    text: 'From breathwork to gentle yoga flows — find the practice that fits your energy today.',
                    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
                },
                {
                    title: 'Livestream Classes',
                    text: 'Join live sessions with community energy, or revisit recordings whenever you need calm.',
                    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=80',
                },
            ],
            itemFields: [
                { key: 'title', label: 'Title', type: 'text' },
                { key: 'text', label: 'Description', type: 'textarea' },
                { key: 'image', label: 'Image', type: 'image' },
            ],
        },
    ],
};
exports.default = schema;
