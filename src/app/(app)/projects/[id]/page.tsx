import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import {
  canLogTimeEntry,
  canManageProject,
  canViewAllTimeEntries,
  canViewProject,
  toAuthProject,
} from "@/lib/authorization";
import {
  calculateInternalCost,
  calculatePendingBilling,
  calculatePendingPlanned,
  calculateProfit,
  calculateProfitPercentage,
  calculateTotalBudget,
  calculateTotalInvoiced,
  isMarginAtRisk,
} from "@/lib/financials";
import {
  addProjectMember,
  logTimeEntry,
  removeProjectMember,
} from "@/app/(app)/projects/actions";
import { Card } from "@/components/ui/card";
import { TrashIcon } from "@/components/ui/icons";
import { FinancialsSection } from "./financials-section";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  const authUser = { id: userId, role: session.user.role };

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      manager: true,
      members: { include: { user: true } },
      timeEntries: { include: { user: true }, orderBy: { date: "desc" } },
      agreement: true,
      additionals: true,
      plannedInvoices: { orderBy: { date: "asc" } },
      invoices: { orderBy: { date: "desc" } },
    },
  });

  // 404, no redirect: no confirmarle a un usuario sin permiso que el
  // proyecto existe (defensa en profundidad además del chequeo de rol).
  if (!project || !canViewProject(authUser, toAuthProject(project))) {
    notFound();
  }

  const canManage = canManageProject(authUser, toAuthProject(project));
  const canLog = canLogTimeEntry(authUser, toAuthProject(project));
  const canSeeAllEntries = canViewAllTimeEntries(authUser, toAuthProject(project));
  // Datos financieros: Gerencia los ve (solo lectura) además del Gestor
  // dueño (edición) — un Colaborador nunca ve nada financiero (sección 2
  // del plan: "no ve datos financieros ni proyectos ajenos").
  const canSeeFinancials = session.user.role === Role.GERENCIA || canManage;

  const visibleTimeEntries = canSeeAllEntries
    ? project.timeEntries
    : project.timeEntries.filter((entry) => entry.userId === userId);

  const availableCollaborators = canManage
    ? await prisma.user.findMany({
        where: {
          role: Role.COLABORADOR,
          id: { notIn: project.members.map((m) => m.userId) },
        },
        orderBy: { email: "asc" },
      })
    : [];

  // Cálculo de rentabilidad — funciones puras de src/lib/financials.ts,
  // portadas del SPA original y con tests propios (financials.test.ts).
  const totalBudget = calculateTotalBudget(
    project.agreement?.amount,
    project.additionals,
  );
  const totalInvoiced = calculateTotalInvoiced(project.invoices);
  const pendingBilling = calculatePendingBilling(totalBudget, totalInvoiced);
  const pendingPlanned = calculatePendingPlanned(project.plannedInvoices);

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-xs text-sky-400 hover:underline">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        <p className="text-sm text-gray-400">
          Cliente: {project.client ?? "—"} · Gestor:{" "}
          {project.manager.name ?? project.manager.email}
        </p>
      </div>

      {canSeeFinancials && (
        <FinancialsSection
          projectId={project.id}
          canEdit={canManage}
          agreement={project.agreement}
          additionals={project.additionals}
          plannedInvoices={project.plannedInvoices}
          invoices={project.invoices}
          members={project.members.map((m) => ({
            userId: m.userId,
            label: m.user.name ?? m.user.email,
            hourlyRate: m.hourlyRate,
            defaultRate: m.user.defaultHourlyRate,
          }))}
          totalBudget={totalBudget}
          totalInvoiced={totalInvoiced}
          pendingBilling={pendingBilling}
          pendingPlanned={pendingPlanned}
          internalCost={internalCost}
          profit={profit}
          profitPercentage={profitPercentage}
          atRisk={atRisk}
        />
      )}

      {canManage && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Colaboradores asignados
          </h2>
          <ul className="flex flex-col gap-2">
            {project.members.length === 0 && (
              <li className="text-sm text-gray-500">
                Todavía no hay colaboradores asignados.
              </li>
            )}
            {project.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm text-white"
              >
                <span>{member.user.name ?? member.user.email}</span>
                <form action={removeProjectMember}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="memberUserId" value={member.userId} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <TrashIcon className="h-3.5 w-3.5" /> Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {availableCollaborators.length > 0 && (
            <form action={addProjectMember} className="flex items-end gap-2">
              <input type="hidden" name="projectId" value={project.id} />
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="memberUserId" className="text-xs text-gray-400">
                  Agregar colaborador
                </label>
                <select
                  id="memberUserId"
                  name="memberUserId"
                  className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
                >
                  {availableCollaborators.map((collaborator) => (
                    <option key={collaborator.id} value={collaborator.id}>
                      {collaborator.name ?? collaborator.email}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
              >
                Agregar
              </button>
            </form>
          )}
        </Card>
      )}

      {canLog && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Cargar horas
          </h2>
          <form action={logTimeEntry} className="flex flex-col gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="date" className="text-xs text-gray-400">
                  Fecha
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
                />
              </div>
              <div className="flex w-24 flex-col gap-1">
                <label htmlFor="hours" className="text-xs text-gray-400">
                  Horas
                </label>
                <input
                  id="hours"
                  name="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  required
                  className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-xs text-gray-400">
                Descripción (opcional)
              </label>
              <input
                id="description"
                name="description"
                className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="self-start rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
            >
              Cargar
            </button>
          </form>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          {canSeeAllEntries ? "Horas cargadas (todos)" : "Tus horas cargadas"} (
          {visibleTimeEntries.length})
        </h2>
        {visibleTimeEntries.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay horas cargadas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleTimeEntries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm text-white"
              >
                {entry.date.toISOString().slice(0, 10)} — {entry.hours}h
                {canSeeAllEntries && (
                  <span className="text-gray-400">
                    {" "}
                    ({entry.user.name ?? entry.user.email})
                  </span>
                )}
                {entry.description && (
                  <span className="text-gray-400"> — {entry.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
