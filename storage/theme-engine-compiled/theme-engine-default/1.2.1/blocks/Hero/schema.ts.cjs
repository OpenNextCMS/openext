"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema = {
    fields: [
        { key: 'title', label: 'Title', type: 'text', default: 'Welcome' },
        {
            key: 'description',
            label: 'Description',
            type: 'textarea',
            default: 'This is the Theme Engine default fallback theme.',
        },
    ],
};
exports.default = schema;
