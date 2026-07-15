/*
  Switch behavior: keeps exactly one .switch__option active per
  .switch container and dispatches "fr:switch-change" { id, value }
  (bubbles) whenever the active option changes.
*/

export function initSwitches(root = document) {
  const switches = root.querySelectorAll('[data-component="switch"]');

  switches.forEach((switchEl) => {
    const options = Array.from(switchEl.querySelectorAll('.switch__option'));

    options.forEach((option) => {
      option.addEventListener('click', () => {
        if (option.classList.contains('is-active')) return;

        options.forEach((o) => o.classList.remove('is-active'));
        option.classList.add('is-active');

        switchEl.dispatchEvent(
          new CustomEvent('fr:switch-change', {
            bubbles: true,
            detail: { id: switchEl.id || null, value: option.dataset.value },
          })
        );
      });
    });
  });
}
