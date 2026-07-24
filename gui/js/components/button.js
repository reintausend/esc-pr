/*
  Button behavior.
  - data-action="x" -> momentary action, dispatches "fr:action" { action }
  - adds a short 3-blink class on click for tap feedback
  Bubbles, so the merged project can listen once on a common ancestor
  (or document) instead of wiring every button.
*/

export function initButtons(root = document) {
  const buttons = root.querySelectorAll(
    '[data-component="button"][data-action]'
  );

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.remove("is-blinking");
      // Force restart if clicked mid-animation
      void btn.offsetWidth;
      btn.classList.add("is-blinking");

      const clear = () => btn.classList.remove("is-blinking");
      btn.addEventListener("animationend", clear, { once: true });
      // Fallback if animation is disabled
      setTimeout(clear, 400);

      btn.dispatchEvent(
        new CustomEvent("fr:action", {
          bubbles: true,
          detail: { action: btn.dataset.action },
        })
      );
    });
  });
}
