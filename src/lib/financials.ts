// Fórmulas portadas del SPA original (project-management-dashboard,
// Dashboard.tsx/EconomicTracking.tsx) — funciones puras, sin Prisma, para
// poder testearlas de forma aislada y determinística. Diferencia
// deliberada respecto al original: el coste interno se calcula sobre
// horas REALMENTE cargadas (TimeEntry), no sobre horas planificadas por
// dedicación — más simple y más preciso para este MVP, a costo de no
// tener todavía una "previsión" de coste interno futuro (solo de
// ingresos, vía PlannedInvoice). Ver plan_maestro.md para la nota sobre
// este cambio de secuencia y el riesgo aceptado (Etapa 0 pendiente).

export function calculateTotalBudget(
  agreementAmount: number | null | undefined,
  additionals: { amount: number }[],
): number {
  const base = agreementAmount ?? 0;
  const extras = additionals.reduce((sum, a) => sum + a.amount, 0);
  return base + extras;
}

export function calculateTotalInvoiced(invoices: { amount: number }[]): number {
  return invoices.reduce((sum, i) => sum + i.amount, 0);
}

export function calculatePendingBilling(
  totalBudget: number,
  totalInvoiced: number,
): number {
  return totalBudget - totalInvoiced;
}

// Del total previsto (PlannedInvoice), cuánto todavía no se "promovió" a
// factura real — la previsión de cobro pendiente de concretarse.
export function calculatePendingPlanned(
  plannedInvoices: { amount: number; invoiced: boolean }[],
): number {
  return plannedInvoices
    .filter((p) => !p.invoiced)
    .reduce((sum, p) => sum + p.amount, 0);
}

// Coste interno = horas cargadas × tarifa hora vigente para ese
// colaborador en ese proyecto (override de ProjectMember.hourlyRate, o
// User.defaultHourlyRate si no hay override, o 0 si no hay ninguna
// tarifa configurada — nunca se asume un número inventado).
export function calculateInternalCost(
  timeEntries: { userId: string; hours: number }[],
  rateByUserId: Map<string, number>,
): number {
  return timeEntries.reduce((sum, entry) => {
    const rate = rateByUserId.get(entry.userId) ?? 0;
    return sum + entry.hours * rate;
  }, 0);
}

// Coste externo = pagos REALES ya hechos a colaboradores externos (no
// lo acordado/previsto) — mismo criterio que el coste interno: se basa
// en lo efectivamente ejecutado, no en compromisos futuros.
export function calculateExternalCost(
  payments: { amount: number }[],
): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

// Cuánto falta pagarle a un colaborador externo puntual: lo acordado
// (+ adicionales) menos lo ya pagado.
export function calculatePendingExternalPayment(
  agreementAmount: number | null | undefined,
  additionals: { amount: number }[],
  payments: { amount: number }[],
): number {
  const committed = calculateTotalBudget(agreementAmount, additionals);
  const paid = calculateExternalCost(payments);
  return committed - paid;
}

export function calculateProfit(
  totalBudget: number,
  internalCost: number,
  externalCost = 0,
): number {
  return totalBudget - internalCost - externalCost;
}

export function calculateProfitPercentage(
  profit: number,
  totalBudget: number,
): number {
  if (totalBudget <= 0) return 0;
  return (profit / totalBudget) * 100;
}

// Margen objetivo configurable por proyecto — default 50%, igual que el
// SPA original (hoy fijo ahí; acá ya nace configurable, sección 4.1 del
// plan lo pedía explícitamente).
export function isMarginAtRisk(
  profitPercentage: number,
  targetPercentage = 50,
): boolean {
  return profitPercentage < targetPercentage;
}

// ── Cashflow mensual (sección 4.1 del plan) ──────────────────────────────

export type CashflowRow = {
  month: string;       // "YYYY-MM" — clave de ordenamiento
  label: string;       // "Ene 2026" — para mostrar al usuario
  cobrado: number;     // Invoice.amount en ese mes
  previsto: number;    // PlannedInvoice.amount NO facturado aún en ese mes
  costeInterno: number;
  costeExterno: number;
};

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function toMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function fillMonthRange(from: string, to: string): string[] {
  const result: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [toY, toM] = to.split("-").map(Number);
  while (y < toY || (y === toY && m <= toM)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

export function buildCashflowByMonth(params: {
  plannedInvoices: { date: Date; amount: number; invoiced: boolean }[];
  invoices: { date: Date; amount: number }[];
  timeEntries: { date: Date; hours: number; userId: string }[];
  rateByUserId: Map<string, number>;
  externalPayments: { date: Date; amount: number }[];
}): CashflowRow[] {
  const { plannedInvoices, invoices, timeEntries, rateByUserId, externalPayments } = params;

  const data = new Map<string, Omit<CashflowRow, "month" | "label">>();
  const ensure = (k: string) => {
    if (!data.has(k)) data.set(k, { cobrado: 0, previsto: 0, costeInterno: 0, costeExterno: 0 });
    return data.get(k)!;
  };

  for (const inv of invoices) {
    const row = ensure(toMonthKey(inv.date));
    row.cobrado += inv.amount;
  }
  for (const pi of plannedInvoices) {
    if (!pi.invoiced) {
      const row = ensure(toMonthKey(pi.date));
      row.previsto += pi.amount;
    }
  }
  for (const te of timeEntries) {
    const rate = rateByUserId.get(te.userId) ?? 0;
    if (rate > 0) {
      const row = ensure(toMonthKey(te.date));
      row.costeInterno += te.hours * rate;
    }
  }
  for (const pay of externalPayments) {
    const row = ensure(toMonthKey(pay.date));
    row.costeExterno += pay.amount;
  }

  if (data.size === 0) return [];

  const keys = [...data.keys()].sort();
  const months = fillMonthRange(keys[0], keys[keys.length - 1]);

  return months.map((month) => {
    const d = data.get(month) ?? { cobrado: 0, previsto: 0, costeInterno: 0, costeExterno: 0 };
    return { month, label: monthLabel(month), ...d };
  });
}
