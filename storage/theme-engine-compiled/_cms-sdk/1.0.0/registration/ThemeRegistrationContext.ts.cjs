"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeRegistrationContext = void 0;
const createEmptyRegistry_1 = require("D:/Professional/ATPL/nextcmsmains/storage/theme-engine-compiled/_cms-sdk/1.0.0/registration/createEmptyRegistry.ts.cjs");
function normalizePath(p) {
    return p.replace(/\\/g, '/').replace(/^\.\//, '');
}
function ensureTsx(path) {
    const n = normalizePath(path);
    if (n.endsWith('.tsx'))
        return n;
    if (n.endsWith('.ts'))
        return `${n.slice(0, -3)}.tsx`;
    return `${n}.tsx`;
}
function ensureTs(path) {
    const n = normalizePath(path);
    if (n.endsWith('.ts'))
        return n;
    return `${n}.ts`;
}
class ThemeRegistrationContext {
    constructor() {
        this.registry = (0, createEmptyRegistry_1.createEmptyRegistry)();
    }
    registerTemplate(key, templatePath, component) {
        this.registry.templates[key] = { key, path: ensureTsx(templatePath), component };
    }
    registerPartial(key, partialPath, component) {
        this.registry.partials[key] = { key, path: ensureTsx(partialPath), component };
    }
    registerBlock(input) {
        const entry = {
            type: input.type,
            label: input.label,
            renderer: input.renderer,
            schema: input.schema,
            rendererPath: input.rendererPath ? ensureTsx(input.rendererPath) : undefined,
            schemaPath: input.schemaPath ? ensureTs(input.schemaPath) : undefined,
        };
        if (!entry.rendererPath && !entry.renderer) {
            entry.rendererPath = `blocks/${capitalize(input.type)}/Renderer.tsx`;
        }
        this.registry.blocks[input.type] = entry;
    }
    registerMenu(input) {
        this.registry.menus[input.key] = input;
    }
    registerWidgetArea(input) {
        this.registry.widgetAreas[input.key] = input;
    }
    registerThemeSetting(input) {
        this.registry.settings[input.key] = {
            key: input.key,
            label: input.label ?? titleCase(input.key),
            type: input.type,
            default: input.default,
            options: input.options,
        };
    }
    registerEditorPlugin(input) {
        this.registry.editorPlugins[input.id] = input;
    }
    registerInspectorPanel(input) {
        this.registry.inspectorPanels[input.id] = input;
    }
    registerToolbarButton(input) {
        this.registry.toolbarButtons[input.id] = {
            id: input.id,
            icon: input.icon,
            label: input.label,
            action: input.action ?? (() => undefined),
            command: input.command,
        };
    }
    registerCommand(input) {
        this.registry.commands[input.id] = input;
    }
    registerShortcut(input) {
        this.registry.shortcuts[input.keys] = input;
    }
    registerHook(name, handler, priority) {
        const hook = { name, handler, priority };
        this.registry.hooks.push(hook);
        this.registry.hooks.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }
    registerMiddleware(input) {
        const entry = {
            id: input.id ?? `middleware-${this.registry.middleware.length + 1}`,
            handler: input.handler,
            priority: input.priority,
        };
        this.registry.middleware.push(entry);
        this.registry.middleware.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }
    registerProvider(input) {
        this.registry.providers[input.id] = input;
    }
    registerValidator(input) {
        this.registry.validators[input.id] = input;
    }
    registerPreview(input) {
        this.registry.previews[input.id] = input;
    }
    registerFieldType(input) {
        this.registry.fieldTypes[input.id] = input;
    }
    registerBreakpoint(input) {
        this.registry.breakpoints[input.id] = input;
    }
    registerService(input) {
        this.registry.services[input.id] = input;
    }
    registerStyle(relativePath) {
        this.pushAsset('style', relativePath);
    }
    registerScript(relativePath) {
        this.pushAsset('script', relativePath);
    }
    registerFont(relativePath) {
        this.pushAsset('font', relativePath);
    }
    onInstall(handler) {
        this.registerHook('install', handler);
    }
    onActivate(handler) {
        this.registerHook('activate', handler);
    }
    onDeactivate(handler) {
        this.registerHook('deactivate', handler);
    }
    onUpgrade(handler) {
        this.registerHook('upgrade', handler);
    }
    onRender(handler) {
        this.registerHook('render', handler);
    }
    onDestroy(handler) {
        this.registerHook('destroy', handler);
    }
    beforeRender(handler) {
        this.registerHook('beforeRender', handler);
    }
    afterRender(handler) {
        this.registerHook('afterRender', handler);
    }
    beforeSave(handler) {
        this.registerHook('beforeSave', handler);
    }
    afterSave(handler) {
        this.registerHook('afterSave', handler);
    }
    beforePublish(handler) {
        this.registerHook('beforePublish', handler);
    }
    afterPublish(handler) {
        this.registerHook('afterPublish', handler);
    }
    getRegistry() {
        return this.registry;
    }
    toDefinition() {
        return { registry: this.registry };
    }
    pushAsset(kind, relativePath) {
        this.registry.assets.push({ kind, path: normalizePath(relativePath) });
    }
}
exports.ThemeRegistrationContext = ThemeRegistrationContext;
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function titleCase(key) {
    return key
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
