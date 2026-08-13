import { z } from "zod";

// Zod en el 100% de los inputs (plan_maestro.md, sección 5.3) — sin
// excepciones, incluidos los del MVP.

// Un <input> que un <form> nunca renderiza (a diferencia de uno que se
// manda vacío) llega como `null` vía formData.get() — distinto de
// `undefined`. Zod v4 rechaza `null` en un campo `.optional()` (que solo
// acepta `undefined`) con el mensaje genérico "Invalid input", sin
// distinguir la causa (ver docs/gotchas.md, sección "Zod v4"). Reportado
// en producción 2026-08-09: varios formularios (agregar adicional, agregar
// colaborador externo, marcar factura prevista) omiten un input opcional
// del todo, y esto tumbaba la Server Action entera. Todo campo de texto
// opcional pasa por este helper para no repetir el bug en un schema nuevo.
function optionalString(max?: number) {
  const base = max ? z.string().trim().max(max) : z.string();
  return z.preprocess(
    (v) => (v === null ? undefined : v),
    base.optional().or(z.literal("")),
  );
}

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  // Cliente existente (select) o nombre de uno nuevo (texto) — si viene
  // texto nuevo, tiene prioridad y se crea/reutiliza ese Client global.
  clientId: optionalString(),
  newClientName: optionalString(200),
});

export const updateProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  clientId: optionalString(),
  newClientName: optionalString(200),
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
  description: optionalString(500),
});

export const updateTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
  date: z.coerce.date(),
  hours: z.coerce.number().positive().max(24, "No puede ser más de 24 horas por carga"),
  description: optionalString(500),
});

export const deleteTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
});

// --- Ampliación financiera (previsiones, facturas, coste interno) ---

const optionalUrl = z.preprocess(
  (v) => (v === null ? undefined : v),
  z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\//.test(v), "Tiene que ser una URL válida (http/https)"),
);

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
  // El formulario "Agregar prevista" no expone un campo `source` (no hay
  // forma de elegir Acuerdo/Adicional al cargar) — igual que optionalString,
  // `.default()` de Zod solo sustituye `undefined`, no `null`, así que el
  // campo ausente del form crasheaba la Server Action (mismo bug, ver
  // helper de arriba).
  source: z.preprocess(
    (v) => (v === null ? undefined : v),
    invoiceSourceSchema.default("AGREEMENT"),
  ),
  // Referencia opcional (plantilla/borrador) cargada desde que se crea la
  // previsión — se precarga como valor inicial al promoverla a factura
  // real (promotePlannedInvoiceSchema), editable en ese momento.
  pdfUrl: optionalUrl,
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
  pdfUrl: optionalUrl,
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

// --- Coste interno: horas proyectadas (InternalWorkRange) ---

export const addWorkRangeSchema = z.object({
  projectMemberId: z.string().min(1),
  taskName: z.string().trim().min(1, "El nombre de la tarea es obligatorio").max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  dedicationPercentage: z.coerce.number().min(0).max(100, "Tiene que ser entre 0 y 100"),
  holidaysCount: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  manualHours: z.coerce.number().nonnegative().optional().or(z.literal("")),
});

export const updateWorkRangeSchema = z.object({
  workRangeId: z.string().min(1),
  taskName: z.string().trim().min(1, "El nombre de la tarea es obligatorio").max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  dedicationPercentage: z.coerce.number().min(0).max(100, "Tiene que ser entre 0 y 100"),
  holidaysCount: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  manualHours: z.coerce.number().nonnegative().optional().or(z.literal("")),
});

export const deleteWorkRangeSchema = z.object({
  workRangeId: z.string().min(1),
});

// Importación de fichajes desde el CSV de Odoo — no pasa por FormData
// (es una Server Action "programática", llamada directo desde el cliente
// con un array ya resuelto de filas), así que no necesita null-safety de
// optionalString: el array llega tipado desde TypeScript, no desde inputs
// de un <form>.
export const importTimeEntriesSchema = z.object({
  projectId: z.string().min(1),
  entries: z
    .array(
      z.object({
        userId: z.string().min(1),
        date: z.coerce.date(),
        hours: z.coerce.number().positive().max(24, "No puede ser más de 24 horas por fila"),
      }),
    )
    .min(1, "No hay filas para importar"),
});

// --- Colaboradores externos (subcontratistas — se les paga, no cargan horas) ---

export const addExternalCollaboratorSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  company: optionalString(200),
  contact: optionalString(200),
  agreementAmount: z.coerce.number().nonnegative().optional().or(z.literal("")),
  agreementUrl: optionalUrl,
});

export const updateExternalCollaboratorSchema = z.object({
  externalCollaboratorId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  company: optionalString(200),
  contact: optionalString(200),
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
  description: optionalString(500),
});

export const updateExternalPaymentSchema = z.object({
  externalPaymentId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  description: optionalString(500),
});

export const deleteExternalPaymentSchema = z.object({
  externalPaymentId: z.string().min(1),
});

// --- Clientes (catálogo global de Deltana) ---

const optionalEmail = z.preprocess(
  (v) => (v === null ? undefined : v),
  z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Email inválido"),
);

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  generalContactName: optionalString(200),
  generalContactEmail: optionalEmail,
  generalContactPhone: optionalString(50),
});

export const clientContactTypeSchema = z.enum(["TECHNICAL", "ECONOMIC"]);

export const addClientContactSchema = z.object({
  clientId: z.string().min(1),
  type: clientContactTypeSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  email: optionalEmail,
  phone: optionalString(50),
});

export const updateClientSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  generalContactName: optionalString(200),
  generalContactEmail: optionalEmail,
  generalContactPhone: optionalString(50),
});

export const deleteClientSchema = z.object({
  clientId: z.string().min(1),
});

export const updateClientContactSchema = z.object({
  contactId: z.string().min(1),
  type: clientContactTypeSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  email: optionalEmail,
  phone: optionalString(50),
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
