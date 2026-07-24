/*
  Label behavior — pairs with a slider via data-for matching the slider's
  data-id. Shows a live numeric value (no %) beside the name, matching
  the Figma editor slider field.
*/

function displayValue(min, max, value) {
  if (max === min) return 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

function buildValueEl() {
  const valueEl = document.createElement("span");
  valueEl.className = "label__value";
  valueEl.setAttribute("aria-hidden", "true");

  const numEl = document.createElement("span");
  numEl.className = "label__value-num";
  numEl.textContent = "0";

  valueEl.append(numEl);
  return valueEl;
}

function setValue(valueEl, min, max, value) {
  const numEl = valueEl.querySelector(".label__value-num");
  if (!numEl) return;
  numEl.textContent = String(displayValue(min, max, value));
}

function buildLabelStructure(labelEl) {
  if (labelEl.querySelector(".label__stack")) return;

  const name = labelEl.textContent.trim();
  labelEl.textContent = "";

  const viewport = document.createElement("div");
  viewport.className = "label__viewport";

  const stack = document.createElement("div");
  stack.className = "label__stack";

  const nameEl = document.createElement("span");
  nameEl.className = "label__name";
  nameEl.textContent = name;

  stack.append(nameEl, buildValueEl());
  viewport.appendChild(stack);
  labelEl.appendChild(viewport);
}

function syncFromSlider(root, labelEl, detail) {
  const valueEl = labelEl.querySelector(".label__value");
  if (!valueEl) return;

  const sliderEl = root.querySelector(
    `[data-component="slider"][data-id="${detail.id}"]`
  );
  const min = Number(sliderEl?.dataset.min ?? 0);
  const max = Number(sliderEl?.dataset.max ?? 100);
  const value =
    detail.value != null ? detail.value : Number(sliderEl?.dataset.value ?? 0);
  setValue(valueEl, min, max, value);
}

export function initLabels(root = document) {
  const labels = root.querySelectorAll('[data-component="label"]');
  const byId = new Map();

  labels.forEach((labelEl) => {
    buildLabelStructure(labelEl);
    const id = labelEl.dataset.for;
    if (!id) return;
    byId.set(id, labelEl);

    const sliderEl = root.querySelector(
      `[data-component="slider"][data-id="${id}"]`
    );
    if (sliderEl) {
      syncFromSlider(root, labelEl, {
        id,
        value: Number(sliderEl.dataset.value ?? 0),
      });
    }
  });

  root.addEventListener("fr:slider-start", (event) => {
    const labelEl = byId.get(event.detail.id);
    if (!labelEl) return;
    syncFromSlider(root, labelEl, event.detail);
  });

  root.addEventListener("fr:slider-input", (event) => {
    const labelEl = byId.get(event.detail.id);
    if (!labelEl) return;
    syncFromSlider(root, labelEl, event.detail);
  });

  root.addEventListener("fr:slider-change", (event) => {
    const labelEl = byId.get(event.detail.id);
    if (!labelEl) return;
    syncFromSlider(root, labelEl, event.detail);
  });
}
