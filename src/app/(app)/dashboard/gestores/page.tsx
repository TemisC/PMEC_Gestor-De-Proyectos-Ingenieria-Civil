import Link from "next/link";
import { redirect } from "next/navigation";
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
import { Card } from "@/components/ui/card";
import { AlertIcon } from "@/components/ui/icons";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function MarginBadge({ pct, atRisk }: { pct: number; atRisk: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${atRisk ? "text-red-400" : "text-green-400"}`}>
      {pct.toFixed(1)}%
      {atRisk && <AlertIcon className="h-3 w-3" />}
    </span>
  );
}

export default async function GestoresPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  if (session.user.role !== Role.GERENCIA) redirect("/dashboard");

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
    orderBy: { name: "asc" },
  });

  const rows = projects.map((p) => {
    const totalBudget = calculateTotalBudget(p.agreement?.amount, p.additionals);
    const totalInvoiced = calculateTotalInvoiced(p.invoices);
    const rateByUserId = new Map(p.members.map((m) => [m.userId, m.hourlyRate ?? m.user.defaultHourlyRate ?? 0]));
    const internalCost = calculateInternalCost(p.timeEntries, rateByUserId);
    const externalCost = calculateExternalCost(p.externalCollaborators.flatMap((c) => c.payments));
    const profit = calculateProfit(totalBudget, internalCost, externalCost);
    const profitPct = calculateProfitPercentage(profit, totalBudget);
    const atRisk = isMarginAtRisk(profitPct);
    return { project: p, totalBudget, totalInvoiced, internalCost, externalCost, profit, profitPct, atRisk };
  });

  // Agrupar por gestor
  const byManager = new Map<
    string,
    {
      id: string;
      name: string;
      projects: typeof rows;
      budget: number;
      invoiced: number;
      profit: number;
    }
  >();
  for (const r of rows) {
    const mgr = r.project.manager;
    const entry = byManager.get(mgr.id) ?? {
      id: mgr.id,
      name: mgr.name ?? mgr.email,
      projects: [],
      budget: 0,
      invoiced: 0,
      profit: 0,
    };
    entry.projects.push(r);
    entry.budget += r.totalBudget;
    entry.invoiced += r.totalInvoiced;
    entry.profit += r.profit;
    byManager.set(mgr.id, entry);
  }

  // Ordenar: peor margen primero
  const gestores = [...byManager.values()].sort((a, b) => {
    const ma = a.budget > 0 ? a.profit / a.budget : 0;
    const mb = b.budget > 0 ? b.profit / b.budget : 0;
    return ma - mb;
  });

  const maxBudget = Math.max(...gestores.map((g) => g.budget), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header con botón de volver */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-white"
        >
          ← Volver al Dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Presupuesto vs. Facturado por Gestor</h1>
          <p className="text-sm text-gray-400">{gestores.length} gestor{gestores.length !== 1 ? "es" : ""} · {projects.length} proyectos activos</p>
        </div>
      </div>

      {/* Una card por gestor */}
      {gestores.map((g) => {
        const margen = g.budget > 0 ? (g.profit / g.budget) * 100 : 0;
        const atRisk = isMarginAtRisk(margen);
        const pendiente = Math.max(0, g.budget - g.invoiced);
        const budgetW = maxBudget > 0 ? (g.budget / maxBudget) * 100 : 0;
        const invoicedW = g.budget > 0 ? Math.min(100, (g.invoiced / g.budget) * 100) : 0;

        return (
          <Card key={g.id}>
            {/* Header del gestor */}
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">{g.name}</h2>
                <p className="text-xs text-gray-500">{g.projects.length} proyecto{g.projects.length !== 1 ? "s" : ""} activo{g.projects.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-6 text-right text-xs">
                <div>
                  <p className="text-gray-500">Presupuesto</p>
                  <p className="font-semibold text-white">{money(g.budget)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Facturado</p>
                  <p className="font-semibold text-emerald-400">{money(g.invoiced)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pendiente</p>
                  <p className="font-semibold text-sky-400">{money(pendiente)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Margen</p>
                  <MarginBadge pct={margen} atRisk={atRisk} />
                </div>
              </div>
            </div>

            {/* Barras de presupuesto/facturado */}
            <div className="mb-5 space-y-1.5">
              <div className="relative h-4 w-full overflow-hidden rounded bg-gray-800">
                <div className="absolute left-0 top-0 h-full rounded bg-sky-800" style={{ width: `${budgetW}%` }} />
                <span className="absolute left-2 top-0 flex h-full items-center text-[10px] text-sky-300">Presupuesto</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded bg-gray-800">
                <div className="absolute left-0 top-0 h-full rounded bg-emerald-600" style={{ width: `${(budgetW * invoicedW) / 100}%` }} />
                <span className="absolute left-2 top-0 flex h-full items-center text-[10px] text-emerald-300">Facturado {invoicedW.toFixed(0)}%</span>
              </div>
            </div>

            {/* Tabla de proyectos del gestor */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Proyecto</th>
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 text-right font-medium">Presupuesto</th>
                    <th className="pb-2 text-right font-medium">Facturado</th>
                    <th className="pb-2 text-right font-medium">Pendiente</th>
                    <th className="pb-2 text-right font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {g.projects
                    .sort((a, b) => a.profitPct - b.profitPct)
                    .map(({ project, totalBudget, totalInvoiced, profitPct, atRisk }) => (
                      <tr key={project.id} className="hover:bg-gray-800/30">
                        <td className="py-2.5">
                          <Link href={`/projects/${project.id}`} className="font-medium text-white hover:text-sky-400">
                            {project.name}
                          </Link>
                        </td>
                        <td className="py-2.5 text-gray-400">{project.client?.name ?? "—"}</td>
                        <td className="py-2.5 text-right text-gray-300">{totalBudget > 0 ? money(totalBudget) : "—"}</td>
                        <td className="py-2.5 text-right text-emerald-400">{totalInvoiced > 0 ? money(totalInvoiced) : "—"}</td>
                        <td className="py-2.5 text-right text-sky-400">
                          {totalBudget > 0 ? money(Math.max(0, totalBudget - totalInvoiced)) : "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          {totalBudget > 0 ? <MarginBadge pct={profitPct} atRisk={atRisk} /> : <span className="text-gray-600">—</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
