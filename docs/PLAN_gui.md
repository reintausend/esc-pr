# FR Interface — Build & Merge Notes

Tracking doc for this standalone interface build. Keep this updated as the
source of truth for layout/components.

**Merging with the other project parts (graphics generator + barcode system)
is documented for Fable in [`MERGE_FOR_FABLE.md`](MERGE_FOR_FABLE.md)** — use
that brief as the handoff; this file stays the detailed GUI reference.

## Status


| Area                                             | Status                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Grid system (responsive 16:9, 16 cols x 24 rows) | Done                                                                           |
| Button component (default / filled)              | Done                                                                           |
| Label component (static, non-interactive)        | Done                                                                           |
| Switch component (Fill-In / Outline)             | Done                                                                           |
| Ticker / marquee component                       | Done                                                                           |
| Canvas + stats panels                            | Done (static placeholders)                                                     |
| Slider component                                 | Done — continuous fill-bar, placed next to Rounded Edges/Stroke/Tweak H/V/Size |
| Real fonts (Roobert, Typestar Normal)            | Done — using `Roobert-Medium.otf` / `Typestar-Normal.otf`                      |




## 1. Grid system

The Figma frame is 2560x1440 px (16:9), and every element's position/size is
a clean multiple of 160x60 px — i.e. a **16 column x 24 row** grid, cell =
160x60 at design size.

