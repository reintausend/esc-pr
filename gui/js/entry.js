/*
  Message entry logic, ported from the old Glyphs start page
  (generator/index.js pre-merge):

  - The generator works in uppercase only: lowercase is converted
    while typing.
  - Only characters registered in the generator material are allowed
    (Regelwerk Kapitel 2 — Zeichenklassen); anything else is stripped
    as it is typed.
  - Submit forwards to the editor stage with the message as URL param.
    No word/character limit — long messages just print longer receipts.
*/
import { isAllowedCharacter } from "../../generator/Generator/material/zeichensatz.js";

const createForm = document.getElementById("create-form");
const messageInput = document.getElementById("message-input");

// Coming back from the editor: prefill the previous message for editing.
const previousMessage = new URLSearchParams(window.location.search).get("message");
if (previousMessage) {
  messageInput.value = [...previousMessage.toUpperCase()]
    .filter((c) => isAllowedCharacter(c))
    .join("");
}

messageInput.addEventListener("input", () => {
  const cursor = messageInput.selectionStart;
  const raw = messageInput.value;
  const cleaned = [...raw.toUpperCase()]
    .filter((c) => isAllowedCharacter(c))
    .join("");
  if (cleaned !== raw) {
    const removedBeforeCursor =
      [...raw.slice(0, cursor).toUpperCase()]
        .filter((c) => !isAllowedCharacter(c)).length;
    messageInput.value = cleaned;
    const newCursor = cursor - removedBeforeCursor;
    messageInput.setSelectionRange(newCursor, newCursor);
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
