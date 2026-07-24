import { describe, expect, it } from "vitest";
import {
  buildCashflowByMonth,
  calculateExternalCost,
  calculateInternalCost,
  calculatePendingBilling,
  calculatePendingExternalPayment,
  calculatePendingPlanned,
  calculateProfit,
  calculateProfitPercentage,
  calculateTotalBudget,
  calculateTotalInvoiced,
  isMarginAtRisk,
} from "./financials";

describe("calculateTotalBudget", () => {
  it("suma el acuerdo más los adicionales", () => {
    expect(
      calculateTotalBudget(10000, [{ amount: 1000 }, { amount: 1000 }]),
    ).toBe(12000);
  });

  it("sin acuerdo (null) cuenta solo los adicionales", () => {
    expect(calculateTotalBudget(null, [{ amount: 500 }])).toBe(500);
  });

  it("sin adicionales es solo el acuerdo", () => {
    expect(calculateTotalBudget(5000, [])).toBe(5000);
  });
});

describe("calculateTotalInvoiced / calculatePendingBilling", () => {
  it("lo pendiente de facturar es presupuesto menos lo ya facturado", () => {
    const totalBudget = calculateTotalBudget(10000, []);
    const totalInvoiced = calculateTotalInvoiced([{ amount: 3000 }]);
    expect(calculatePendingBilling(totalBudget, totalInvoiced)).toBe(7000);
  });

  it("si se facturó todo, no queda pendiente", () => {
    expect(calculatePendingBilling(5000, 5000)).toBe(0);
  });
});

describe("calculatePendingPlanned", () => {
  it("solo cuenta las previstas que todavía no se promovieron a factura real", () => {
    const pending = calculatePendingPlanned([
      { amount: 1000, invoiced: true },
      { amount: 2000, invoiced: false },
      { amount: 500, invoiced: false },
    ]);
    expect(pending).toBe(2500);
  });
});

describe("calculateExternalCost / calculatePendingExternalPayment", () => {
  it("el coste externo es la suma de los pagos reales, no lo acordado", () => {
    const cost = calculateExternalCost([{ amount: 1000 }, { amount: 500 }]);
    expect(cost).toBe(1500);
  });

  it("lo pendiente de pagar es lo acordado (+ adicionales) menos lo ya pagado", () => {
    const pending = calculatePendingExternalPayment(
      3000,
      [{ amount: 500 }],
      [{ amount: 1000 }],
    );
    expect(pending).toBe(2500);
  });
});

describe("calculateInternalCost", () => {
  it("multiplica horas por la tarifa del colaborador correspondiente", () => {
    const rates = new Map([
      ["user-1", 20],
      ["user-2", 30],
    ]);
    const cost = calculateInternalCost(
      [
        { userId: "user-1", hours: 10 },
        { userId: "user-2", hours: 5 },
      ],
      rates,
    );
    expect(cost).toBe(10 * 20 + 5 * 30);
  });

  it("si no hay tarifa configurada para un colaborador, no inventa un número", () => {
    const cost = calculateInternalCost(
      [{ userId: "sin-tarifa", hours: 100 }],
      new Map(),
    );
    expect(cost).toBe(0);
  });
});

describe("calculateProfit / calculateProfitPercentage / isMarginAtRisk", () => {
  it("caso rentable: presupuesto 12000, coste interno 2000 -> margen ~83%", () => {
    const totalBudget = 12000;
    const internalCost = 2000;
    const profit = calculateProfit(totalBudget, internalCost);
    const profitPercentage = calculateProfitPercentage(profit, totalBudget);

    expect(profit).toBe(10000);
    expect(profitPercentage).toBeCloseTo(83.33, 1);
    expect(isMarginAtRisk(profitPercentage)).toBe(false);
  });

  it("caso en riesgo: presupuesto 10000, coste interno 8000 -> margen 20%, debajo del objetivo 50%", () => {
    const profit = calculateProfit(10000, 8000);
    const profitPercentage = calculateProfitPercentage(profit, 10000);

    expect(profitPercentage).toBe(20);
    expect(isMarginAtRisk(profitPercentage)).toBe(true);
  });

  it("caso a pérdida: coste interno mayor al presupuesto -> margen negativo", () => {
    const profit = calculateProfit(5000, 7000);
    const profitPercentage = calculateProfitPercentage(profit, 5000);

    expect(profit).toBe(-2000);
    expect(profitPercentage).toBeLessThan(0);
    expect(isMarginAtRisk(profitPercentage)).toBe(true);
  });

  it("presupuesto en cero no divide por cero", () => {
    expect(calculateProfitPercentage(0, 0)).toBe(0);
  });

  it("respeta un margen objetivo distinto al default", () => {
    // 40% de margen, con objetivo custom de 30% -> no está en riesgo
    expect(isMarginAtRisk(40, 30)).toBe(false);
    // pero con el objetivo default (50%) sí lo estaría
    expect(isMarginAtRisk(40)).toBe(true);
  });
});

