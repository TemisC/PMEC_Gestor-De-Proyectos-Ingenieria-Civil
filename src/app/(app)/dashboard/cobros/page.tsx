import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export default async function CobrosPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  if (session.user.role !== Role.GERENCIA) redirect("/dashboard");

  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    include: {
      manager: true,
      client: true,
      plannedInvoices: {
        where: { invoiced: false },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Agrupar previsiones por mes (próximos 6 meses)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = monthLabel(d);
    return {
      key,
      label,
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0),
      amount: 0,
      invoices: [] as {
        id: string;
        description: string;
        amount: number;
        date: Date;
        projectId: string;
        projectName: string;
        clientName: string | null;
        managerName: string;
      }[],
    };
  });

  for (const p of projects) {
    for (const pi of p.plannedInvoices) {
      const key = `${pi.date.getFullYear()}-${String(pi.date.getMonth() + 1).padStart(2, "0")}`;
      const month = months.find((m) => m.key === key);
      if (!month) continue;
      month.amount += pi.amount;
      month.invoices.push({
        id: pi.id,
        description: pi.description,
        amount: pi.amount,
        date: pi.date,
        projectId: p.id,
        projectName: p.name,
        clientName: p.client?.name ?? null,
        managerName: p.manager.name ?? p.manager.email,
      });
    }
  }

  const totalEsperado = months.reduce((s, m) => s + m.amount, 0);
  const maxAmount = Math.max(...months.map((m) => m.amount), 1);
  const maxBarPx = 80;

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
          <h1 className="text-2xl font-bold text-white">Próximos Cobros Previstos</h1>
          <p className="text-sm text-gray-400">
            Previsiones de cobro sin facturar · próximos 6 meses ·{" "}
            <span className="text-emerald-400 font-medium">{money(totalEsperado)} esperado</span>
          </p>
        </div>
      </div>

      {/* Gráfica de barras grande */}
      <Card>
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Distribución mensual
        </h2>
        <div className="flex items-end gap-4" style={{ height: "140px" }}>
          {months.map((m) => {
            const barH = m.amount > 0 ? Math.round((m.amount / maxAmount) * maxBarPx) : 0;
            return (
              <div key={m.key} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-xs font-semibold text-emerald-400">
                  {m.amount > 0 ? money(m.amount) : "—"}
                </span>
                <div
                  className="w-full rounded-t bg-emerald-700 transition-all"
                  style={{ height: `${Math.max(barH, m.amount > 0 ? 6 : 0)}px` }}
                />
                <div className="h-px w-full bg-gray-700" />
                <span className="text-center text-[10px] capitalize text-gray-400">{m.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Detalle mes a mes */}
      {months.map((m) => (
        <Card
          key={m.key}
          className={m.amount === 0 ? "opacity-40" : ""}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold capitalize text-white">{m.label}</h2>
              <p className="text-xs text-gray-500">
                {m.invoices.length} previsión{m.invoices.length !== 1 ? "es" : ""} ·{" "}
                <span className="text-emerald-400 font-medium">{money(m.amount)}</span>
              </p>
            </div>
            {m.amount > 0 && (
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${(m.amount / maxAmount) * 100}%` }}
                />
              </div>
            )}
          </div>

          {m.invoices.length === 0 ? (
            <p className="text-xs text-gray-600">Sin previsiones de cobro para este mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Descripción</th>
                    <th className="pb-2 font-medium">Proyecto</th>
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Gestor</th>
                    <th className="pb-2 text-right font-medium">Monto</th>
                    <th className="pb-2 text-right font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {m.invoices
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-800/30">
                        <td className="py-2.5 text-gray-300">{inv.description}</td>
                        <td className="py-2.5">
                          <Link
                            href={`/projects/${inv.projectId}`}
                            className="font-medium text-white hover:text-sky-400"
                          >
                            {inv.projectName}
                          </Link>
                        </td>
                        <td className="py-2.5 text-gray-400">{inv.clientName ?? "—"}</td>
                        <td className="py-2.5 text-gray-400">{inv.managerName}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-400">
                          {money(inv.amount)}
                        </td>
                        <td className="py-2.5 text-right text-xs text-gray-500">
                          {inv.date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700 text-xs font-semibold">
                    <td colSpan={4} className="pt-2 text-gray-400">Total {m.label}</td>
                    <td className="pt-2 text-right text-emerald-400">{money(m.amount)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
