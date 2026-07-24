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
import {
  AlertIcon,
  PercentIcon,
  PlusIcon,
  ReceiptIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

function money(amount: number) {
  return amount.toLocaleString("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function MarginBadge({ pct, atRisk }: { pct: number; atRisk: boolean }) {
  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold ${
        atRisk ? "text-red-400" : "text-green-400"
      }`}
    >
      {pct.toFixed(0)}%
      {atRisk && <AlertIcon className="h-3.5 w-3.5" />}
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const role = session.user.role;
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  // ── Gerencia: query completo con todo lo financiero ──────────────────
  if (role === Role.GERENCIA) {
    const projects = await prisma.project.findMany({
      where: { status: showArchived ? "ARCHIVED" : "ACTIVE" },
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

    // Calcular métricas por proyecto
    const rows = projects.map((p) => {
      const totalBudget = calculateTotalBudget(p.agreement?.amount, p.additionals);
      const totalInvoiced = calculateTotalInvoiced(p.invoices);
      const rateByUserId = new Map(
        p.members.map((m) => [m.userId, m.hourlyRate ?? m.user.defaultHourlyRate ?? 0]),
      );
      const internalCost = calculateInternalCost(p.timeEntries, rateByUserId);
      const externalCost = calculateExternalCost(p.externalCollaborators.flatMap((c) => c.payments));
      const profit = calculateProfit(totalBudget, internalCost, externalCost);
      const profitPct = calculateProfitPercentage(profit, totalBudget);
      const atRisk = isMarginAtRisk(profitPct);
      return { project: p, totalBudget, totalInvoiced, profit, profitPct, atRisk };
    });

    // KPIs de cartera
    const totalCartera = rows.reduce((s, r) => s + r.totalBudget, 0);
    const totalFacturado = rows.reduce((s, r) => s + r.totalInvoiced, 0);
    const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
    const margenCartera = totalCartera > 0 ? (totalProfit / totalCartera) * 100 : 0;
    const enRiesgo = rows.filter((r) => r.atRisk);

    // Ranking de gestores
    const byManager = new Map<
      string,
      { name: string; count: number; budget: number; profit: number }
    >();
    for (const r of rows) {
      const mgr = r.project.manager;
      const entry = byManager.get(mgr.id) ?? {
        name: mgr.name ?? mgr.email,
        count: 0,
        budget: 0,
        profit: 0,
      };
      entry.count++;
      entry.budget += r.totalBudget;
      entry.profit += r.profit;
      byManager.set(mgr.id, entry);
    }
    const gestores = [...byManager.values()].sort((a, b) => {
      const ma = a.budget > 0 ? a.profit / a.budget : 0;
      const mb = b.budget > 0 ? b.profit / b.budget : 0;
      return ma - mb; // peor primero
    });

    // Lista completa ordenada: sin presupuesto al fondo, con presupuesto por margen asc
    const sorted = [...rows].sort((a, b) => {
      if (a.totalBudget === 0 && b.totalBudget === 0) return 0;
      if (a.totalBudget === 0) return 1;
      if (b.totalBudget === 0) return -1;
      return a.profitPct - b.profitPct;
    });

    return (
      <div className="flex flex-col gap-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Ejecutivo</h1>
          <p className="text-sm text-gray-400">
            Cartera {showArchived ? "archivada" : "activa"} · {projects.length} proyecto
            {projects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="flex items-center gap-3">
            <TrendingUpIcon className="h-8 w-8 shrink-0 text-sky-400" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white">{money(totalCartera)}</p>
              <p className="text-xs text-gray-400">Presupuesto cartera</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <ReceiptIcon className="h-8 w-8 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white">{money(totalFacturado)}</p>
              <p className="text-xs text-gray-400">Facturado total</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <PercentIcon className="h-8 w-8 shrink-0 text-violet-400" />
            <div className="min-w-0">
              <p
                className={`text-lg font-bold ${
                  isMarginAtRisk(margenCartera) ? "text-red-400" : "text-white"
                }`}
              >
                {margenCartera.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">Margen cartera</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <AlertIcon
              className={`h-8 w-8 shrink-0 ${enRiesgo.length > 0 ? "text-red-400" : "text-green-400"}`}
            />
            <div>
              <p className="text-lg font-bold text-white">{enRiesgo.length}</p>
              <p className="text-xs text-gray-400">
                {enRiesgo.length === 1 ? "proyecto en riesgo" : "proyectos en riesgo"}
              </p>
            </div>
          </Card>
        </div>

        {/* Proyectos en riesgo — solo si hay */}
        {enRiesgo.length > 0 && (
          <Card className="border-red-900/60 bg-red-950/20">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-400">
              <AlertIcon className="h-4 w-4" />
              Proyectos que necesitan atención ({enRiesgo.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {enRiesgo.map(({ project, totalBudget, profitPct }) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-md border border-red-900/40 bg-gray-900/40 px-4 py-2.5 text-sm hover:border-red-700/60"
                  >
                    <span>
                      <span className="font-medium text-white">{project.name}</span>
                      <span className="ml-2 text-gray-400">
                        — {project.manager.name ?? project.manager.email}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{money(totalBudget)}</span>
                      <MarginBadge pct={profitPct} atRisk />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Ranking de Gestores */}
        {gestores.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Ranking de Gestores
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Gestor</th>
                    <th className="pb-2 font-medium">Proyectos</th>
                    <th className="pb-2 font-medium">Presupuesto</th>
                    <th className="pb-2 font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {gestores.map((g) => {
                    const margen = g.budget > 0 ? (g.profit / g.budget) * 100 : 0;
                    const atRisk = isMarginAtRisk(margen);
                    return (
                      <tr key={g.name}>
                        <td className="py-2 font-medium text-white">{g.name}</td>
                        <td className="py-2 text-gray-400">{g.count}</td>
                        <td className="py-2 text-gray-400">{money(g.budget)}</td>
                        <td className="py-2">
                          <MarginBadge pct={margen} atRisk={atRisk} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Cartera completa */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Cartera {showArchived ? "archivada" : "activa"} ({projects.length})
            </h2>
            <Link
              href={showArchived ? "/dashboard" : "/dashboard?archived=1"}
              className="text-xs text-sky-400 hover:underline"
            >
              {showArchived ? "Ver activos" : "Ver archivados"}
            </Link>
          </div>
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-500">No hay proyectos para mostrar.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sorted.map(({ project, totalBudget, totalInvoiced, profitPct, atRisk }) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-4 py-2.5 text-sm transition-colors hover:border-sky-500"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">
                        {project.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {project.manager.name ?? project.manager.email}
                        {project.client && ` · ${project.client.name}`}
                      </span>
                    </span>
                    <span className="ml-4 flex shrink-0 items-center gap-4 text-xs text-gray-400">
                      {totalBudget > 0 && (
                        <>
                          <span className="hidden sm:block">{money(totalBudget)}</span>
                          <span className="hidden sm:block text-gray-600">
                            {money(totalInvoiced)} fact.
                          </span>
                          <MarginBadge pct={profitPct} atRisk={atRisk} />
                        </>
                      )}
                      {totalBudget === 0 && (
                        <span className="text-gray-600">Sin presupuesto</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  // ── Gestor ────────────────────────────────────────────────────────────
  if (role === Role.GESTOR) {
    const projects = await prisma.project.findMany({
      where: { managerId: userId, status: showArchived ? "ARCHIVED" : "ACTIVE" },
      include: {
        agreement: true,
        additionals: true,
        invoices: true,
        timeEntries: true,
        members: { include: { user: true } },
        externalCollaborators: { include: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = projects.map((p) => {
      const totalBudget = calculateTotalBudget(p.agreement?.amount, p.additionals);
      const totalInvoiced = calculateTotalInvoiced(p.invoices);
      const rateByUserId = new Map(
        p.members.map((m) => [m.userId, m.hourlyRate ?? m.user.defaultHourlyRate ?? 0]),
      );
      const internalCost = calculateInternalCost(p.timeEntries, rateByUserId);
      const externalCost = calculateExternalCost(p.externalCollaborators.flatMap((c) => c.payments));
      const profit = calculateProfit(totalBudget, internalCost, externalCost);
      const profitPct = calculateProfitPercentage(profit, totalBudget);
      const atRisk = isMarginAtRisk(profitPct);
      return { project: p, totalBudget, totalInvoiced, profitPct, atRisk };
    });

    const atRiskCount = rows.filter((r) => r.atRisk).length;
    const totalCartera = rows.reduce((s, r) => s + r.totalBudget, 0);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hola, {session.user.name ?? session.user.email}
          </h1>
          <p className="text-sm text-gray-400">Tus proyectos</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-3">
            <TrendingUpIcon className="h-8 w-8 shrink-0 text-sky-400" />
            <div>
              <p className="text-2xl font-bold text-white">{projects.length}</p>
              <p className="text-xs text-gray-400">Proyectos activos</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <ReceiptIcon className="h-8 w-8 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white">{money(totalCartera)}</p>
              <p className="text-xs text-gray-400">Presupuesto total</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <AlertIcon
              className={`h-8 w-8 shrink-0 ${atRiskCount > 0 ? "text-red-400" : "text-green-400"}`}
            />
            <div>
              <p className="text-2xl font-bold text-white">{atRiskCount}</p>
              <p className="text-xs text-gray-400">
                {atRiskCount === 1 ? "proyecto en riesgo" : "proyectos en riesgo"}
              </p>
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Proyectos{showArchived ? " archivados" : ""} ({projects.length})
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href={showArchived ? "/dashboard" : "/dashboard?archived=1"}
                className="text-xs text-sky-400 hover:underline"
              >
                {showArchived ? "Ver activos" : "Ver archivados"}
              </Link>
              <Link
                href="/projects/new"
                className="flex items-center gap-1 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400"
              >
                <PlusIcon className="h-4 w-4" />
                Nuevo proyecto
              </Link>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">
              {showArchived ? "No hay proyectos archivados." : "Todavía no tenés proyectos."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map(({ project, totalBudget, totalInvoiced, profitPct, atRisk }) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-4 py-3 text-sm transition-colors hover:border-sky-500"
                  >
                    <span className="font-medium text-white">{project.name}</span>
                    {totalBudget > 0 && (
                      <span className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="hidden sm:block">{money(totalBudget)}</span>
                        <MarginBadge pct={profitPct} atRisk={atRisk} />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  // ── Colaborador ───────────────────────────────────────────────────────
  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
      status: showArchived ? "ARCHIVED" : "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {session.user.name ?? session.user.email}
        </h1>
        <p className="text-sm text-gray-400">Tus proyectos asignados</p>
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Proyectos ({projects.length})
          </h2>
          <Link
            href={showArchived ? "/dashboard" : "/dashboard?archived=1"}
            className="text-xs text-sky-400 hover:underline"
          >
            {showArchived ? "Ver activos" : "Ver archivados"}
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">
            {showArchived
              ? "No hay proyectos archivados."
              : "Todavía no estás asignado a ningún proyecto."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-4 py-3 text-sm transition-colors hover:border-sky-500"
                >
                  <span className="font-medium text-white">{project.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
