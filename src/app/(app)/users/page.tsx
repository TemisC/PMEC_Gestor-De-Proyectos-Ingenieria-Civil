import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { CreateUserForm } from "@/components/create-user-form";
import { EditUserForm, ToggleUserButton, DeleteUserButton } from "./user-row-forms";

const PAGE_SIZE = 20;

const roleLabel: Record<string, string> = {
  GERENCIA: "Gerencia",
  GESTOR: "Gestor de Proyectos",
  COLABORADOR: "Colaborador",
};

// Admin queda fuera del alcance del MVP — Gerencia asume esta función
// mínima (gestión de usuarios) mientras tanto (sección 0.1 del plan).
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers({ id: session.user.id, role: session.user.role })) {
    redirect("/dashboard");
  }
  const selfId = session.user.id;

  const { q, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
      take: PAGE_SIZE,
      skip,
      include: {
        _count: {
          select: {
            managedProjects: true,
            assignments: true,
            timeEntries: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Usuarios</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Crear usuario
        </h2>
        <CreateUserForm />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Usuarios existentes ({total})
          </h2>
          <SearchInput placeholder="Buscar por nombre o email…" />
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-gray-500">
            {q ? `Sin resultados para "${q}".` : "Todavía no hay usuarios cargados."}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {users.map((user) => {
                const isSelf = user.id === selfId;
                const hasData =
                  user._count.managedProjects + user._count.assignments + user._count.timeEntries > 0;
                const canDelete = !isSelf && !hasData;

                return (
                  <li
                    key={user.id}
                    className={`flex flex-col gap-3 rounded-md border bg-gray-900/40 p-3 ${
                      user.active ? "border-gray-700" : "border-gray-800 opacity-60"
                    }`}
                  >
                    {/* Encabezado: nombre + badges */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-white">
                        {user.name ?? user.email}
                      </span>
                      <span className="text-xs font-medium text-sky-400">
                        {roleLabel[user.role]}
                      </span>
                      {!user.active && (
                        <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                          Inactivo
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-xs text-gray-500">(vos)</span>
                      )}
                    </div>

                    {/* Formulario de edición inline */}
                    <EditUserForm
                      userId={user.id}
                      initialName={user.name ?? ""}
                      initialEmail={user.email}
                      initialRole={user.role}
                      initialRate={user.defaultHourlyRate}
                      isSelf={isSelf}
                    />

                    {/* Acciones secundarias: desactivar + eliminar */}
                    <div className="flex items-center gap-4 border-t border-gray-700/50 pt-2">
                      <ToggleUserButton
                        userId={user.id}
                        active={user.active}
                        isSelf={isSelf}
                      />
                      <DeleteUserButton
                        userId={user.id}
                        canDelete={canDelete}
                        countLabel={
                          !isSelf && hasData
                            ? `${user._count.managedProjects}p / ${user._count.assignments}a / ${user._count.timeEntries}h — no eliminable`
                            : ""
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} q={q} />
          </>
        )}
      </Card>
    </div>
  );
}
