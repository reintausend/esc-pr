/*
  Slider behavior — continuous, no steps/snapping (see slider.css for the
  visual spec). Reads data-min/data-max/data-value from the .slider
  element, drags via Pointer Events, and dispatches (all bubble):
    "fr:slider-start"  { id, value } once on pointer down
    "fr:slider-input"  { id, value } continuously while dragging
    "fr:slider-change" { id, value } once on release

  Paired labels (data-for matching data-id) listen for these to reveal
  a live percentage while the slider is held.
*/

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyValue(sliderEl, rawValue) {
  const min = Number(sliderEl.dataset.min ?? 0);
  const max = Number(sliderEl.dataset.max ?? 100);
  const value = clamp(rawValue, min, max);
  const percent = ((value - min) / (max - min)) * 100;

  sliderEl.style.setProperty('--value', percent.toFixed(2));
  sliderEl.dataset.value = String(value);
  return value;
}

function valueFromPointer(sliderEl, clientX) {
  const min = Number(sliderEl.dataset.min ?? 0);
  const max = Number(sliderEl.dataset.max ?? 100);
  const rect = sliderEl.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  return min + ratio * (max - min);
}

export function initSliders(root = document) {
  const sliders = root.querySelectorAll('[data-component="slider"]');

  sliders.forEach((sliderEl) => {
    sliderEl.textContent = '';
    const fillEl = document.createElement('span');
    fillEl.className = 'slider__fill';
    sliderEl.appendChild(fillEl);

    applyValue(sliderEl, Number(sliderEl.dataset.value ?? 0));

    let dragging = false;

    const emit = (type) => {
      sliderEl.dispatchEvent(
        new CustomEvent(type, {
          bubbles: true,
          detail: {
            id: sliderEl.dataset.id || null,
            value: Number(sliderEl.dataset.value),
          },
        })
      );
    };

    const onMove = (event) => {
      if (!dragging) return;
      applyValue(sliderEl, valueFromPointer(sliderEl, event.clientX));
      emit('fr:slider-input');
    };

    const onUp = (event) => {
      if (!dragging) return;
      dragging = false;
      applyValue(sliderEl, valueFromPointer(sliderEl, event.clientX));
      emit('fr:slider-change');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    sliderEl.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      dragging = true;
      applyValue(sliderEl, valueFromPointer(sliderEl, event.clientX));
      emit('fr:slider-start');
      emit('fr:slider-input');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  });
}
