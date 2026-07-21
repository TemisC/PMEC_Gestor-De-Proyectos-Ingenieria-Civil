import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Postgres (Supabase) vía Prisma driver adapter (Prisma 7 ya no acepta
// datasource.url en runtime, requiere un adapter explícito). Usa
// DATABASE_URL (pooler en modo transaction, puerto 6543) — las migraciones
// de CLI usan DIRECT_URL en cambio (ver prisma.config.ts), porque el pooler
// de Supabase en modo transaction no soporta los comandos DDL que corre
// `prisma migrate`. Si el hosting final cambia (VPS con Postgres propio,
// sección 8.1 del plan), este es el único archivo que cambia.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // El pooler de Supabase requiere TLS; sin esto `pg` intenta una conexión
  // sin cifrar y el servidor la rechaza (ECONNREFUSED, no un error de auth
  // claro). `rejectUnauthorized: false` es lo que recomienda Supabase para
  // el pooler — sigue siendo tráfico cifrado, pero sin validar la cadena
  // de certificados. Pendiente explícito para la Etapa 8 (seguridad,
  // sección 5.4 del plan): fijar el CA cert de Supabase y pasar a
  // `rejectUnauthorized: true`.
  //
  // El Postgres efímero de CI (.github/workflows/ci.yml) no ofrece TLS —
  // ahí se pasa DATABASE_SSL=false explícitamente para no romper la
  // conexión pidiendo SSL a un servidor que no lo soporta.
  const useSSL = process.env.DATABASE_SSL !== "false";

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
