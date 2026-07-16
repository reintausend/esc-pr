# Redesign Plan — Green Terminal Look

Tracking doc for the 2026-07 GUI redesign (Figma → code).
Companion to `PLAN_gui.md` (original grid derivation, still valid).

## Decisions (agreed in chat)

- Accent color `#a719ff` (purple) → `#00FF44` on the **terminal GUI**.
- All text on green surfaces is black (white on `#00FF44` is unreadable).
- Typestar is dropped entirely; every font in the design (Figma names
  "Test Söhne", "Satoshi Variable", "Inter") maps to Roobert.
- Buttons (GUI): default = black bg / white text, hover = green bg /
  black text. Green buttons in the Figma frames are the drawn hover state.
- Ticker: marquee animation removed; the message is written once,
  centered, black on green, same font size. Only the editor still has a
  ticker bar (start + entry frames don't).
- All GUI copy switches to English (mobile already is).
- Entry word limit: 10 words, "Remaining Words: N" counts down live.
- Entry input: native caret (black), blinks by itself.
- Finish screen: "Start Over" button + auto-redirect to start after 30 s.
- **Mobile: pure black / white only** — no green accent. Top bar, scanner
  status, buttons, and status-log success lines all stay black/white.
  Roobert only (no Typestar).

## Screens

### Start (`gui/index.html`)

- [x] Centered green panel 1280×720 @ (640,360): "ESC-PR / Vector
      Encryption Terminal", 120px Roobert, black.
- [x] Start button 320×120 @ (2080,1200), 58px label → `entry.html`.
- [x] 8 double-columns across the full stage (2 grid cols = 320 design-px
      each) using `gui/assets/graphics_startscreen/1–8.svg`. 4–6 columns
      active; active set is a sparse random subset re-rolled every few
      seconds (adjacency penalized). Per column: one SVG as a dual-tile
      seamless marquee (same file, two stacked copies — continuous scroll,
      no teleport gap) for 5–20 s, then drains off. Concurrent columns
      prefer different SVGs. On load, desired columns start visible with
      staggered phases. Side padding inside each column.
      `prefers-reduced-motion`: static visible strips, no animation.
- [x] No ticker bar on this screen.

### Entry (`gui/entry.html`)

- [x] Full-width green band, 360 design-px tall, at the top. Input
      lives inside it: black text above a single 5px black underline
      (x 160→2400, 58px above the band's bottom edge). Native black
      caret. Textarea wraps by width (mid-word allowed), bottom-aligned;
      120px for 1–2 lines, then font shrinks so a 3rd line stays visible.
      Old white boxed input, label and hint row removed.
- [x] "Remaining Words: 10" pill @ (160,480) 480×60 — static green,
      black text, counts down while typing; input hard-capped at
      10 words (existing character filter stays).
- [x] "Create" button @ (2080,480) 320×60.
- [x] "Back" button below the band at the left edge.
- [x] Explanation paragraph @ (160,840), 2240 wide, 60px Roobert,
      black ("Enter the secret message …", Figma's double-"the" fixed).

### Editor (`gui/editor.html`)

- [x] Ticker becomes static: message written once, centered, black on
      green. `ticker.js` deleted, markup simplified.
- [x] Stats + status strings translated to English (`app.js`).
- [x] On successful print → redirect to `finish.html`.

### Finish (`gui/finish.html`, new)

- [x] Same layout language as start: green panel with "Message
      encrypted successfully." + explanation ("… ESC-PR Vector
      Decryption Client (mobile web app). The link is printed on your
      receipt.").
- [x] "Start Over" button (same slot as Start on the start screen) →
      `index.html`; auto-redirect after 30 s.

### Mobile (`mobile/`)

- [x] No green accent — top bar and scanner status are pure black with
      white text.
- [x] `.log .ok` success color → pure black.
- [x] Typestar (`--font-mono`) usages → Roobert.
- [x] Button press states stay grayscale (no green flash).

## Shared files touched

| File | Change |
| --- | --- |
| `gui/css/variables.css` | accent → `#00FF44`, `--font-mono` removed |
| `gui/css/fonts.css` | Typestar `@font-face` removed |
| `gui/css/components/button.css` | new default/hover states |
| `gui/css/components/ticker.css` | static centered bar, black text |
| `gui/css/pages.css` | start/entry/finish regions rewritten |
| `gui/js/main.js` | ticker init removed |
| `gui/js/components/ticker.js` | deleted |
| `gui/js/start.js` | new: start nav + lane animation |
| `gui/js/entry.js` | 10-word limit + live counter |
| `gui/js/finish.js` | new: start-over + 30 s auto-redirect |
| `gui/js/app.js` | English status texts, finish redirect |
| `mobile/style.css` | black/white only, Roobert only |

## Open points

- `editor.html` layout itself was not part of this pass (only ticker,
  copy, and the shared button/accent restyle apply there). If there is
  a Figma frame for the editor, do it in a follow-up.
- The entry screen no longer lists the allowed characters; invalid
  characters are silently stripped while typing (unchanged behavior).
