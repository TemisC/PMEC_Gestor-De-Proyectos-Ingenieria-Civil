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

// --- Ampliación financiera (previsiones, facturas, coste interno) ---

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^https?:\/\//.test(v), "Tiene que ser una URL válida (http/https)");

export const setAgreementSchema = z.object({
  projectId: z.string().min(1),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  offerUrl: optionalUrl,
  contractUrl: optionalUrl,
});

export const addAdditionalSchema = z.object({
  projectId: z.string().min(1),
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  url: optionalUrl,
});

export const invoiceSourceSchema = z.enum(["AGREEMENT", "ADDITIONAL"]);

export const addPlannedInvoiceSchema = z.object({
  projectId: z.string().min(1),
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  date: z.coerce.date(),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  source: invoiceSourceSchema.default("AGREEMENT"),
});

export const promotePlannedInvoiceSchema = z.object({
  plannedInvoiceId: z.string().min(1),
  pdfUrl: optionalUrl,
});

export const setMemberRateSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  hourlyRate: z.coerce.number().nonnegative("La tarifa no puede ser negativa"),
});
