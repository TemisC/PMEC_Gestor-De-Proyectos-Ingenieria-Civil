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
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import {
  AlertIcon,
  PercentIcon,
  PlusIcon,
  ReceiptIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

const PAGE_SIZE = 15;

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
  searchParams: Promise<{ archived?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const role = session.user.role;
  const { archived, q, page: pageStr } = await searchParams;
  const showArchived = archived === "1";
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  // Helper para toggle de archivados preservando el filtro activo
  const archiveHref = (currentlyArchived: boolean) => {
    const params = new URLSearchParams();
    if (!currentlyArchived) params.set("archived", "1");
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/dashboard${qs ? `?${qs}` : ""}`;
  };

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
        plannedInvoices: true,
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
      { name: string; count: number; budget: number; invoiced: number; profit: number }
    >();
    for (const r of rows) {
      const mgr = r.project.manager;
      const entry = byManager.get(mgr.id) ?? {
        name: mgr.name ?? mgr.email,
        count: 0,
        budget: 0,
        invoiced: 0,
        profit: 0,
      };
      entry.count++;
      entry.budget += r.totalBudget;
      entry.invoiced += r.totalInvoiced;
      entry.profit += r.profit;
      byManager.set(mgr.id, entry);
    }
    const gestores = [...byManager.values()].sort((a, b) => {
      const ma = a.budget > 0 ? a.profit / a.budget : 0;
      const mb = b.budget > 0 ? b.profit / b.budget : 0;
      return ma - mb; // peor primero
    });

    // ── Gráfica 1: distribución de salud de cartera ───────────────────
    const rowsConPpto = rows.filter((r) => r.totalBudget > 0);
    const saludable = rowsConPpto.filter((r) => r.profitPct >= 50).length;
    const atencion = rowsConPpto.filter((r) => r.profitPct >= 30 && r.profitPct < 50).length;
    const critico = rowsConPpto.filter((r) => r.profitPct < 30).length;
    const sinPpto = rows.filter((r) => r.totalBudget === 0).length;
    const totalProy = rows.length;
    const cartPct = (n: number) => (totalProy > 0 ? (n / totalProy) * 100 : 0);

    // ── Gráfica 2: presupuesto vs facturado por gestor ────────────────
    const maxBudgetGestor = Math.max(...gestores.map((g) => g.budget), 1);

    // ── Gráfica 3: próximos cobros previstos (3 meses) ────────────────
    const nowDate = new Date();
    const upcomingMonths = [0, 1, 2].map((offset) => {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() + offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
      return { key, label, amount: 0 };
    });
    if (!showArchived) {
      for (const p of projects) {
        for (const pi of p.plannedInvoices) {
          if (pi.invoiced) continue;
          const key = `${pi.date.getFullYear()}-${String(pi.date.getMonth() + 1).padStart(2, "0")}`;
          const month = upcomingMonths.find((m) => m.key === key);
          if (month) month.amount += pi.amount;
        }
      }
    }
    const maxUpcoming = Math.max(...upcomingMonths.map((m) => m.amount), 1);

    // Lista completa ordenada: sin presupuesto al fondo, con presupuesto por margen asc
    const sorted = [...rows].sort((a, b) => {
      if (a.totalBudget === 0 && b.totalBudget === 0) return 0;
      if (a.totalBudget === 0) return 1;
      if (b.totalBudget === 0) return -1;
      return a.profitPct - b.profitPct;
    });

    // Filtrado + paginación de la cartera (KPIs siempre sobre el total)
    const filteredSorted = q
      ? sorted.filter((r) => r.project.name.toLowerCase().includes(q.toLowerCase()))
      : sorted;
    const paginatedSorted = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div className="flex flex-col gap-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Ejecutivo</h1>
            <p className="text-sm text-gray-400">
              Cartera {showArchived ? "archivada" : "activa"} · {projects.length} proyecto
              {projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!showArchived && (
            <a
              href="/dashboard/report"
              className="shrink-0 rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-sky-500 hover:text-sky-400"
            >
              Descargar cartera PDF
            </a>
          )}
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

        {/* ── Gráficas ejecutivas (solo cartera activa con datos) ── */}
        {!showArchived && rows.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            {/* Gráfica 1 — Salud de la cartera */}
            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Salud de la cartera
              </h2>
              <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-800">
                {saludable > 0 && (
                  <div className="bg-green-500" style={{ width: `${cartPct(saludable)}%` }} />
                )}
                {atencion > 0 && (
                  <div className="bg-yellow-500" style={{ width: `${cartPct(atencion)}%` }} />
                )}
                {critico > 0 && (
                  <div className="bg-red-500" style={{ width: `${cartPct(critico)}%` }} />
                )}
                {sinPpto > 0 && (
                  <div className="bg-gray-700" style={{ width: `${cartPct(sinPpto)}%` }} />
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-green-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Sano (≥ 50%)
                  </span>
                  <span className="font-semibold text-white">{saludable}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-yellow-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                    Atención (30–50%)
                  </span>
                  <span className="font-semibold text-white">{atencion}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-red-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    Crítico (&lt; 30%)
                  </span>
                  <span className="font-semibold text-white">{critico}</span>
                </div>
                {sinPpto > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-500">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-700" />
                      Sin presupuesto
                    </span>
                    <span className="font-semibold text-white">{sinPpto}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Gráfica 2 — Presupuesto vs. Facturado por Gestor */}
            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Presupuesto vs. Facturado
              </h2>
              <div className="flex flex-col gap-4">
                {gestores.map((g) => {
                  const budgetW = maxBudgetGestor > 0 ? (g.budget / maxBudgetGestor) * 100 : 0;
                  const invoicedW = g.budget > 0 ? Math.min(100, (g.invoiced / g.budget) * 100) : 0;
                  return (
                    <div key={g.name}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="max-w-[130px] truncate font-medium text-white">
                          {g.name}
                        </span>
                        <span className="text-gray-500">{money(g.budget)}</span>
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded bg-gray-800">
                        <div
                          className="absolute left-0 top-0 h-full rounded bg-sky-800"
                          style={{ width: `${budgetW}%` }}
                        />
                      </div>
                      <div className="relative mt-1 h-2 w-full overflow-hidden rounded bg-gray-800">
                        <div
                          className="absolute left-0 top-0 h-full rounded bg-emerald-500"
                          style={{ width: `${(budgetW * invoicedW) / 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-3 rounded bg-sky-800" /> Presupuesto
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-3 rounded bg-emerald-500" /> Facturado
                  </span>
                </div>
              </div>
            </Card>

            {/* Gráfica 3 — Próximos cobros previstos */}
            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Próximos cobros previstos
              </h2>
              <div className="flex gap-3" style={{ height: "112px" }}>
                {upcomingMonths.map((m) => {
                  const barH =
                    maxUpcoming > 1
                      ? Math.round((m.amount / maxUpcoming) * 72)
                      : 0;
                  return (
                    <div
                      key={m.key}
                      className="flex flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-[10px] font-semibold text-emerald-400">
                        {m.amount > 0 ? money(m.amount) : "—"}
                      </span>
                      <div
                        className="w-full rounded-t bg-emerald-700"
                        style={{ height: `${Math.max(barH, m.amount > 0 ? 6 : 0)}px` }}
                      />
                      <div className="h-px w-full bg-gray-700" />
                      <span className="text-[10px] capitalize text-gray-500">{m.label}</span>
                    </div>
                  );
                })}
              </div>
              {upcomingMonths.every((m) => m.amount === 0) && (
                <p className="mt-2 text-center text-xs text-gray-600">
                  Sin previsiones de cobro cargadas
                </p>
              )}
            </Card>
          </div>
        )}

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Cartera {showArchived ? "archivada" : "activa"} ({filteredSorted.length}
              {q && ` de ${sorted.length}`})
            </h2>
            <div className="flex items-center gap-3">
              <SearchInput placeholder="Buscar proyecto…" />
              <Link
                href={archiveHref(showArchived)}
                className="text-xs text-sky-400 hover:underline"
              >
                {showArchived ? "Ver activos" : "Ver archivados"}
              </Link>
            </div>
          </div>
          {filteredSorted.length === 0 ? (
            <p className="text-sm text-gray-500">
              {q ? `Sin resultados para "${q}".` : "No hay proyectos para mostrar."}
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-1.5">
                {paginatedSorted.map(({ project, totalBudget, totalInvoiced, profitPct, atRisk }) => (
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
              <Pagination page={page} total={filteredSorted.length} pageSize={PAGE_SIZE} q={q} />
            </>
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
        client: true,
        agreement: true,
        additionals: true,
        invoices: true,
        timeEntries: true,
        members: { include: { user: true } },
        externalCollaborators: { include: { payments: true, additionals: true } },
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

    // ── KPI 1: Empresa top ─────────────────────────────────────────────
    const clientCountMap = new Map<string, { name: string; count: number }>();
    for (const p of projects) {
      if (p.client) {
        const entry = clientCountMap.get(p.client.id) ?? { name: p.client.name, count: 0 };
        entry.count++;
        clientCountMap.set(p.client.id, entry);
      }
    }
    const topClient = [...clientCountMap.values()].sort((a, b) => b.count - a.count)[0] ?? null;
    const totalClientProjects = projects.filter((p) => p.client).length;

    // ── KPI 2: Pendiente pago a externos ──────────────────────────────
    const pendingPayment = Math.max(
      0,
      projects.reduce((total, p) => {
        return (
          total +
          p.externalCollaborators.reduce((sum, ec) => {
            const agreed = ec.agreementAmount ?? 0;
            const extras = ec.additionals.reduce((s, a) => s + a.amount, 0);
            const paid = ec.payments.reduce((s, pay) => s + pay.amount, 0);
            return sum + (agreed + extras - paid);
          }, 0)
        );
      }, 0),
    );

    // ── KPI 3: Colaborador más activo ──────────────────────────────────
    const collabCountMap = new Map<string, { name: string; count: number }>();
    for (const p of projects) {
      for (const m of p.members) {
        const name = m.user.name ?? m.user.email;
        const entry = collabCountMap.get(m.userId) ?? { name, count: 0 };
        entry.count++;
        collabCountMap.set(m.userId, entry);
      }
    }
    const sortedCollabs = [...collabCountMap.values()].sort((a, b) => b.count - a.count);
    const topCollab = sortedCollabs[0] ?? null;
    const topCollabs = sortedCollabs.slice(0, 5);

    // ── KPI 4: Pendiente de facturar ───────────────────────────────────
    const totalCartera = rows.reduce((s, r) => s + r.totalBudget, 0);
    const totalFacturado = rows.reduce((s, r) => s + r.totalInvoiced, 0);
    const pendingInvoicing = Math.max(0, totalCartera - totalFacturado);
    const totalAgreement = projects.reduce((s, p) => s + (p.agreement?.amount ?? 0), 0);
    const totalExtras = projects.reduce(
      (s, p) => s + p.additionals.reduce((ss, a) => ss + a.amount, 0),
      0,
    );
    const acuerdoPct = totalCartera > 0 ? (totalAgreement / totalCartera) * 100 : 0;
    const extrasPct = totalCartera > 0 ? (totalExtras / totalCartera) * 100 : 0;

    // ── Top 5 contratos ────────────────────────────────────────────────
    const top5 = [...rows]
      .filter((r) => r.totalBudget > 0)
      .sort((a, b) => b.totalBudget - a.totalBudget)
      .slice(0, 5);

    const atRiskCount = rows.filter((r) => r.atRisk).length;

    // Filtrado + paginación de la lista (KPIs siempre sobre el total)
    const filteredRows = q
      ? rows.filter((r) => r.project.name.toLowerCase().includes(q.toLowerCase()))
      : rows;
    const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Resumen de Gestión</h1>
          <p className="text-sm text-gray-400">
            Hola, {session.user.name ?? session.user.email} ·{" "}
            {showArchived ? "proyectos archivados" : `${projects.length} proyecto${projects.length !== 1 ? "s" : ""} activo${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* 4 KPIs — misma estructura visual que el SPA */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Empresa top */}
          <div className="rounded-lg border border-blue-800/60 bg-blue-950/20 p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
              Empresa top
            </p>
            <p className="truncate text-lg font-bold text-white">{topClient?.name ?? "N/A"}</p>
            <p className="mt-1 text-xs text-gray-400">
              {topClient
                ? `${topClient.count} proyecto${topClient.count !== 1 ? "s" : ""} / ${totalClientProjects} con cliente`
                : "Sin proyectos con cliente"}
            </p>
          </div>

          {/* Pendiente pago */}
          <div className="rounded-lg border border-red-800/60 bg-red-950/20 p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
              Pendiente pago
            </p>
            <p className="truncate text-lg font-bold text-white">{money(pendingPayment)}</p>
            <p className="mt-1 text-xs text-gray-400">A colaboradores externos</p>
          </div>

          {/* Colaborador activo */}
          <div className="rounded-lg border border-pink-800/60 bg-pink-950/20 p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-pink-400">
              Colaborador activo
            </p>
            <p className="truncate text-lg font-bold text-white">
              {topCollab?.name.split(" ")[0] ?? "N/A"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {topCollab
                ? `En ${topCollab.count} proyecto${topCollab.count !== 1 ? "s" : ""} activo${topCollab.count !== 1 ? "s" : ""}`
                : "Sin colaboradores asignados"}
            </p>
          </div>

          {/* Pendiente facturar */}
          <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Pendiente facturar
            </p>
            <p className="truncate text-lg font-bold text-white">{money(pendingInvoicing)}</p>
            {totalCartera > 0 && pendingInvoicing > 0 ? (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>Distribución</span>
                  <span>Total: 100%</span>
                </div>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
                  <div className="bg-sky-500" style={{ width: `${acuerdoPct}%` }} />
                  <div className="bg-violet-500" style={{ width: `${extrasPct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px]">
                  <span className="text-sky-400">Acuerdo {acuerdoPct.toFixed(0)}%</span>
                  <span className="text-violet-400">Extras {extrasPct.toFixed(0)}%</span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                {totalCartera === 0 ? "Sin presupuesto cargado" : "Todo facturado"}
              </p>
            )}
          </div>
        </div>

        {/* Top 5 contratos + Equipo activo */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Top 5 contratos (importe)
            </h2>
            {top5.length === 0 ? (
              <p className="text-xs text-gray-600">Sin proyectos con presupuesto cargado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="pb-2 font-medium">Proyecto</th>
                      <th className="pb-2 font-medium">Cliente</th>
                      <th className="pb-2 text-right font-medium">Presupuesto</th>
                      <th className="pb-2 text-right font-medium">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {top5.map(({ project, totalBudget, profitPct, atRisk }) => (
                      <tr key={project.id}>
                        <td className="py-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="block max-w-[140px] truncate font-medium text-white hover:text-sky-400"
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="max-w-[100px] truncate py-2 text-xs text-gray-400">
                          {project.client?.name ?? "—"}
                        </td>
                        <td className="py-2 text-right text-xs text-gray-400">
                          {money(totalBudget)}
                        </td>
                        <td className="py-2 text-right">
                          <MarginBadge pct={profitPct} atRisk={atRisk} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Equipo activo
            </h2>
            {topCollabs.length === 0 ? (
              <p className="text-xs text-gray-600">Sin colaboradores asignados.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {topCollabs.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${i === 0 ? "text-pink-400" : "text-white"}`}
                    >
                      {c.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className={`h-full rounded-full ${i === 0 ? "bg-pink-500" : "bg-sky-700"}`}
                          style={{
                            width: `${topCollabs[0].count > 0 ? (c.count / topCollabs[0].count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs text-gray-400">
                        {c.count} proy.
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Lista de proyectos */}
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Proyectos{showArchived ? " archivados" : ""} ({filteredRows.length}
              {q && ` de ${rows.length}`})
              {atRiskCount > 0 && !showArchived && (
                <span className="ml-2 text-red-400">· {atRiskCount} en riesgo</span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              <SearchInput placeholder="Buscar proyecto…" />
              <Link
                href={archiveHref(showArchived)}
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
          {filteredRows.length === 0 ? (
            <p className="text-sm text-gray-500">
              {q
                ? `Sin resultados para "${q}".`
                : showArchived
                  ? "No hay proyectos archivados."
                  : "Todavía no tenés proyectos."}
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {paginatedRows.map(({ project, totalBudget, totalInvoiced, profitPct, atRisk }) => (
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
              <Pagination page={page} total={filteredRows.length} pageSize={PAGE_SIZE} q={q} />
            </>
          )}
        </Card>
      </div>
    );
  }

  // ── Colaborador ───────────────────────────────────────────────────────
  const allColabProjects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
      status: showArchived ? "ARCHIVED" : "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
  });

  const colabProjects = q
    ? allColabProjects.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    : allColabProjects;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {session.user.name ?? session.user.email}
        </h1>
        <p className="text-sm text-gray-400">Tus proyectos asignados</p>
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Proyectos ({colabProjects.length}{q && ` de ${allColabProjects.length}`})
          </h2>
          <div className="flex items-center gap-3">
            <SearchInput placeholder="Buscar proyecto…" />
            <Link
              href={archiveHref(showArchived)}
              className="text-xs text-sky-400 hover:underline"
            >
              {showArchived ? "Ver activos" : "Ver archivados"}
            </Link>
          </div>
        </div>
        {colabProjects.length === 0 ? (
          <p className="text-sm text-gray-500">
            {q
              ? `Sin resultados para "${q}".`
              : showArchived
                ? "No hay proyectos archivados."
                : "Todavía no estás asignado a ningún proyecto."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {colabProjects.map((project) => (
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
