import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import {
  calculateTotalBudget,
  calculateTotalInvoiced,
  calculateInternalCost,
  calculateExternalCost,
  calculateProfit,
  calculateProfitPercentage,
  isMarginAtRisk,
} from "@/lib/financials";
import { Card } from "@/components/ui/card";
import { AlertIcon } from "@/components/ui/icons";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function MarginBadge({ pct, atRisk }: { pct: number; atRisk: boolean }) {
  return (
    <span className={`flex items-center justify-end gap-1 text-xs font-semibold ${atRisk ? "text-red-400" : "text-green-400"}`}>
      {pct.toFixed(1)}%
      {atRisk && <AlertIcon className="h-3 w-3" />}
    </span>
  );
}

export default async function EconomicPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  if (session.user.role !== Role.GESTOR) redirect("/dashboard");

  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const projects = await prisma.project.findMany({
    where: { managerId: userId, status: showArchived ? "ARCHIVED" : "ACTIVE" },
    include: {
      client: true,
      agreement: true,
      additionals: true,
      invoices: true,
      timeEntries: true,
      members: { include: { user: true } },
      externalCollaborators: { include: { payments: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = projects.map((p) => {
    const totalBudget = calculateTotalBudget(p.agreement?.amount, p.additionals);
    const totalInvoiced = calculateTotalInvoiced(p.invoices);
    const pendingInvoicing = Math.max(0, totalBudget - totalInvoiced);
    const rateByUserId = new Map(
      p.members.map((m) => [m.userId, m.hourlyRate ?? m.user.defaultHourlyRate ?? 0]),
    );
    const internalCost = calculateInternalCost(p.timeEntries, rateByUserId);
    const externalCost = calculateExternalCost(p.externalCollaborators.flatMap((c) => c.payments));
    const profit = calculateProfit(totalBudget, internalCost, externalCost);
    const profitPct = calculateProfitPercentage(profit, totalBudget);
    const atRisk = isMarginAtRisk(profitPct);
    return { project: p, totalBudget, totalInvoiced, pendingInvoicing, internalCost, externalCost, profit, profitPct, atRisk };
  });

  const totalCartera = rows.reduce((s, r) => s + r.totalBudget, 0);
  const totalFacturado = rows.reduce((s, r) => s + r.totalInvoiced, 0);
  const totalPendiente = rows.reduce((s, r) => s + r.pendingInvoicing, 0);
  const totalInternalCost = rows.reduce((s, r) => s + r.internalCost, 0);
  const totalExternalCost = rows.reduce((s, r) => s + r.externalCost, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const margenCartera = totalCartera > 0 ? (totalProfit / totalCartera) * 100 : 0;
  const atRiskCount = rows.filter((r) => r.atRisk).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Seguimiento Económico</h1>
          <p className="text-sm text-gray-400">
            {showArchived ? "Proyectos archivados" : "Proyectos activos"} ·{" "}
            {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={showArchived ? "/economic" : "/economic?archived=1"}
          className="shrink-0 text-xs text-sky-400 hover:underline"
        >
          {showArchived ? "Ver activos" : "Ver archivados"}
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Presupuesto</p>
          <p className="mt-1 truncate text-lg font-bold text-white">{money(totalCartera)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Facturado</p>
          <p className="mt-1 truncate text-lg font-bold text-white">{money(totalFacturado)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Pendiente facturar</p>
          <p className="mt-1 truncate text-lg font-bold text-emerald-400">{money(totalPendiente)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Margen cartera</p>
          <p className={`mt-1 text-lg font-bold ${isMarginAtRisk(margenCartera) ? "text-red-400" : "text-white"}`}>
            {margenCartera.toFixed(1)}%
            {atRiskCount > 0 && (
              <span className="ml-2 text-xs text-red-400">({atRiskCount} en riesgo)</span>
            )}
          </p>
        </Card>
      </div>

      {/* Tabla detallada */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                <th className="pb-3 font-medium">Proyecto</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 text-right font-medium">Presupuesto</th>
                <th className="pb-3 text-right font-medium">Facturado</th>
                <th className="pb-3 text-right font-medium">Pendiente</th>
                <th className="pb-3 text-right font-medium">Coste int.</th>
                <th className="pb-3 text-right font-medium">Coste ext.</th>
                <th className="pb-3 text-right font-medium">Resultado</th>
                <th className="pb-3 text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-gray-500">
                    No hay proyectos para mostrar.
                  </td>
                </tr>
              ) : (
                rows.map(({ project, totalBudget, totalInvoiced, pendingInvoicing, internalCost, externalCost, profit, profitPct, atRisk }) => (
                  <tr key={project.id} className="hover:bg-gray-800/30">
                    <td className="py-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-white hover:text-sky-400"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-400">{project.client?.name ?? "—"}</td>
                    <td className="py-3 text-right text-gray-300">
                      {totalBudget > 0 ? money(totalBudget) : "—"}
                    </td>
                    <td className="py-3 text-right text-gray-300">
                      {totalInvoiced > 0 ? money(totalInvoiced) : "—"}
                    </td>
                    <td className="py-3 text-right text-emerald-400">
                      {pendingInvoicing > 0 ? money(pendingInvoicing) : "—"}
                    </td>
                    <td className="py-3 text-right text-gray-400">
                      {internalCost > 0 ? money(internalCost) : "—"}
                    </td>
                    <td className="py-3 text-right text-gray-400">
                      {externalCost > 0 ? money(externalCost) : "—"}
                    </td>
                    <td className={`py-3 text-right font-medium ${profit >= 0 ? "text-white" : "text-red-400"}`}>
                      {totalBudget > 0 ? money(profit) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {totalBudget > 0 ? (
                        <MarginBadge pct={profitPct} atRisk={atRisk} />
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-600 text-xs font-semibold">
                  <td colSpan={2} className="pt-3 text-gray-400">Total</td>
                  <td className="pt-3 text-right text-white">{money(totalCartera)}</td>
                  <td className="pt-3 text-right text-white">{money(totalFacturado)}</td>
                  <td className="pt-3 text-right text-emerald-400">{money(totalPendiente)}</td>
                  <td className="pt-3 text-right text-gray-300">{money(totalInternalCost)}</td>
                  <td className="pt-3 text-right text-gray-300">{money(totalExternalCost)}</td>
                  <td className={`pt-3 text-right ${totalProfit >= 0 ? "text-white" : "text-red-400"}`}>
                    {money(totalProfit)}
                  </td>
                  <td className="pt-3 text-right">
                    <MarginBadge pct={margenCartera} atRisk={isMarginAtRisk(margenCartera)} />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
