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
  return project;
}

async function assertCanManageViaCollaborator(externalCollaboratorId: string) {
  const collaborator = await prisma.externalCollaborator.findUnique({
    where: { id: externalCollaboratorId },
  });
  if (!collaborator) throw new Error("No encontrado");
  await assertCanManage(collaborator.projectId);
  return collaborator;
}

export async function addExternalCollaborator(formData: FormData) {
  const parsed = addExternalCollaboratorSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    company: formData.get("company"),
    contact: formData.get("contact"),
    agreementAmount: formData.get("agreementAmount"),
    agreementUrl: formData.get("agreementUrl"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await assertCanManage(parsed.data.projectId);

  await prisma.externalCollaborator.create({
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

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function updateExternalCollaborator(formData: FormData) {
  const parsed = updateExternalCollaboratorSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
    name: formData.get("name"),
    company: formData.get("company"),
    contact: formData.get("contact"),
    agreementAmount: formData.get("agreementAmount"),
    agreementUrl: formData.get("agreementUrl"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const collaborator = await assertCanManageViaCollaborator(
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

  revalidatePath(`/projects/${collaborator.projectId}`);
}

// Borra también sus adicionales/pagos (no hay onDelete: Cascade en el
// schema) — en una sola transacción para no dejar registros huérfanos si
// algo falla a mitad de camino.
export async function deleteExternalCollaborator(formData: FormData) {
  const parsed = deleteExternalCollaboratorSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const collaborator = await assertCanManageViaCollaborator(
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

  revalidatePath(`/projects/${collaborator.projectId}`);
}

export async function addExternalAdditional(formData: FormData) {
  const parsed = addExternalAdditionalSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const collaborator = await assertCanManageViaCollaborator(
    parsed.data.externalCollaboratorId,
  );

  await prisma.externalCollaboratorAdditional.create({
    data: {
      externalCollaboratorId: parsed.data.externalCollaboratorId,
      description: parsed.data.description,
      amount: parsed.data.amount,
    },
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
}

export async function updateExternalAdditional(formData: FormData) {
  const parsed = updateExternalAdditionalSchema.safeParse({
    externalAdditionalId: formData.get("externalAdditionalId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const additional = await prisma.externalCollaboratorAdditional.findUnique({
    where: { id: parsed.data.externalAdditionalId },
  });
  if (!additional) throw new Error("No encontrado");
  const collaborator = await assertCanManageViaCollaborator(additional.externalCollaboratorId);

  await prisma.externalCollaboratorAdditional.update({
    where: { id: parsed.data.externalAdditionalId },
    data: { description: parsed.data.description, amount: parsed.data.amount },
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
}

export async function deleteExternalAdditional(formData: FormData) {
  const parsed = deleteExternalAdditionalSchema.safeParse({
    externalAdditionalId: formData.get("externalAdditionalId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const additional = await prisma.externalCollaboratorAdditional.findUnique({
    where: { id: parsed.data.externalAdditionalId },
  });
  if (!additional) throw new Error("No encontrado");
  const collaborator = await assertCanManageViaCollaborator(additional.externalCollaboratorId);

  await prisma.externalCollaboratorAdditional.delete({
    where: { id: parsed.data.externalAdditionalId },
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
}

export async function addExternalPayment(formData: FormData) {
  const parsed = addExternalPaymentSchema.safeParse({
    externalCollaboratorId: formData.get("externalCollaboratorId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const collaborator = await assertCanManageViaCollaborator(
    parsed.data.externalCollaboratorId,
  );

  await prisma.externalCollaboratorPayment.create({
    data: {
      externalCollaboratorId: parsed.data.externalCollaboratorId,
      date: parsed.data.date,
      amount: parsed.data.amount,
      description: parsed.data.description || null,
    },
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
}

export async function updateExternalPayment(formData: FormData) {
  const parsed = updateExternalPaymentSchema.safeParse({
    externalPaymentId: formData.get("externalPaymentId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const payment = await prisma.externalCollaboratorPayment.findUnique({
    where: { id: parsed.data.externalPaymentId },
  });
  if (!payment) throw new Error("No encontrado");
  const collaborator = await assertCanManageViaCollaborator(payment.externalCollaboratorId);

  await prisma.externalCollaboratorPayment.update({
    where: { id: parsed.data.externalPaymentId },
    data: {
      date: parsed.data.date,
      amount: parsed.data.amount,
      description: parsed.data.description || null,
    },
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
}

export async function deleteExternalPayment(formData: FormData) {
  const parsed = deleteExternalPaymentSchema.safeParse({
    externalPaymentId: formData.get("externalPaymentId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const payment = await prisma.externalCollaboratorPayment.findUnique({
    where: { id: parsed.data.externalPaymentId },
  });
  if (!payment) throw new Error("No encontrado");
  const collaborator = await assertCanManageViaCollaborator(payment.externalCollaboratorId);

  await prisma.externalCollaboratorPayment.delete({
    where: { id: parsed.data.externalPaymentId },
  });

  revalidatePath(`/projects/${collaborator.projectId}`);
}
