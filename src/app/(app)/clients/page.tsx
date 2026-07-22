import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessClients } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { createClient } from "./actions";

// Catálogo global de clientes (sección 2 del plan) — no scoped a un
// Gestor. Cualquier proyecto de cualquier Gestor puede estar linkeado
// a estos mismos clientes.
export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id || !canAccessClients({ id: session.user.id, role: session.user.role })) {
    redirect("/dashboard");
  }

  const clients = await prisma.client.findMany({
    include: { projects: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Clientes</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Nuevo cliente
        </h2>
        <form action={createClient} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-xs text-gray-400">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              required
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="generalContactName" className="text-xs text-gray-400">
              Contacto general
            </label>
            <input
              id="generalContactName"
              name="generalContactName"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="generalContactEmail" className="text-xs text-gray-400">
              Email
            </label>
            <input
              id="generalContactEmail"
              name="generalContactEmail"
              type="email"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="generalContactPhone" className="text-xs text-gray-400">
              Teléfono
            </label>
            <input
              id="generalContactPhone"
              name="generalContactPhone"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
          >
            Crear
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Todos los clientes ({clients.length})
        </h2>
        {clients.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay clientes cargados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-4 py-2 text-sm hover:border-sky-500"
                >
                  <span className="font-medium text-white">{client.name}</span>
                  <span className="text-xs text-gray-400">
                    {client.projects.length}{" "}
                    {client.projects.length === 1 ? "proyecto" : "proyectos"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
