import {
  addAdditional,
  addPlannedInvoice,
  deleteAdditional,
  deleteInvoice,
  deletePlannedInvoice,
  promotePlannedInvoice,
  setAgreement,
  setMemberRate,
  updateAdditional,
  updateInvoice,
  updatePlannedInvoice,
} from "@/app/(app)/projects/financial-actions";
import { Card } from "@/components/ui/card";
import { AlertIcon, TrashIcon } from "@/components/ui/icons";

type Money = number;

export type FinancialsSectionProps = {
  projectId: string;
  canEdit: boolean;
  agreement: { amount: Money; offerUrl: string | null; contractUrl: string | null } | null;
  additionals: { id: string; description: string; amount: Money; url: string | null }[];
  plannedInvoices: {
    id: string;
    description: string;
    date: Date;
    amount: Money;
    invoiced: boolean;
  }[];
  invoices: { id: string; amount: Money; date: Date; pdfUrl: string | null }[];
  members: {
    userId: string;
    label: string;
    hourlyRate: number | null;
    defaultRate: number | null;
  }[];
  totalBudget: Money;
  totalInvoiced: Money;
  pendingBilling: Money;
  pendingPlanned: Money;
  internalCost: Money;
  externalCost: Money;
  profit: Money;
  profitPercentage: number;
  atRisk: boolean;
};

