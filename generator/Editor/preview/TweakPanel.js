/*
  Zweck dieser Datei:
  Illustrator-ähnliches Tweak-Panel (Stärke, Ändern) für die Preview.
  Steuert die Brush-Parameter; keine Geometrie-Logik.
*/

function clampPercent(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function syncPair(range, input) {
  const value = clampPercent(range.value);
  range.value = String(value);
  input.value = String(value);
  return value;
}

export class TweakPanel {
  /**
   * @param {HTMLElement} root  #tweak-panel
   * @param {{ onChange: (options: object) => void, onRandomize?: () => void }} callbacks
   */
  constructor(root, { onChange, onRandomize }) {
    this.root = root;
    this.onChange = onChange;
    this.onRandomize = onRandomize ?? (() => {});

    this.horizontalRange = root.querySelector("#tweak-horizontal");
    this.horizontalInput = root.querySelector("#tweak-horizontal-value");
    this.verticalRange = root.querySelector("#tweak-vertical");
    this.verticalInput = root.querySelector("#tweak-vertical-value");
    this.roundingRange = root.querySelector("#tweak-rounding");
    this.roundingInput = root.querySelector("#tweak-rounding-value");
    this.modeRadios = [...root.querySelectorAll('input[name="tweak-mode"]')];
    this.anchorCheckbox = root.querySelector("#tweak-anchors");
    this.inHandleCheckbox = root.querySelector("#tweak-in-handles");
    this.outHandleCheckbox = root.querySelector("#tweak-out-handles");
    this.displayCheckbox = root.querySelector("#tweak-display");
    this.strokeRange = root.querySelector("#tweak-stroke");
    this.strokeInput = root.querySelector("#tweak-stroke-value");
    this.sizeRange = root.querySelector("#tweak-size");
    this.sizeInput = root.querySelector("#tweak-size-value");
    this.randomizeButton = root.querySelector("#tweak-randomize");

    this._bindEvents();
    this.emitChange();
  }

  _bindEvents() {
    const onStrengthChange = () => {
      syncPair(this.horizontalRange, this.horizontalInput);
      syncPair(this.verticalRange, this.verticalInput);
      this.emitChange();
    };

    this.horizontalRange.addEventListener("input", onStrengthChange);
    this.horizontalInput.addEventListener("change", () => {
      this.horizontalRange.value = clampPercent(this.horizontalInput.value);
      onStrengthChange();
    });

    this.verticalRange.addEventListener("input", onStrengthChange);
    this.verticalInput.addEventListener("change", () => {
      this.verticalRange.value = clampPercent(this.verticalInput.value);
      onStrengthChange();
    });

    const onRoundingChange = () => {
      syncPair(this.roundingRange, this.roundingInput);
      this.emitChange();
    };
    this.roundingRange.addEventListener("input", onRoundingChange);
    this.roundingInput.addEventListener("change", () => {
      this.roundingRange.value = clampPercent(this.roundingInput.value);
      onRoundingChange();
    });

    for (const radio of this.modeRadios) {
      radio.addEventListener("change", () => this.emitChange());
    }

    this.anchorCheckbox.addEventListener("change", () => this.emitChange());
    this.inHandleCheckbox.addEventListener("change", () => this.emitChange());
    this.outHandleCheckbox.addEventListener("change", () => this.emitChange());
    this.displayCheckbox.addEventListener("change", () => this.emitChange());

    const onStrokeChange = () => {
      syncPair(this.strokeRange, this.strokeInput);
      this.emitChange();
    };
    this.strokeRange.addEventListener("input", onStrokeChange);
    this.strokeInput.addEventListener("change", () => {
      this.strokeRange.value = clampPercent(this.strokeInput.value);
      onStrokeChange();
    });

    const onSizeChange = () => {
      syncPair(this.sizeRange, this.sizeInput);
      this.emitChange();
    };
    this.sizeRange.addEventListener("input", onSizeChange);
    this.sizeInput.addEventListener("change", () => {
      this.sizeRange.value = clampPercent(this.sizeInput.value);
      onSizeChange();
    });

    this.randomizeButton?.addEventListener("click", () => this.onRandomize());
  }

  /**
   * Setzt alle Regler aus einem Options-Objekt (z. B. Randomize).
   * @param {object} options  wie von emitChange / randomBrushOptions
   */
  applyOptions(options) {
    this.horizontalRange.value = clampPercent(options.horizontalStrength ?? 0);
    this.horizontalInput.value = this.horizontalRange.value;
    this.verticalRange.value = clampPercent(options.verticalStrength ?? 0);
    this.verticalInput.value = this.verticalRange.value;
    this.roundingRange.value = clampPercent(options.cornerRounding ?? 0);
    this.roundingInput.value = this.roundingRange.value;
    this.strokeRange.value = clampPercent(options.strokeWidth ?? 0);
    this.strokeInput.value = this.strokeRange.value;
    this.sizeRange.value = clampPercent(options.sizePercent ?? 35);
    this.sizeInput.value = this.sizeRange.value;

    const mode = options.mode === "absolute" ? "absolute" : "relative";
    for (const radio of this.modeRadios) {
      radio.checked = radio.value === mode;
    }

    this.anchorCheckbox.checked = Boolean(options.affectAnchors);
    this.inHandleCheckbox.checked = Boolean(options.affectInHandles);
    this.outHandleCheckbox.checked = Boolean(options.affectOutHandles);
    this.displayCheckbox.checked = options.display === "outline";

    this.emitChange();
  }

  emitChange() {
    const mode =
      this.modeRadios.find((radio) => radio.checked)?.value ?? "relative";

    this.onChange({
      horizontalStrength: clampPercent(this.horizontalRange.value),
      verticalStrength: clampPercent(this.verticalRange.value),
      cornerRounding: clampPercent(this.roundingRange.value),
      mode,
      affectAnchors: this.anchorCheckbox.checked,
      affectInHandles: this.inHandleCheckbox.checked,
      affectOutHandles: this.outHandleCheckbox.checked,
      display: this.displayCheckbox.checked ? "outline" : "fill",
      strokeWidth: clampPercent(this.strokeRange.value),
      sizePercent: clampPercent(this.sizeRange.value),
    });
  }
}
