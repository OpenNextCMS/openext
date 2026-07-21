# Brunch Theme

Elegant Indian restaurant theme for the Theme Engine — matches the Brunch / Indian cuisine landing design with spice hero, menu highlights, reservation form, and food gallery.

## Location

Source package (authoring):

```text
theme-packages/brunch/
```

This folder is **separate** from installed themes (`themes/`) and the built-in default (`src/modules/themeEngine/default-theme-source/`).

## Structure

```text
theme-packages/brunch/
├── theme.json
├── theme.ts
├── templates/Index.tsx
├── partials/Header.tsx, Footer.tsx
├── blocks/
│   ├── Hero/          Full-screen spice hero + CTA card
│   ├── Intro/         "Indian traditional flavours"
│   ├── Features/      Three-column dark band
│   ├── Menu/          Menu highlights with circular thumbnails
│   ├── Visual/        Full-width curry image break
│   ├── Booking/       Reservation form
│   └── Gallery/       "India on your plate" image grid
└── assets/style.css
```

## Install

### Option A — ZIP upload (production)

```powershell
cd d:\Professional\ATPL\nextcmsmains
Compress-Archive -Path .\theme-packages\brunch\* -DestinationPath .\theme-packages\brunch.zip -Force
```

Upload `theme-packages/brunch.zip` from **Dashboard → Theme Engine (Beta) → Upload theme**, then activate.

### Option B — Copy to installed themes (local dev)

```powershell
Copy-Item -Recurse -Force .\theme-packages\brunch .\themes\brunch
```

Register in MongoDB via the Theme Engine upload flow or Theme Manager install API.

## Editable sections

| Section ID | Block type | Description |
| --- | --- | --- |
| `hero` | `brunch-hero` | Hero banner with background image and CTA |
| `intro` | `brunch-intro` | Introduction with mandala decor |
| `features` | `brunch-features` | Three feature columns |
| `menu` | `brunch-menu` | Menu item list |
| `visual` | `brunch-visual` | Parallax image break |
| `booking` | `brunch-booking` | Reservation form UI |
| `gallery` | `brunch-gallery` | Food photo gallery |

Activate with **Also load this theme onto the page editor canvas** to edit sections on the homepage.

## Theme settings

- `brandName` — header logo text (default: `BRUNCH`)
- `accentGold` — gold accent color
- `charcoal` — dark section background

## Docs

- [Theme Registration](../docs/theme-registration.md)
- [Theme Engine Package Format](../docs/theme-engine-editable-sections.md)
