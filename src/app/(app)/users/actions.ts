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

// Admin queda fuera del alcance del MVP (sección 0.1 del plan) —
// Gerencia asume esta función mínima mientras tanto. Re-chequea el rol
// server-side (nunca confía en que la UI oculte el formulario).
//
// Acción simple (no useActionState) por consistencia con el resto de
// las Server Actions del proyecto (createProject, logTimeEntry, etc.) —
// todas se validan de la misma forma vía curl/tests de integración.
export async function createUser(formData: FormData) {
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
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    throw new Error("Ya existe un usuario con ese email.");
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
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

  revalidatePath("/users");
}

async function assertCanManageUsers() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !canManageUsers({ id: userId, role: session.user.role })) {
    throw new Error("No autorizado");
  }
  return userId;
}

export async function updateUser(formData: FormData) {
  const callerId = await assertCanManageUsers();

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    defaultHourlyRate: formData.get("defaultHourlyRate"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const { userId, email, name, role, defaultHourlyRate } = parsed.data;

  // Un Gerencia no puede quitarse el rol a sí mismo si es el único activo
  // (quedaría sin acceso a /users). Solo aplica cuando edita su propio usuario.
  if (userId === callerId && role !== "GERENCIA") {
    const otherGerencia = await prisma.user.count({
      where: { role: "GERENCIA", active: true, NOT: { id: userId } },
    });
    if (otherGerencia === 0) {
      throw new Error(
        "No podés cambiar tu propio rol: sos el único usuario de Gerencia activo.",
      );
    }
  }

  const conflict = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  });
  if (conflict) throw new Error("Ya existe otro usuario con ese email.");

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

  revalidatePath("/users");
}

export async function toggleUserActive(formData: FormData) {
  const callerId = await assertCanManageUsers();

  const parsed = toggleUserActiveSchema.safeParse({
    userId: formData.get("userId"),
    active: formData.get("active"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const { userId, active } = parsed.data;

  if (userId === callerId) {
    throw new Error("No podés desactivarte a vos mismo.");
  }

  // Si se está desactivando a un GERENCIA, verificar que quede al menos uno activo.
  if (!active) {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (target?.role === "GERENCIA") {
      const otherActiveGerencia = await prisma.user.count({
        where: { role: "GERENCIA", active: true, NOT: { id: userId } },
      });
      if (otherActiveGerencia === 0) {
        throw new Error(
          "No se puede desactivar: es el único usuario de Gerencia activo.",
        );
      }
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/users");
}

export async function deleteUser(formData: FormData) {
  const callerId = await assertCanManageUsers();

  const parsed = deleteUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const { userId } = parsed.data;

  if (userId === callerId) throw new Error("No podés eliminarte a vos mismo.");

  const [managed, assignments, entries] = await Promise.all([
    prisma.project.count({ where: { managerId: userId } }),
    prisma.projectMember.count({ where: { userId } }),
    prisma.timeEntry.count({ where: { userId } }),
  ]);

  if (managed + assignments + entries > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${managed} proyecto${managed !== 1 ? "s" : ""} como gestor, ` +
        `${assignments} asignación${assignments !== 1 ? "es" : ""} y ` +
        `${entries} entrada${entries !== 1 ? "s" : ""} de horas.`,
    );
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/users");
}
