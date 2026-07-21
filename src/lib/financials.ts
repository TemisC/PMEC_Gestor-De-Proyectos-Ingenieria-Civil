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
