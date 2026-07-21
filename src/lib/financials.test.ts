import { describe, expect, it } from "vitest";
import {
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
