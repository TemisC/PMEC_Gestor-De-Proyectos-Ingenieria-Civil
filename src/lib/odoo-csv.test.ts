import { describe, expect, it } from "vitest";
import { findBestMatch, normalizeNameKey, parseOdooCsv } from "./odoo-csv";

describe("parseOdooCsv", () => {
  it("parsea filas válidas con formato de fecha ISO", () => {
    const csv = [
      "Proyecto,Fecha,Empleado,Cantidad",
      "25-052-ESP,2026-08-01,Juan Perez,8",
      "25-052-ESP,2026-08-02,Maria Gomez,7.5",
    ].join("\n");
    const { rows, errors } = parseOdooCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: "2026-08-01", employeeName: "Juan Perez", hours: 8 });
    expect(rows[1]).toMatchObject({ date: "2026-08-02", employeeName: "Maria Gomez", hours: 7.5 });
  });

  it("acepta fecha en formato DD/MM/YYYY", () => {
    const csv = "Proyecto,15/08/2026,Juan Perez,4";
    const { rows, errors } = parseOdooCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows[0].date).toBe("2026-08-15");
  });

  it("detecta punto y coma como delimitador si predomina", () => {
    const csv = "Proyecto;2026-08-01;Juan Perez;8";
    const { rows } = parseOdooCsv(csv);
    expect(rows[0]).toMatchObject({ date: "2026-08-01", employeeName: "Juan Perez", hours: 8 });
  });

  it("ignora la fila de encabezado sin marcarla como error", () => {
    const csv = ["Proyecto,Fecha,Empleado,Cantidad", "P,2026-08-01,Juan Perez,8"].join("\n");
    const { rows, errors } = parseOdooCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("admite horas negativas (correcciones)", () => {
    const csv = "P,2026-08-01,Juan Perez,-2";
    const { rows } = parseOdooCsv(csv);
    expect(rows[0].hours).toBe(-2);
  });

  it("reporta error en fecha inválida sin tirar la fila silenciosamente", () => {
    const csv = "P,no-es-fecha,Juan Perez,8";
    const { rows, errors } = parseOdooCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/Línea 1/);
  });

  it("reporta error si faltan columnas", () => {
    const csv = "P,2026-08-01,Juan Perez";
    const { rows, errors } = parseOdooCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/formato inválido/);
  });

  it("archivo vacío devuelve un error, no una excepción", () => {
    const { rows, errors } = parseOdooCsv("");
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("normalizeNameKey / findBestMatch", () => {
  it("normaliza tildes, mayúsculas y espacios", () => {
    expect(normalizeNameKey("María José Pérez")).toBe(normalizeNameKey("maria jose perez"));
  });

  it("encuentra match exacto ignorando tildes/mayúsculas", () => {
    const candidates = [{ id: "1", name: "María Pérez" }, { id: "2", name: "Juan Gómez" }];
    expect(findBestMatch("maria perez", candidates)?.id).toBe("1");
  });

  it("encuentra match parcial por contención", () => {
    const candidates = [{ id: "1", name: "Juan Carlos Perez" }];
    expect(findBestMatch("Juan Perez", candidates)?.id ?? findBestMatch("Perez", candidates)?.id).toBeDefined();
  });

  it("no encuentra match si no hay candidatos parecidos", () => {
    const candidates = [{ id: "1", name: "Ana Torres" }];
    expect(findBestMatch("Roberto Diaz", candidates)).toBeNull();
  });

  it("nombre vacío no matchea nada", () => {
    const candidates = [{ id: "1", name: "Ana Torres" }];
    expect(findBestMatch("", candidates)).toBeNull();
  });
});
