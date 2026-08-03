"use client";

import { useRef, useState } from "react";

// ── Tipos mínimos del formato SPA ────────────────────────────────────────────

interface SpaAdditional {
  description: string;
  amount: number;
  url?: string;
}

interface SpaPlannedInvoice {
  id: string;
  description: string;
  date: string;
  amount: number;
  source?: string;
}

interface SpaInvoice {
  id: string;
  amount: number;
  date: string;
  pdfUrl: string;
  source?: string;
}

interface SpaClientInfo {
  agreement: { amount: number; offerUrl: string; contractUrl?: string };
  additionals: SpaAdditional[];
  plannedInvoices: SpaPlannedInvoice[];
  invoices: SpaInvoice[];
}

interface SpaCollaboratorInfo {
  agreement: { amount: number; contractUrl: string };
  additionals: { description: string; amount: number }[];
  invoices: { id: string; amount: number; date: string; pdfUrl: string }[];
}

interface SpaInternalCostInfo {
  hourlyRate: number;
  workRanges: unknown[];
}

interface SpaTeamMember {
  name: string;
  company?: string;
  contact: string;
  role: string;
  type: "Interno" | "Externo";
  active?: boolean;
  collaboratorInfo?: SpaCollaboratorInfo;
  internalCostInfo?: SpaInternalCostInfo;
}

interface SpaPartialDelivery {
  id: string;
  description: string;
  date: string;
  completed: boolean;
}

interface SpaProject {
  id: string;
  code: string;
  name: string;
  client: string;
  status: string;
  statusDetail?: string;
  startDate?: string;
  endDate?: string;
  team: SpaTeamMember[];
  clientInfo?: SpaClientInfo;
  partialDeliveries?: SpaPartialDelivery[];
}

interface SpaBackup {
  projects: SpaProject[];
  loneCollaborators: SpaTeamMember[];
  internalRates: Record<string, number>;
  exportDate?: string;
  exportedFrom?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function statusColor(s: string) {
  if (s === "En proceso") return "text-emerald-400";
  if (s === "Finalizado") return "text-gray-400";
  return "text-yellow-400";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </div>
  );
}

// ── Visor del proyecto ────────────────────────────────────────────────────────