`css/grid.css` locks a `.stage` element to a 16:9 box that scales to fit any
viewport (letterboxed if the viewport isn't exactly 16:9), matching the
target 16:9 display. `container-type: inline-size` on `.stage` makes `cqw`
units mean "% of the stage's own width" everywhere inside it, so every
component scales together off one number.

Every scaled CSS value is written as:

```css
calc(100cqw * <figma-px-value> / var(--dw))
```

`--dw: 2560` (design width) lives in `css/variables.css` — the single place
to change if the design is ever re-exported at a different size.

### Grid mapping (Figma px -> grid lines)

Two elements in the Figma export use `transform: rotate(90deg)` with
`transform-origin: top left`, which shifts their effective bounding box.
Values below are the *resolved* boxes (already accounts for the rotation).


| Element                                         | Effective box (x, y, w, h) | Grid column | Grid row |
| ----------------------------------------------- | -------------------------- | ----------- | -------- |
| Ticker (purple)                                 | 0, 0, 2560, 120            | 1 / 17      | 1 / 3    |
| Back                                            | 0, 180, 160, 60            | 1 / 2       | 4 / 5    |
| Fill-In / Outline switch                        | 0, 300, 640, 60            | 1 / 5       | 6 / 7    |
| Rounded Edges (label)                           | 0, 420, 320, 60            | 1 / 3       | 8 / 9    |
| Rounded Edges slider *(added, not in Figma)*    | —                          | 3 / 5       | 8 / 9    |
| Stroke (label)                                  | 0, 540, 320, 60            | 1 / 3       | 10 / 11  |
| Stroke slider *(added, not in Figma)*           | —                          | 3 / 5       | 10 / 11  |
| Tweak Horizontal (label)                        | 0, 660, 320, 60            | 1 / 3       | 12 / 13  |
| Tweak Horizontal slider *(added, not in Figma)* | —                          | 3 / 5       | 12 / 13  |
| Tweak Vertical (label)                          | 0, 780, 320, 60            | 1 / 3       | 14 / 15  |
| Tweak Vertical slider *(added, not in Figma)*   | —                          | 3 / 5       | 14 / 15  |
| Size (label)                                    | 0, 900, 320, 60            | 1 / 3       | 16 / 17  |
| Size slider *(added, not in Figma)*             | —                          | 3 / 5       | 16 / 17  |
| Randomize                                       | 0, 1020, 320, 60           | 1 / 3       | 18 / 19  |
| Canvas panel (white)                            | 960, 180, 640, 1200        | 7 / 11      | 4 / 24   |
| Stats panel (word/char)                         | 1920, 180, 640, 180        | 13 / 17     | 4 / 7    |
| Print                                           | 2240, 1320, 320, 60        | 15 / 17     | 23 / 24  |


The five slider rows (Rounded Edges, Stroke, Tweak Horizontal, Tweak
Vertical, Size) now span the full 4-column sidebar width (cols 1/5) —
a static **label** (cols 1/3, see `label.css`) naming the parameter, plus
a **slider** (cols 3/5) to set it — matching the Fill-In/Outline switch
row directly above them. These five are *not* buttons: they don't
respond to clicks and have no active/toggle state, they're just captions
for the sliders next to them. Back and Randomize are unaffected (still
single 2-col buttons, cols 1/3); the canvas panel starts at column 7, well
clear of the 4-column sidebar in every row, so no other region needed to
change.

Placement lives in `css/layout.css` as `.region-*` classes, kept separate
from component styling on purpose (see File structure below).

## 2. File structure

```
fr-interface/
  index.html
  css/
    reset.css              minimal reset
    variables.css           design tokens: --dw, colors, font stacks, border width
    fonts.css               @font-face rules (commented out until real files exist)
    grid.css                .stage: responsive 16:9 grid container
    layout.css              .region-*: grid-column/row placement per Figma element
    components/
      button.css
      label.css                static non-interactive labels (Rounded Edges, Stroke, Tweak H/V, Size)
      switch.css
      slider.css              continuous fill-bar slider, matches sidebar buttons
      ticker.css
      panel.css               canvas + stats panels
  js/
    main.js                  wires up all components on DOMContentLoaded
    components/
      button.js
      label.js
      switch.js
      slider.js
      ticker.js
  assets/
    fonts/                   drop Roobert + Typestar Normal files here (see README.md)
  PLAN.md                    detailed GUI / grid / component reference
  MERGE_FOR_FABLE.md         handoff brief for merging with barcode + graphics parts
```

No build step / bundler — plain ES modules loaded via `<script type="module">`,
open `index.html` directly or serve statically.

## 3. Components



### Button (`.btn`)

```html
<button class="btn btn--filled" data-component="button" data-action="print">Print</button>
```

- `.btn` — base outlined button (white bg, black border/text), label
left-aligned with 16px padding, matching the Figma's outlined-button
text offset. Not currently instantiated in `index.html` (the outlined
sidebar rows — Rounded Edges, Stroke, Tweak H/V, Size — turned out to be
**labels**, not buttons, see below), but kept as the general-purpose
outlined variant of the button component since you asked for a
reusable button component with this look.
- `.btn.btn--filled` — solid black button (Back, Randomize, Print), label
centered — the Figma's filled-button text offsets work out to centered.

Behavior (`js/components/button.js`):

- `data-action="x"` buttons dispatch `fr:action` (`{ action }`) on click.
- Bubbles, so the real project can listen once (e.g. on `document`)
instead of wiring every button individually.



### Label (`.label`)

```html
<div class="label" data-component="label" data-for="rounded-edges">Rounded Edges</div>
```

Caption for the slider to its right — paired via `data-for` matching the
slider's `data-id`. Same visual footprint as an outlined control (white
bg, black outline on top/right/bottom, **no left border** so the sidebar
sits flush to the stage edge with no thin vertical line). Left-aligned
text; not clickable on its own.

`label.js` wraps the text into a two-line stack (name + percentage).
While the paired slider is held (`fr:slider-start` … `fr:slider-change`),
the name slides up and a live percentage (`0%`–`100%` of the slider's
min→max range) takes its place; on release the name slides back down.
Respects `prefers-reduced-motion`.

### Switch (`.switch`)

```html
<div class="switch" id="fill-outline-switch" data-component="switch">
  <button class="switch__option is-active" data-value="fill">Fill-In</button>
  <button class="switch__option" data-value="outline">Outline</button>
</div>
```

