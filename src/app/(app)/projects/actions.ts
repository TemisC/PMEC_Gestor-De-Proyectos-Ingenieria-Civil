"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import {
  canLogTimeEntry,
  canManageProject,
  toAuthProject,
} from "@/lib/authorization";
import {
  addProjectMemberSchema,
  createProjectSchema,
  logTimeEntrySchema,
  removeProjectMemberSchema,
} from "@/lib/schemas";

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
    client: formData.get("client"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      client: parsed.data.client || null,
      managerId: userId,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
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
