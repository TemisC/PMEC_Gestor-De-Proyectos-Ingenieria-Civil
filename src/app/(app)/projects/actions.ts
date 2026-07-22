"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import {
  canLogTimeEntry,
  canManageProject,
  canManageTimeEntry,
  toAuthProject,
} from "@/lib/authorization";
import {
  addProjectMemberSchema,
  createProjectSchema,
  deleteTimeEntrySchema,
  logTimeEntrySchema,
  removeProjectMemberSchema,
  setProjectStatusSchema,
  updateProjectSchema,
  updateTimeEntrySchema,
} from "@/lib/schemas";

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

// Etapa 4 (plan_maestro.md, sección 11): CRUD real de Proyectos y carga
// de horas. Cada acción vuelve a validar rol/pertenencia server-side —
// nunca confía en que la UI solo muestre el botón a quien corresponde
// (sección 5.2 del plan: RBAC server-side en el 100% de las mutaciones).

export async function createProject(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || session.user.role !== Role.GESTOR) {
    // Solo el Gestor crea proyectos (sección 0.1) — fail closed.
    redirect("/dashboard");
  }

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    clientId: formData.get("clientId"),
    newClientName: formData.get("newClientName"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  // Cliente global (sección 2 del plan): si se escribió un nombre nuevo,
  // se reutiliza el existente con ese nombre o se crea uno — nunca se
  // duplica por typo/mayúsculas exactas coincidentes.
  let clientId: string | null = parsed.data.clientId || null;
  if (parsed.data.newClientName) {
    const client = await prisma.client.upsert({
      where: { name: parsed.data.newClientName },
      update: {},
      create: { name: parsed.data.newClientName },
    });
    clientId = client.id;
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      clientId,
      managerId: userId,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(formData: FormData) {
  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    clientId: formData.get("clientId"),
    newClientName: formData.get("newClientName"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await assertCanManage(parsed.data.projectId);

  let clientId: string | null = parsed.data.clientId || null;
  if (parsed.data.newClientName) {
    const client = await prisma.client.upsert({
      where: { name: parsed.data.newClientName },
      update: {},
      create: { name: parsed.data.newClientName },
    });
    clientId = client.id;
  }

  await prisma.project.update({
    where: { id: parsed.data.projectId },
    data: { name: parsed.data.name, clientId },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/dashboard");
}

// Archivar/reactivar (2026-07-22): la única forma de "cerrar" un proyecto —
// soft, nunca se borra. No bloquea seguir editando/cargando horas, solo
// cambia de qué lista del dashboard aparece por default.
export async function setProjectStatus(formData: FormData) {
  const parsed = setProjectStatusSchema.safeParse({
    projectId: formData.get("projectId"),
    status: formData.get("status"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await assertCanManage(parsed.data.projectId);

  await prisma.project.update({
    where: { id: parsed.data.projectId },
    data: { status: parsed.data.status },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/dashboard");
}

export async function addProjectMember(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  const parsed = addProjectMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("memberUserId"),
  });
  if (!userId || !parsed.success) {
    throw new Error("Datos inválidos");
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    include: { members: true },
  });
  if (!project || !canManageProject({ id: userId, role: session.user.role }, toAuthProject(project))) {
    // No revelar si el proyecto existe o no a quien no tiene permiso.
    throw new Error("No autorizado");
  }

  const memberToAdd = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!memberToAdd || memberToAdd.role !== Role.COLABORADOR) {
    throw new Error("El usuario elegido no es un Colaborador válido");
  }

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: { userId: parsed.data.userId, projectId: parsed.data.projectId },
    },
    update: {},
    create: { userId: parsed.data.userId, projectId: parsed.data.projectId },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function removeProjectMember(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  const parsed = removeProjectMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("memberUserId"),
  });
  if (!userId || !parsed.success) {
    throw new Error("Datos inválidos");
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    include: { members: true },
  });
  if (!project || !canManageProject({ id: userId, role: session.user.role }, toAuthProject(project))) {
    throw new Error("No autorizado");
  }

  await prisma.projectMember.deleteMany({
    where: { projectId: parsed.data.projectId, userId: parsed.data.userId },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function logTimeEntry(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  const parsed = logTimeEntrySchema.safeParse({
    projectId: formData.get("projectId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    description: formData.get("description"),
  });
  if (!userId || !parsed.success) {
    throw new Error(parsed.success ? "No autorizado" : parsed.error.issues[0]?.message);
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    include: { members: true },
  });
  if (!project || !canLogTimeEntry({ id: userId, role: session.user.role }, toAuthProject(project))) {
    throw new Error("No autorizado");
  }

  await prisma.timeEntry.create({
    data: {
      projectId: parsed.data.projectId,
      userId,
      date: parsed.data.date,
      hours: parsed.data.hours,
      description: parsed.data.description || null,
    },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

// Corrección de horas (2026-07-22): el propio Colaborador dueño de la
// entrada, o el Gestor responsable del proyecto (canManageTimeEntry).
async function assertCanManageTimeEntry(timeEntryId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("No autorizado");

  const entry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
    include: { project: { include: { members: true } } },
  });
  if (
    !entry ||
    !canManageTimeEntry(
      { id: userId, role: session.user.role },
      toAuthProject(entry.project),
      entry.userId,
    )
  ) {
    throw new Error("No autorizado");
  }
  return entry;
}

export async function updateTimeEntry(formData: FormData) {
  const parsed = updateTimeEntrySchema.safeParse({
    timeEntryId: formData.get("timeEntryId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    description: formData.get("description"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const entry = await assertCanManageTimeEntry(parsed.data.timeEntryId);

  await prisma.timeEntry.update({
    where: { id: parsed.data.timeEntryId },
    data: {
      date: parsed.data.date,
      hours: parsed.data.hours,
      description: parsed.data.description || null,
    },
  });

  revalidatePath(`/projects/${entry.projectId}`);
}

export async function deleteTimeEntry(formData: FormData) {
  const parsed = deleteTimeEntrySchema.safeParse({
    timeEntryId: formData.get("timeEntryId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const entry = await assertCanManageTimeEntry(parsed.data.timeEntryId);

  await prisma.timeEntry.delete({ where: { id: parsed.data.timeEntryId } });

  revalidatePath(`/projects/${entry.projectId}`);
}
