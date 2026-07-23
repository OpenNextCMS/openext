import { defineTheme } from '@cms/theme';

export default defineTheme((theme) => {
  // Templates
  theme.registerTemplate('index', './templates/Index');

  // Partials
  theme.registerPartial('header', './partials/Header');
  theme.registerPartial('footer', './partials/Footer');

  // Blocks
  theme.registerBlock({
    type: 'nexus-hero',
    rendererPath: './blocks/Hero/Renderer',
    schemaPath: './blocks/Hero/schema',
    label: 'Hero',
  });

  theme.registerBlock({
    type: 'nexus-stats',
    rendererPath: './blocks/Stats/Renderer',
    schemaPath: './blocks/Stats/schema',
    label: 'Stats',
  });

  theme.registerBlock({
    type: 'nexus-cta',
    rendererPath: './blocks/CTA/Renderer',
    schemaPath: './blocks/CTA/schema',
    label: 'Call To Action',
  });

  // Assets
  theme.registerStyle('./assets/style.css');
  theme.registerScript('./assets/theme.js');
});
