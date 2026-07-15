/*
  Label behavior — pairs with a slider via data-for matching the slider's
  data-id. While the slider is held (fr:slider-start … fr:slider-change),
  the label name slides up and a live percentage takes its place.

  The % sign sits at one of three fixed positions (1 / 2 / 3 digit widths)
  so it doesn't jitter left/right while the number stays in the same
  digit count (e.g. 10 → 99). The number stays left-aligned and expands
  rightward as it grows from single → double → triple digits.
*/

function percentParts(min, max, value) {
  if (max === min) return { num: 0, digits: 1 };
  const num = Math.round(((value - min) / (max - min)) * 100);
  const digits = num >= 100 ? 3 : num >= 10 ? 2 : 1;
  return { num, digits };
}

function buildValueEl() {
  const valueEl = document.createElement('span');
  valueEl.className = 'label__value';
  valueEl.setAttribute('aria-hidden', 'true');

  const numEl = document.createElement('span');
  numEl.className = 'label__value-num';
  numEl.dataset.digits = '1';
  numEl.textContent = '0';

  const unitEl = document.createElement('span');
  unitEl.className = 'label__value-unit';
  unitEl.textContent = '%';

  valueEl.append(numEl, unitEl);
  return valueEl;
}

function setValue(valueEl, min, max, value) {
  const { num, digits } = percentParts(min, max, value);
  const numEl = valueEl.querySelector('.label__value-num');
  if (!numEl) return;

  numEl.textContent = String(num);
  numEl.dataset.digits = String(digits);
}

function buildLabelStructure(labelEl) {
  if (labelEl.querySelector('.label__stack')) return;

  const name = labelEl.textContent.trim();
  labelEl.textContent = '';

  const viewport = document.createElement('div');
  viewport.className = 'label__viewport';

  const stack = document.createElement('div');
  stack.className = 'label__stack';

  const nameEl = document.createElement('span');
  nameEl.className = 'label__name';
  nameEl.textContent = name;

  stack.append(nameEl, buildValueEl());
  viewport.appendChild(stack);
  labelEl.appendChild(viewport);
}

export function initLabels(root = document) {
  const labels = root.querySelectorAll('[data-component="label"]');
  const byId = new Map();

  labels.forEach((labelEl) => {
    buildLabelStructure(labelEl);
    const id = labelEl.dataset.for;
    if (id) byId.set(id, labelEl);
  });

  const setRevealing = (labelEl, revealing) => {
    labelEl.classList.toggle('is-revealing', revealing);
  };

  const updateValue = (labelEl, detail) => {
    const valueEl = labelEl.querySelector('.label__value');
    if (!valueEl) return;

    const sliderEl = root.querySelector(
      `[data-component="slider"][data-id="${detail.id}"]`
    );
    const min = Number(sliderEl?.dataset.min ?? 0);
    const max = Number(sliderEl?.dataset.max ?? 100);
    setValue(valueEl, min, max, detail.value);
  };

  root.addEventListener('fr:slider-start', (event) => {
    const labelEl = byId.get(event.detail.id);
    if (!labelEl) return;
    updateValue(labelEl, event.detail);
    setRevealing(labelEl, true);
  });

  root.addEventListener('fr:slider-input', (event) => {
    const labelEl = byId.get(event.detail.id);
    if (!labelEl) return;
    updateValue(labelEl, event.detail);
  });

  root.addEventListener('fr:slider-change', (event) => {
    const labelEl = byId.get(event.detail.id);
    if (!labelEl) return;
    updateValue(labelEl, event.detail);
    setRevealing(labelEl, false);
  });
}