function money(amount: number) {
  return amount.toLocaleString("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function FinancialsSection(props: FinancialsSectionProps) {
  const { projectId, canEdit } = props;

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Financiero
      </h2>

      {/* Rentabilidad — lo que le interesa a Gerencia, visible siempre que se
          pueda ver esta sección (Gerencia lectura, Gestor dueño edición) */}
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Presupuesto total" value={money(props.totalBudget)} />
        <Stat label="Facturado" value={money(props.totalInvoiced)} />
        <Stat label="Pendiente de facturar" value={money(props.pendingBilling)} />
        <Stat label="Previsto sin facturar" value={money(props.pendingPlanned)} />
        <Stat label="Coste interno" value={money(props.internalCost)} />
        <Stat label="Coste externo" value={money(props.externalCost)} />
        <Stat
          label="Rentabilidad"
          value={`${money(props.profit)} (${props.profitPercentage.toFixed(1)}%)`}
          highlight={props.atRisk ? "risk" : "ok"}
        />
      </div>
      {props.atRisk && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertIcon className="h-4 w-4" /> Margen por debajo del objetivo
          (50%) — proyecto en riesgo.
        </p>
      )}

      {/* Acuerdo */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-gray-400">Acuerdo</h3>
        {props.agreement ? (
          <p className="text-sm">
            {money(props.agreement.amount)}
            {props.agreement.offerUrl && (
              <>
                {" "}
                ·{" "}
                <a
                  href={props.agreement.offerUrl}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Oferta
                </a>
              </>
            )}
            {props.agreement.contractUrl && (
              <>
                {" "}
                ·{" "}
                <a
                  href={props.agreement.contractUrl}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Contrato
                </a>
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-400">Sin acuerdo cargado.</p>
        )}
        {canEdit && (
          <form action={setAgreement} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <Field label="Monto" name="amount" type="number" step="0.01" defaultValue={props.agreement?.amount} />
            <Field label="URL oferta" name="offerUrl" defaultValue={props.agreement?.offerUrl ?? ""} />
            <Field label="URL contrato" name="contractUrl" defaultValue={props.agreement?.contractUrl ?? ""} />
            <SubmitButton>{props.agreement ? "Actualizar" : "Guardar"}</SubmitButton>
          </form>
        )}
      </div>

      {/* Adicionales */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-gray-400">
          Adicionales ({props.additionals.length})
        </h3>
        <ul className="flex flex-col gap-1">
          {props.additionals.map((a) =>
            canEdit ? (
              <li key={a.id} className="flex flex-wrap items-end gap-2">
                <form action={updateAdditional} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="additionalId" value={a.id} />
                  <Field label="Descripción" name="description" defaultValue={a.description} />
                  <Field label="Monto" name="amount" type="number" step="0.01" defaultValue={a.amount} />
                  <SubmitButton small>Guardar</SubmitButton>
                </form>
                <form action={deleteAdditional}>
                  <input type="hidden" name="additionalId" value={a.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <TrashIcon className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </form>
              </li>
            ) : (
              <li key={a.id} className="text-sm">
                {a.description} — {money(a.amount)}
              </li>
            ),
          )}
        </ul>
        {canEdit && (
          <form action={addAdditional} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <Field label="Descripción" name="description" />
            <Field label="Monto" name="amount" type="number" step="0.01" />
            <SubmitButton>Agregar adicional</SubmitButton>
          </form>
        )}
      </div>

      {/* Previsión de facturación */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-gray-400">
          Previsión de facturación ({props.plannedInvoices.length})
        </h3>
        <ul className="flex flex-col gap-2">
          {props.plannedInvoices.map((p) =>
            canEdit && !p.invoiced ? (
              <li key={p.id} className="flex flex-wrap items-end gap-2">
                <form action={updatePlannedInvoice} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="plannedInvoiceId" value={p.id} />
                  <Field label="Descripción" name="description" defaultValue={p.description} />
                  <Field label="Fecha" name="date" type="date" defaultValue={fmtDate(p.date)} />
                  <Field label="Monto" name="amount" type="number" step="0.01" defaultValue={p.amount} />
                  <SubmitButton small>Guardar</SubmitButton>
                </form>
                <form action={promotePlannedInvoice}>
                  <input type="hidden" name="plannedInvoiceId" value={p.id} />
                  <SubmitButton small>Marcar facturada</SubmitButton>
                </form>
                <form action={deletePlannedInvoice}>
                  <input type="hidden" name="plannedInvoiceId" value={p.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <TrashIcon className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </form>
              </li>
            ) : (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {fmtDate(p.date)} — {p.description} — {money(p.amount)}{" "}
                  {p.invoiced ? (
                    <span className="text-green-400">(facturada)</span>
                  ) : (
                    <span className="text-gray-400">(pendiente)</span>
                  )}
                </span>
              </li>
            ),
          )}
        </ul>
        {canEdit && (
          <form action={addPlannedInvoice} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <Field label="Descripción" name="description" />
            <Field label="Fecha" name="date" type="date" />
            <Field label="Monto" name="amount" type="number" step="0.01" />
            <SubmitButton>Agregar prevista</SubmitButton>
          </form>
        )}
      </div>

      {/* Facturas reales */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-gray-400">
          Facturas emitidas ({props.invoices.length})
        </h3>
        {props.invoices.length === 0 ? (
          <p className="text-sm text-gray-400">Todavía no hay facturas emitidas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {props.invoices.map((inv) =>
              canEdit ? (
                <li key={inv.id} className="flex flex-wrap items-end gap-2">
                  <form action={updateInvoice} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="invoiceId" value={inv.id} />
                    <Field label="Fecha" name="date" type="date" defaultValue={fmtDate(inv.date)} />
                    <Field label="Monto" name="amount" type="number" step="0.01" defaultValue={inv.amount} />
                    <Field label="URL PDF" name="pdfUrl" defaultValue={inv.pdfUrl ?? ""} />
                    <SubmitButton small>Guardar</SubmitButton>
                  </form>
                  <form action={deleteInvoice}>
                    <input type="hidden" name="invoiceId" value={inv.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                    >
                      <TrashIcon className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </form>
                </li>
              ) : (
                <li key={inv.id} className="text-sm">
                  {fmtDate(inv.date)} — {money(inv.amount)}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {/* Tarifas de coste interno */}
      {canEdit && props.members.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-gray-400">
            Tarifa hora (coste interno)
          </h3>
          <ul className="flex flex-col gap-2">
            {props.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{m.label}</span>
                <form action={setMemberRate} className="flex items-center gap-2">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <input
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    defaultValue={m.hourlyRate ?? m.defaultRate ?? ""}
                    placeholder="tarifa/hora"
                    className="w-24 rounded-md border border-gray-700 bg-gray-900/60 text-white px-2 py-1 text-xs"
                  />
                  <SubmitButton small>Guardar</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "ok" | "risk";
}) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={
          highlight === "risk"
            ? "font-medium text-red-400"
            : highlight === "ok"
              ? "font-medium text-green-400"
              : "font-medium"
        }
      >
        {value}
      </p>
    </div>
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
        className="rounded-md border border-gray-700 bg-gray-900/60 text-white px-2 py-1 text-xs"
      />
    </div>
  );
}

function SubmitButton({
  children,
  small,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="submit"
      className={
        small
          ? "rounded-md bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
          : "rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
      }
    >
      {children}
    </button>
  );
}