2-option segmented control matching the Figma Fill-In/Outline control.
`js/components/switch.js` keeps exactly one option active and dispatches
`fr:switch-change` (`{ id, value }`, bubbles) when the selection changes.

### Ticker (`.ticker`)

```html
<div class="ticker" data-component="ticker" data-speed="120">
  <div class="ticker__track">
    <span class="ticker__source">Your message here</span>
  </div>
</div>
```

Write the sentence once in `.ticker__source` (no `+++` needed — JS adds it).
`ticker.js` builds repeating segments of `[message] +++ [message] +++ …`,
cloning enough segments to always cover the viewport regardless of message
length (short or long). Spacing around `+++` is controlled by
`--ticker-gap` (default 40px at design size). Optional `data-divider`
attribute overrides the default `+++` separator. Seamless loop via
`requestAnimationFrame` at constant `data-speed` (px/s). Respects
`prefers-reduced-motion`.

### Panels (`.panel--canvas`, `.panel--stats`)

Static containers for now:

- `#canvas-panel` — empty bordered box; the real project renders the
glyph/output canvas here.
- `#word-count` / `#char-count` — spans to update from the real project's
data; currently hardcoded to the Figma's placeholder values (5 / 52).



### Slider (`.slider`)

```html
<div class="slider" data-component="slider" data-id="size" data-min="0" data-max="100" data-value="40"></div>
```

