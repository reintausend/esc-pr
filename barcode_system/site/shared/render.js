// Rendering utilities: SVG -> canvas, receipt composition and 1-bit
// thresholding for the thermal printer.
//
// Part 1 (this receipt) is the hidden message only: just the artwork, no
// tick strip and no corner marks. The scannable code lives on part 2, the
// info receipt built by epson/info_receipt.py.

import { CONFIG } from "./config.js";

/** Render an SVG string onto a canvas of the given pixel width. */
export function svgToImage(svgString) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG could not be rendered"));
    };
    img.src = url;
  });
}

/**
 * Compose the hidden-message receipt (part 1): white background at full
 * printer width with the artwork centered inside a small margin. No tick
 * strip, no corner marks - just the message.
 */
export async function composeReceipt(svgString) {
  const width = CONFIG.printWidthDots;
  const margin = 36;
  const contentWidth = width - margin * 2;

  const img = await svgToImage(svgString);
  const aspect = img.height / img.width || 0.75;
  const artHeight = Math.round(contentWidth * aspect);
  const height = artHeight + margin * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(img, margin, margin, contentWidth, artHeight);

  thresholdCanvas(canvas);
  return canvas;
}

/** Hard 1-bit threshold in place (thermal printers cannot print gray). */
export function thresholdCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const v = lum < 140 ? 0 : 255;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
