# PMEC

Gestión de proyectos de ingeniería civil y arquitectura. Ver `plan_maestro.md` en la raíz del repositorio (carpeta padre) para el plan completo, roles, y alcance del MVP.

**Estado actual: Etapa 1 (sección 11 del plan) — esqueleto caminante.** Solo existen los modelos mínimos `User`/`Project` y un login básico, para probar que Prisma + Auth.js + Next.js funcionan de punta a punta. El modelo completo del MVP (roles Gerencia/Gestor/Colaborador, `TimeEntry`) se agrega en la Etapa 2.

## Cómo levantarlo en local

Requiere un `.env` (no versionado) con `DATABASE_URL`, `DIRECT_URL` (connection strings de Postgres — hoy Supabase, ver sección 8.1 de `plan_maestro.md` para la decisión de hosting final pendiente) y `AUTH_SECRET`. Pedir estos valores; nunca commitear ni compartir por chat/canales no seguros — si un secreto se comparte por error, rotarlo.

```bash
npm install
npx prisma migrate dev   # aplica el schema actual contra la base de Postgres de DATABASE_URL/DIRECT_URL
npm run db:seed          # usuario de prueba: demo@pmec.local / demo1234
npm run dev
```

Abrir http://localhost:3000 → "Ingresar" → loguearse con el usuario de prueba.

**Nota de red:** los puertos de Postgres (5432/6543) suelen estar bloqueados en redes corporativas restrictivas — si `prisma migrate`/`db:seed` tiran `ECONNREFUSED` o timeout, probar desde otra red antes de asumir un bug de configuración.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` / `npm run start` — build y arranque en modo producción.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run db:seed` — carga el usuario y proyecto de prueba.

## Notas técnicas relevantes

- **Prisma 7 + Postgres**: requiere un driver adapter explícito (`@prisma/adapter-pg`) — ver `src/lib/prisma.ts`. `DATABASE_URL` usa el pooler de Supabase en modo *transaction* (puerto 6543, para el runtime de la app); `DIRECT_URL` usa el modo *session* (puerto 5432, sin pgbouncer) solo para `prisma migrate` (`prisma.config.ts`) — el pooler en modo transaction no soporta los comandos DDL que corren las migraciones.
- **TLS con Supabase**: el pooler exige conexión cifrada; sin pasar `ssl: { rejectUnauthorized: false }` explícito al adapter, `pg` intenta conectar sin TLS y el servidor rechaza la conexión (`ECONNREFUSED`, sin pista de que el problema es TLS). Se controla con la variable `DATABASE_SSL` (default: activado; se desactiva en CI, que usa un Postgres efímero sin TLS).
- **`tsx` no carga `.env` automáticamente** (a diferencia de Next.js) — `prisma/seed.ts` importa `dotenv/config` explícitamente al principio; cualquier script nuevo que se corra con `tsx`/`node` fuera de Next.js necesita lo mismo.
- **Next.js 16**: el archivo de gateo de rutas se llama `src/proxy.ts` (Next 16 renombró `middleware` → `proxy`; corre siempre en Node.js, nunca Edge).
- **Auth.js (next-auth v5)**: sesión por JWT. El callback `session` en `src/auth.ts` propaga `user.id` explícitamente — por defecto Auth.js NO incluye el id en la sesión, y cualquier chequeo de autorización que dependa de él falla en silencio sin este callback.
- **Doble barrera de autorización**: `src/proxy.ts` (gate general por ruta) + el chequeo explícito en cada página protegida (ej. `src/app/dashboard/page.tsx`). Ninguna página protegida debe confiar solo en el proxy.
