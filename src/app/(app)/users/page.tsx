import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "@/components/create-user-form";

const roleLabel: Record<string, string> = {
  GERENCIA: "Gerencia",
  GESTOR: "Gestor de Proyectos",
  COLABORADOR: "Colaborador",
};

// Admin queda fuera del alcance del MVP — Gerencia asume esta función
// mínima (alta de usuarios) mientras tanto (sección 0.1 del plan).
export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers({ id: session.user.id, role: session.user.role })) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
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
        <ul className="flex flex-col gap-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium text-white">
                  {user.name ?? user.email}
                </span>{" "}
                <span className="text-gray-400">({user.email})</span>
              </span>
              <span className="text-xs font-medium text-sky-400">
                {roleLabel[user.role]}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
