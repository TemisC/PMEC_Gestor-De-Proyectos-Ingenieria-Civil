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
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/components/action-form";

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
  return { project, userId, userName: session.user.name ?? session.user.email ?? null };
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export async function setAgreement(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = setAgreementSchema.safeParse({
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    offerUrl: formData.get("offerUrl"),
    contractUrl: formData.get("contractUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { userId, userName } = await assertCanManage(parsed.data.projectId);

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

  await logAction({
    userId, userName,
    action: "agreement.set",
    entityType: "ProjectAgreement",
    entityId: parsed.data.projectId,
    entityName: money(parsed.data.amount),
    projectId: parsed.data.projectId,
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function addAdditional(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = addAdditionalSchema.safeParse({
    projectId: formData.get("projectId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    url: formData.get("url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { userId, userName } = await assertCanManage(parsed.data.projectId);

  const rec = await prisma.projectAdditional.create({
    data: {
      projectId: parsed.data.projectId,
      description: parsed.data.description,
      amount: parsed.data.amount,
      url: parsed.data.url || null,
    },
  });

  await logAction({
    userId, userName,
    action: "additional.create",
    entityType: "ProjectAdditional",
    entityId: rec.id,
    entityName: `${parsed.data.description} (${money(parsed.data.amount)})`,
    projectId: parsed.data.projectId,
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function updateAdditional(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = updateAdditionalSchema.safeParse({
    additionalId: formData.get("additionalId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    url: formData.get("url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const additional = await prisma.projectAdditional.findUnique({
    where: { id: parsed.data.additionalId },
  });
  if (!additional) throw new Error("No encontrado");
  const { userId, userName } = await assertCanManage(additional.projectId);

  await prisma.projectAdditional.update({
    where: { id: parsed.data.additionalId },
    data: {
      description: parsed.data.description,
      amount: parsed.data.amount,
      url: parsed.data.url || null,
    },
  });

  await logAction({
    userId, userName,
    action: "additional.update",
    entityType: "ProjectAdditional",
    entityId: parsed.data.additionalId,
    entityName: `${parsed.data.description} (${money(parsed.data.amount)})`,
    projectId: additional.projectId,
  });

  revalidatePath(`/projects/${additional.projectId}`);
  return { ok: true };
}

export async function deleteAdditional(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = deleteAdditionalSchema.safeParse({
    additionalId: formData.get("additionalId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const additional = await prisma.projectAdditional.findUnique({
    where: { id: parsed.data.additionalId },
  });
  if (!additional) throw new Error("No encontrado");
  const { userId, userName } = await assertCanManage(additional.projectId);

  await prisma.projectAdditional.delete({ where: { id: parsed.data.additionalId } });

  await logAction({
    userId, userName,
    action: "additional.delete",
    entityType: "ProjectAdditional",
    entityId: parsed.data.additionalId,
    entityName: `${additional.description} (${money(additional.amount)})`,
    projectId: additional.projectId,
  });

  revalidatePath(`/projects/${additional.projectId}`);
  return { ok: true };
}

export async function addPlannedInvoice(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = addPlannedInvoiceSchema.safeParse({
    projectId: formData.get("projectId"),
    description: formData.get("description"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    source: formData.get("source"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { userId, userName } = await assertCanManage(parsed.data.projectId);

  const rec = await prisma.plannedInvoice.create({
    data: {
      projectId: parsed.data.projectId,
      description: parsed.data.description,
      date: parsed.data.date,
      amount: parsed.data.amount,
      source: parsed.data.source,
    },
  });

  await logAction({
    userId, userName,
    action: "planned_invoice.create",
    entityType: "PlannedInvoice",
    entityId: rec.id,
    entityName: `${parsed.data.description} (${money(parsed.data.amount)})`,
    projectId: parsed.data.projectId,
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

// Editar/borrar una previsión solo mientras no se promovió a factura real
// (invoiced === false) — una vez facturada es un registro histórico, la
// corrección se hace sobre la Invoice (updateInvoice/deleteInvoice).
export async function updatePlannedInvoice(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = updatePlannedInvoiceSchema.safeParse({
    plannedInvoiceId: formData.get("plannedInvoiceId"),
    description: formData.get("description"),
    date: formData.get("date"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const planned = await prisma.plannedInvoice.findUnique({
    where: { id: parsed.data.plannedInvoiceId },
  });
  if (!planned) throw new Error("No encontrada");
  if (planned.invoiced) return { error: "Ya fue facturada, no se puede editar la previsión" };
  const { userId, userName } = await assertCanManage(planned.projectId);

  await prisma.plannedInvoice.update({
    where: { id: parsed.data.plannedInvoiceId },
    data: {
      description: parsed.data.description,
      date: parsed.data.date,
      amount: parsed.data.amount,
    },
  });

  await logAction({
    userId, userName,
    action: "planned_invoice.update",
    entityType: "PlannedInvoice",
    entityId: parsed.data.plannedInvoiceId,
    entityName: `${parsed.data.description} (${money(parsed.data.amount)})`,
    projectId: planned.projectId,
  });

  revalidatePath(`/projects/${planned.projectId}`);
  return { ok: true };
}

export async function deletePlannedInvoice(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = deletePlannedInvoiceSchema.safeParse({
    plannedInvoiceId: formData.get("plannedInvoiceId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const planned = await prisma.plannedInvoice.findUnique({
    where: { id: parsed.data.plannedInvoiceId },
  });
  if (!planned) throw new Error("No encontrada");
  if (planned.invoiced) return { error: "Ya fue facturada, no se puede borrar la previsión" };
  const { userId, userName } = await assertCanManage(planned.projectId);

  await prisma.plannedInvoice.delete({ where: { id: parsed.data.plannedInvoiceId } });

  await logAction({
    userId, userName,
    action: "planned_invoice.delete",
    entityType: "PlannedInvoice",
    entityId: parsed.data.plannedInvoiceId,
    entityName: `${planned.description} (${money(planned.amount)})`,
    projectId: planned.projectId,
  });

  revalidatePath(`/projects/${planned.projectId}`);
  return { ok: true };
}

export async function updateInvoice(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = updateInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    pdfUrl: formData.get("pdfUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
  if (!invoice) throw new Error("No encontrada");
  const { userId, userName } = await assertCanManage(invoice.projectId);

  await prisma.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: {
      amount: parsed.data.amount,
      date: parsed.data.date,
      pdfUrl: parsed.data.pdfUrl || null,
    },
  });

  await logAction({
    userId, userName,
    action: "invoice.update",
    entityType: "Invoice",
    entityId: parsed.data.invoiceId,
    entityName: money(parsed.data.amount),
    projectId: invoice.projectId,
  });

  revalidatePath(`/projects/${invoice.projectId}`);
  return { ok: true };
}

// Nota de limitación aceptada: la PlannedInvoice que originó esta Invoice
// (vía promotePlannedInvoice) no tiene FK de vuelta — queda marcada
// invoiced=true aunque la factura real se borre acá. Ver plan_maestro.md.
export async function deleteInvoice(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = deleteInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
  if (!invoice) throw new Error("No encontrada");
  const { userId, userName } = await assertCanManage(invoice.projectId);

  await prisma.invoice.delete({ where: { id: parsed.data.invoiceId } });

  await logAction({
    userId, userName,
    action: "invoice.delete",
    entityType: "Invoice",
    entityId: parsed.data.invoiceId,
    entityName: money(invoice.amount),
    projectId: invoice.projectId,
  });

  revalidatePath(`/projects/${invoice.projectId}`);
  return { ok: true };
}

// "Promover" una factura prevista a factura real emitida — mismo
// concepto que el SPA original (handlePromoteToInvoice).
export async function promotePlannedInvoice(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = promotePlannedInvoiceSchema.safeParse({
    plannedInvoiceId: formData.get("plannedInvoiceId"),
    pdfUrl: formData.get("pdfUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const planned = await prisma.plannedInvoice.findUnique({
    where: { id: parsed.data.plannedInvoiceId },
  });
  if (!planned) throw new Error("No encontrada");

  const { userId, userName } = await assertCanManage(planned.projectId);

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

  await logAction({
    userId, userName,
    action: "planned_invoice.promote",
    entityType: "PlannedInvoice",
    entityId: planned.id,
    entityName: `${planned.description} (${money(planned.amount)})`,
    projectId: planned.projectId,
  });

  revalidatePath(`/projects/${planned.projectId}`);
  return { ok: true };
}

export async function setMemberRate(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = setMemberRateSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
    hourlyRate: formData.get("hourlyRate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { userId, userName } = await assertCanManage(parsed.data.projectId);

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: parsed.data.userId, projectId: parsed.data.projectId } },
    include: { user: true },
  });

  await prisma.projectMember.update({
    where: {
      userId_projectId: {
        userId: parsed.data.userId,
        projectId: parsed.data.projectId,
      },
    },
    data: { hourlyRate: parsed.data.hourlyRate },
  });

  await logAction({
    userId, userName,
    action: "member.rate_update",
    entityType: "ProjectMember",
    entityId: `${parsed.data.projectId}:${parsed.data.userId}`,
    entityName: member?.user.name ?? member?.user.email ?? parsed.data.userId,
    projectId: parsed.data.projectId,
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}
