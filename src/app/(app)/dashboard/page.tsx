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
  isMarginAtRisk,
} from "@/lib/financials";
import { Card } from "@/components/ui/card";
import { AlertIcon, PlusIcon, TrendingUpIcon } from "@/components/ui/icons";

// Dashboard real por rol — Gerencia ve todos los proyectos (con
// rentabilidad, que es lo que le interesa para decidir), Gestor los
// suyos, Colaborador solo los que tiene asignados (sin nada
// financiero). El detalle de cada proyecto vive en /projects/[id].
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
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

  // Por default solo activos (Etapa "gestión de punta a punta", 2026-07-22):
  // un proyecto archivado sigue existiendo con toda su info, pero deja de
  // aparecer acá salvo que se pida explícitamente con ?archived=1.
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const roleFilter =
    role === Role.GERENCIA
      ? {} // Gerencia ve todos los proyectos — acá sí es intencional, no un bug.
      : role === Role.GESTOR
        ? { managerId: userId }
        : { members: { some: { userId } } };

  const projects = await prisma.project.findMany({
    where: { ...roleFilter, status: showArchived ? "ARCHIVED" : "ACTIVE" },
    include: {
      manager: true,
      agreement: true,
      additionals: true,
      invoices: true,
      timeEntries: true,
      members: { include: { user: true } },
      externalCollaborators: { include: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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
    const externalCost = calculateExternalCost(
      project.externalCollaborators.flatMap((c) => c.payments),
    );
    const profit = calculateProfit(totalBudget, internalCost, externalCost);
    const profitPercentage = calculateProfitPercentage(profit, totalBudget);
    const atRisk = isMarginAtRisk(profitPercentage);

    return { project, profitability: { totalBudget, profitPercentage, atRisk } };
  });

  const atRiskCount = projectsWithProfitability.filter(
    (p) => p.profitability?.atRisk,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {session.user.name ?? session.user.email}
        </h1>
        <p className="text-sm text-gray-400">
          {role === Role.GERENCIA
            ? "Todos los proyectos de la empresa"
            : role === Role.GESTOR
              ? "Tus proyectos"
              : "Tus proyectos asignados"}
        </p>
      </div>

      {canSeeFinancials && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="flex items-center gap-4">
            <TrendingUpIcon className="h-8 w-8 text-sky-400" />
            <div>
              <p className="text-2xl font-bold text-white">{projects.length}</p>
              <p className="text-xs text-gray-400">
                {role === Role.GERENCIA ? "Proyectos activos" : "Tus proyectos"}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <AlertIcon
              className={`h-8 w-8 ${atRiskCount > 0 ? "text-red-400" : "text-green-400"}`}
            />
            <div>
              <p className="text-2xl font-bold text-white">{atRiskCount}</p>
              <p className="text-xs text-gray-400">
                {atRiskCount === 1 ? "proyecto en riesgo" : "proyectos en riesgo"}
              </p>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            {role === Role.GERENCIA ? "Todos los proyectos" : "Proyectos"}
            {showArchived ? " archivados" : ""} ({projects.length})
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href={showArchived ? "/dashboard" : "/dashboard?archived=1"}
              className="text-xs text-sky-400 hover:underline"
            >
              {showArchived ? "Ver activos" : "Ver archivados"}
            </Link>
            {role === Role.GESTOR && (
              <Link
                href="/projects/new"
                className="flex items-center gap-1 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400"
              >
                <PlusIcon className="h-4 w-4" />
                Nuevo proyecto
              </Link>
            )}
          </div>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">
            {showArchived
              ? "No hay proyectos archivados."
              : "Todavía no hay proyectos para mostrar."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projectsWithProfitability.map(({ project, profitability }) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-4 py-3 text-sm transition-colors hover:border-sky-500"
                >
                  <span>
                    <span className="font-medium text-white">{project.name}</span>
                    {role === Role.GERENCIA && (
                      <span className="text-gray-400">
                        {" "}
                        — Gestor: {project.manager.name ?? project.manager.email}
                      </span>
                    )}
                  </span>
                  {profitability && profitability.totalBudget > 0 && (
                    <span
                      className={
                        profitability.atRisk
                          ? "flex items-center gap-1 text-xs font-semibold text-red-400"
                          : "text-xs font-semibold text-green-400"
                      }
                    >
                      {profitability.profitPercentage.toFixed(0)}%
                      {profitability.atRisk && (
                        <>
                          <AlertIcon className="h-3.5 w-3.5" /> en riesgo
                        </>
                      )}
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
