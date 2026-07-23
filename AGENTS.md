<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Antes de tocar auth/DB/seeds o probar Server Actions con curl

Leer `docs/gotchas.md` y `plan_maestro.md` (raíz del repo) — tienen bugs
reales ya resueltos (Prisma 7 driver adapter, cookies de Auth.js, límite de
24h en `TimeEntry`, el gotcha de Zod v4 al probar con curl) y el estado
exacto del proyecto con el próximo paso a seguir.
