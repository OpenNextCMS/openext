import { Vibrant } from 'node-vibrant/node';

export type ExtractedSwatch = {
  hex: string;
  rgb: [number, number, number];
  population: number;
  role: string;
};

export type ExtractedPalette = {
  swatches: ExtractedSwatch[];
  // The most common dark/light pair — usually background + foreground
  background: string | null;
  foreground: string | null;
  accent: string | null;
};

const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

// Extract a 6-swatch palette from the uploaded image. Returns null if the
// extractor fails for any reason — the caller falls back to LLM-only color
// reasoning. Keep this defensive: never let a palette extraction error break
// the whole generation pipeline.
export const extractPalette = async (
  imageBuffer: Buffer
): Promise<ExtractedPalette | null> => {
  try {
    const palette = await Vibrant.from(imageBuffer).getPalette();

    const roles: Array<keyof typeof palette> = [
      'Vibrant',
      'DarkVibrant',
      'LightVibrant',
      'Muted',
      'DarkMuted',
      'LightMuted',
    ];

    const swatches: ExtractedSwatch[] = [];
    for (const role of roles) {
      const swatch = palette[role];
      if (!swatch) continue;
      swatches.push({
        hex: swatch.hex.toUpperCase(),
        rgb: swatch.rgb as [number, number, number],
        population: swatch.population,
        role: String(role),
      });
    }

    if (swatches.length === 0) return null;

    // Pick background = most populous swatch.
    const byPopulation = [...swatches].sort((a, b) => b.population - a.population);
    const background = byPopulation[0]?.hex || null;

    // Foreground = highest-contrast swatch vs background.
    const bgLum = background ? luminance(byPopulation[0].rgb) : 0;
    const foreground =
      [...swatches]
        .map((s) => ({ s, contrast: Math.abs(luminance(s.rgb) - bgLum) }))
        .sort((a, b) => b.contrast - a.contrast)[0]?.s.hex || null;

    // Accent = vibrant swatch (if any) that isn't background or foreground.
    const accent =
      swatches.find(
        (s) =>
          (s.role === 'Vibrant' || s.role === 'DarkVibrant' || s.role === 'LightVibrant') &&
          s.hex !== background &&
          s.hex !== foreground
      )?.hex || null;

    return { swatches, background, foreground, accent };
  } catch (err) {
    console.warn('[extractPalette] failed:', err);
    return null;
  }
};

// Stringify the palette into a compact constraint block for the LLM prompt.
// Lists hex codes by role + the inferred bg/fg/accent so the model uses real
// sampled colors instead of hallucinating common ones (#3B82F6 vs #2563EB).
export const formatPaletteForPrompt = (palette: ExtractedPalette): string => {
  const lines = [
    'EXTRACTED COLOR PALETTE — sampled programmatically from the image:',
    ...palette.swatches.map(
      (s) => `  ${s.role.padEnd(13)} ${s.hex}  (pop: ${s.population})`
    ),
  ];
  if (palette.background) lines.push(`  → likely background: ${palette.background}`);
  if (palette.foreground) lines.push(`  → likely foreground: ${palette.foreground}`);
  if (palette.accent) lines.push(`  → likely accent: ${palette.accent}`);
  lines.push('');
  lines.push(
    'COLOR CONSTRAINT: Every color value you output (color, backgroundColor, border, gradient stops) MUST be one of the hex codes above, or a tone within +/- 5% lightness of one of them. Do NOT introduce hex codes that are not derived from this palette. If you need a hover/subtle variant, lighten or darken an existing palette color — do not invent.'
  );
  return lines.join('\n');
};
