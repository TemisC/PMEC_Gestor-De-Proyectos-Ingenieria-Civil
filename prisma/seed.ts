// A diferencia de Next.js (que carga .env automáticamente), `tsx` no lo
// hace — sin esto, DATABASE_URL llega undefined y `pg` cae a localhost
// por default (ECONNREFUSED silencioso, no un error de credenciales).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/generated/prisma/enums";

// Datos de prueba: un usuario por cada rol del MVP (Gerencia/Gestor/
// Colaborador — plan_maestro.md sección 0.1), y DOS proyectos con datos
// financieros para que el dashboard de Gerencia muestre un caso sano y
// un caso en riesgo (no solo un proyecto vacío) — se reemplaza por datos
// reales antes de la UAT (Etapa 10).
async function upsertDemoUser(
  email: string,
  name: string,
  role: Role,
  defaultHourlyRate?: number,
) {
  const password = await bcrypt.hash("demo1234", 12);
  return prisma.user.upsert({
    where: { email },
    update: { role, defaultHourlyRate },
    create: { email, name, password, role, defaultHourlyRate },
  });
}

async function main() {
  await upsertDemoUser("gerencia@pmec.local", "Gerencia Demo", Role.GERENCIA);
  const gestor = await upsertDemoUser(
    "gestor@pmec.local",
    "Gestor Demo",
    Role.GESTOR,
  );
  const colaborador = await upsertDemoUser(
    "colaborador@pmec.local",
    "Colaborador Demo",
    Role.COLABORADOR,
    25, // tarifa hora por defecto
  );

  // --- Proyecto 1: sano, con facturación previsional y una factura ya
  // emitida (para mostrar previsión vs. real) ---
  const project1 = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: { managerId: gestor.id },
    create: {
      id: "seed-project-1",
      name: "Proyecto de prueba",
      client: "Cliente de prueba",
      managerId: gestor.id,
    },
  });

  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: colaborador.id, projectId: project1.id } },
    update: {},
    create: { userId: colaborador.id, projectId: project1.id },
  });

  const timeEntry1 = {
    userId: colaborador.id,
    projectId: project1.id,
    date: new Date("2026-07-15"),
    hours: 40,
    description: "Relevamiento y diseño preliminar",
  };
  await prisma.timeEntry.upsert({
    where: { id: "seed-time-entry-1" },
    update: timeEntry1,
    create: { id: "seed-time-entry-1", ...timeEntry1 },
  });

  await prisma.projectAgreement.upsert({
    where: { projectId: project1.id },
    update: { amount: 20000, offerUrl: "https://example.com/oferta-1.pdf" },
    create: {
      projectId: project1.id,
      amount: 20000,
      offerUrl: "https://example.com/oferta-1.pdf",
    },
  });

  const additional1 = {
    projectId: project1.id,
    description: "Relevamiento topográfico adicional",
    amount: 2000,
  };
  await prisma.projectAdditional.upsert({
    where: { id: "seed-additional-1" },
    update: additional1,
    create: { id: "seed-additional-1", ...additional1 },
  });

  const plannedInvoice1 = {
    projectId: project1.id,
    description: "1er anticipo (50%)",
    date: new Date("2026-07-01"),
    amount: 11000,
    invoiced: true,
  };
  await prisma.plannedInvoice.upsert({
    where: { id: "seed-planned-invoice-1" },
    update: plannedInvoice1,
    create: { id: "seed-planned-invoice-1", ...plannedInvoice1 },
  });

  const invoice1 = { projectId: project1.id, amount: 11000, date: new Date("2026-07-01") };
  await prisma.invoice.upsert({
    where: { id: "seed-invoice-1" },
    update: invoice1,
    create: { id: "seed-invoice-1", ...invoice1 },
  });

  const plannedInvoice2 = {
    projectId: project1.id,
    description: "2do anticipo — entrega final (50%)",
    date: new Date("2026-09-01"),
    amount: 11000,
    invoiced: false,
  };
  await prisma.plannedInvoice.upsert({
    where: { id: "seed-planned-invoice-2" },
    update: plannedInvoice2,
    create: { id: "seed-planned-invoice-2", ...plannedInvoice2 },
  });

  const externalCollaborator1 = {
    name: "Topógrafo Externo SRL",
    company: "Topografía Beta",
    contact: "contacto@topobeta.example",
    projectId: project1.id,
    agreementAmount: 3000,
  };
  const topografo = await prisma.externalCollaborator.upsert({
    where: { id: "seed-external-collaborator-1" },
    update: externalCollaborator1,
    create: { id: "seed-external-collaborator-1", ...externalCollaborator1 },
  });

  const externalPayment1 = {
    externalCollaboratorId: topografo.id,
    amount: 1500,
    date: new Date("2026-07-10"),
    description: "Primer pago (50%)",
  };
  await prisma.externalCollaboratorPayment.upsert({
    where: { id: "seed-external-payment-1" },
    update: externalPayment1,
    create: { id: "seed-external-payment-1", ...externalPayment1 },
  });

  // --- Proyecto 2: en riesgo (coste interno ya se comió más de la
  // mitad del presupuesto) — para que el flag de riesgo del dashboard
  // se vea con datos reales, no solo en la teoría ---
  const project2 = await prisma.project.upsert({
    where: { id: "seed-project-2" },
    update: { managerId: gestor.id },
    create: {
      id: "seed-project-2",
      name: "Ampliación planta Beta",
      client: "Cliente Beta",
      managerId: gestor.id,
    },
  });

  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: colaborador.id, projectId: project2.id } },
    update: {},
    create: { userId: colaborador.id, projectId: project2.id },
  });

  const timeEntry2 = {
    userId: colaborador.id,
    projectId: project2.id,
    date: new Date("2026-07-18"),
    hours: 150,
    description: "Rediseño estructural — más horas de las previstas",
  };
  await prisma.timeEntry.upsert({
    where: { id: "seed-time-entry-2" },
    update: timeEntry2,
    create: { id: "seed-time-entry-2", ...timeEntry2 },
  });

  await prisma.projectAgreement.upsert({
    where: { projectId: project2.id },
    update: { amount: 5000 },
    create: { projectId: project2.id, amount: 5000 },
  });

  const plannedInvoice3 = {
    projectId: project2.id,
    description: "Pago único al cierre",
    date: new Date("2026-10-01"),
    amount: 5000,
    invoiced: false,
  };
  await prisma.plannedInvoice.upsert({
    where: { id: "seed-planned-invoice-3" },
    update: plannedInvoice3,
    create: { id: "seed-planned-invoice-3", ...plannedInvoice3 },
  });

  console.log("Seed OK — usuarios de prueba (password demo1234 para los 3):");
  console.log("  Gerencia:    gerencia@pmec.local");
  console.log("  Gestor:      gestor@pmec.local");
  console.log("  Colaborador: colaborador@pmec.local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
