import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { ACTION_LABELS, getAuditLogPage, relativeTime } from "@/lib/audit";

// Solo Gerencia puede ver el log global (misma guarda que /users).
const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers({ id: session.user.id, role: session.user.role })) {
    redirect("/dashboard");
  }

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const { entries, total } = await getAuditLogPage({ skip, take: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Historial de cambios</h1>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Todos los eventos ({total})
          </h2>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">Sin actividad registrada todavía.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-gray-800/60">
              {entries.map((entry) => {
                const label = ACTION_LABELS[entry.action] ?? entry.action;
                return (
                  <li key={entry.id} className="flex items-start gap-3 py-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium text-white">
                          {entry.userName ?? "Sistema"}
                        </span>{" "}
                        {label}
                        {entry.entityName && (
                          <span className="ml-1 text-gray-400">— {entry.entityName}</span>
                        )}
                      </p>
                      {entry.projectId && (
                        <Link
                          href={`/projects/${entry.projectId}`}
                          className="text-xs text-sky-500 hover:underline"
                        >
                          Ver proyecto →
                        </Link>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-600">
                      {relativeTime(entry.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
          </>
        )}
      </Card>
    </div>
  );
}
