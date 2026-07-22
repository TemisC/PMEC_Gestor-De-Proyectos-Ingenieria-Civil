"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageProject, toAuthProject } from "@/lib/authorization";
import {
  addAdditionalSchema,
  addPlannedInvoiceSchema,
  deleteAdditionalSchema,
  deleteInvoiceSchema,
  deletePlannedInvoiceSchema,
  promotePlannedInvoiceSchema,
  setAgreementSchema,
  setMemberRateSchema,
  updateAdditionalSchema,
  updateInvoiceSchema,
  updatePlannedInvoiceSchema,
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

export async function updateAdditional(formData: FormData) {
  const parsed = updateAdditionalSchema.safeParse({
    additionalId: formData.get("additionalId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    url: formData.get("url"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const additional = await prisma.projectAdditional.findUnique({
    where: { id: parsed.data.additionalId },
  });
  if (!additional) throw new Error("No encontrado");
  await assertCanManage(additional.projectId);

  await prisma.projectAdditional.update({
    where: { id: parsed.data.additionalId },
    data: {
      description: parsed.data.description,
      amount: parsed.data.amount,
      url: parsed.data.url || null,
    },
  });

  revalidatePath(`/projects/${additional.projectId}`);
}

export async function deleteAdditional(formData: FormData) {
  const parsed = deleteAdditionalSchema.safeParse({
    additionalId: formData.get("additionalId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const additional = await prisma.projectAdditional.findUnique({
    where: { id: parsed.data.additionalId },
  });
  if (!additional) throw new Error("No encontrado");
  await assertCanManage(additional.projectId);

  await prisma.projectAdditional.delete({ where: { id: parsed.data.additionalId } });

  revalidatePath(`/projects/${additional.projectId}`);
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

// Editar/borrar una previsión solo mientras no se promovió a factura real
// (invoiced === false) — una vez facturada es un registro histórico, la
// corrección se hace sobre la Invoice (updateInvoice/deleteInvoice).
export async function updatePlannedInvoice(formData: FormData) {
  const parsed = updatePlannedInvoiceSchema.safeParse({
    plannedInvoiceId: formData.get("plannedInvoiceId"),
    description: formData.get("description"),
    date: formData.get("date"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const planned = await prisma.plannedInvoice.findUnique({
    where: { id: parsed.data.plannedInvoiceId },
  });
  if (!planned) throw new Error("No encontrada");
  if (planned.invoiced) throw new Error("Ya fue facturada, no se puede editar la previsión");
  await assertCanManage(planned.projectId);

  await prisma.plannedInvoice.update({
    where: { id: parsed.data.plannedInvoiceId },
    data: {
      description: parsed.data.description,
      date: parsed.data.date,
      amount: parsed.data.amount,
    },
  });

  revalidatePath(`/projects/${planned.projectId}`);
}

export async function deletePlannedInvoice(formData: FormData) {
  const parsed = deletePlannedInvoiceSchema.safeParse({
    plannedInvoiceId: formData.get("plannedInvoiceId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const planned = await prisma.plannedInvoice.findUnique({
    where: { id: parsed.data.plannedInvoiceId },
  });
  if (!planned) throw new Error("No encontrada");
  if (planned.invoiced) throw new Error("Ya fue facturada, no se puede borrar la previsión");
  await assertCanManage(planned.projectId);

  await prisma.plannedInvoice.delete({ where: { id: parsed.data.plannedInvoiceId } });

  revalidatePath(`/projects/${planned.projectId}`);
}

export async function updateInvoice(formData: FormData) {
  const parsed = updateInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    pdfUrl: formData.get("pdfUrl"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
  if (!invoice) throw new Error("No encontrada");
  await assertCanManage(invoice.projectId);

  await prisma.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: {
      amount: parsed.data.amount,
      date: parsed.data.date,
      pdfUrl: parsed.data.pdfUrl || null,
    },
  });

  revalidatePath(`/projects/${invoice.projectId}`);
}

// Nota de limitación aceptada: la PlannedInvoice que originó esta Invoice
// (vía promotePlannedInvoice) no tiene FK de vuelta — queda marcada
// invoiced=true aunque la factura real se borre acá. Ver plan_maestro.md.
export async function deleteInvoice(formData: FormData) {
  const parsed = deleteInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
  if (!invoice) throw new Error("No encontrada");
  await assertCanManage(invoice.projectId);

  await prisma.invoice.delete({ where: { id: parsed.data.invoiceId } });

  revalidatePath(`/projects/${invoice.projectId}`);
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
