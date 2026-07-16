# Fonts

The interface uses a single typeface:

- `Roobert` (weight 500 / Medium) — used for everything
  (`roobert/Roobert-Medium.otf`, declared in `css/fonts.css`).

The `roobert/` folder contains more weights/styles if they're ever
needed; add `@font-face` blocks in `css/fonts.css` the same way.

The `typestar/` folder is kept for reference only — Typestar was
dropped from the design in the 2026-07 green redesign
(see `docs/PLAN_redesign.md`).

If font files go missing, `css/variables.css` falls back to
`Helvetica Neue`/Arial for `--font-display`, so the layout stays usable.
