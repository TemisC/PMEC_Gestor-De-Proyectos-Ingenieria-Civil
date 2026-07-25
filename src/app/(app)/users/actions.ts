"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/authorization";
import {
  createUserSchema,
  deleteUserSchema,
  toggleUserActiveSchema,
  updateUserSchema,
} from "@/lib/schemas";
import { logAction } from "@/lib/audit";

export type ActionResult = { error?: string; ok?: boolean } | null;

export async function createUser(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers({ id: session.user.id, role: session.user.role })) {
    throw new Error("No autorizado");
  }

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
    defaultHourlyRate: formData.get("defaultHourlyRate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "Ya existe un usuario con ese email." };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  const newUser = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      password: hashedPassword,
      defaultHourlyRate:
        parsed.data.defaultHourlyRate === "" || parsed.data.defaultHourlyRate === undefined
          ? null
          : parsed.data.defaultHourlyRate,
    },
  });

  await logAction({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email,
    action: "user.create",
    entityType: "User",
    entityId: newUser.id,
    entityName: parsed.data.name ?? parsed.data.email,
  });

  revalidatePath("/users");
  return { ok: true };
}

async function assertCanManageUsers() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !canManageUsers({ id: userId, role: session.user.role })) {
    throw new Error("No autorizado");
  }
  return { callerId: userId, callerName: session.user.name ?? session.user.email ?? null };
}

export async function updateUser(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const { callerId, callerName } = await assertCanManageUsers();

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    defaultHourlyRate: formData.get("defaultHourlyRate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { userId, email, name, role, defaultHourlyRate } = parsed.data;

  // Un Gerencia no puede quitarse el rol a sí mismo si es el único activo
  // (quedaría sin acceso a /users). Solo aplica cuando edita su propio usuario.
  if (userId === callerId && role !== "GERENCIA") {
    const otherGerencia = await prisma.user.count({
      where: { role: "GERENCIA", active: true, NOT: { id: userId } },
    });
    if (otherGerencia === 0) {
      return { error: "No podés cambiar tu propio rol: sos el único usuario de Gerencia activo." };
    }
  }

  const conflict = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  });
  if (conflict) return { error: "Ya existe otro usuario con ese email." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      name,
      role,
      defaultHourlyRate:
        defaultHourlyRate === "" || defaultHourlyRate === undefined ? null : defaultHourlyRate,
    },
  });

  await logAction({
    userId: callerId, userName: callerName,
    action: "user.update",
    entityType: "User",
    entityId: userId,
    entityName: name ?? email,
  });

  revalidatePath("/users");
  return { ok: true };
}

export async function toggleUserActive(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const { callerId, callerName } = await assertCanManageUsers();

  const parsed = toggleUserActiveSchema.safeParse({
    userId: formData.get("userId"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { userId, active } = parsed.data;

  if (userId === callerId) {
    return { error: "No podés desactivarte a vos mismo." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });

  // Si se está desactivando a un GERENCIA, verificar que quede al menos uno activo.
  if (!active && target?.role === "GERENCIA") {
    const otherActiveGerencia = await prisma.user.count({
      where: { role: "GERENCIA", active: true, NOT: { id: userId } },
    });
    if (otherActiveGerencia === 0) {
      return { error: "No se puede desactivar: es el único usuario de Gerencia activo." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { active } });

  await logAction({
    userId: callerId, userName: callerName,
    action: active ? "user.reactivate" : "user.deactivate",
    entityType: "User",
    entityId: userId,
    entityName: target?.name ?? target?.email ?? userId,
  });

  revalidatePath("/users");
  return { ok: true };
}

export async function deleteUser(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const { callerId, callerName } = await assertCanManageUsers();

  const parsed = deleteUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { userId } = parsed.data;

  if (userId === callerId) return { error: "No podés eliminarte a vos mismo." };

  const [managed, assignments, entries] = await Promise.all([
    prisma.project.count({ where: { managerId: userId } }),
    prisma.projectMember.count({ where: { userId } }),
    prisma.timeEntry.count({ where: { userId } }),
  ]);

  if (managed + assignments + entries > 0) {
    return {
      error:
        `No se puede eliminar: tiene ${managed} proyecto${managed !== 1 ? "s" : ""} como gestor, ` +
        `${assignments} asignación${assignments !== 1 ? "es" : ""} y ` +
        `${entries} entrada${entries !== 1 ? "s" : ""} de horas.`,
    };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.user.delete({ where: { id: userId } });

  await logAction({
    userId: callerId, userName: callerName,
    action: "user.delete",
    entityType: "User",
    entityId: userId,
    entityName: target?.name ?? target?.email ?? userId,
  });

  revalidatePath("/users");
  return { ok: true };
}
