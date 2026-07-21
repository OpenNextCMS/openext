"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyRegistry = createEmptyRegistry;
function createEmptyRegistry() {
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