Standalone, continuous, **no baked-in label and no discrete steps**.
Same 2-col x 1-row footprint as a sidebar button. Visual language:
white background, 2px black outline on top/right/bottom — **no left
border**, so it abuts its paired label as one continuous unit (shared
edge is the label's right border only). Solid black fill grows from the
left edge to the current value as you drag.

Markup is minimal — just the container with `data-id`/`data-min`/
`data-max`/`data-value`; `slider.js` appends the `.slider__fill` element
and handles dragging.

Behavior (`js/components/slider.js`):

- Click or drag anywhere in the control to set the value freely — no
snapping, no discrete positions.
- Dispatches `fr:slider-start` (`{ id, value }`) once on pointer down,
`fr:slider-input` continuously while dragging, and `fr:slider-change`
once on release. All bubble.

**Placement**: one slider sits immediately to the right of each of the
five toggle-button rows — Rounded Edges, Stroke, Tweak Horizontal, Tweak
Vertical, Size — turning each of those rows into `[label button: 2 cols] [slider: 2 cols]` (4 cols total, cols 1/5), matching the width of the
Fill-In/Outline switch row above them. Back, Randomize, and Print are
unaffected (still single 2-col buttons, no slider).

**One judgment call**: Tweak Horizontal/Vertical default to `data-min="-100" data-max="100" data-value="0"` (bidirectional, centered at 0) since "tweak"
implies adjusting in either direction, while Rounded Edges/Stroke/Size
default to `data-min="0" data-max="100" data-value="40"` (unidirectional).
Purely a starting guess — adjust the `data-min`/`data-max`/`data-value`
attributes in `index.html` per control once real ranges are known.

Verified by rendering `index.html` in headless Chrome at 1600x900 (16:9) —
see "Grid mapping" note above; no clipping or misalignment.

## 4. Event contract (for merging)

All custom events bubble, so the host project can attach one listener on a
common ancestor:


| Event              | Detail                                 | Fired by                    |
| ------------------ | -------------------------------------- | --------------------------- |
| `fr:action`        | `{ action: string }`                   | Back, Randomize, Print      |
| `fr:switch-change` | `{ id: string | null, value: string }` | Fill-In/Outline switch      |
| `fr:slider-start`  | `{ id: string | null, value: number }` | any slider, on pointer down |
| `fr:slider-input`  | `{ id: string | null, value: number }` | any slider, while dragging  |
| `fr:slider-change` | `{ id: string | null, value: number }` | any slider, on release      |


Rounded Edges, Stroke, Tweak Horizontal/Vertical, and Size are static
labels (no events) — only the slider next to each one is interactive.

Example listener for the host project:

```js
document.addEventListener('fr:action', (e) => {
  if (e.detail.action === 'randomize') { /* trigger real randomize */ }
});
```



## 5. Decisions log

- **Fonts**: real files are in `assets/fonts/roobert/` and
`assets/fonts/typestar/`; `css/fonts.css` declares `@font-face` for the
weight actually used by the design (500 -> `Roobert-Medium.otf` /
`Typestar-Normal.otf`). Other weights/styles in those folders (Light,
Regular, SemiBold, Bold, Heavy, italics, Typestar OCR/Black) aren't
declared yet since the current design doesn't use them — add more
`@font-face` blocks the same way if the merged project needs them.
- **Ticker**: animated marquee (not static), constant-speed via JS, respects
reduced-motion. Driven by `requestAnimationFrame` + pixel `transform`
rather than a CSS `%`-based animation, to avoid a jump/gap when the real
`@font-face` swaps in or the window resizes (see Ticker section above).
- **Slider (corrected)**: is continuous, not stepped — no snapping, no
discrete positions, no baked-in label. A standalone 2-col component
placed to the right of Rounded Edges/Stroke/Tweak H/V/Size, each of
which stayed/reverted to a plain `.btn--toggle` label button. (An earlier
iteration misread the reference screenshot as a stepped/labeled design
and merged it into "Size" — that's undone now. See Slider section above
for the full corrected spec.)
- **Sidebar rows are labels, not buttons** (corrected): Rounded Edges,
Stroke, Tweak H/V, and Size are static `.label` captions, not buttons —
an earlier iteration built these as toggle buttons (`.btn--toggle` +
`.is-active`) for possible future expansion, but you clarified they're
just names for the sliders next to them, with no interaction of their
own. `.btn--toggle` and its `data-toggle-id` / `fr:toggle` JS behavior
were removed as dead code.
- **Sidebar width for 5 rows**: Rounded Edges/Stroke/Tweak H/V/Size rows
grew from 2 cols to 4 cols (label + slider) to fit the new sliders. No
knock-on effects elsewhere — the switch row above already used 4 cols,
and the canvas panel starts at column 7, well clear of the sidebar.
- **Button text alignment fix**: re-checked the Figma source while building
the slider and found the outlined sidebar buttons use `left: 16px` text
(left-aligned), not centered as originally built — the reference
screenshot's left-aligned "Size" label confirmed this. Fixed `.btn` to be
left-aligned with 16px padding; `.btn--filled` (Back/Randomize/Print)
stays centered, matching those Figma offsets.
- **Sizing**: fully responsive, aspect-ratio-locked to 16:9 (matches your
target display), scales via `container query units`, not fixed pixels.
- Filled buttons and switch options use flexbox centering rather than
replicating the Figma's absolute per-string text offsets (those offsets
were just how Figma auto-centers a specific string, not a real layout
constraint) — but outlined buttons are genuinely left-aligned, see above.



## 6. Open items / next steps

Previously flagged slider assumptions are now resolved by your feedback:
stepped-vs-continuous → continuous (done); whether other controls get
sliders → yes, all five now have one (done); step count / label-width
questions → moot, there's no baked-in label or steps anymore. The one
remaining open judgment call is the Tweak H/V vs. others min/max range
default — see "One judgment call" in the Slider section above.

1. **Merge into main project** — once ready, this plan documents the full
  component/event contract needed to wire real functionality:
  - Listen for `fr:action` / `fr:switch-change` / `fr:slider-*` events
  (see section 4) instead of re-deriving DOM structure.
  - Render actual output into `#canvas-panel`.
  - Update `#word-count` / `#char-count` from real data.
  - Rounded Edges/Stroke/Tweak H/V/Size are labels only — all real
  interaction for those parameters comes through their slider's
  `fr:slider-input` / `fr:slider-change` events, keyed by `data-id`
  (`rounded-edges`, `stroke`, `tweak-horizontal`, `tweak-vertical`,
  `size`).

