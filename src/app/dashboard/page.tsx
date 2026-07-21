import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import {
  calculateInternalCost,
  calculateProfit,
  calculateProfitPercentage,
  calculateTotalBudget,
  isMarginAtRisk,
} from "@/lib/financials";
import { logout } from "./actions";

// Dashboard real por rol — Gerencia ve todos los proyectos (con
// rentabilidad, que es lo que le interesa para decidir), Gestor los
// suyos, Colaborador solo los que tiene asignados (sin nada
// financiero). El detalle de cada proyecto vive en /projects/[id].
export default async function DashboardPage() {
  const session = await auth();

  // Defensa en profundidad: no depender solo del proxy (src/proxy.ts)
  // para el gate de autenticación. Si `auth()` falla o devuelve null por
  // cualquier motivo, esta página debe fallar cerrado (redirigir), nunca
  // fail-open.
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  const role = session.user.role;
  const canSeeFinancials = role === Role.GERENCIA || role === Role.GESTOR;

  const projects = await prisma.project.findMany({
    where:
      role === Role.GERENCIA
        ? undefined // Gerencia ve todos los proyectos — acá sí es intencional, no un bug.
        : role === Role.GESTOR
          ? { managerId: userId }
          : { members: { some: { userId } } },
    include: {
      manager: true,
      agreement: true,
      additionals: true,
      invoices: true,
      timeEntries: true,
      members: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const roleLabel =
    role === Role.GERENCIA
      ? "Gerencia"
      : role === Role.GESTOR
        ? "Gestor de Proyectos"
        : "Colaborador";

  const projectsWithProfitability = projects.map((project) => {
    if (!canSeeFinancials) return { project, profitability: null };

    const totalBudget = calculateTotalBudget(
      project.agreement?.amount,
      project.additionals,
    );
    const rateByUserId = new Map(
      project.members.map((m) => [
        m.userId,
        m.hourlyRate ?? m.user.defaultHourlyRate ?? 0,
      ]),
    );
    const internalCost = calculateInternalCost(project.timeEntries, rateByUserId);
    const profit = calculateProfit(totalBudget, internalCost);
    const profitPercentage = calculateProfitPercentage(profit, totalBudget);
    const atRisk = isMarginAtRisk(profitPercentage);

    return { project, profitability: { totalBudget, profitPercentage, atRisk } };
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Hola, {session.user.name ?? session.user.email}
          </h1>
          <p className="text-xs text-gray-500">{roleLabel}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-gray-500 underline hover:text-gray-900"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">
            {role === Role.GERENCIA ? "Todos los proyectos" : "Tus proyectos"} (
            {projects.length})
          </h2>
          {role === Role.GESTOR && (
            <Link
              href="/projects/new"
              className="text-xs text-gray-900 underline"
            >
              + Nuevo proyecto
            </Link>
          )}
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay proyectos para mostrar.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projectsWithProfitability.map(({ project, profitability }) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-2 text-sm hover:border-gray-400"
                >
                  <span>
                    <span className="font-medium">{project.name}</span>
                    {role === Role.GERENCIA && (
                      <span className="text-gray-500">
                        {" "}
                        — Gestor: {project.manager.name ?? project.manager.email}
                      </span>
                    )}
                  </span>
                  {profitability && profitability.totalBudget > 0 && (
                    <span
                      className={
                        profitability.atRisk
                          ? "text-xs font-medium text-red-500"
                          : "text-xs font-medium text-green-500"
                      }
                    >
                      {profitability.profitPercentage.toFixed(0)}%{" "}
                      {profitability.atRisk ? "⚠ en riesgo" : ""}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
