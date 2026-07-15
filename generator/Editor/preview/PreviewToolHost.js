/*
  Zweck dieser Datei:
  Verbindet Tweak-Effekt, Darstellungsmodus, Stroke, Größe und Panel mit der Preview.

  Effekt-Pipeline (bei jeder Änderung neu, immer aus dem Original):
    Original → Tweak → Abrunden → Darstellung → Stroke → ViewBox-Fit → Größe

  Alle Regler sind unabhängig kombinierbar (Reihenfolge der Bedienung egal).
*/

import { Brush } from "../tweak/Brush.js";
import { TweakEffect } from "../tweak/TweakEffect.js";
import { TweakPanel } from "./TweakPanel.js";
import { mergeSvgToPathData } from "../outline/mergeSymbol.js";
import { roundPathData } from "../round/roundCorners.js";
import { strokeEffectFromPercent } from "../stroke/strokeMapping.js";
import { GLYPH_COLOR, OUTLINE_STROKE_BASE } from "../stroke/strokeConstants.js";
import { fitAllSymbolViewBoxes } from "./fitViewBox.js";
import { applySymbolSize } from "../size/applySize.js";
import { randomBrushOptions } from "../random/randomize.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export class PreviewToolHost {
  /**
   * @param {object} options
   * @param {HTMLElement} options.gridContent  #grid-content
   * @param {HTMLElement} [options.panelRoot]  #tweak-panel — optional:
   *   ohne panelRoot läuft der Host "headless" und wird über
   *   setOptions() von außen gesteuert (z. B. von der GUI-Glue-Schicht).
   * @param {() => void} [options.onEdit]
   */
  constructor({ gridContent, panelRoot, onEdit }) {
    this.gridContent = gridContent;
    this.onEdit = onEdit ?? (() => {});

    this.brush = new Brush();
    this.effect = new TweakEffect();
    this.entries = this.effect.capture(this._collectPaths());
    this.displayMode = "fill";
    this._raf = null;

    this.panel = panelRoot
      ? new TweakPanel(panelRoot, {
          onChange: (options) => this.setOptions(options),
          onRandomize: () => this.randomize(),
        })
      : null;
  }

  /**
   * Wendet Regler-Optionen an (gleiches Format wie TweakPanel.emitChange /
   * randomBrushOptions) und rendert neu.
   * @param {object} options
   */
  setOptions(options) {
    const { display, ...brushOptions } = options;
    Object.assign(this.brush, brushOptions);
    if (display) this.displayMode = display;
    this.render();
  }

  /** @returns {object} die angewendeten Zufalls-Optionen */
  randomize() {
    this.effect.regenerateRandoms(this.entries);
    const options = randomBrushOptions();
    if (this.panel) {
      this.panel.applyOptions(options);
    } else {
      this.setOptions(options);
    }
    return options;
  }

  _collectPaths() {
    return [...this.gridContent.querySelectorAll("path:not(.glyph-merged)")];
  }

  _symbols() {
    return [...this.gridContent.querySelectorAll("svg")];
  }

  render() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      this._renderNow();
    });
  }

  _renderNow() {
    this._resetVisualState();
    this.effect.apply(this.entries, this.brush);
    this._applyRounding();

    const strokeEffect = strokeEffectFromPercent(this.brush.strokeWidth ?? 0);

    if (this.displayMode === "outline") {
      this._showOutline(strokeEffect);
    } else {
      this._showFill(strokeEffect);
    }

    fitAllSymbolViewBoxes(this.gridContent);
    applySymbolSize(this.gridContent, this.brush.sizePercent ?? 35);
    this.onEdit();
  }

  _resetVisualState() {
    for (const svg of this._symbols()) {
      svg.querySelectorAll(":scope > g[data-rolle]").forEach((g) => {
        g.style.display = "";
      });

      const merged = svg.querySelector(":scope > path.glyph-merged");
      if (merged) merged.style.display = "none";

      for (const path of svg.querySelectorAll("path:not(.glyph-merged)")) {
        path.removeAttribute("stroke");
        path.removeAttribute("stroke-width");
        path.removeAttribute("stroke-linejoin");
        path.removeAttribute("stroke-linecap");
        path.style.paintOrder = "";
      }
    }
  }

  _applyRounding() {
    const fraction = (this.brush.cornerRounding ?? 0) / 100;
    if (fraction <= 0) return;
    for (const entry of this.entries) {
      const d = entry.element.getAttribute("d");
      entry.element.setAttribute("d", roundPathData(d, fraction));
    }
  }

  _glyphColor(svg) {
    return svg.getAttribute("fill") || GLYPH_COLOR;
  }

  _ensureMergedPath(svg) {
    let merged = svg.querySelector(":scope > path.glyph-merged");
    if (!merged) {
      merged = document.createElementNS(SVG_NS, "path");
      merged.setAttribute("class", "glyph-merged");
      svg.appendChild(merged);
    }
    return merged;
  }

  _hideFragments(svg) {
    svg.querySelectorAll(":scope > g[data-rolle]").forEach((g) => {
      g.style.display = "none";
    });
  }

  _showFill(strokeEffect) {
    if (strokeEffect.kind !== "thick") return;

    for (const svg of this._symbols()) {
      const color = this._glyphColor(svg);
      for (const path of svg.querySelectorAll("path:not(.glyph-merged)")) {
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", String(strokeEffect.fillStrokeWidth));
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("stroke-linecap", "round");
        path.style.paintOrder = "stroke fill";
      }
    }
  }

  _showOutline(strokeEffect) {
    const outlineWidth =
      strokeEffect.kind === "neutral"
        ? OUTLINE_STROKE_BASE
        : strokeEffect.outlineStrokeWidth;

    for (const svg of this._symbols()) {
      const data = mergeSvgToPathData(svg);
      const merged = this._ensureMergedPath(svg);

      merged.setAttribute("d", data || "");
      merged.setAttribute("fill", "none");
      merged.setAttribute("stroke", GLYPH_COLOR);
      merged.setAttribute("stroke-width", String(outlineWidth));
      merged.setAttribute("stroke-linejoin", "round");
      merged.style.display = "";

      this._hideFragments(svg);
    }
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}
