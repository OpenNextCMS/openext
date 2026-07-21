"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { defineTheme, definePlugin } = require("D:/Professional/ATPL/nextcmsmains/storage/theme-engine-compiled/_cms-sdk/1.0.0/sdk/index.ts.cjs");
exports.default = defineTheme((theme) => {
    theme.registerTemplate('index', './templates/Index');
    theme.registerPartial('header', './partials/Header');
    theme.registerPartial('footer', './partials/Footer');
    theme.registerBlock({
        type: 'brunch-hero',
        rendererPath: './blocks/Hero/Renderer',
        schemaPath: './blocks/Hero/schema',
        label: 'Hero',
    });
    theme.registerBlock({
        type: 'brunch-intro',
        rendererPath: './blocks/Intro/Renderer',
        schemaPath: './blocks/Intro/schema',
        label: 'Introduction',
    });
    theme.registerBlock({
        type: 'brunch-features',
        rendererPath: './blocks/Features/Renderer',
        schemaPath: './blocks/Features/schema',
        label: 'Features',
    });
    theme.registerBlock({
        type: 'brunch-menu',
        rendererPath: './blocks/Menu/Renderer',
        schemaPath: './blocks/Menu/schema',
        label: 'Menu',
    });
    theme.registerBlock({
        type: 'brunch-visual',
        rendererPath: './blocks/Visual/Renderer',
        schemaPath: './blocks/Visual/schema',
        label: 'Visual Break',
    });
    theme.registerBlock({
        type: 'brunch-booking',
        rendererPath: './blocks/Booking/Renderer',
        schemaPath: './blocks/Booking/schema',
        label: 'Booking',
    });
    theme.registerBlock({
        type: 'brunch-gallery',
        rendererPath: './blocks/Gallery/Renderer',
        schemaPath: './blocks/Gallery/schema',
        label: 'Gallery',
    });
    theme.registerMenu({ key: 'primary', label: 'Primary Navigation', maxDepth: 1 });
    theme.registerThemeSetting({ key: 'brandName', type: 'text', default: 'BRUNCH', label: 'Brand Name' });
    theme.registerThemeSetting({ key: 'accentGold', type: 'color', default: '#c9a962', label: 'Accent Gold' });
    theme.registerThemeSetting({ key: 'charcoal', type: 'color', default: '#2c3335', label: 'Charcoal' });
    theme.registerStyle('./assets/style.css');
});
