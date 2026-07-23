import { z } from "zod";

// Zod en el 100% de los inputs (plan_maestro.md, sección 5.3) — sin
// excepciones, incluidos los del MVP.

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  // Cliente existente (select) o nombre de uno nuevo (texto) — si viene
  // texto nuevo, tiene prioridad y se crea/reutiliza ese Client global.
  clientId: z.string().optional().or(z.literal("")),
  newClientName: z.string().trim().max(200).optional().or(z.literal("")),
});

export const updateProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  clientId: z.string().optional().or(z.literal("")),
  newClientName: z.string().trim().max(200).optional().or(z.literal("")),
});

export const projectStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);

export const setProjectStatusSchema = z.object({
  projectId: z.string().min(1),
  status: projectStatusSchema,
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

export const updateTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
  date: z.coerce.date(),
  hours: z.coerce.number().positive().max(24, "No puede ser más de 24 horas por carga"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const deleteTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
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

export const updateAdditionalSchema = z.object({
  additionalId: z.string().min(1),
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  url: optionalUrl,
});

export const deleteAdditionalSchema = z.object({
  additionalId: z.string().min(1),
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

// Editar/borrar una previsión solo tiene sentido mientras no se promovió a
// factura real (invoiced === false) — una vez facturada, es un registro
// histórico; la corrección se hace sobre la Invoice, no acá.
export const updatePlannedInvoiceSchema = z.object({
  plannedInvoiceId: z.string().min(1),
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  date: z.coerce.date(),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
});

export const deletePlannedInvoiceSchema = z.object({
  plannedInvoiceId: z.string().min(1),
});

export const updateInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  date: z.coerce.date(),
  pdfUrl: optionalUrl,
});

export const deleteInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
});

export const setMemberRateSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  hourlyRate: z.coerce.number().nonnegative("La tarifa no puede ser negativa"),
});

// --- Colaboradores externos (subcontratistas — se les paga, no cargan horas) ---

export const addExternalCollaboratorSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  contact: z.string().trim().max(200).optional().or(z.literal("")),
  agreementAmount: z.coerce.number().nonnegative().optional().or(z.literal("")),
  agreementUrl: optionalUrl,
});

export const updateExternalCollaboratorSchema = z.object({
  externalCollaboratorId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  contact: z.string().trim().max(200).optional().or(z.literal("")),
  agreementAmount: z.coerce.number().nonnegative().optional().or(z.literal("")),
  agreementUrl: optionalUrl,
});

export const deleteExternalCollaboratorSchema = z.object({
  externalCollaboratorId: z.string().min(1),
});

export const addExternalAdditionalSchema = z.object({
  externalCollaboratorId: z.string().min(1),
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
});

export const updateExternalAdditionalSchema = z.object({
  externalAdditionalId: z.string().min(1),
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
});

export const deleteExternalAdditionalSchema = z.object({
  externalAdditionalId: z.string().min(1),
});

export const addExternalPaymentSchema = z.object({
  externalCollaboratorId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateExternalPaymentSchema = z.object({
  externalPaymentId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const deleteExternalPaymentSchema = z.object({
  externalPaymentId: z.string().min(1),
});

// --- Clientes (catálogo global de Deltana) ---

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || z.string().email().safeParse(v).success, "Email inválido");

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  generalContactName: z.string().trim().max(200).optional().or(z.literal("")),
  generalContactEmail: optionalEmail,
  generalContactPhone: z.string().trim().max(50).optional().or(z.literal("")),
});

export const clientContactTypeSchema = z.enum(["TECHNICAL", "ECONOMIC"]);

export const addClientContactSchema = z.object({
  clientId: z.string().min(1),
  type: clientContactTypeSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  email: optionalEmail,
  phone: z.string().trim().max(50).optional().or(z.literal("")),
});

export const updateClientSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  generalContactName: z.string().trim().max(200).optional().or(z.literal("")),
  generalContactEmail: optionalEmail,
  generalContactPhone: z.string().trim().max(50).optional().or(z.literal("")),
});

export const deleteClientSchema = z.object({
  clientId: z.string().min(1),
});

export const updateClientContactSchema = z.object({
  contactId: z.string().min(1),
  type: clientContactTypeSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  email: optionalEmail,
  phone: z.string().trim().max(50).optional().or(z.literal("")),
});

export const deleteClientContactSchema = z.object({
  contactId: z.string().min(1),
});

// --- Gestión de usuarios (Admin queda fuera del MVP, lo hace Gerencia) ---

export const roleSchema = z.enum(["GERENCIA", "GESTOR", "COLABORADOR"]);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  role: roleSchema,
  password: z.string().min(8, "Mínimo 8 caracteres"),
  defaultHourlyRate: z.coerce.number().nonnegative().optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  role: roleSchema,
  defaultHourlyRate: z.coerce.number().nonnegative().optional().or(z.literal("")),
});

export const toggleUserActiveSchema = z.object({
  userId: z.string().min(1),
  active: z
    .string()
    .transform((v) => v === "true"),
});

export const deleteUserSchema = z.object({
  userId: z.string().min(1),
});
