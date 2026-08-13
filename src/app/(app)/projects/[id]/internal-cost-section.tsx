import {
  addWorkRange,
  deleteWorkRange,
  updateWorkRange,
} from "@/app/(app)/projects/internal-cost-actions";
import { calculateProjectedHours, calculateRangeHours, isHoursOverProjected } from "@/lib/financials";
import { ActionForm, SubmitButton, DeleteButton } from "@/components/action-form";
import { Card } from "@/components/ui/card";
import { AlertIcon, TrashIcon } from "@/components/ui/icons";
import { OdooImportForm } from "./odoo-import-form";

type WorkRange = {
  id: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  dedicationPercentage: number;
  holidaysCount: number;
  manualHours: number | null;
};

export type InternalCostMember = {
  projectMemberId: string;
  label: string;
  workRanges: WorkRange[];
  realHours: number;
};

export type InternalCostSectionProps = {
  projectId: string;
  canEdit: boolean;
  members: InternalCostMember[];
  candidates: { id: string; name: string }[];
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtHours(n: number) {
  return `${n.toFixed(1)} h`;
}

// Coste interno: horas proyectadas (rangos con % de dedicación) vs horas
// reales (TimeEntry, cargadas a mano o importadas del CSV de Odoo) —
// pedido del feedback del gestor (2026-08-13), portado de InternalTeam.tsx
// del SPA original sin los "hitos" (no pedidos). A diferencia del SPA,
// acá la alerta de "se pasó" es por persona (no solo a nivel proyecto) y
// usa rojo de verdad, como pidió el feedback original.
export function InternalCostSection({
  projectId,
  canEdit,
  members,
  candidates,
}: InternalCostSectionProps) {
  if (members.length === 0) return null; // sin equipo interno, no hay nada que mostrar acá

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Coste interno: proyectado vs real
        </h2>
        {canEdit && <OdooImportForm projectId={projectId} candidates={candidates} />}
      </div>

      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const projected = calculateProjectedHours(m.workRanges);
          const overBudget = isHoursOverProjected(m.realHours, projected);
          return (
            <li key={m.projectMemberId} className="rounded-md border border-gray-700 bg-gray-900/40">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span className="font-medium text-white">{m.label}</span>
                  <span className="flex items-center gap-3 text-xs">
                    <span className="text-sky-400">Proyectado: {fmtHours(projected)}</span>
                    <span className={overBudget ? "font-semibold text-red-400" : "text-emerald-400"}>
                      Real: {fmtHours(m.realHours)}
                    </span>
                    {overBudget && (
                      <span className="flex items-center gap-1 font-semibold text-red-400">
                        <AlertIcon className="h-3.5 w-3.5" /> Se pasó de lo proyectado
                      </span>
                    )}
                  </span>
                </summary>

                <div className="flex flex-col gap-2 border-t border-gray-700 p-3">
                  {m.workRanges.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin rangos de horas proyectadas todavía.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {m.workRanges.map((r) =>
                        canEdit ? (
                          <li key={r.id} className="rounded-md border border-gray-700 bg-gray-900/60 p-2">
                            <ActionForm action={updateWorkRange} className="flex flex-wrap items-end gap-2">
                              <input type="hidden" name="workRangeId" value={r.id} />
                              <Field label="Tarea" name="taskName" defaultValue={r.taskName} />
                              <Field
                                label="Inicio"
                                name="startDate"
                                type="date"
                                defaultValue={fmtDate(r.startDate)}
                              />
                              <Field label="Fin" name="endDate" type="date" defaultValue={fmtDate(r.endDate)} />
                              <Field
                                label="% dedicación"
                                name="dedicationPercentage"
                                type="number"
                                step="1"
                                defaultValue={r.dedicationPercentage}
                              />
                              <Field
                                label="Festivos"
                                name="holidaysCount"
                                type="number"
                                step="1"
                                defaultValue={r.holidaysCount}
                              />
                              <Field
                                label="Horas manual (opcional)"
                                name="manualHours"
                                type="number"
                                step="0.5"
                                defaultValue={r.manualHours ?? ""}
                              />
                              <SubmitButton small>Guardar</SubmitButton>
                            </ActionForm>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-xs text-gray-500">= {fmtHours(calculateRangeHours(r))}</span>
                              <ActionForm action={deleteWorkRange}>
                                <input type="hidden" name="workRangeId" value={r.id} />
                                <DeleteButton>
                                  <TrashIcon className="h-3.5 w-3.5" /> Eliminar
                                </DeleteButton>
                              </ActionForm>
                            </div>
                          </li>
                        ) : (
                          <li key={r.id} className="text-xs text-gray-400">
                            {r.taskName}: {fmtDate(r.startDate)} → {fmtDate(r.endDate)} (
                            {r.dedicationPercentage}%) = {fmtHours(calculateRangeHours(r))}
                          </li>
                        ),
                      )}
                    </ul>
                  )}

                  {canEdit && (
                    <ActionForm
                      action={addWorkRange}
                      className="flex flex-wrap items-end gap-2 border-t border-gray-700 pt-2"
                    >
                      <input type="hidden" name="projectMemberId" value={m.projectMemberId} />
                      <Field label="Tarea" name="taskName" />
                      <Field label="Inicio" name="startDate" type="date" />
                      <Field label="Fin" name="endDate" type="date" />
                      <Field label="% dedicación" name="dedicationPercentage" type="number" step="1" />
                      <Field label="Festivos" name="holidaysCount" type="number" step="1" />
                      <Field label="Horas manual (opcional)" name="manualHours" type="number" step="0.5" />
                      <SubmitButton small>Agregar rango</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? undefined}
        className="w-28 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
      />
    </div>
  );
}
