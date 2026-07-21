import { z } from "zod";

// Zod en el 100% de los inputs (plan_maestro.md, sección 5.3) — sin
// excepciones, incluidos los del MVP.

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  client: z.string().trim().max(200).optional().or(z.literal("")),
});

export const addProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export const removeProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export const logTimeEntrySchema = z.object({
  projectId: z.string().min(1),
  date: z.coerce.date(),
  hours: z.coerce.number().positive().max(24, "No puede ser más de 24 horas por carga"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
