import {
  addExternalAdditional,
  addExternalCollaborator,
  addExternalPayment,
  deleteExternalAdditional,
  deleteExternalCollaborator,
  deleteExternalPayment,
  updateExternalAdditional,
  updateExternalCollaborator,
  updateExternalPayment,
} from "@/app/(app)/projects/external-collaborators-actions";
import { calculateExternalCost, calculatePendingExternalPayment } from "@/lib/financials";
import { Card } from "@/components/ui/card";
import { TrashIcon } from "@/components/ui/icons";

type Money = number;

export type ExternalCollaboratorsSectionProps = {
  projectId: string;
  canEdit: boolean;
  collaborators: {
    id: string;
    name: string;
    company: string | null;
    contact: string | null;
    agreementAmount: Money | null;
    agreementUrl: string | null;
    additionals: { id: string; description: string; amount: Money }[];
    payments: { id: string; amount: Money; date: Date; description: string | null }[];
  }[];
};

function money(amount: number) {
  return amount.toLocaleString("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// Colaboradores externos (subcontratistas): se les paga por acuerdo, no
// por hora — a diferencia del Colaborador interno (User con TimeEntry).
// Mismo criterio de acceso que el resto de "Financiero": Gestor dueño
// edita, Gerencia ve en solo lectura, Colaborador nunca ve esto (se
// filtra en la página, esta sección solo se renderiza si canSeeFinancials).
export function ExternalCollaboratorsSection({
  projectId,
  canEdit,
  collaborators,
}: ExternalCollaboratorsSectionProps) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Colaboradores externos ({collaborators.length})
      </h2>

      {collaborators.map((c) => {
        const paid = calculateExternalCost(c.payments);
        const pending = calculatePendingExternalPayment(
          c.agreementAmount,
          c.additionals,
          c.payments,
        );
        return (
          <div
            key={c.id}
            className="flex flex-col gap-2 rounded-md border border-gray-700 bg-gray-900/40 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  {c.name} {c.company && <span className="text-gray-400">({c.company})</span>}
                </p>
                {c.contact && <p className="text-xs text-gray-400">{c.contact}</p>}
              </div>
              <div className="text-right text-xs">
                <p className="text-gray-400">
                  Acordado: {money(c.agreementAmount ?? 0)}
                </p>
                <p className="text-green-400">Pagado: {money(paid)}</p>
                <p className={pending > 0 ? "text-yellow-400" : "text-gray-400"}>
                  Pendiente: {money(pending)}
                </p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-end gap-2 border-t border-gray-700 pt-2">
                <form action={updateExternalCollaborator} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="externalCollaboratorId" value={c.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Nombre</label>
                    <input
                      name="name"
                      defaultValue={c.name}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Empresa</label>
                    <input
                      name="company"
                      defaultValue={c.company ?? ""}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Contacto</label>
                    <input
                      name="contact"
                      defaultValue={c.contact ?? ""}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Acordado</label>
                    <input
                      name="agreementAmount"
                      type="number"
                      step="0.01"
                      defaultValue={c.agreementAmount ?? ""}
                      className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
                  >
                    Guardar
                  </button>
                </form>
                <form action={deleteExternalCollaborator}>
                  <input type="hidden" name="externalCollaboratorId" value={c.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <TrashIcon className="h-3.5 w-3.5" /> Eliminar colaborador
                  </button>
                </form>
              </div>
            )}

            {c.additionals.length > 0 && (
              <ul className="flex flex-col gap-1 text-xs text-gray-400">
                {c.additionals.map((a) =>
                  canEdit ? (
                    <li key={a.id} className="flex flex-wrap items-end gap-2">
                      <form
                        action={updateExternalAdditional}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="externalAdditionalId" value={a.id} />
                        <input
                          name="description"
                          defaultValue={a.description}
                          className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                        />
                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          defaultValue={a.amount}
                          className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
                        >
                          Guardar
                        </button>
                      </form>
                      <form action={deleteExternalAdditional}>
                        <input type="hidden" name="externalAdditionalId" value={a.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-1 text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="h-3 w-3" /> Eliminar
                        </button>
                      </form>
                    </li>
                  ) : (
                    <li key={a.id}>
                      + {a.description} — {money(a.amount)}
                    </li>
                  ),
                )}
              </ul>
            )}

            {c.payments.length > 0 && (
              <ul className="flex flex-col gap-1 text-xs text-gray-400">
                {c.payments.map((p) =>
                  canEdit ? (
                    <li key={p.id} className="flex flex-wrap items-end gap-2">
                      <form
                        action={updateExternalPayment}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="externalPaymentId" value={p.id} />
                        <input
                          name="date"
                          type="date"
                          defaultValue={p.date.toISOString().slice(0, 10)}
                          className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                        />
                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          defaultValue={p.amount}
                          className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                        />
                        <input
                          name="description"
                          defaultValue={p.description ?? ""}
                          className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
                        >
                          Guardar
                        </button>
                      </form>
                      <form action={deleteExternalPayment}>
                        <input type="hidden" name="externalPaymentId" value={p.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-1 text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="h-3 w-3" /> Eliminar
                        </button>
                      </form>
                    </li>
                  ) : (
                    <li key={p.id}>
                      {p.date.toISOString().slice(0, 10)} — {money(p.amount)}
                      {p.description && ` — ${p.description}`}
                    </li>
                  ),
                )}
              </ul>
            )}

            {canEdit && (
              <div className="flex flex-wrap gap-4 border-t border-gray-700 pt-2">
                <form action={addExternalAdditional} className="flex items-end gap-2">
                  <input type="hidden" name="externalCollaboratorId" value={c.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Adicional</label>
                    <input
                      name="description"
                      placeholder="descripción"
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="monto"
                    className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
                  >
                    Agregar
                  </button>
                </form>

                <form action={addExternalPayment} className="flex items-end gap-2">
                  <input type="hidden" name="externalCollaboratorId" value={c.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Pago</label>
                    <input
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="monto"
                    className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
                  >
                    Registrar pago
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      })}

      {canEdit && (
        <form
          action={addExternalCollaborator}
          className="flex flex-wrap items-end gap-2 border-t border-gray-700 pt-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Nombre</label>
            <input
              name="name"
              required
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Empresa</label>
            <input
              name="company"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Contacto</label>
            <input
              name="contact"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Acordado</label>
            <input
              name="agreementAmount"
              type="number"
              step="0.01"
              className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
          >
            Agregar colaborador externo
          </button>
        </form>
      )}
    </Card>
  );
}
