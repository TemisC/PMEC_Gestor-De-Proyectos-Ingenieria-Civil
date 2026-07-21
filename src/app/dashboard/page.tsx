import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "./actions";

// Etapa 1 (esqueleto caminante): página protegida mínima, solo para
// probar que login + lectura de datos vía Prisma funcionan de punta a
// punta. El dashboard real por rol (Gerencia ve todo, Colaborador solo
// sus proyectos asignados, carga de horas) llega en la Etapa 3/4
// (plan_maestro.md, sección 11) — acá solo se ajustó el nombre del
// campo (`ownerId` → `managerId`) para que siga compilando tras el
// modelo de datos de la Etapa 2.
export default async function DashboardPage() {
  const session = await auth();

  // Defensa en profundidad: no depender solo del proxy (src/proxy.ts)
  // para el gate de autenticación. Si `auth()` falla o devuelve null por
  // cualquier motivo, esta página debe fallar cerrado (redirigir), nunca
  // fail-open. Además, nunca pasar `undefined` a un filtro de Prisma: es
  // "sin filtro" (matchea todo), no "sin resultados".
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { managerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Hola, {session?.user?.name ?? session?.user?.email}
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-gray-500 underline hover:text-gray-900"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-500">
          Tus proyectos ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no tenés proyectos cargados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm"
              >
                {project.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
