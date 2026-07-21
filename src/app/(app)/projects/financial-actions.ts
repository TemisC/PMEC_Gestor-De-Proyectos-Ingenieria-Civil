"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageProject, toAuthProject } from "@/lib/authorization";
import {
  addAdditionalSchema,
  addPlannedInvoiceSchema,
  promotePlannedInvoiceSchema,
  setAgreementSchema,
  setMemberRateSchema,
} from "@/lib/schemas";

// Todo lo financiero (acuerdo, adicionales, previsión de facturación,
// tarifas) es edición exclusiva del Gestor responsable — Gerencia lo ve
// pero no lo edita (sección 2 del plan: "no edita proyectos ajenos").
// Cada acción vuelve a chequear esto server-side, nunca confía en que la
// UI oculte el formulario a quien no corresponde.

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

export async function setAgreement(formData: FormData) {
  const parsed = setAgreementSchema.safeParse({
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    offerUrl: formData.get("offerUrl"),
    contractUrl: formData.get("contractUrl"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await assertCanManage(parsed.data.projectId);

  await prisma.projectAgreement.upsert({
    where: { projectId: parsed.data.projectId },
    update: {
      amount: parsed.data.amount,
      offerUrl: parsed.data.offerUrl || null,
      contractUrl: parsed.data.contractUrl || null,
    },
    create: {
      projectId: parsed.data.projectId,
      amount: parsed.data.amount,
      offerUrl: parsed.data.offerUrl || null,
      contractUrl: parsed.data.contractUrl || null,
    },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function addAdditional(formData: FormData) {
  const parsed = addAdditionalSchema.safeParse({
    projectId: formData.get("projectId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    url: formData.get("url"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await assertCanManage(parsed.data.projectId);

  await prisma.projectAdditional.create({
    data: {
      projectId: parsed.data.projectId,
      description: parsed.data.description,
      amount: parsed.data.amount,
      url: parsed.data.url || null,
    },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function addPlannedInvoice(formData: FormData) {
  const parsed = addPlannedInvoiceSchema.safeParse({
    projectId: formData.get("projectId"),
    description: formData.get("description"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    source: formData.get("source"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await assertCanManage(parsed.data.projectId);

  await prisma.plannedInvoice.create({
    data: {
      projectId: parsed.data.projectId,
      description: parsed.data.description,
      date: parsed.data.date,
      amount: parsed.data.amount,
      source: parsed.data.source,
    },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

// "Promover" una factura prevista a factura real emitida — mismo
// concepto que el SPA original (handlePromoteToInvoice).
export async function promotePlannedInvoice(formData: FormData) {
  const parsed = promotePlannedInvoiceSchema.safeParse({
    plannedInvoiceId: formData.get("plannedInvoiceId"),
    pdfUrl: formData.get("pdfUrl"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const planned = await prisma.plannedInvoice.findUnique({
    where: { id: parsed.data.plannedInvoiceId },
  });
  if (!planned) throw new Error("No encontrada");

  await assertCanManage(planned.projectId);

  await prisma.$transaction([
    prisma.invoice.create({
      data: {
        projectId: planned.projectId,
        amount: planned.amount,
        date: planned.date,
        pdfUrl: parsed.data.pdfUrl || null,
        source: planned.source,
      },
    }),
    prisma.plannedInvoice.update({
      where: { id: planned.id },
      data: { invoiced: true },
    }),
  ]);

  revalidatePath(`/projects/${planned.projectId}`);
}

export async function setMemberRate(formData: FormData) {
  const parsed = setMemberRateSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
    hourlyRate: formData.get("hourlyRate"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await assertCanManage(parsed.data.projectId);

  await prisma.projectMember.update({
    where: {
      userId_projectId: {
        userId: parsed.data.userId,
        projectId: parsed.data.projectId,
      },
    },
    data: { hourlyRate: parsed.data.hourlyRate },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}
