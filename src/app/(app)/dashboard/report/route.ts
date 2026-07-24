import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import {
  calculateExternalCost,
  calculateInternalCost,
  calculateProfit,
  calculateProfitPercentage,
  calculateTotalBudget,
  calculateTotalInvoiced,
  isMarginAtRisk,
} from "@/lib/financials";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { createElement } from "react";
import type { ReactElement } from "react";
import { PortfolioReport } from "@/lib/pdf/portfolio-report";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (session.user.role !== Role.GERENCIA) return new Response("Forbidden", { status: 403 });

  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    include: {
      manager: true,
      client: true,
      agreement: true,
      additionals: true,
      invoices: true,
      timeEntries: true,
      members: { include: { user: true } },
      externalCollaborators: { include: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const projectRows = projects
    .map((p) => {
      const totalBudget = calculateTotalBudget(p.agreement?.amount, p.additionals);
      const totalInvoiced = calculateTotalInvoiced(p.invoices);
      const rateByUserId = new Map(
        p.members.map((m) => [m.userId, m.hourlyRate ?? m.user.defaultHourlyRate ?? 0]),
      );
      const internalCost = calculateInternalCost(p.timeEntries, rateByUserId);
      const externalCost = calculateExternalCost(
        p.externalCollaborators.flatMap((c) => c.payments),
      );
      const profit = calculateProfit(totalBudget, internalCost, externalCost);
      const profitPct = calculateProfitPercentage(profit, totalBudget);
      const atRisk = isMarginAtRisk(profitPct);
      return {
        name: p.name,
        clientName: p.client?.name ?? null,
        managerName: p.manager.name ?? p.manager.email,
        totalBudget,
        totalInvoiced,
        profit,
        profitPct,
        atRisk,
      };
    })
    .sort((a, b) => {
      if (a.totalBudget === 0 && b.totalBudget === 0) return 0;
      if (a.totalBudget === 0) return 1;
      if (b.totalBudget === 0) return -1;
      return a.profitPct - b.profitPct;
    });

  const totalCartera = projectRows.reduce((s, r) => s + r.totalBudget, 0);
  const totalFacturado = projectRows.reduce((s, r) => s + r.totalInvoiced, 0);
  const totalProfit = projectRows.reduce((s, r) => s + r.profit, 0);
  const margenCartera = totalCartera > 0 ? (totalProfit / totalCartera) * 100 : 0;
  const enRiesgoCount = projectRows.filter((r) => r.atRisk).length;

  const elem = createElement(PortfolioReport, {
    data: {
      generatedAt: new Date(),
      totalCartera,
      totalFacturado,
      margenCartera,
      enRiesgoCount,
      projects: projectRows,
    },
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(elem);

  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cartera-${date}.pdf"`,
    },
  });
}
