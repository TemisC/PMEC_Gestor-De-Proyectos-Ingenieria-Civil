"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { importTimeEntries } from "@/app/(app)/projects/internal-cost-actions";
import { findBestMatch, parseOdooCsv, type OdooCsvRow } from "@/lib/odoo-csv";

type Candidate = { id: string; name: string };

type ReviewRow = OdooCsvRow & {
  matchedUserId: string | null; // null = fila descartada, no se importa
};

// Carga del CSV de Odoo (feedback del gestor, 2026-08-13): el parseo y el
// matcheo de nombre corren acá en el cliente, y el gestor confirma cada
// fila antes de que se persista nada — decisión explícita del usuario: no
// crear colaboradores/logins nuevos solo por aparecer un nombre no
// reconocido en el Excel, a diferencia del SPA original.
export function OdooImportForm({
  projectId,
  candidates,
}: {
  projectId: string;
  candidates: Candidate[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const { rows: parsed, errors } = parseOdooCsv(text);
    setParseErrors(errors);
    setRows(
      parsed.map((r) => ({
        ...r,
        matchedUserId: findBestMatch(r.employeeName, candidates)?.id ?? null,
      })),
    );
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setRows(null);
    setParseErrors([]);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateMatch(idx: number, userId: string) {
    setRows((prev) =>
      prev ? prev.map((r, i) => (i === idx ? { ...r, matchedUserId: userId || null } : r)) : null,
    );
  }

  const confirmedRows = useMemo(() => (rows ?? []).filter((r) => r.matchedUserId), [rows]);

  function handleConfirm() {
    if (confirmedRows.length === 0) return;
    startTransition(async () => {
      const res = await importTimeEntries(
        projectId,
        confirmedRows.map((r) => ({ userId: r.matchedUserId as string, date: r.date, hours: r.hours })),
      );
      if (res.ok) {
        const extra = [
          res.skipped > 0 ? `${res.skipped} ya existían` : null,
          res.addedMembers > 0 ? `${res.addedMembers} colaborador(es) nuevo(s) agregado(s) al proyecto` : null,
        ].filter(Boolean);
        setResult({
          ok: true,
          message: `${res.created} fichajes importados${extra.length ? ` (${extra.join(", ")})` : ""}.`,
        });
        reset();
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  if (!rows) {
    return (
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onInputChange} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-sky-500 hover:text-sky-400"
        >
          Cargar fichajes de Odoo (CSV)
        </button>
        {result && (
          <span className={result.ok ? "text-xs text-green-400" : "text-xs text-red-400"}>
            {result.message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border border-gray-700 bg-gray-900/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-gray-300">
          {fileName} — {rows.length} filas, {confirmedRows.length} con colaborador asignado
        </span>
        <button type="button" onClick={reset} className="text-xs text-gray-500 hover:text-white">
          Cancelar
        </button>
      </div>

      {parseErrors.length > 0 && (
        <div className="mb-2 rounded-md bg-red-900/30 px-2 py-1 text-xs text-red-400">
          {parseErrors.length} línea(s) con error, se ignoraron: {parseErrors.slice(0, 3).join(" · ")}
          {parseErrors.length > 3 && "…"}
        </div>
      )}

      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-1 pr-2">Fecha</th>
              <th className="pb-1 pr-2">Empleado (CSV)</th>
              <th className="pb-1 pr-2">Horas</th>
              <th className="pb-1">Colaborador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((r, idx) => (
              <tr key={idx} className={r.matchedUserId ? "" : "opacity-50"}>
                <td className="py-1 pr-2 text-gray-400">{r.date}</td>
                <td className="py-1 pr-2 text-gray-300">{r.employeeName}</td>
                <td className="py-1 pr-2 text-gray-300">{r.hours}</td>
                <td className="py-1">
                  <select
                    value={r.matchedUserId ?? ""}
                    onChange={(e) => updateMatch(idx, e.target.value)}
                    className="rounded border border-gray-700 bg-gray-900/60 px-1 py-0.5 text-xs text-white"
                  >
                    <option value="">— Descartar fila —</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && !result.ok && (
        <p className="mt-2 rounded-md bg-red-900/30 px-2 py-1 text-xs text-red-400">{result.message}</p>
      )}

      <button
        type="button"
        disabled={isPending || confirmedRows.length === 0}
        onClick={handleConfirm}
        className="mt-3 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Importando..." : `Confirmar importación (${confirmedRows.length})`}
      </button>
    </div>
  );
}
