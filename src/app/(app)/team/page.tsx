import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function TeamPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  if (session.user.role !== Role.GESTOR) redirect("/dashboard");

  const projects = await prisma.project.findMany({
    where: { managerId: userId, status: "ACTIVE" },
    include: {
      members: { include: { user: true } },
      timeEntries: true,
    },
    orderBy: { name: "asc" },
  });

  // Agrupar colaboradores a través de todos los proyectos
  const memberMap = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      projects: { id: string; name: string; hourlyRate: number | null; hours: number; cost: number }[];
      totalHours: number;
      totalCost: number;
    }
  >();

  for (const p of projects) {
    for (const m of p.members) {
      const rate = m.hourlyRate ?? m.user.defaultHourlyRate ?? 0;
      const projectHours = p.timeEntries
        .filter((te) => te.userId === m.userId)
        .reduce((s, te) => s + te.hours, 0);
      const projectCost = projectHours * rate;

      const entry = memberMap.get(m.userId) ?? {
        userId: m.userId,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        projects: [],
        totalHours: 0,
        totalCost: 0,
      };

      entry.projects.push({
        id: p.id,
        name: p.name,
        hourlyRate: rate > 0 ? rate : null,
        hours: projectHours,
        cost: projectCost,
      });
      entry.totalHours += projectHours;
      entry.totalCost += projectCost;

      memberMap.set(m.userId, entry);
    }
  }

  // Ordenar por horas descendente (más activo primero)
  const members = [...memberMap.values()].sort((a, b) => b.totalHours - a.totalHours);

  const totalHours = members.reduce((s, m) => s + m.totalHours, 0);
  const totalCost = members.reduce((s, m) => s + m.totalCost, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Equipo Global</h1>
        <p className="text-sm text-gray-400">
          {members.length} colaborador{members.length !== 1 ? "es" : ""} en proyectos activos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-pink-800/60 bg-pink-950/20 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-pink-400">
            Equipo activo
          </p>
          <p className="text-xl font-bold text-white">{members.length}</p>
          <p className="mt-1 text-xs text-gray-400">
            colaborador{members.length !== 1 ? "es" : ""} asignado{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-sky-800/60 bg-sky-950/20 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-400">
            Horas registradas
          </p>
          <p className="text-xl font-bold text-white">{totalHours.toFixed(1)} h</p>
          <p className="mt-1 text-xs text-gray-400">en proyectos activos</p>
        </div>
        <div className="rounded-lg border border-violet-800/60 bg-violet-950/20 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-400">
            Coste interno
          </p>
          <p className="truncate text-xl font-bold text-white">{money(totalCost)}</p>
          <p className="mt-1 text-xs text-gray-400">horas × tarifa</p>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        {members.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay colaboradores asignados a proyectos activos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                  <th className="pb-3 font-medium">Colaborador</th>
                  <th className="pb-3 font-medium">Proyectos asignados</th>
                  <th className="pb-3 text-right font-medium">Horas</th>
                  <th className="pb-3 text-right font-medium">Coste estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {members.map((m, i) => (
                  <tr key={m.userId} className="hover:bg-gray-800/30 align-top">
                    <td className="py-3">
                      <p className={`font-medium ${i === 0 ? "text-pink-400" : "text-white"}`}>
                        {m.name}
                      </p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        {m.projects.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-4">
                            <Link
                              href={`/projects/${p.id}`}
                              className="text-xs text-sky-400 hover:underline"
                            >
                              {p.name}
                            </Link>
                            <span className="text-xs text-gray-600">
                              {p.hours > 0 ? `${p.hours.toFixed(1)} h` : "sin horas"}
                              {p.hourlyRate ? ` · ${money(p.hourlyRate)}/h` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-right text-gray-300">
                      {m.totalHours > 0 ? `${m.totalHours.toFixed(1)} h` : "—"}
                    </td>
                    <td className="py-3 text-right text-gray-300">
                      {m.totalCost > 0 ? money(m.totalCost) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-600 text-xs font-semibold">
                  <td colSpan={2} className="pt-3 text-gray-400">Total</td>
                  <td className="pt-3 text-right text-white">{totalHours.toFixed(1)} h</td>
                  <td className="pt-3 text-right text-white">{money(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
