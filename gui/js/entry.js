/*
  Message entry logic.

  - The generator works in uppercase only: lowercase is converted
    while typing.
  - Only characters registered in the generator material are allowed
    (Regelwerk Kapitel 2 — Zeichenklassen); anything else is stripped
    as it is typed.
  - Messages are capped at MAX_WORDS words; the "Remaining Words"
    counter updates live and input that would start an extra word is
    rejected.
  - The textarea wraps by width (mid-word allowed) and grows upward
    from the underline. Font stays at BASE_FS (120 design-px) for 1–2
    lines; when a third line is needed the font shrinks so the whole
    message stays visible.
  - Submit forwards to the editor stage with the message as URL param.
*/
import { isAllowedCharacter } from "../../generator/Generator/material/zeichensatz.js";

const MAX_WORDS = 10;
const BASE_FS = 120; // design-px
const MIN_FS = 48;
const LINE_HEIGHT = 1.1;
const TOP_MARGIN_DU = 40; // design-px headroom inside the band

const createForm = document.getElementById("create-form");
const messageInput = document.getElementById("message-input");
const wordsLeft = document.getElementById("words-left");
const band = document.querySelector(".region-entry-band");

let lastValid = "";

function countWords(value) {
  return value.split(/\s+/).filter(Boolean).length;
}

function cleanCharacters(value) {
  return [...value.toUpperCase().replace(/\n/g, " ")]
    .filter((c) => isAllowedCharacter(c))
    .join("");
}

function updateCounter() {
  wordsLeft.textContent = String(
    Math.max(0, MAX_WORDS - countWords(messageInput.value))
  );
}

function stageWidth() {
  const stage = band?.closest(".stage") || document.querySelector(".stage");
  return stage ? stage.clientWidth : window.innerWidth;
}

function du(designPx) {
  return (stageWidth() * designPx) / 2560;
}

function setFontSize(designPx) {
  messageInput.style.setProperty("--entry-fs", String(designPx));
}

function contentHeight() {
  messageInput.style.height = "auto";
  return messageInput.scrollHeight;
}

/**
 * 120px for 1–2 lines; shrink when a 3rd line is needed so everything
 * stays visible. Height grows upward from the underline.
 */
function fitInputLayout() {
  if (!band) return;

  const maxH = Math.max(0, band.clientHeight - du(TOP_MARGIN_DU) - du(58));
  const fsPx = du(BASE_FS);
  const padTop = fsPx * 0.3; // matches CSS padding-top: 0.3em
  const padBottom = du(16);
  const twoLineH = fsPx * LINE_HEIGHT * 2 + padTop + padBottom;

  setFontSize(BASE_FS);
  let needed = contentHeight();

  if (needed > twoLineH + 1 || needed > maxH + 1) {
    let fs = BASE_FS;
    while (fs > MIN_FS) {
      setFontSize(fs);
      needed = contentHeight();
      if (needed <= maxH + 1) break;
      fs -= 2;
    }
  }

  needed = contentHeight();
  messageInput.style.height = `${Math.min(needed, maxH)}px`;
}

function sanitizeInput() {
  const cursor = messageInput.selectionStart;
  const raw = messageInput.value;
  const cleaned = cleanCharacters(raw);

  if (cleaned !== raw) {
    const removedBeforeCursor = [...raw.slice(0, cursor).toUpperCase()].filter(
      (c) => !isAllowedCharacter(c) && c !== "\n"
    ).length;
    const newlinesBefore = (raw.slice(0, cursor).match(/\n/g) || []).length;
    messageInput.value = cleaned;
    const newCursor = Math.max(0, cursor - removedBeforeCursor - newlinesBefore);
    messageInput.setSelectionRange(newCursor, newCursor);
  }

  if (countWords(messageInput.value) > MAX_WORDS) {
    const pos = Math.min(lastValid.length, Math.max(0, cursor - 1));
    messageInput.value = lastValid;
    messageInput.setSelectionRange(pos, pos);
  } else {
    lastValid = messageInput.value;
  }

  updateCounter();
  fitInputLayout();
}

const previousMessage = new URLSearchParams(window.location.search).get("message");
if (previousMessage) {
  const cleaned = cleanCharacters(previousMessage);
  messageInput.value = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_WORDS)
    .join(" ");
  lastValid = messageInput.value;
}
updateCounter();

messageInput.addEventListener("input", sanitizeInput);

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (!event.isComposing) createForm.requestSubmit();
  }
});

createForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  const target = new URL("editor.html", window.location.href);
  target.searchParams.set("message", message);
  window.location.href = target.toString();
});

document.addEventListener("fr:action", (event) => {
  if (event.detail.action === "back") {
    window.location.href = "index.html";
  }
});

const stage = document.querySelector(".stage");
if (stage) new ResizeObserver(() => fitInputLayout()).observe(stage);
if (band) new ResizeObserver(() => fitInputLayout()).observe(band);

if (document.fonts?.ready) {
  document.fonts.ready.then(fitInputLayout);
} else {
  requestAnimationFrame(fitInputLayout);
}
