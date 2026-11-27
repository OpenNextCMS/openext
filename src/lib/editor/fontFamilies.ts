/**
 * Curated font families for the editor Typography panel.
 * `id` is the stable Select value; `value` is the CSS font-family stack applied to the block.
 * `google` is the Google Fonts family name used to load webfonts (omit for system fonts).
 */

export type EditorFontOption = {
  id: string;
  label: string;
  value: string;
  google?: string;
  category: 'sans' | 'serif' | 'display' | 'mono' | 'handwriting';
};

export const EDITOR_FONT_FAMILIES: EditorFontOption[] = [
  // System / web-safe
  { id: 'system-ui', label: 'System UI', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', category: 'sans' },
  { id: 'arial', label: 'Arial', value: 'Arial, Helvetica, sans-serif', category: 'sans' },
  { id: 'helvetica', label: 'Helvetica', value: 'Helvetica, Arial, sans-serif', category: 'sans' },
  { id: 'verdana', label: 'Verdana', value: 'Verdana, Geneva, sans-serif', category: 'sans' },
  { id: 'tahoma', label: 'Tahoma', value: 'Tahoma, Verdana, sans-serif', category: 'sans' },
  { id: 'trebuchet', label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif', category: 'sans' },
  { id: 'georgia', label: 'Georgia', value: 'Georgia, "Times New Roman", serif', category: 'serif' },
  { id: 'times-new-roman', label: 'Times New Roman', value: '"Times New Roman", Times, serif', category: 'serif' },
  { id: 'palatino', label: 'Palatino', value: '"Palatino Linotype", Palatino, serif', category: 'serif' },
  { id: 'courier-new', label: 'Courier New', value: '"Courier New", Courier, monospace', category: 'mono' },
  { id: 'lucida-console', label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace', category: 'mono' },

  // Modern sans (Google)
  { id: 'inter', label: 'Inter', value: 'Inter, system-ui, sans-serif', google: 'Inter', category: 'sans' },
  { id: 'poppins', label: 'Poppins', value: 'Poppins, system-ui, sans-serif', google: 'Poppins', category: 'sans' },
  { id: 'roboto', label: 'Roboto', value: 'Roboto, system-ui, sans-serif', google: 'Roboto', category: 'sans' },
  { id: 'open-sans', label: 'Open Sans', value: '"Open Sans", system-ui, sans-serif', google: 'Open Sans', category: 'sans' },
  { id: 'lato', label: 'Lato', value: 'Lato, system-ui, sans-serif', google: 'Lato', category: 'sans' },
  { id: 'montserrat', label: 'Montserrat', value: 'Montserrat, system-ui, sans-serif', google: 'Montserrat', category: 'sans' },
  { id: 'nunito', label: 'Nunito', value: 'Nunito, system-ui, sans-serif', google: 'Nunito', category: 'sans' },
  { id: 'nunito-sans', label: 'Nunito Sans', value: '"Nunito Sans", system-ui, sans-serif', google: 'Nunito Sans', category: 'sans' },
  { id: 'source-sans-3', label: 'Source Sans 3', value: '"Source Sans 3", system-ui, sans-serif', google: 'Source Sans 3', category: 'sans' },
  { id: 'work-sans', label: 'Work Sans', value: '"Work Sans", system-ui, sans-serif', google: 'Work Sans', category: 'sans' },
  { id: 'dm-sans', label: 'DM Sans', value: '"DM Sans", system-ui, sans-serif', google: 'DM Sans', category: 'sans' },
  { id: 'manrope', label: 'Manrope', value: 'Manrope, system-ui, sans-serif', google: 'Manrope', category: 'sans' },
  { id: 'outfit', label: 'Outfit', value: 'Outfit, system-ui, sans-serif', google: 'Outfit', category: 'sans' },
  { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", system-ui, sans-serif', google: 'Plus Jakarta Sans', category: 'sans' },
  { id: 'figtree', label: 'Figtree', value: 'Figtree, system-ui, sans-serif', google: 'Figtree', category: 'sans' },
  { id: 'rubik', label: 'Rubik', value: 'Rubik, system-ui, sans-serif', google: 'Rubik', category: 'sans' },
  { id: 'mulish', label: 'Mulish', value: 'Mulish, system-ui, sans-serif', google: 'Mulish', category: 'sans' },
  { id: 'karla', label: 'Karla', value: 'Karla, system-ui, sans-serif', google: 'Karla', category: 'sans' },
  { id: 'ubuntu', label: 'Ubuntu', value: 'Ubuntu, system-ui, sans-serif', google: 'Ubuntu', category: 'sans' },
  { id: 'raleway', label: 'Raleway', value: 'Raleway, system-ui, sans-serif', google: 'Raleway', category: 'sans' },
  { id: 'oswald', label: 'Oswald', value: 'Oswald, system-ui, sans-serif', google: 'Oswald', category: 'sans' },
  { id: 'barlow', label: 'Barlow', value: 'Barlow, system-ui, sans-serif', google: 'Barlow', category: 'sans' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', value: '"IBM Plex Sans", system-ui, sans-serif', google: 'IBM Plex Sans', category: 'sans' },

  // Serif (Google)
  { id: 'merriweather', label: 'Merriweather', value: 'Merriweather, Georgia, serif', google: 'Merriweather', category: 'serif' },
  { id: 'playfair-display', label: 'Playfair Display', value: '"Playfair Display", Georgia, serif', google: 'Playfair Display', category: 'serif' },
  { id: 'lora', label: 'Lora', value: 'Lora, Georgia, serif', google: 'Lora', category: 'serif' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', value: '"Libre Baskerville", Georgia, serif', google: 'Libre Baskerville', category: 'serif' },
  { id: 'source-serif-4', label: 'Source Serif 4', value: '"Source Serif 4", Georgia, serif', google: 'Source Serif 4', category: 'serif' },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', value: '"Cormorant Garamond", Georgia, serif', google: 'Cormorant Garamond', category: 'serif' },
  { id: 'eb-garamond', label: 'EB Garamond', value: '"EB Garamond", Georgia, serif', google: 'EB Garamond', category: 'serif' },
  { id: 'crimson-text', label: 'Crimson Text', value: '"Crimson Text", Georgia, serif', google: 'Crimson Text', category: 'serif' },
  { id: 'dm-serif-display', label: 'DM Serif Display', value: '"DM Serif Display", Georgia, serif', google: 'DM Serif Display', category: 'serif' },
  { id: 'instrument-serif', label: 'Instrument Serif', value: '"Instrument Serif", Georgia, serif', google: 'Instrument Serif', category: 'serif' },

  // Display / branding
  { id: 'space-grotesk', label: 'Space Grotesk', value: '"Space Grotesk", system-ui, sans-serif', google: 'Space Grotesk', category: 'display' },
  { id: 'syne', label: 'Syne', value: 'Syne, system-ui, sans-serif', google: 'Syne', category: 'display' },
  { id: 'bebas-neue', label: 'Bebas Neue', value: '"Bebas Neue", Impact, sans-serif', google: 'Bebas Neue', category: 'display' },
  { id: 'anton', label: 'Anton', value: 'Anton, Impact, sans-serif', google: 'Anton', category: 'display' },
  { id: 'archivo-black', label: 'Archivo Black', value: '"Archivo Black", Impact, sans-serif', google: 'Archivo Black', category: 'display' },
  { id: 'sora', label: 'Sora', value: 'Sora, system-ui, sans-serif', google: 'Sora', category: 'display' },
  { id: 'lexend', label: 'Lexend', value: 'Lexend, system-ui, sans-serif', google: 'Lexend', category: 'display' },

  // Handwriting / script
  { id: 'pacifico', label: 'Pacifico', value: 'Pacifico, cursive', google: 'Pacifico', category: 'handwriting' },
  { id: 'dancing-script', label: 'Dancing Script', value: '"Dancing Script", cursive', google: 'Dancing Script', category: 'handwriting' },
  { id: 'great-vibes', label: 'Great Vibes', value: '"Great Vibes", cursive', google: 'Great Vibes', category: 'handwriting' },
  { id: 'caveat', label: 'Caveat', value: 'Caveat, cursive', google: 'Caveat', category: 'handwriting' },
  { id: 'satisfy', label: 'Satisfy', value: 'Satisfy, cursive', google: 'Satisfy', category: 'handwriting' },

  // Mono (Google)
  { id: 'roboto-mono', label: 'Roboto Mono', value: '"Roboto Mono", ui-monospace, monospace', google: 'Roboto Mono', category: 'mono' },
  { id: 'source-code-pro', label: 'Source Code Pro', value: '"Source Code Pro", ui-monospace, monospace', google: 'Source Code Pro', category: 'mono' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', value: '"JetBrains Mono", ui-monospace, monospace', google: 'JetBrains Mono', category: 'mono' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', value: '"IBM Plex Mono", ui-monospace, monospace', google: 'IBM Plex Mono', category: 'mono' },
  { id: 'fira-code', label: 'Fira Code', value: '"Fira Code", ui-monospace, monospace', google: 'Fira Code', category: 'mono' },
  { id: 'space-mono', label: 'Space Mono', value: '"Space Mono", ui-monospace, monospace', google: 'Space Mono', category: 'mono' },
];

export const EDITOR_FONT_SELECT_OPTIONS = EDITOR_FONT_FAMILIES.map(({ id, label }) => ({
  label,
  value: id,
}));

export const getEditorFontStackById = (id: string): string =>
  EDITOR_FONT_FAMILIES.find((f) => f.id === id)?.value || id;

export const getEditorFontPreviewStack = (id: string): string => getEditorFontStackById(id);

/** Build a Google Fonts CSS2 URL for all catalog webfonts. */
export const getEditorGoogleFontsHref = (): string => {
  const families = [
    ...new Set(
      EDITOR_FONT_FAMILIES.map((f) => f.google).filter((name): name is string => Boolean(name))
    ),
  ];
  if (!families.length) return '';

  const params = families
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
};

/** Map a stored CSS font-family back to a catalog id for the select. */
export const matchEditorFontId = (raw: string | undefined): string => {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return 'arial';

  const byId = EDITOR_FONT_FAMILIES.find((f) => f.id === cleaned);
  if (byId) return byId.id;

  const exact = EDITOR_FONT_FAMILIES.find(
    (f) =>
      f.value === cleaned ||
      f.value.replace(/['"]/g, '') === cleaned.replace(/['"]/g, '')
  );
  if (exact) return exact.id;

  const primary = cleaned
    .split(',')[0]
    ?.trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase();
  const byPrimary = EDITOR_FONT_FAMILIES.find((f) => {
    const fontPrimary = f.value
      .split(',')[0]
      ?.trim()
      .replace(/^['"]|['"]$/g, '')
      .toLowerCase();
    return fontPrimary === primary || f.label.toLowerCase() === primary;
  });
  return byPrimary?.id || 'arial';
};
