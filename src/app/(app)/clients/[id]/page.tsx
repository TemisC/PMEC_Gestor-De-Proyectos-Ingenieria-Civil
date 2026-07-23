import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessClients, canViewProject, toAuthProject } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { TrashIcon } from "@/components/ui/icons";
import {
  addClientContact,
  deleteClient,
  deleteClientContact,
  updateClient,
  updateClientContact,
} from "../actions";

const contactTypeLabel: Record<string, string> = {
  TECHNICAL: "Técnico",
  ECONOMIC: "Económico",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id || !canAccessClients({ id: session.user.id, role: session.user.role })) {
    redirect("/dashboard");
  }
  const authUser = { id: session.user.id, role: session.user.role };

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { type: "asc" } },
      projects: { include: { manager: true, members: true } },
    },
  });
  if (!client) {
    notFound();
  }

  // El cliente es global, pero cada proyecto sigue respetando su propia
  // regla de visibilidad (un Gestor no ve el proyecto de otro Gestor,
  // aunque comparta cliente) — mismo canViewProject de siempre.
  const visibleProjects = client.projects.filter((project) =>
    canViewProject(authUser, toAuthProject(project)),
  );

  const canDelete = client.projects.length === 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/clients" className="text-xs text-sky-400 hover:underline">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-white">{client.name}</h1>
      </div>

      {/* Editar datos del cliente */}
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Editar cliente
        </h2>
        <form action={updateClient} className="flex flex-col gap-3">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Nombre</label>
              <input
                name="name"
                defaultValue={client.name}
                required
                className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Contacto general</label>
              <input
                name="generalContactName"
                defaultValue={client.generalContactName ?? ""}
                className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Email</label>
              <input
                name="generalContactEmail"
                type="email"
                defaultValue={client.generalContactEmail ?? ""}
                className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Teléfono</label>
              <input
                name="generalContactPhone"
                defaultValue={client.generalContactPhone ?? ""}
                className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-sky-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
            >
              Guardar
            </button>
          </div>
        </form>

        {canDelete ? (
          <form action={deleteClient}>
            <input type="hidden" name="clientId" value={client.id} />
            <button
              type="submit"
              className="text-xs text-red-400 hover:text-red-300 hover:underline"
            >
              Eliminar cliente
            </button>
          </form>
        ) : (
          <p className="text-xs text-gray-500">
            No se puede eliminar: tiene {client.projects.length} proyecto
            {client.projects.length > 1 ? "s" : ""} asociado
            {client.projects.length > 1 ? "s" : ""}.
          </p>
        )}
      </Card>

      {/* Contactos técnicos / económicos */}
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Contactos técnicos / económicos ({client.contacts.length})
        </h2>

        {client.contacts.length > 0 && (
          <ul className="flex flex-col gap-3">
            {client.contacts.map((contact) => (
              <li
                key={contact.id}
                className="flex flex-wrap items-end gap-2 rounded-md border border-gray-700 bg-gray-900/40 px-3 py-2"
              >
                <form action={updateClientContact} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="contactId" value={contact.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Tipo</label>
                    <select
                      name="type"
                      defaultValue={contact.type}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    >
                      <option value="TECHNICAL">Técnico</option>
                      <option value="ECONOMIC">Económico</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Nombre</label>
                    <input
                      name="name"
                      defaultValue={contact.name}
                      required
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Email</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={contact.email ?? ""}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">Teléfono</label>
                    <input
                      name="phone"
                      defaultValue={contact.phone ?? ""}
                      className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
                  >
                    Guardar
                  </button>
                </form>

                <form action={deleteClientContact}>
                  <input type="hidden" name="contactId" value={contact.id} />
                  <button
                    type="submit"
                    title={`Eliminar contacto ${contact.name}`}
                    className="rounded p-1 text-gray-500 hover:text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addClientContact} className="flex flex-wrap items-end gap-2 border-t border-gray-700 pt-3">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Tipo</label>
            <select
              name="type"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            >
              <option value="TECHNICAL">Técnico</option>
              <option value="ECONOMIC">Económico</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Nombre</label>
            <input
              name="name"
              required
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Email</label>
            <input
              name="email"
              type="email"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Teléfono</label>
            <input
              name="phone"
              className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600"
          >
            + Agregar contacto
          </button>
        </form>
      </Card>

      {/* Proyectos con este cliente */}
      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Proyectos con este cliente ({visibleProjects.length})
        </h2>
        {visibleProjects.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay proyectos visibles para vos con este cliente.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm hover:border-sky-500"
                >
                  <span className="text-white">{project.name}</span>
                  <span className="text-xs text-gray-400">
                    Gestor: {project.manager.name ?? project.manager.email}
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
