// Parser del CSV de fichajes de Odoo (feedback del gestor, 2026-08-13).
// Mismo formato posicional fijo que ya usa el SPA original
// (utils/timeTrackingParser.ts), pero simplificado a CSV puro (el pedido
// original solo mencionó "el csv descargado del Odoo", no Excel):
//   Col A: nombre del proyecto (referencial, se ignora — acá siempre se
//          importa a un solo proyecto a la vez).
//   Col B: fecha.
//   Col C: nombre del empleado (texto libre, no email).
//   Col D: horas (puede venir negativo, correcciones).
//
// Función pura, sin dependencias de DOM — se puede usar tanto en un
// componente cliente (con el texto ya leído vía FileReader) como en tests.

export type OdooCsvRow = {
  date: string; // YYYY-MM-DD
  employeeName: string;
  hours: number;
  line: number; // número de línea real del archivo, para mostrar errores
};

export type OdooCsvParseResult = {
  rows: OdooCsvRow[];
  errors: string[];
};

function detectDelimiter(sampleLine: string): "," | ";" {
  const commas = (sampleLine.match(/,/g) || []).length;
  const semicolons = (sampleLine.match(/;/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// Acepta YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY.
function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

const HEADER_KEYWORDS = ["empleado", "employee", "cantidad", "horas", "hours", "quantity"];

function looksLikeHeaderRow(colC: string, colD: string): boolean {
  const lower = `${colC} ${colD}`.toLowerCase();
  return HEADER_KEYWORDS.some((k) => lower.includes(k));
}

export function parseOdooCsv(text: string): OdooCsvParseResult {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: ["El archivo está vacío."] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows: OdooCsvRow[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const cols = splitCsvLine(line, delimiter);
    const [, colB = "", colC = "", colD = ""] = cols;

    if (looksLikeHeaderRow(colC, colD)) return; // encabezado, se ignora sin error

    if (cols.length < 4) {
      errors.push(`Línea ${lineNumber}: formato inválido (se esperaban 4 columnas, hay ${cols.length}).`);
      return;
    }

    const date = parseFlexibleDate(colB);
    if (!date) {
      errors.push(`Línea ${lineNumber}: fecha inválida ("${colB}").`);
      return;
    }

    const employeeName = colC.trim();
    if (!employeeName) {
      errors.push(`Línea ${lineNumber}: falta el nombre del empleado.`);
      return;
    }

    const hours = Number(colD.replace(",", "."));
    if (!Number.isFinite(hours) || hours === 0) {
      errors.push(`Línea ${lineNumber}: horas inválidas ("${colD}").`);
      return;
    }

    rows.push({ date, employeeName, hours, line: lineNumber });
  });

  return { rows, errors };
}

// ── Matching de nombre de empleado → colaborador existente ──────────────
// Sugerencia únicamente — el gestor siempre confirma antes de importar
// (decisión explícita, 2026-08-13: no crear usuarios/logins nuevos solo
// por aparecer un nombre en una fila del Excel, a diferencia del SPA
// original que sí los auto-creaba).

export function normalizeNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function findBestMatch<T extends { name: string }>(
  employeeName: string,
  candidates: T[],
): T | null {
  const key = normalizeNameKey(employeeName);
  if (!key) return null;

  const exact = candidates.find((c) => normalizeNameKey(c.name) === key);
  if (exact) return exact;

  if (key.length >= 4) {
    const partial = candidates.find((c) => {
      const ck = normalizeNameKey(c.name);
      return ck.length >= 4 && (ck.includes(key) || key.includes(ck));
    });
    if (partial) return partial;
  }

  return null;
}
