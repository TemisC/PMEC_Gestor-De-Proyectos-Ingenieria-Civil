// A diferencia de Next.js (que carga .env automáticamente), `tsx` no lo
// hace — sin esto, DATABASE_URL llega undefined y `pg` cae a localhost
// por default (ECONNREFUSED silencioso, no un error de credenciales).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// Datos de prueba para la Etapa 1 (esqueleto caminante). Usuario de demo
// para poder probar el login de punta a punta; se reemplaza por datos
// reales en etapas posteriores.
async function main() {
  const email = "demo@pmec.local";
  const password = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Usuario Demo",
      password,
    },
  });

  await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Proyecto de prueba",
      ownerId: user.id,
    },
  });

  console.log(`Seed OK — login con ${email} / demo1234`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
