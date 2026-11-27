"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { defineTheme, definePlugin } = require("D:/Professional/ATPL/nextcmsmains/storage/theme-engine-compiled/_cms-sdk/1.0.0/registration/defineTheme.ts.cjs");
exports.default = defineTheme((theme) => {
    theme.registerTemplate('index', './templates/Index');
    theme.registerBlock({
        type: 'default-hero',
        rendererPath: './blocks/Hero/Renderer',
        schemaPath: './blocks/Hero/schema',
        label: 'Hero',
    });
    theme.registerStyle('./assets/style.css');
});
