// A diferencia de Next.js (que carga .env automáticamente), `tsx` no lo
// hace — sin esto, DATABASE_URL llega undefined y `pg` cae a localhost
// por default (ECONNREFUSED silencioso, no un error de credenciales).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/generated/prisma/enums";

// Datos de prueba para la Etapa 2 (modelo de datos del MVP): un usuario
// por cada rol del MVP (Gerencia/Gestor/Colaborador — plan_maestro.md
// sección 0.1), un proyecto con el Gestor como responsable y el
// Colaborador asignado, y una carga de horas de ejemplo. Se reemplaza
// por datos reales antes de la UAT (Etapa 10).
async function upsertDemoUser(
  email: string,
  name: string,
  role: Role,
) {
  const password = await bcrypt.hash("demo1234", 12);
  return prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, name, password, role },
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
  );

  const project = await prisma.project.upsert({
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
    where: { userId_projectId: { userId: colaborador.id, projectId: project.id } },
    update: {},
    create: { userId: colaborador.id, projectId: project.id },
  });

  await prisma.timeEntry.upsert({
    where: { id: "seed-time-entry-1" },
    update: {},
    create: {
      id: "seed-time-entry-1",
      userId: colaborador.id,
      projectId: project.id,
      date: new Date(),
      hours: 4,
      description: "Carga de horas de prueba",
    },
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
