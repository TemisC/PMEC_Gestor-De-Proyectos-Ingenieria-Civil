import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { canManageProject, canViewProject, toAuthProject } from "@/lib/authorization";
import {
  buildCashflowByMonth,
  calculateExternalCost,
  calculateInternalCost,
  calculatePendingBilling,
  calculatePendingPlanned,
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
import { ProjectReport } from "@/lib/pdf/project-report";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const authUser = { id: userId, role: session.user.role };

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      manager: true,
      client: true,
      members: { include: { user: true } },
      timeEntries: true,
      agreement: true,
      additionals: true,
      plannedInvoices: { orderBy: { date: "asc" } },
      invoices: { orderBy: { date: "desc" } },
      externalCollaborators: { include: { additionals: true, payments: true } },
    },
  });

  if (!project || !canViewProject(authUser, toAuthProject(project))) {
    return new Response("Not found", { status: 404 });
  }

  const canManage = canManageProject(authUser, toAuthProject(project));
  if (!canManage && session.user.role !== Role.GERENCIA) {
    return new Response("Forbidden", { status: 403 });
  }

  const totalBudget = calculateTotalBudget(project.agreement?.amount, project.additionals);
  const totalInvoiced = calculateTotalInvoiced(project.invoices);
  const pendingBilling = calculatePendingBilling(totalBudget, totalInvoiced);
  const pendingPlanned = calculatePendingPlanned(project.plannedInvoices);

  const rateByUserId = new Map(
    project.members.map((m) => [m.userId, m.hourlyRate ?? m.user.defaultHourlyRate ?? 0]),
  );
  const internalCost = calculateInternalCost(project.timeEntries, rateByUserId);
  const externalCost = calculateExternalCost(
    project.externalCollaborators.flatMap((c) => c.payments),
  );
  const profit = calculateProfit(totalBudget, internalCost, externalCost);
  const profitPct = calculateProfitPercentage(profit, totalBudget);
  const atRisk = isMarginAtRisk(profitPct);

  const cashflowRows = buildCashflowByMonth({
    plannedInvoices: project.plannedInvoices,
    invoices: project.invoices,
    timeEntries: project.timeEntries,
    rateByUserId,
    externalPayments: project.externalCollaborators.flatMap((c) => c.payments),
  });

  const elem = createElement(ProjectReport, {
    data: {
      projectName: project.name,
      clientName: project.client?.name ?? null,
      managerName: project.manager.name ?? project.manager.email,
      status: project.status as "ACTIVE" | "ARCHIVED",
      generatedAt: new Date(),
      totalBudget,
      totalInvoiced,
      pendingBilling,
      pendingPlanned,
      internalCost,
      externalCost,
      profit,
      profitPct,
      atRisk,
      cashflowRows,
    },
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(elem);

  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${slug}.pdf"`,
    },
  });
}
