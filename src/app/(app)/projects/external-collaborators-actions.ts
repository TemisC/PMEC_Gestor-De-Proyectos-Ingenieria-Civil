"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageProject, toAuthProject } from "@/lib/authorization";
import {
  addExternalAdditionalSchema,
  addExternalCollaboratorSchema,
  addExternalPaymentSchema,
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
