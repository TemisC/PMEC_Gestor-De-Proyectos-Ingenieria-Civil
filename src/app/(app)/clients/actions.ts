"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessClients } from "@/lib/authorization";
import {
  addClientContactSchema,
  createClientSchema,
  deleteClientContactSchema,
  deleteClientSchema,
  updateClientContactSchema,
  updateClientSchema,
} from "@/lib/schemas";

// Clientes: catálogo global (sección 2 del plan) — cualquier Gestor o
// Gerencia puede crear/editar, no está scoped a un proyecto ni a un
// Gestor en particular. Colaborador no tiene acceso (ver
// canAccessClients en authorization.ts).
async function assertCanAccessClients() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !canAccessClients({ id: userId, role: session.user.role })) {
    throw new Error("No autorizado");
  }
}

export async function createClient(formData: FormData) {
  await assertCanAccessClients();

  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    generalContactName: formData.get("generalContactName"),
    generalContactEmail: formData.get("generalContactEmail"),
    generalContactPhone: formData.get("generalContactPhone"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const existing = await prisma.client.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    throw new Error("Ya existe un cliente con ese nombre.");
  }

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      generalContactName: parsed.data.generalContactName || null,
      generalContactEmail: parsed.data.generalContactEmail || null,
      generalContactPhone: parsed.data.generalContactPhone || null,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function addClientContact(formData: FormData) {
  await assertCanAccessClients();

  const parsed = addClientContactSchema.safeParse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await prisma.clientContact.create({
    data: {
      clientId: parsed.data.clientId,
      type: parsed.data.type,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    },
  });

  revalidatePath(`/clients/${parsed.data.clientId}`);
}

export async function updateClient(formData: FormData) {
  await assertCanAccessClients();

  const parsed = updateClientSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    generalContactName: formData.get("generalContactName"),
    generalContactEmail: formData.get("generalContactEmail"),
    generalContactPhone: formData.get("generalContactPhone"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const { clientId, name, ...contact } = parsed.data;

  const conflict = await prisma.client.findFirst({
    where: { name, NOT: { id: clientId } },
  });
  if (conflict) throw new Error("Ya existe otro cliente con ese nombre.");

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name,
      generalContactName: contact.generalContactName || null,
      generalContactEmail: contact.generalContactEmail || null,
      generalContactPhone: contact.generalContactPhone || null,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteClient(formData: FormData) {
  await assertCanAccessClients();

  const parsed = deleteClientSchema.safeParse({ clientId: formData.get("clientId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const { clientId } = parsed.data;

  const projectCount = await prisma.project.count({ where: { clientId } });
  if (projectCount > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${projectCount} proyecto${projectCount > 1 ? "s" : ""} asociado${projectCount > 1 ? "s" : ""}.`,
    );
  }

  await prisma.client.delete({ where: { id: clientId } });

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientContact(formData: FormData) {
  await assertCanAccessClients();

  const parsed = updateClientContactSchema.safeParse({
    contactId: formData.get("contactId"),
    type: formData.get("type"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const { contactId, ...data } = parsed.data;
  const contact = await prisma.clientContact.update({
    where: { id: contactId },
    data: {
      type: data.type,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
    },
  });

  revalidatePath(`/clients/${contact.clientId}`);
}

export async function deleteClientContact(formData: FormData) {
  await assertCanAccessClients();

  const parsed = deleteClientContactSchema.safeParse({ contactId: formData.get("contactId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const contact = await prisma.clientContact.delete({ where: { id: parsed.data.contactId } });

  revalidatePath(`/clients/${contact.clientId}`);
}
