# PMEC

Gestión de proyectos de ingeniería civil y arquitectura. Ver `plan_maestro.md` en la raíz del repositorio (carpeta padre) para el plan completo, roles, y alcance del MVP.

**Estado actual: Etapa 1 (sección 11 del plan) — esqueleto caminante.** Solo existen los modelos mínimos `User`/`Project` y un login básico, para probar que Prisma + Auth.js + Next.js funcionan de punta a punta. El modelo completo del MVP (roles Gerencia/Gestor/Colaborador, `TimeEntry`) se agrega en la Etapa 2.

## Cómo levantarlo en local

```bash
npm install
npx prisma migrate dev   # crea prisma/dev.db (SQLite) con el schema actual
npm run db:seed          # usuario de prueba: demo@pmec.local / demo1234
npm run dev
```

Abrir http://localhost:3000 → "Ingresar" → loguearse con el usuario de prueba.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` / `npm run start` — build y arranque en modo producción.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run db:seed` — carga el usuario y proyecto de prueba.

## Notas técnicas relevantes

- **Prisma 7 + SQLite**: requiere un driver adapter explícito (`@prisma/adapter-better-sqlite3`) — ver `src/lib/prisma.ts`. Al migrar a Postgres (Supabase en la Etapa 2, o el VPS más adelante), solo cambia ese archivo y el `datasource` de `prisma/schema.prisma`.
- **Next.js 16**: el archivo de gateo de rutas se llama `src/proxy.ts` (Next 16 renombró `middleware` → `proxy`; corre siempre en Node.js, nunca Edge).
- **Auth.js (next-auth v5)**: sesión por JWT. El callback `session` en `src/auth.ts` propaga `user.id` explícitamente — por defecto Auth.js NO incluye el id en la sesión, y cualquier chequeo de autorización que dependa de él falla en silencio sin este callback.
- **Doble barrera de autorización**: `src/proxy.ts` (gate general por ruta) + el chequeo explícito en cada página protegida (ej. `src/app/dashboard/page.tsx`). Ninguna página protegida debe confiar solo en el proxy.
