/*
  Zweck dieser Datei:
  Parsen und Serialisieren von SVG-Pfad-d-Attributen für das
  Tweak-Werkzeug. Rein funktional, kein DOM.
*/

const COMMAND_TYPES = new Set(["M", "L", "H", "V", "C", "S", "Q", "T", "A", "Z"]);

function tokenizePathData(d) {
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    tokens.push(match[1] ?? Number(match[2]));
  }
  return tokens;
}

function readNumber(tokens, index) {
  const value = tokens[index];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Ungültiger Pfad-Token an Position ${index}.`);
  }
  return value;
}

/**
 * @returns {Array<{ type: string, values: number[], relative: boolean }>}
 */
export function parsePathData(d) {
  const tokens = tokenizePathData(d || "");
  const commands = [];
  let i = 0;
  let current = { x: 0, y: 0 };
  let subpathStart = { x: 0, y: 0 };

  while (i < tokens.length) {
    const token = tokens[i];
    if (typeof token !== "string") {
      throw new Error("Pfad beginnt oder setzt sich ohne Befehl fort.");
    }

    const relative = token === token.toLowerCase();
    const type = token.toUpperCase();
    i++;

    if (type === "Z") {
      commands.push({ type: "Z", values: [], relative: false });
      current = { ...subpathStart };
      continue;
    }

    if (type === "M") {
      const x = readNumber(tokens, i++);
      const y = readNumber(tokens, i++);
      const abs = relative
        ? { x: current.x + x, y: current.y + y }
        : { x, y };
      commands.push({ type: "M", values: [abs.x, abs.y], relative: false });
      current = abs;
      subpathStart = abs;
      while (i < tokens.length && typeof tokens[i] === "number") {
        const lx = readNumber(tokens, i++);
        const ly = readNumber(tokens, i++);
        const line = relative
          ? { x: current.x + lx, y: current.y + ly }
          : { x: lx, y: ly };
        commands.push({ type: "L", values: [line.x, line.y], relative: false });
        current = line;
      }
      continue;
    }

    if (type === "L") {
      while (i < tokens.length && typeof tokens[i] === "number") {
        const x = readNumber(tokens, i++);
        const y = readNumber(tokens, i++);
        const abs = relative
          ? { x: current.x + x, y: current.y + y }
          : { x, y };
        commands.push({ type: "L", values: [abs.x, abs.y], relative: false });
        current = abs;
      }
      continue;
    }

    if (type === "H") {
      while (i < tokens.length && typeof tokens[i] === "number") {
        const x = readNumber(tokens, i++);
        current = {
          x: relative ? current.x + x : x,
          y: current.y,
        };
        commands.push({ type: "L", values: [current.x, current.y], relative: false });
      }
      continue;
    }

    if (type === "V") {
      while (i < tokens.length && typeof tokens[i] === "number") {
        const y = readNumber(tokens, i++);
        current = {
          x: current.x,
          y: relative ? current.y + y : y,
        };
        commands.push({ type: "L", values: [current.x, current.y], relative: false });
      }
      continue;
    }

    if (type === "C") {
      while (i < tokens.length && typeof tokens[i] === "number") {
        const x1 = readNumber(tokens, i++);
        const y1 = readNumber(tokens, i++);
        const x2 = readNumber(tokens, i++);
        const y2 = readNumber(tokens, i++);
        const x = readNumber(tokens, i++);
        const y = readNumber(tokens, i++);
        const p1 = relative
          ? { x: current.x + x1, y: current.y + y1 }
          : { x: x1, y: y1 };
        const p2 = relative
          ? { x: current.x + x2, y: current.y + y2 }
          : { x: x2, y: y2 };
        const end = relative ? { x: current.x + x, y: current.y + y } : { x, y };
        commands.push({
          type: "C",
          values: [p1.x, p1.y, p2.x, p2.y, end.x, end.y],
          relative: false,
        });
        current = end;
      }
      continue;
    }

    if (!COMMAND_TYPES.has(type)) {
      throw new Error(`Pfadbefehl "${type}" wird noch nicht unterstützt.`);
    }
    throw new Error(`Pfadbefehl "${type}" wird in dieser Version noch nicht unterstützt.`);
  }

  return commands;
}

export function pathDataToString(commands) {
  return commands
    .map((cmd) => {
      if (cmd.type === "Z") return "Z";
      if (cmd.type === "M") return `M${fmt(cmd.values[0])},${fmt(cmd.values[1])}`;
      if (cmd.type === "L") return `L${fmt(cmd.values[0])},${fmt(cmd.values[1])}`;
      if (cmd.type === "C") {
        return (
          `C${fmt(cmd.values[0])},${fmt(cmd.values[1])} ` +
          `${fmt(cmd.values[2])},${fmt(cmd.values[3])} ` +
          `${fmt(cmd.values[4])},${fmt(cmd.values[5])}`
        );
      }
      return "";
    })
    .join("");
}

function fmt(n) {
  return Number(n.toFixed(4)).toString();
}

/**
 * Liefert bearbeitbare Koordinaten aus geparsten Befehlen.
 * @returns {Array<{ commandIndex: number, valueIndex: number, role: string, x: number, y: number }>}
 */
export function extractEditablePoints(commands, options) {
  const points = [];
  commands.forEach((cmd, commandIndex) => {
    if (cmd.type === "M" || cmd.type === "L") {
      if (options.affectAnchors) {
        points.push({
          commandIndex,
          valueIndex: 0,
          role: "anchor",
          x: cmd.values[0],
          y: cmd.values[1],
        });
      }
      return;
    }
    if (cmd.type === "C") {
      if (options.affectInHandles) {
        points.push({
          commandIndex,
          valueIndex: 0,
          role: "in",
          x: cmd.values[0],
          y: cmd.values[1],
        });
      }
      if (options.affectOutHandles) {
        points.push({
          commandIndex,
          valueIndex: 2,
          role: "out",
          x: cmd.values[2],
          y: cmd.values[3],
        });
      }
      if (options.affectAnchors) {
        points.push({
          commandIndex,
          valueIndex: 4,
          role: "anchor",
          x: cmd.values[4],
          y: cmd.values[5],
        });
      }
    }
  });
  return points;
}

export function applyPointDelta(commands, point, dx, dy) {
  const cmd = commands[point.commandIndex];
  if (cmd.type === "M" || cmd.type === "L") {
    cmd.values[0] += dx;
    cmd.values[1] += dy;
    return;
  }
  if (cmd.type === "C") {
    cmd.values[point.valueIndex] += dx;
    cmd.values[point.valueIndex + 1] += dy;
  }
}
