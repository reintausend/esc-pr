/*
  Zweck dieser Datei:
  Interaktionslogik der Startseite.

  - Das System arbeitet ausschließlich mit Versalien: Kleinbuchstaben
    werden bereits beim Tippen in Großbuchstaben umgewandelt.
  - Es sind nur Zeichen zulässig, die im Materialordner existieren
    (Regelwerk Kapitel 2 – Zeichenklassen). Unzulässige Zeichen werden
    direkt bei der Eingabe entfernt.
  - Klick auf "Create" leitet zur preview.html weiter und übergibt
    den Eingabetext als URL-Parameter.
*/
import { isAllowedCharacter } from "./Generator/material/zeichensatz.js";

const createForm = document.getElementById("create-form");
const messageInput = document.getElementById("message-input");

// Versalien erzwingen und unzulässige Zeichen entfernen –
// direkt beim Tippen, damit nur gültiges Material eingegeben wird.
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

  const target = new URL("preview.html", window.location.href);
  target.searchParams.set("message", message);

  window.location.href = target.toString();
});
