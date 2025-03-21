// app/components/Documentation/FolderStructureSection.tsx
export default function FolderStructureSection() {
    const folderStructure = `+---public
|   +---flags
|   |       ar.png
|   |       bn.png
|   |       de.png
|   |       en.png
|   |       es.png
|   |       fr.png
|   |       hi.png
|   |       it.png
|   |       kn.png
|   |       mr.png
|   |       ne.png
|   |       pt.png
|   |       ru.png
|   |       ta.png
|   |       zh.png
|   |
|   +---img
|   |       openNext.png
|   |       openNextWhite.png
|   |
|   +---locales
|   |       ar.language.ts
|   |       bn.language.ts
|   |       de.language.ts
|   |       en.language.ts
|   |       es.language.ts
|   |       fr.language.ts
|   |       hi.language.ts
|   |       it.language.ts
|   |       kn.language.ts
|   |       mr.language.ts
|   |       ne.language.ts
|   |       pt.language.ts
|   |       ru.language.ts
|   |       ta.language.ts
|   |       translations.ts
|   |       zh.language.ts
|   |
|   \---upload
|           1742213344234-vssurat.png
|
\---src
    |   middleware.ts
    |
    +---app
    |   |   layout.tsx
    |   |   page.tsx
    |   |
    |   +---(auth)
    |   |   +---admin
    |   |   |       page.tsx
    |   |   |
    |   |   +---language
    |   |   |       page.tsx
    |   |   |
    |   |   +---login
    |   |   |       page.tsx
    |   |   |
    |   |   \---mongodb-setup
    |   |       |   page.tsx
    |   |       |
    |   |       \---database-setup
    |   |               page.tsx
    |   |
    |   +---api
    |   |   +---api-sync
    |   |   |       route.ts
    |   |   |
    |   |   +---auth
    |   |   |   +---admin
    |   |   |   |       route.ts
    |   |   |   |
    |   |   |   +---delete-databases
    |   |   |   |       route.ts
    |   |   |   |
    |   |   |   +---login
    |   |   |   |       route.ts
    |   |   |   |
    |   |   |   +---logout
    |   |   |   |       route.ts
    |   |   |   |
    |   |   |   +---setup-databases
    |   |   |   |       route.ts
    |   |   |   |
    |   |   |   \---verify-mongodb
    |   |   |           route.ts
    |   |   |
    |   |   +---clear-cookies
    |   |   |       route.ts
    |   |   |
    |   |   +---dashboard
    |   |   |   |   route.ts
    |   |   |   |
    |   |   |   +---profile
    |   |   |   |   |   route.ts
    |   |   |   |   |
    |   |   |   |   \---upload
    |   |   |   |           route.ts
    |   |   |   |
    |   |   |   \---settings
    |   |   |       |   route.ts
    |   |   |       |
    |   |   |       \---siteicon
    |   |   |               route.ts
    |   |   |
    |   |   +---get-role
    |   |   |       route.ts
    |   |   |
    |   |   +---pages
    |   |   |   \---get-pages
    |   |   |           route.ts
    |   |   |
    |   |   +---sub-users
    |   |   |   +---add-users
    |   |   |   |       route.ts
    |   |   |   |
    |   |   |   \---get-users
    |   |   |           route.ts
    |   |   |
    |   |   +---themes
    |   |   |   +---extract
    |   |   |   |       route.ts
    |   |   |   |
    |   |   |   \---upload
    |   |   |           route.ts
    |   |   |
    |   |   \---verify-connection
    |   |           route.ts
    |   |
    |   +---builder
    |   +---dashboard
    |   |   |   layout.tsx
    |   |   |   page.tsx
    |   |   |
    |   |   +---pages
    |   |   |       page.tsx
    |   |   |
    |   |   +---profile
    |   |   |       page.tsx
    |   |   |
    |   |   +---settings
    |   |   |       page.tsx
    |   |   |
    |   |   +---themes
    |   |   |       page.tsx
    |   |   |
    |   |   \---users
    |   |           page.tsx
    |   |
    |   +---doc
    |   |   |   page.tsx
    |   |   |
    |   |   +---components
    |   |   |       ApiReferenceSection.tsx
    |   |   |       Features.tsx
    |   |   |       FolderStructureSection.tsx
    |   |   |       Overview.tsx
    |   |   |       ProjectFlow.tsx
    |   |   |       Section.tsx
    |   |   |       Sidebar.tsx
    |   |   |       TechStackSection.tsx
    |   |   |
    |   |   \---data
    |   |           documentation.json
    |   |
    |   +---doc-demo
    |   |       page.tsx
    |   |
    |   +---Editor
    |   |       page.tsx
    |   |
    |   \---themes
    |       +---openNextDefault
    |       |   |   README.md
    |       |   |   theme.config.ts
    |       |   |
    |       |   +---components
    |       |   |       Body.tsx
    |       |   |       Footer.tsx
    |       |   |       Header.tsx
    |       |   |       Navigation.tsx
    |       |   |       Sidebar.tsx
    |       |   |
    |       |   +---layouts
    |       |   |       page.tsx
    |       |   |
    |       |   +---pages
    |       |   |       about.tsx
    |       |   |       index.tsx
    |       |   |       [slug].tsx
    |       |   |
    |       |   +---public
    |       |   |   |   favicon.ico
    |       |   |   |
    |       |   |   +---assets
    |       |   |   |   +---css
    |       |   |   |   |       body.module.css
    |       |   |   |   |       footer.module.css
    |       |   |   |   |       theme.module.css
    |       |   |   |   |
    |       |   |   |   \---img
    |       |   |   |           openNext.png
    |       |   |   |
    |       |   |   \---data
    |       |   |           body.json
    |       |   |           footer.json
    |       |   |           header.json
    |       |   |
    |       |   \---styles
    |       |           globals.css
    |       |           theme.css
    |       |           variables.css
    |       |
    |       \---[theme]
    |               layout.tsx
    |
    +---components
    |   |   DynamicTitle.tsx
    |   |   Navbar.tsx
    |   |   ProfileUploader.tsx
    |   |   RegistrationForm.tsx
    |   |   Sidebar.tsx
    |   |   ThemeLoader.tsx
    |   |   ThemeToggle.tsx
    |   |
    |   +---editor
    |   |       blocks.tsx
    |   |       canvas.tsx
    |   |       draggableblock.tsx
    |   |       editor.tsx
    |   |       left-sidebar.tsx
    |   |       renderblock.tsx
    |   |       right-sidebar.tsx
    |   |       status-bar.tsx
    |   |       theme-toggle.tsx
    |   |       toolbar.tsx
    |   |
    |   +---LanguageSelector
    |   |       body.tsx
    |   |       LanguageSelector.tsx
    |   |       marq.tsx
    |   |
    |   \---ui
    |           alert.tsx
    |           avatar.tsx
    |           badge.tsx
    |           button.tsx
    |           card.tsx
    |           chart.tsx
    |           collapsible.tsx
    |           dropdown-menu.tsx
    |           input.tsx
    |           label.tsx
    |           progress.tsx
    |           resizable.tsx
    |           scroll-area.tsx
    |           select.tsx
    |           separator.tsx
    |           skeleton.tsx
    |           switch.tsx
    |           table.tsx
    |           tabs.tsx
    |           textarea.tsx
    |           tooltip.tsx
    |
    +---context
    |       AvatarContext.tsx
    |       ThemeContext.tsx
    |
    +---lib
    |       utils.ts
    |
    +---models
    |       MasterDb.ts
    |       Page.ts
    |       Role.ts
    |       Settings.ts
    |       User.ts
    |
    +---modules
    |   \---auth
    |           authService.ts
    |           authValidation.ts
    |
    +---styles
    |       globals.css
    |       Marquee.module.css
    |
    +---types
    |       index.ts
    |
    \---utils
            db.ts
            errorHandler.ts
            successHandler.ts
            utils.ts`;

    return (
        <section id="structure" className="pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Folder Structure</h2>
            <pre className="bg-gray-800 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm">
                {folderStructure}
            </pre>
        </section>
    );
}