function ProjectPreview({ project, internalRates }: { project: SpaProject; internalRates: Record<string, number> }) {
  const internals = project.team.filter((m) => m.type === "Interno");
  const externals = project.team.filter((m) => m.type === "Externo");
  const ci = project.clientInfo;

  const totalAgreement = ci?.agreement.amount ?? 0;
  const totalAdditionals = ci?.additionals.reduce((s, a) => s + a.amount, 0) ?? 0;
  const totalBudget = totalAgreement + totalAdditionals;
  const totalInvoiced = ci?.invoices.reduce((s, i) => s + i.amount, 0) ?? 0;
  const totalPlanned = ci?.plannedInvoices.reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalExtCost = externals.reduce((s, m) => {
    const paid = m.collaboratorInfo?.invoices.reduce((x, i) => x + i.amount, 0) ?? 0;
    return s + paid;
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado */}
      <Section title="Datos generales">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Nombre</dt>
            <dd className="font-semibold text-white">{project.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Cliente</dt>
            <dd className="text-gray-300">{project.client || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Estado</dt>
            <dd className={`font-medium ${statusColor(project.status)}`}>{project.status}</dd>
          </div>
          {project.code && (
            <div>
              <dt className="text-xs text-gray-500">Código</dt>
              <dd className="font-mono text-xs text-gray-400">{project.code}</dd>
            </div>
          )}
          {project.startDate && (
            <div>
              <dt className="text-xs text-gray-500">Inicio</dt>
              <dd className="text-gray-400">{project.startDate}</dd>
            </div>
          )}
          {project.endDate && (
            <div>
              <dt className="text-xs text-gray-500">Fin</dt>
              <dd className="text-gray-400">{project.endDate}</dd>
            </div>
          )}
          {project.statusDetail && (
            <div className="col-span-full">
              <dt className="text-xs text-gray-500">Detalle estado</dt>
              <dd className="text-gray-400">{project.statusDetail}</dd>
            </div>
          )}
        </dl>
      </Section>

      {/* Resumen financiero */}
      <Section title="Resumen financiero">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Acuerdo base", value: money(totalAgreement), color: "text-white" },
            { label: "Adicionales", value: money(totalAdditionals), color: "text-sky-400" },
            { label: "Presupuesto total", value: money(totalBudget), color: "text-white font-bold" },
            { label: "Facturado", value: money(totalInvoiced), color: "text-emerald-400" },
            { label: "Previsto facturar", value: money(totalPlanned), color: "text-yellow-400" },
            { label: "Pagado a externos", value: money(totalExtCost), color: "text-red-400" },
          ].map((item) => (
            <div key={item.label} className="rounded bg-gray-800/60 p-2">
              <p className="text-[10px] text-gray-500">{item.label}</p>
              <p className={`text-sm ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Previsiones de cobro */}
      {ci && ci.plannedInvoices.length > 0 && (
        <Section title={`Previsiones de cobro (${ci.plannedInvoices.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Descripción</th>
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Fuente</th>
                  <th className="pb-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {ci.plannedInvoices.map((pi) => (
                  <tr key={pi.id}>
                    <td className="py-2 text-gray-300">{pi.description}</td>
                    <td className="py-2 text-gray-400">{pi.date}</td>
                    <td className="py-2 text-gray-500">{pi.source ?? "—"}</td>
                    <td className="py-2 text-right font-medium text-yellow-400">{money(pi.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 text-xs font-semibold">
                  <td colSpan={3} className="pt-2 text-gray-400">Total previsto</td>
                  <td className="pt-2 text-right text-yellow-400">{money(totalPlanned)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>
      )}

      {/* Facturas emitidas */}
      {ci && ci.invoices.length > 0 && (
        <Section title={`Facturas emitidas (${ci.invoices.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Fuente</th>
                  <th className="pb-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {ci.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 text-gray-400">{inv.date}</td>
                    <td className="py-2 text-gray-500">{inv.source ?? "—"}</td>
                    <td className="py-2 text-right font-medium text-emerald-400">{money(inv.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 text-xs font-semibold">
                  <td colSpan={2} className="pt-2 text-gray-400">Total facturado</td>
                  <td className="pt-2 text-right text-emerald-400">{money(totalInvoiced)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>
      )}

      {/* Equipo interno */}
      {internals.length > 0 && (
        <Section title={`Equipo interno (${internals.length})`}>
          <ul className="flex flex-col gap-2">
            {internals.map((m) => {
              const rate =
                m.internalCostInfo && m.internalCostInfo.hourlyRate > 0
                  ? m.internalCostInfo.hourlyRate
                  : (internalRates[m.contact] ?? null);
              return (
                <li key={m.contact} className="flex items-center justify-between rounded bg-gray-800/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.contact}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{m.role}</p>
                    <p className="text-xs text-sky-400">
                      {rate != null ? `${rate} $/h` : "Sin tarifa"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Colaboradores externos */}
      {externals.length > 0 && (
        <Section title={`Colaboradores externos (${externals.length})`}>
          <div className="flex flex-col gap-3">
            {externals.map((m) => {
              const ci2 = m.collaboratorInfo;
              const totalPaid = ci2?.invoices.reduce((s, i) => s + i.amount, 0) ?? 0;
              const extAdditionals = ci2?.additionals.reduce((s, a) => s + a.amount, 0) ?? 0;
              const totalAgreed = (ci2?.agreement.amount ?? 0) + extAdditionals;
              return (
                <div key={m.contact} className="rounded bg-gray-800/40 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{m.name}</p>
                      {m.company && <p className="text-xs text-gray-500">{m.company}</p>}
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-gray-400">Acuerdo: <span className="text-white">{money(totalAgreed)}</span></p>
                      <p className="text-gray-400">Pagado: <span className="text-red-400">{money(totalPaid)}</span></p>
                    </div>
                  </div>
                  {ci2 && ci2.invoices.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ci2.invoices.map((inv) => (
                        <span key={inv.id} className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {inv.date} · {money(inv.amount)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Hitos */}
      {project.partialDeliveries && project.partialDeliveries.length > 0 && (
        <Section title={`Hitos / entregas parciales (${project.partialDeliveries.length})`}>
          <ul className="flex flex-col gap-1.5">
            {project.partialDeliveries.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span className={d.completed ? "text-gray-500 line-through" : "text-gray-300"}>
                  {d.description}
                </span>
                <span className="ml-4 shrink-0 text-xs text-gray-600">{d.date}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Botón Tarea 3 */}
      <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-700 p-4">
        <div>
          <p className="text-sm font-medium text-white">¿Todo correcto?</p>
          <p className="text-xs text-gray-500">La importación a base de datos estará disponible en la próxima tarea.</p>
        </div>
        <button
          disabled
          className="cursor-not-allowed rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-600"
          title="Próximamente — Tarea 3"
        >
          Confirmar e importar
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ImportViewer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<SpaBackup | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  function reset() {
    setBackup(null);
    setSelectedIdx(0);
    setError(null);
    setFilename(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".json")) {
      setError("El archivo debe ser un .json");
      return;
    }
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsed?.projects) || parsed.projects.length === 0) {
          setError("El archivo no contiene proyectos válidos.");
          return;
        }
        setError(null);
        setSelectedIdx(0);
        setBackup(parsed as SpaBackup);
      } catch {
        setError("No se pudo leer el archivo. ¿Es un JSON válido?");
      }
    };
    reader.readAsText(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ── Sin archivo cargado: zona de drop ────────────────────────────────
  if (!backup) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onInputChange}
        />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/40 px-8 py-16 text-center transition-colors hover:border-sky-600 hover:bg-gray-900/60"
        >
          <div className="text-4xl text-gray-600">📂</div>
          <div>
            <p className="text-sm font-medium text-gray-300">
              Arrastrá el archivo aquí o hacé clic para seleccionar
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Acepta <span className="font-mono">vicent_pm_backup_*.json</span> o exports de PMEC
            </p>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-md bg-red-950/40 px-4 py-2 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }

  // ── Archivo cargado ───────────────────────────────────────────────────
  const project = backup.projects[selectedIdx];

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-emerald-400">✓</span>
          <span className="font-medium text-white">{filename}</span>
          {backup.exportedFrom && (
            <span className="rounded bg-sky-900/50 px-1.5 py-0.5 text-[10px] text-sky-400">
              desde {backup.exportedFrom}
            </span>
          )}
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{backup.projects.length} proyecto{backup.projects.length !== 1 ? "s" : ""}</span>
          {backup.exportDate && (
            <>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500 text-xs">{backup.exportDate.slice(0, 10)}</span>
            </>
          )}
        </div>
        <button
          onClick={reset}
          className="text-xs text-gray-500 hover:text-white"
        >
          Cargar otro archivo
        </button>
      </div>

      {/* Selector de proyecto si hay más de uno */}
      {backup.projects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {backup.projects.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedIdx(i)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === selectedIdx
                  ? "border-sky-500 bg-sky-900/30 text-sky-300"
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Preview del proyecto seleccionado */}
      <ProjectPreview project={project} internalRates={backup.internalRates ?? {}} />
    </div>
  );
}
