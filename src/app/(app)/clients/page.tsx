import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { canAccessClients } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { createClient } from "./actions";

const PAGE_SIZE = 20;

// Catálogo global de clientes (sección 2 del plan) — no scoped a un
// Gestor. Cualquier proyecto de cualquier Gestor puede estar linkeado
// a estos mismos clientes. El filtro "solo mis clientes" (feedback del
// gestor, 2026-08-13) es opcional, no cambia el catálogo compartido.
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; mine?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !canAccessClients({ id: session.user.id, role: session.user.role })) {
    redirect("/dashboard");
  }

  const { q, page: pageStr, mine } = await searchParams;
  // "Mis clientes" solo tiene sentido para un Gestor (dueño de proyectos)
  // — Gerencia no gestiona proyectos propios, siempre ve el catálogo entero.
  const showMine = mine === "1" && session.user.role === Role.GESTOR;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const mineHref = (currentlyMine: boolean) => {
    const params = new URLSearchParams();
    if (!currentlyMine) params.set("mine", "1");
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/clients${qs ? `?${qs}` : ""}`;
  };

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(showMine ? { projects: { some: { managerId: session.user.id } } } : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { projects: true },
      orderBy: { name: "asc" },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.client.count({ where }),
  ]);

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            {showMine ? "Mis clientes" : "Todos los clientes"} ({total})
          </h2>
          <div className="flex items-center gap-3">
            <SearchInput placeholder="Buscar por nombre…" />
            {session.user.role === Role.GESTOR && (
              <Link href={mineHref(showMine)} className="text-xs text-sky-400 hover:underline">
                {showMine ? "Ver todos" : "Ver solo mis clientes"}
              </Link>
            )}
          </div>
        </div>

        {clients.length === 0 ? (
          <p className="text-sm text-gray-500">
            {q
              ? `Sin resultados para "${q}".`
              : showMine
                ? "Ninguno de tus proyectos tiene un cliente asignado todavía."
                : "Todavía no hay clientes cargados."}
          </p>
        ) : (
          <>
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
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              q={q}
              extraParams={{ mine: showMine ? "1" : undefined }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
