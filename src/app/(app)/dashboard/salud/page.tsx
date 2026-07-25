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

type ProjectRow = {
  project: { id: string; name: string; manager: { name: string | null; email: string }; client: { name: string } | null };
  totalBudget: number;
  profitPct: number;
  atRisk: boolean;
};

function ProjectTable({ rows }: { rows: ProjectRow[] }) {
  if (rows.length === 0) return <p className="py-4 text-xs text-gray-600">Sin proyectos en esta categoría.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
          <th className="pb-2 font-medium">Proyecto</th>
          <th className="pb-2 font-medium">Gestor</th>
          <th className="pb-2 font-medium">Cliente</th>
          <th className="pb-2 text-right font-medium">Presupuesto</th>
          <th className="pb-2 text-right font-medium">Margen</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800">
        {rows.map(({ project, totalBudget, profitPct, atRisk }) => (
          <tr key={project.id} className="hover:bg-gray-800/30">
            <td className="py-2.5">
              <Link href={`/projects/${project.id}`} className="font-medium text-white hover:text-sky-400">
                {project.name}
              </Link>
            </td>
            <td className="py-2.5 text-gray-400">{project.manager.name ?? project.manager.email}</td>
            <td className="py-2.5 text-gray-400">{project.client?.name ?? "—"}</td>
            <td className="py-2.5 text-right text-gray-300">{totalBudget > 0 ? money(totalBudget) : "—"}</td>
            <td className="py-2.5 text-right">
              {totalBudget > 0 ? <MarginBadge pct={profitPct} atRisk={atRisk} /> : <span className="text-gray-600">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function SaludPage() {
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
    return { project: p, totalBudget, totalInvoiced, profitPct, atRisk };
  });

  const rowsConPpto = rows.filter((r) => r.totalBudget > 0);
  const saludable = rowsConPpto.filter((r) => r.profitPct >= 50);
  const atencion = rowsConPpto.filter((r) => r.profitPct >= 30 && r.profitPct < 50);
  const critico = rowsConPpto.filter((r) => r.profitPct < 30);
  const sinPpto = rows.filter((r) => r.totalBudget === 0);
  const total = rows.length;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const totalBudgetSano = saludable.reduce((s, r) => s + r.totalBudget, 0);
  const totalBudgetAtencion = atencion.reduce((s, r) => s + r.totalBudget, 0);
  const totalBudgetCritico = critico.reduce((s, r) => s + r.totalBudget, 0);

  const zones = [
    { label: "Sano", sub: "Margen ≥ 50%", color: "text-green-400", dot: "bg-green-500", rows: saludable, budget: totalBudgetSano },
    { label: "Atención", sub: "Margen 30–50%", color: "text-yellow-400", dot: "bg-yellow-500", rows: atencion, budget: totalBudgetAtencion },
    { label: "Crítico", sub: "Margen < 30%", color: "text-red-400", dot: "bg-red-500", rows: critico, budget: totalBudgetCritico },
  ] as const;

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
          <h1 className="text-2xl font-bold text-white">Salud de la Cartera</h1>
          <p className="text-sm text-gray-400">{total} proyecto{total !== 1 ? "s" : ""} activo{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Barra general */}
      <Card>
        <div className="flex h-6 w-full overflow-hidden rounded-full bg-gray-800">
          {saludable.length > 0 && <div className="bg-green-500" style={{ width: `${pct(saludable.length)}%` }} />}
          {atencion.length > 0 && <div className="bg-yellow-500" style={{ width: `${pct(atencion.length)}%` }} />}
          {critico.length > 0 && <div className="bg-red-500" style={{ width: `${pct(critico.length)}%` }} />}
          {sinPpto.length > 0 && <div className="bg-gray-700" style={{ width: `${pct(sinPpto.length)}%` }} />}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {zones.map((z) => (
            <div key={z.label} className="flex items-center gap-2">
              <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${z.dot}`} />
              <div>
                <p className={`text-sm font-semibold ${z.color}`}>{z.rows.length} {z.label.toLowerCase()}</p>
                <p className="text-[10px] text-gray-500">{z.sub}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-gray-700" />
            <div>
              <p className="text-sm font-semibold text-gray-500">{sinPpto.length} sin presupuesto</p>
              <p className="text-[10px] text-gray-500">sin datos financieros</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Detalle por zona */}
      {zones.map((z) => (
        <Card key={z.label} className={z.rows.length === 0 ? "opacity-40" : ""}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className={`text-base font-bold ${z.color}`}>
                {z.label} — {z.rows.length} proyecto{z.rows.length !== 1 ? "s" : ""}
              </h2>
              <p className="text-xs text-gray-500">{z.sub} · Presupuesto total: {money(z.budget)}</p>
            </div>
          </div>
          <ProjectTable rows={z.rows} />
        </Card>
      ))}

      {/* Sin presupuesto */}
      {sinPpto.length > 0 && (
        <Card className="opacity-60">
          <h2 className="mb-4 text-base font-bold text-gray-500">
            Sin presupuesto — {sinPpto.length} proyecto{sinPpto.length !== 1 ? "s" : ""}
          </h2>
          <ProjectTable rows={sinPpto} />
        </Card>
      )}
    </div>
  );
}
