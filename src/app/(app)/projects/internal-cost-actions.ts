"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageProject, toAuthProject } from "@/lib/authorization";
import {
  addWorkRangeSchema,
  deleteWorkRangeSchema,
  importTimeEntriesSchema,
  updateWorkRangeSchema,
} from "@/lib/schemas";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/components/action-form";

// Coste interno (horas proyectadas vs reales) — mismo criterio de
// autorización que el resto de lo financiero (financial-actions.ts):
// edición exclusiva del Gestor dueño del proyecto.

async function assertCanManage(projectId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("No autorizado");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project || !canManageProject({ id: userId, role: session.user.role }, toAuthProject(project))) {
    throw new Error("No autorizado");
  }
  return { project, userId, userName: session.user.name ?? session.user.email ?? null };
}

async function assertCanManageViaMember(projectMemberId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { id: projectMemberId },
    include: { user: true },
  });
  if (!member) throw new Error("Colaborador no encontrado en el proyecto");
  const caller = await assertCanManage(member.projectId);
  return { member, ...caller };
}

export async function addWorkRange(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = addWorkRangeSchema.safeParse({
    projectMemberId: formData.get("projectMemberId"),
    taskName: formData.get("taskName"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    dedicationPercentage: formData.get("dedicationPercentage"),
    holidaysCount: formData.get("holidaysCount"),
    manualHours: formData.get("manualHours"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  if (parsed.data.endDate < parsed.data.startDate) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio" };
  }

  const { member, userId, userName } = await assertCanManageViaMember(parsed.data.projectMemberId);

  const rec = await prisma.internalWorkRange.create({
    data: {
      projectMemberId: parsed.data.projectMemberId,
      taskName: parsed.data.taskName,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      dedicationPercentage: parsed.data.dedicationPercentage,
      holidaysCount:
        parsed.data.holidaysCount === "" || parsed.data.holidaysCount === undefined
          ? 0
          : parsed.data.holidaysCount,
      manualHours:
        parsed.data.manualHours === "" || parsed.data.manualHours === undefined
          ? null
          : parsed.data.manualHours,
    },
  });

  await logAction({
    userId, userName,
    action: "work_range.create",
    entityType: "InternalWorkRange",
    entityId: rec.id,
    entityName: `${member.user.name ?? member.user.email} — ${parsed.data.taskName}`,
    projectId: member.projectId,
  });

  revalidatePath(`/projects/${member.projectId}`);
  return { ok: true };
}

export async function updateWorkRange(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = updateWorkRangeSchema.safeParse({
    workRangeId: formData.get("workRangeId"),
    taskName: formData.get("taskName"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    dedicationPercentage: formData.get("dedicationPercentage"),
    holidaysCount: formData.get("holidaysCount"),
    manualHours: formData.get("manualHours"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  if (parsed.data.endDate < parsed.data.startDate) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio" };
  }

  const range = await prisma.internalWorkRange.findUnique({
    where: { id: parsed.data.workRangeId },
    include: { projectMember: { include: { user: true } } },
  });
  if (!range) throw new Error("No encontrado");

  const { userId, userName } = await assertCanManage(range.projectMember.projectId);

  await prisma.internalWorkRange.update({
    where: { id: parsed.data.workRangeId },
    data: {
      taskName: parsed.data.taskName,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      dedicationPercentage: parsed.data.dedicationPercentage,
      holidaysCount:
        parsed.data.holidaysCount === "" || parsed.data.holidaysCount === undefined
          ? 0
          : parsed.data.holidaysCount,
      manualHours:
        parsed.data.manualHours === "" || parsed.data.manualHours === undefined
          ? null
          : parsed.data.manualHours,
    },
  });

  await logAction({
    userId, userName,
    action: "work_range.update",
    entityType: "InternalWorkRange",
    entityId: parsed.data.workRangeId,
    entityName: `${range.projectMember.user.name ?? range.projectMember.user.email} — ${parsed.data.taskName}`,
    projectId: range.projectMember.projectId,
  });

  revalidatePath(`/projects/${range.projectMember.projectId}`);
  return { ok: true };
}

export async function deleteWorkRange(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = deleteWorkRangeSchema.safeParse({
    workRangeId: formData.get("workRangeId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const range = await prisma.internalWorkRange.findUnique({
    where: { id: parsed.data.workRangeId },
    include: { projectMember: { include: { user: true } } },
  });
  if (!range) throw new Error("No encontrado");

  const { userId, userName } = await assertCanManage(range.projectMember.projectId);

  await prisma.internalWorkRange.delete({ where: { id: parsed.data.workRangeId } });

  await logAction({
    userId, userName,
    action: "work_range.delete",
    entityType: "InternalWorkRange",
    entityId: parsed.data.workRangeId,
    entityName: `${range.projectMember.user.name ?? range.projectMember.user.email} — ${range.taskName}`,
    projectId: range.projectMember.projectId,
  });

  revalidatePath(`/projects/${range.projectMember.projectId}`);
  return { ok: true };
}

// ── Importar fichajes desde el CSV de Odoo ───────────────────────────────
// Se llama directo desde el cliente (no vía <form>): el parseo y el
// matcheo de nombre → colaborador ya se hicieron en el browser
// (src/lib/odoo-csv.ts) y el gestor ya confirmó cada fila — acá solo se
// persiste. Nunca crea un User nuevo: si el userId no es todavía
// ProjectMember de este proyecto, se agrega como miembro (con tarifa sin
// definir), pero el User tiene que existir de antes.

export type ImportTimeEntriesResult =
  | { ok: true; created: number; skipped: number; addedMembers: number }
  | { ok: false; error: string };

export async function importTimeEntries(
  projectId: string,
  entries: { userId: string; date: string; hours: number }[],
): Promise<ImportTimeEntriesResult> {
  const parsed = importTimeEntriesSchema.safeParse({ projectId, entries });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { userId: actingUserId, userName } = await assertCanManage(parsed.data.projectId);

  const existingMembers = await prisma.projectMember.findMany({
    where: { projectId: parsed.data.projectId },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingMembers.map((m) => m.userId));
  const neededUserIds = [...new Set(parsed.data.entries.map((e) => e.userId))];
  const missingUserIds = neededUserIds.filter((id) => !existingUserIds.has(id));

  // Deduplicación: no volver a crear un fichaje idéntico si el mismo CSV
  // se sube más de una vez (mismo criterio que el SPA original, adaptado
  // a lo que ya persiste TimeEntry).
  const existingEntries = await prisma.timeEntry.findMany({
    where: { projectId: parsed.data.projectId, userId: { in: neededUserIds } },
    select: { userId: true, date: true, hours: true },
  });
  const keyOf = (userId: string, date: Date, hours: number) =>
    `${userId}|${date.toISOString().slice(0, 10)}|${hours}`;
  const existingKeys = new Set(existingEntries.map((e) => keyOf(e.userId, e.date, e.hours)));
  const toCreate = parsed.data.entries.filter((e) => !existingKeys.has(keyOf(e.userId, e.date, e.hours)));

  const operations = [
    ...missingUserIds.map((uid) =>
      prisma.projectMember.upsert({
        where: { userId_projectId: { userId: uid, projectId: parsed.data.projectId } },
        update: {},
        create: { userId: uid, projectId: parsed.data.projectId },
      }),
    ),
    ...toCreate.map((e) =>
      prisma.timeEntry.create({
        data: {
          projectId: parsed.data.projectId,
          userId: e.userId,
          date: e.date,
          hours: e.hours,
          description: "Importado de Odoo",
        },
      }),
    ),
  ];
  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  await logAction({
    userId: actingUserId, userName,
    action: "time_entry.import",
    entityType: "TimeEntry",
    entityId: parsed.data.projectId,
    entityName: `${toCreate.length} fichajes importados de Odoo`,
    projectId: parsed.data.projectId,
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);

  return {
    ok: true,
    created: toCreate.length,
    skipped: parsed.data.entries.length - toCreate.length,
    addedMembers: missingUserIds.length,
  };
}
