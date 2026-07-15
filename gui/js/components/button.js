/*
  Button behavior.
  - data-action="x" -> momentary action, dispatches "fr:action" { action }
  Bubbles, so the merged project can listen once on a common ancestor
  (or document) instead of wiring every button.
*/

export function initButtons(root = document) {
  const buttons = root.querySelectorAll('[data-component="button"][data-action]');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.dispatchEvent(
        new CustomEvent('fr:action', {
          bubbles: true,
          detail: { action: btn.dataset.action },
        })
      );
    });
  });
}
