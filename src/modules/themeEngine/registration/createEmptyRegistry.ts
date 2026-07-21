import type { ThemeRuntimeRegistry } from './types';

export function createEmptyRegistry(): ThemeRuntimeRegistry {
  return {
    templates: {},
    partials: {},
    blocks: {},
    menus: {},
    widgetAreas: {},
    settings: {},
    commands: {},
    toolbarButtons: {},
    inspectorPanels: {},
    shortcuts: {},
    editorPlugins: {},
    providers: {},
    validators: {},
    previews: {},
    fieldTypes: {},
    breakpoints: {},
    services: {},
    hooks: [],
    middleware: [],
    assets: [],
    editableSections: [],
  };
}
