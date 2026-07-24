import type { AuditLogModel as AuditLog } from "@/generated/prisma/models/AuditLog";
import { Card } from "@/components/ui/card";
import { ACTION_LABELS, relativeTime } from "@/lib/audit";

export function AuditSection({ entries }: { entries: AuditLog[] }) {
  if (entries.length === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Historial de cambios
        </h2>
        <p className="text-sm text-gray-500">Sin actividad registrada todavía.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Historial de cambios
      </h2>
      <ul className="flex flex-col divide-y divide-gray-800/60">
        {entries.map((entry) => {
          const label = ACTION_LABELS[entry.action] ?? entry.action;
          return (
            <li key={entry.id} className="flex items-start gap-3 py-2.5">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-300">
                  <span className="font-medium text-white">
                    {entry.userName ?? "Sistema"}
                  </span>{" "}
                  {label}
                  {entry.entityName && (
                    <span className="ml-1 text-gray-400">— {entry.entityName}</span>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-xs text-gray-600">
                {relativeTime(entry.createdAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
