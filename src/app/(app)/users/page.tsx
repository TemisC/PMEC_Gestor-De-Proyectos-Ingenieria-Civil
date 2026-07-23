import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { TrashIcon } from "@/components/ui/icons";
import { CreateUserForm } from "@/components/create-user-form";
import { deleteUser, toggleUserActive, updateUser } from "./actions";

const roleLabel: Record<string, string> = {
  GERENCIA: "Gerencia",
  GESTOR: "Gestor de Proyectos",
  COLABORADOR: "Colaborador",
};

// Admin queda fuera del alcance del MVP — Gerencia asume esta función
// mínima (gestión de usuarios) mientras tanto (sección 0.1 del plan).
export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers({ id: session.user.id, role: session.user.role })) {
    redirect("/dashboard");
  }
  const selfId = session.user.id;

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          managedProjects: true,
          assignments: true,
          timeEntries: true,
        },
      },
    },
  });

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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Usuarios existentes ({users.length})
        </h2>
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
                <form
                  action={updateUser}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Nombre</label>
                    <input
                      name="name"
                      defaultValue={user.name ?? ""}
                      required
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Email</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={user.email}
                      required
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Rol</label>
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    >
                      <option value="GESTOR">Gestor de Proyectos</option>
                      <option value="COLABORADOR">Colaborador</option>
                      <option value="GERENCIA">Gerencia</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Tarifa/h</label>
                    <input
                      name="defaultHourlyRate"
                      type="number"
                      step="0.01"
                      defaultValue={user.defaultHourlyRate ?? ""}
                      className="w-24 rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
                  >
                    Guardar
                  </button>
                </form>

                {/* Acciones secundarias: desactivar + eliminar */}
                <div className="flex items-center gap-4 border-t border-gray-700/50 pt-2">
                  {!isSelf && (
                    <form action={toggleUserActive}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={user.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-white hover:underline"
                      >
                        {user.active ? "Desactivar" : "Reactivar"}
                      </button>
                    </form>
                  )}

                  {canDelete ? (
                    <form action={deleteUser}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        title="Eliminar usuario"
                        className="rounded p-0.5 text-gray-500 hover:text-red-400"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : (
                    !isSelf && (
                      <span className="text-xs text-gray-600">
                        {hasData
                          ? `${user._count.managedProjects}p / ${user._count.assignments}a / ${user._count.timeEntries}h — no eliminable`
                          : ""}
                      </span>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
