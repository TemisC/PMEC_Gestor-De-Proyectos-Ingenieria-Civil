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
  addProjectMember,
  logTimeEntry,
  removeProjectMember,
} from "@/app/projects/actions";

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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <div>
        <a href="/dashboard" className="text-xs text-gray-500 underline">
          ← Volver
        </a>
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-gray-500">
          Cliente: {project.client ?? "—"} · Gestor:{" "}
          {project.manager.name ?? project.manager.email}
        </p>
      </div>

      {canManage && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-gray-500">
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
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <span>{member.user.name ?? member.user.email}</span>
                <form action={removeProjectMember}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="memberUserId" value={member.userId} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 underline"
                  >
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {availableCollaborators.length > 0 && (
            <form
              action={addProjectMember}
              className="flex items-end gap-2"
            >
              <input type="hidden" name="projectId" value={project.id} />
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="memberUserId" className="text-xs text-gray-500">
                  Agregar colaborador
                </label>
                <select
                  id="memberUserId"
                  name="memberUserId"
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
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
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Agregar
              </button>
            </form>
          )}
        </section>
      )}

      {canLog && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-gray-500">Cargar horas</h2>
          <form action={logTimeEntry} className="flex flex-col gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="date" className="text-xs text-gray-500">
                  Fecha
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex w-24 flex-col gap-1">
                <label htmlFor="hours" className="text-xs text-gray-500">
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
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-xs text-gray-500">
                Descripción (opcional)
              </label>
              <input
                id="description"
                name="description"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="self-start rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Cargar
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-gray-500">
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
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                {entry.date.toISOString().slice(0, 10)} — {entry.hours}h
                {canSeeAllEntries && (
                  <span className="text-gray-500">
                    {" "}
                    ({entry.user.name ?? entry.user.email})
                  </span>
                )}
                {entry.description && (
                  <span className="text-gray-500"> — {entry.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
