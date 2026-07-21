"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/authorization";
import { createUserSchema } from "@/lib/schemas";

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
