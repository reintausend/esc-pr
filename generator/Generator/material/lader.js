/*
  Zweck dieser Datei:
  Lädt die vorbereiteten SVG-Dateien aus dem Materialordner
  (Kapitel 3 – Speicherung der Buchstaben und Fragmente).

  Der Lader verändert die Geometrie in keiner Weise:
  Strichstärke, Rundungen, Kanten, Winkel und Proportionen bleiben
  exakt erhalten (Kapitel 2 – Erhaltung der Form). Es werden
  ausschließlich die Pfaddaten und die viewBox ausgelesen.

  Bereits geladene Dateien werden zwischengespeichert, damit jede
  SVG-Datei nur einmal übertragen wird. Jede Verwendung eines
  Fragments erhält trotzdem ihre eigene, unabhängige Instanz
  (Kapitel 5.4 – keine Mehrfachverwendung desselben Fragments).
*/

const svgCache = new Map();

// Wandelt ein <rect>-Element verlustfrei in die identische
// Pfadschreibweise um (gleiche vier Eckpunkte, gleiche Fläche).
function rectToPathData(rect) {
  const x = parseFloat(rect.getAttribute("x") || "0");
  const y = parseFloat(rect.getAttribute("y") || "0");
  const w = parseFloat(rect.getAttribute("width") || "0");
  const h = parseFloat(rect.getAttribute("height") || "0");
  if (!(w > 0) || !(h > 0)) return null;
  return `M${x},${y}h${w}v${h}h${-w}Z`;
}

// Wandelt ein <polygon>/<polyline>-Element verlustfrei in die
// identische Pfadschreibweise um (gleiche Punktfolge).
function polygonToPathData(polygon, close) {
  const points = (polygon.getAttribute("points") || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (points.length < 4) return null;
  let d = `M${points[0]},${points[1]}`;
  for (let i = 2; i < points.length - 1; i += 2) {
    d += `L${points[i]},${points[i + 1]}`;
  }
  return close ? d + "Z" : d;
}

/*
  Lädt eine SVG-Datei und liefert ihre Rohdaten:
  {
    url:     Quelle der Datei
    viewBox: { x, y, width, height }
    paths:   Liste der Pfad-Definitionen (d-Attribute), unverändert
  }
*/
export async function loadSvg(url) {
  if (svgCache.has(url)) {
    return svgCache.get(url);
  }

  // Jedes Pfadsegment einzeln kodieren: Zeichen wie "?" oder "#"
  // (z. B. Ordner "?_SVGS") wuerden sonst als Query-String bzw.
  // Fragment der URL interpretiert.
  const encodedUrl = url.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(encodedUrl);
  if (!response.ok) {
    throw new Error(`SVG-Datei konnte nicht geladen werden: ${url}`);
  }
  const text = await response.text();

  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svgElement = doc.querySelector("svg");
  if (!svgElement) {
    throw new Error(`Datei enthält kein SVG: ${url}`);
  }

  const viewBoxRaw = (svgElement.getAttribute("viewBox") || "0 0 100 100")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const viewBox = {
    x: viewBoxRaw[0],
    y: viewBoxRaw[1],
    width: viewBoxRaw[2],
    height: viewBoxRaw[3],
  };

  // Ausschließlich die vorhandenen Formen übernehmen – es findet keine
  // Zerlegung oder Analyse statt (Kapitel 3). Einige Material-SVGs
  // enthalten <rect>- oder <polygon>-Elemente; sie werden verlustfrei
  // in die identische Pfadschreibweise überführt (reine Format-
  // konvertierung, die Geometrie bleibt exakt erhalten).
  const paths = [
    ...[...doc.querySelectorAll("path")]
      .map((p) => p.getAttribute("d")),
    ...[...doc.querySelectorAll("rect")]
      .map(rectToPathData),
    ...[...doc.querySelectorAll("polygon")]
      .map((p) => polygonToPathData(p, true)),
    ...[...doc.querySelectorAll("polyline")]
      .map((p) => polygonToPathData(p, false)),
  ].filter(Boolean);

  const data = { url, viewBox, paths };
  svgCache.set(url, data);
  return data;
}
