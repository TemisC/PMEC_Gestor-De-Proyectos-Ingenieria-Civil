import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { logout } from "./actions";

// Etapa 4 (plan_maestro.md, sección 11): dashboard real por rol —
// Gerencia ve todos los proyectos, Gestor los suyos, Colaborador solo
// los que tiene asignados. El detalle de cada proyecto (miembros, carga
// de horas) vive en /projects/[id].
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

  const projects = await prisma.project.findMany({
    where:
      role === Role.GERENCIA
        ? undefined // Gerencia ve todos los proyectos — acá sí es intencional, no un bug.
        : role === Role.GESTOR
          ? { managerId: userId }
          : { members: { some: { userId } } },
    include: { manager: true },
    orderBy: { createdAt: "desc" },
  });

  const roleLabel =
    role === Role.GERENCIA
      ? "Gerencia"
      : role === Role.GESTOR
        ? "Gestor de Proyectos"
        : "Colaborador";

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
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block rounded-md border border-gray-200 px-4 py-2 text-sm hover:border-gray-400"
                >
                  <span className="font-medium">{project.name}</span>
                  {role === Role.GERENCIA && (
                    <span className="text-gray-500">
                      {" "}
                      — Gestor: {project.manager.name ?? project.manager.email}
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
