"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageProject, toAuthProject } from "@/lib/authorization";
import {
  addExternalAdditionalSchema,
  addExternalCollaboratorSchema,
  addExternalPaymentSchema,
  deleteExternalAdditionalSchema,
  deleteExternalCollaboratorSchema,
  deleteExternalPaymentSchema,
  updateExternalAdditionalSchema,
  updateExternalCollaboratorSchema,
  updateExternalPaymentSchema,
} from "@/lib/schemas";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/components/action-form";

// Colaboradores externos: mismo criterio que el resto de lo financiero
// (financial-actions.ts) — edición exclusiva del Gestor dueño del
// proyecto, re-chequeado server-side en cada acción.
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

async function assertCanManageViaCollaborator(externalCollaboratorId: string) {
  const collaborator = await prisma.externalCollaborator.findUnique({
    where: { id: externalCollaboratorId },
  });
  if (!collaborator) throw new Error("No encontrado");
  const caller = await assertCanManage(collaborator.projectId);
  return { collaborator, ...caller };
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export async function addExternalCollaborator(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = addExternalCollaboratorSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    company: formData.get("company"),
    contact: formData.get("contact"),
    agreementAmount: formData.get("agreementAmount"),
    agreementUrl: formData.get("agreementUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { userId, userName } = await assertCanManage(parsed.data.projectId);

  const rec = await prisma.externalCollaborator.create({
    data: {
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      company: parsed.data.company || null,
      contact: parsed.data.contact || null,
      agreementAmount:
        parsed.data.agreementAmount === "" || parsed.data.agreementAmount === undefined
          ? null
          : parsed.data.agreementAmount,
      agreementUrl: parsed.data.agreementUrl || null,
    },
  });

  await logAction({
    userId, userName,
    action: "external_collaborator.create",
    entityType: "ExternalCollaborator",
    entityId: rec.id,
    entityName: parsed.data.name,
    projectId: parsed.data.projectId,
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function updateExternalCollaborator(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateExternalCollaboratorSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
    name: formData.get("name"),
    company: formData.get("company"),
    contact: formData.get("contact"),
    agreementAmount: formData.get("agreementAmount"),
    agreementUrl: formData.get("agreementUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(
    parsed.data.externalCollaboratorId,
  );

  await prisma.externalCollaborator.update({
    where: { id: parsed.data.externalCollaboratorId },
    data: {
      name: parsed.data.name,
      company: parsed.data.company || null,
      contact: parsed.data.contact || null,
      agreementAmount:
        parsed.data.agreementAmount === "" || parsed.data.agreementAmount === undefined
          ? null
          : parsed.data.agreementAmount,
      agreementUrl: parsed.data.agreementUrl || null,
    },
  });

  await logAction({
    userId, userName,
    action: "external_collaborator.update",
    entityType: "ExternalCollaborator",
    entityId: parsed.data.externalCollaboratorId,
    entityName: parsed.data.name,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}

// Borra también sus adicionales/pagos (no hay onDelete: Cascade en el
// schema) — en una sola transacción para no dejar registros huérfanos si
// algo falla a mitad de camino.
export async function deleteExternalCollaborator(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = deleteExternalCollaboratorSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(
    parsed.data.externalCollaboratorId,
  );

  await prisma.$transaction([
    prisma.externalCollaboratorPayment.deleteMany({
      where: { externalCollaboratorId: parsed.data.externalCollaboratorId },
    }),
    prisma.externalCollaboratorAdditional.deleteMany({
      where: { externalCollaboratorId: parsed.data.externalCollaboratorId },
    }),
    prisma.externalCollaborator.delete({
      where: { id: parsed.data.externalCollaboratorId },
    }),
  ]);

  await logAction({
    userId, userName,
    action: "external_collaborator.delete",
    entityType: "ExternalCollaborator",
    entityId: parsed.data.externalCollaboratorId,
    entityName: collaborator.name,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}

export async function addExternalAdditional(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = addExternalAdditionalSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(
    parsed.data.externalCollaboratorId,
  );

  const rec = await prisma.externalCollaboratorAdditional.create({
    data: {
      externalCollaboratorId: parsed.data.externalCollaboratorId,
      description: parsed.data.description,
      amount: parsed.data.amount,
    },
  });

  await logAction({
    userId, userName,
    action: "ext_additional.create",
    entityType: "ExternalCollaboratorAdditional",
    entityId: rec.id,
    entityName: `${collaborator.name} — ${parsed.data.description} (${money(parsed.data.amount)})`,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}

export async function updateExternalAdditional(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateExternalAdditionalSchema.safeParse({
    externalAdditionalId: formData.get("externalAdditionalId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const additional = await prisma.externalCollaboratorAdditional.findUnique({
    where: { id: parsed.data.externalAdditionalId },
  });
  if (!additional) throw new Error("No encontrado");
  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(additional.externalCollaboratorId);

  await prisma.externalCollaboratorAdditional.update({
    where: { id: parsed.data.externalAdditionalId },
    data: { description: parsed.data.description, amount: parsed.data.amount },
  });

  await logAction({
    userId, userName,
    action: "ext_additional.update",
    entityType: "ExternalCollaboratorAdditional",
    entityId: parsed.data.externalAdditionalId,
    entityName: `${collaborator.name} — ${parsed.data.description} (${money(parsed.data.amount)})`,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}

export async function deleteExternalAdditional(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = deleteExternalAdditionalSchema.safeParse({
    externalAdditionalId: formData.get("externalAdditionalId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const additional = await prisma.externalCollaboratorAdditional.findUnique({
    where: { id: parsed.data.externalAdditionalId },
  });
  if (!additional) throw new Error("No encontrado");
  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(additional.externalCollaboratorId);

  await prisma.externalCollaboratorAdditional.delete({
    where: { id: parsed.data.externalAdditionalId },
  });

  await logAction({
    userId, userName,
    action: "ext_additional.delete",
    entityType: "ExternalCollaboratorAdditional",
    entityId: parsed.data.externalAdditionalId,
    entityName: `${collaborator.name} — ${additional.description} (${money(additional.amount)})`,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}

export async function addExternalPayment(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = addExternalPaymentSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(
    parsed.data.externalCollaboratorId,
  );

  const rec = await prisma.externalCollaboratorPayment.create({
    data: {
      externalCollaboratorId: parsed.data.externalCollaboratorId,
      date: parsed.data.date,
      amount: parsed.data.amount,
      description: parsed.data.description || null,
    },
  });

  await logAction({
    userId, userName,
    action: "ext_payment.create",
    entityType: "ExternalCollaboratorPayment",
    entityId: rec.id,
    entityName: `${collaborator.name} — ${money(parsed.data.amount)}`,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}

export async function updateExternalPayment(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateExternalPaymentSchema.safeParse({
    externalPaymentId: formData.get("externalPaymentId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const payment = await prisma.externalCollaboratorPayment.findUnique({
    where: { id: parsed.data.externalPaymentId },
  });
  if (!payment) throw new Error("No encontrado");
  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(payment.externalCollaboratorId);

  await prisma.externalCollaboratorPayment.update({
    where: { id: parsed.data.externalPaymentId },
    data: {
      date: parsed.data.date,
      amount: parsed.data.amount,
      description: parsed.data.description || null,
    },
  });

  await logAction({
    userId, userName,
    action: "ext_payment.update",
    entityType: "ExternalCollaboratorPayment",
    entityId: parsed.data.externalPaymentId,
    entityName: `${collaborator.name} — ${money(parsed.data.amount)}`,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}

export async function deleteExternalPayment(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = deleteExternalPaymentSchema.safeParse({
    externalPaymentId: formData.get("externalPaymentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const payment = await prisma.externalCollaboratorPayment.findUnique({
    where: { id: parsed.data.externalPaymentId },
  });
  if (!payment) throw new Error("No encontrado");
  const { collaborator, userId, userName } = await assertCanManageViaCollaborator(payment.externalCollaboratorId);

  await prisma.externalCollaboratorPayment.delete({
    where: { id: parsed.data.externalPaymentId },
  });

  await logAction({
    userId, userName,
    action: "ext_payment.delete",
    entityType: "ExternalCollaboratorPayment",
    entityId: parsed.data.externalPaymentId,
    entityName: `${collaborator.name} — ${money(payment.amount)}`,
    projectId: collaborator.projectId,
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
  return { ok: true };
}
