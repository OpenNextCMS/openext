import { defineTheme } from '@cms/theme';

export default defineTheme((theme) => {
  theme.registerTemplate('index', './templates/Index');

  theme.registerBlock({
    type: 'default-hero',
    rendererPath: './blocks/Hero/Renderer',
    schemaPath: './blocks/Hero/schema',
    label: 'Hero',
  });

  theme.registerStyle('./assets/style.css');
});