// Helpers para tests de cashflow
const d = (ym: string) => new Date(`${ym}-15T00:00:00Z`);
const noRates = new Map<string, number>();

describe("buildCashflowByMonth", () => {
  it("sin datos devuelve array vacío", () => {
    expect(
      buildCashflowByMonth({
        plannedInvoices: [],
        invoices: [],
        timeEntries: [],
        rateByUserId: noRates,
        externalPayments: [],
      }),
    ).toEqual([]);
  });

  it("una factura real aparece en cobrado del mes correcto", () => {
    const rows = buildCashflowByMonth({
      plannedInvoices: [],
      invoices: [{ date: d("2026-07"), amount: 5000 }],
      timeEntries: [],
      rateByUserId: noRates,
      externalPayments: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].month).toBe("2026-07");
    expect(rows[0].cobrado).toBe(5000);
    expect(rows[0].previsto).toBe(0);
  });

  it("previsión NO facturada aparece en previsto; facturada se ignora", () => {
    const rows = buildCashflowByMonth({
      plannedInvoices: [
        { date: d("2026-08"), amount: 3000, invoiced: false },
        { date: d("2026-08"), amount: 1000, invoiced: true },
      ],
      invoices: [],
      timeEntries: [],
      rateByUserId: noRates,
      externalPayments: [],
    });
    expect(rows[0].previsto).toBe(3000);
    expect(rows[0].cobrado).toBe(0);
  });

  it("horas × tarifa aparece en costeInterno", () => {
    const rates = new Map([["u1", 50]]);
    const rows = buildCashflowByMonth({
      plannedInvoices: [],
      invoices: [],
      timeEntries: [{ date: d("2026-06"), hours: 10, userId: "u1" }],
      rateByUserId: rates,
      externalPayments: [],
    });
    expect(rows[0].costeInterno).toBe(500);
  });

  it("colaborador sin tarifa configurada no suma coste inventado", () => {
    const rows = buildCashflowByMonth({
      plannedInvoices: [],
      invoices: [],
      timeEntries: [{ date: d("2026-06"), hours: 100, userId: "sin-tarifa" }],
      rateByUserId: noRates,
      externalPayments: [],
    });
    // El mes no aparece porque su coste sería 0 (tarifa = 0 → no se registra)
    expect(rows).toHaveLength(0);
  });

  it("pago externo aparece en costeExterno", () => {
    const rows = buildCashflowByMonth({
      plannedInvoices: [],
      invoices: [],
      timeEntries: [],
      rateByUserId: noRates,
      externalPayments: [{ date: d("2026-09"), amount: 2000 }],
    });
    expect(rows[0].costeExterno).toBe(2000);
  });

  it("rellena meses vacíos entre el primero y el último con datos", () => {
    const rows = buildCashflowByMonth({
      plannedInvoices: [],
      invoices: [
        { date: d("2026-05"), amount: 1000 },
        { date: d("2026-08"), amount: 2000 },
      ],
      timeEntries: [],
      rateByUserId: noRates,
      externalPayments: [],
    });
    expect(rows).toHaveLength(4); // May, Jun, Jul, Ago
    expect(rows[0].month).toBe("2026-05");
    expect(rows[1].cobrado).toBe(0); // Jun vacío
    expect(rows[2].cobrado).toBe(0); // Jul vacío
    expect(rows[3].month).toBe("2026-08");
  });

  it("agrupa correctamente varias entradas del mismo mes", () => {
    const rows = buildCashflowByMonth({
      plannedInvoices: [],
      invoices: [
        { date: d("2026-07"), amount: 1000 },
        { date: new Date("2026-07-28T00:00:00Z"), amount: 500 },
      ],
      timeEntries: [],
      rateByUserId: noRates,
      externalPayments: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].cobrado).toBe(1500);
  });

  it("el label tiene el formato legible correcto", () => {
    const rows = buildCashflowByMonth({
      plannedInvoices: [],
      invoices: [{ date: d("2026-01"), amount: 100 }],
      timeEntries: [],
      rateByUserId: noRates,
      externalPayments: [],
    });
    expect(rows[0].label).toBe("Ene 2026");
  });
});
