import { prisma } from "./prisma";

export type AuditParams = {
  userId: string | null | undefined;
  userName: string | null | undefined;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string | null;
  projectId?: string | null;
};

// Best-effort: un fallo del log nunca debe interrumpir la operación real.
export async function logAction(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userName: params.userName ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName ?? null,
        projectId: params.projectId ?? null,
      },
    });
  } catch {
    console.error("[audit] Failed to log action:", params.action, params.entityId);
  }
}

type AuditLogEntry = Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number];

// Lectura best-effort, simétrica a logAction: el historial de cambios es
// información auxiliar, nunca debe tumbar la página del proyecto (donde
// vive junto a adicionales/previsiones/colaboradores) si la tabla/consulta
// falla — mismo tipo de falla que ya se vio en producción (bug reportado
// 2026-08-07: error de servidor al abrir la edición de un proyecto).
export async function getProjectAuditLog(
  projectId: string,
  take = 30,
): Promise<AuditLogEntry[]> {
  try {
    return await prisma.auditLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take,
    });
  } catch (err) {
    console.error("[audit] Failed to read project audit log:", projectId, err);
    return [];
  }
}

export async function getAuditLogPage(params: {
  skip: number;
  take: number;
}): Promise<{ entries: AuditLogEntry[]; total: number }> {
  try {
    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: params.take,
        skip: params.skip,
      }),
      prisma.auditLog.count(),
    ]);
    return { entries, total };
  } catch (err) {
    console.error("[audit] Failed to read audit log page:", err);
    return { entries: [], total: 0 };
  }
}

// ── Labels para la UI ─────────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  "project.create":                "creó el proyecto",
  "project.update":                "actualizó el proyecto",
  "project.archive":               "archivó el proyecto",
  "project.unarchive":             "reactivó el proyecto",
  "agreement.set":                 "configuró el acuerdo base",
  "additional.create":             "agregó un adicional",
  "additional.update":             "editó el adicional",
  "additional.delete":             "eliminó el adicional",
  "planned_invoice.create":        "agregó una previsión de cobro",
  "planned_invoice.update":        "editó la previsión de cobro",
  "planned_invoice.delete":        "eliminó la previsión de cobro",
  "planned_invoice.promote":       "promovió a factura real",
  "invoice.create":                "emitió una factura",
  "invoice.update":                "editó la factura",
  "invoice.delete":                "eliminó la factura",
  "member.add":                    "agregó al equipo",
  "member.remove":                 "removió del equipo",
  "member.rate_update":            "actualizó la tarifa de",
  "time_entry.create":             "cargó horas",
  "time_entry.update":             "editó horas cargadas",
  "time_entry.delete":             "eliminó horas cargadas",
  "external_collaborator.create":  "agregó el subcontratista",
  "external_collaborator.update":  "editó el subcontratista",
  "external_collaborator.delete":  "eliminó el subcontratista",
  "ext_additional.create":         "agregó un adicional al subcontratista",
  "ext_additional.update":         "editó el adicional del subcontratista",
  "ext_additional.delete":         "eliminó el adicional del subcontratista",
  "ext_payment.create":            "registró un pago al subcontratista",
  "ext_payment.update":            "editó un pago al subcontratista",
  "ext_payment.delete":            "eliminó un pago al subcontratista",
  "user.create":                   "creó el usuario",
  "user.update":                   "editó el usuario",
  "user.deactivate":               "desactivó el usuario",
  "user.reactivate":               "reactivó el usuario",
  "user.delete":                   "eliminó el usuario",
};

// ── Tiempo relativo (server-side, sin dependencias externas) ──────────────

export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days !== 1 ? "s" : ""}`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}
