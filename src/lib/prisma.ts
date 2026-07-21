import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Etapa 1: SQLite local vía Prisma driver adapter (Prisma 7 ya no acepta
// datasource.url en runtime, requiere un adapter explícito). Cuando se
// pase a Postgres (Supabase en la Etapa 2, o el VPS más adelante), este es
// el único archivo que cambia — el resto de la app no conoce el motor de BD.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
