# Fonts

Drop the font files here:

- `Roobert` (weight 500 / Medium) — used for all UI labels and the ticker
- `Typestar Normal` — used for the word/character count readout

Then uncomment and adjust the `@font-face` rules in [`css/fonts.css`](../../css/fonts.css) to point at the actual filenames/formats (e.g. `.woff2`).

Until real files are added, `css/variables.css` falls back to `Helvetica Neue`/Arial for `--font-display` and a monospace font for `--font-mono`, so the layout stays usable.
