# Gotchas técnicos de PMEC — leer antes de tocar auth/DB/seeds/curl-testing

Next.js 16 + Prisma 7 + Auth.js v5 (beta) instalaron las versiones más nuevas
disponibles, no lo citado en `plan_maestro.md` ("Next.js 14+") — hay breaking
changes reales frente a lo que documenta el entrenamiento de un LLM. Esto es
lo que ya se pisó y se resolvió; no volver a perder tiempo en lo mismo.

## Red / conectividad a Supabase

**La red corporativa de Quanam bloquea los puertos de Postgres (5432 y 6543)
hacia afuera** — confirmado repetidas veces (2026-07-21, 2026-07-23) con
`timeout bash -c "cat < /dev/null > /dev/tcp/host/puerto"`: los puertos dan
timeout, pero DNS resuelve bien y HTTPS/443 al mismo host funciona
perfecto. Si `prisma migrate`/`db:seed`/cualquier conexión directa da
timeout o `ECONNREFUSED` persistente, **no es un bug de código** — probar
primero desde otra red (datos móviles, wifi de casa) o usar `prisma dev`
(Postgres local embebido, sin Docker) para seguir trabajando sin salir a
Supabase. Ver sección "Cómo continuar en otra máquina/red" de
`plan_maestro.md`.

## Prisma 7

- **Exige un driver adapter explícito** — `datasource.url` en
  `schema.prisma` ya no alcanza en runtime (sigue sirviendo para
  `prisma migrate` vía `prisma.config.ts`). El código de la app usa
  `@prisma/adapter-pg` (`PrismaPg`) + `pg`, ver `src/lib/prisma.ts`.
- **Dos connection strings de Supabase, no una:** `DATABASE_URL` = pooler
  modo *transaction* (puerto 6543, `?pgbouncer=true`) para el runtime de la
  app; `DIRECT_URL` = pooler modo *session* (puerto 5432, sin pgbouncer)
  solo para `prisma migrate` (`prisma.config.ts` → `datasource.url`) —
  el pooler transaction no soporta DDL.
- **TLS de Supabase:** pasar `ssl: { rejectUnauthorized: false }` como
  objeto separado en la config de `PrismaPg`. Ponerlo como `?sslmode=require`
  en la connection string NO alcanza y puede dar el error opuesto
  (`self-signed certificate in certificate chain`) si se mezcla con el
  objeto `ssl` explícito.
- **CI usa un Postgres efímero propio** (`postgres:16` en GitHub Actions),
  sin TLS — variable propia `DATABASE_SSL=false` en ese entorno.
- **Comandos destructivos (`migrate reset`, etc.) están bloqueados para
  agentes de IA** salvo consentimiento explícito del usuario, pasado por
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`. Es una guardrail correcta,
  nunca bypasearla.
- **`prisma migrate dev` (incluido `--create-only`) rechaza correr
  no-interactivo si detecta pérdida de datos** (ej. un `DROP COLUMN`).
  Workaround: escribir el SQL de la migración a mano y aplicar con
  `prisma migrate deploy` (no pide confirmación). Migraciones puramente
  aditivas (columna nueva con default) no tienen este problema y corren
  normal con `migrate dev`.

## Next.js 16

- **`middleware.ts` se renombró a `proxy.ts`** — `middleware.ts` sigue
  funcionando pero corre en Edge Runtime, donde Prisma rompe. `proxy.ts`
  corre siempre en Node.js.

## Auth.js v5

- **`session.user.id` y cualquier campo custom (`role`) NO vienen por
  defecto** — hay que agregarlos explícitamente en los callbacks
  `jwt`/`session` de `src/auth.ts` + augment de tipos en
  `src/types/next-auth.d.ts`. Sin esto, cualquier chequeo de autorización
  que dependa de `session.user.id` falla en silencio (sin error visible).
- **Cookie de sesión distinta en HTTPS/producción:**
  `__Secure-authjs.session-token` (vs. `authjs.session-token` en local sobre
  HTTP). `getToken()` en `proxy.ts` necesita `secureCookie` explícito según
  `req.nextUrl.protocol === "https:"`, no según `NODE_ENV`.

## `tsx` / scripts de mantenimiento

- **`tsx` no carga `.env` automáticamente** (a diferencia de
  `next dev`/`build`/`start`). Cualquier script corrido con
  `tsx`/`npx tsx` (seed, scripts temporales) necesita
  `import "dotenv/config";` como primera línea — si no, `DATABASE_URL`
  llega `undefined` y `pg` cae silenciosamente a `localhost:5432`
  (`ECONNREFUSED`, indistinguible a simple vista de un problema de red).
- **`prisma.upsert({ update: {}, create: {...} })` no refresca nada** en
  filas que ya existen — `update: {}` es un objeto vacío, no "poner los
  mismos valores". En cualquier seed, el `update` tiene que reflejar los
  mismos valores que `create` (guardarlos en una variable y spreadearla en
  ambos) para que reseedear sea idempotente de verdad.

## Zod v4 (no v3) — el error más común al probar Server Actions con curl

El mensaje de error por defecto para un tipo inválido es simplemente
**"Invalid input"** (v3 decía algo descriptivo como "Expected string,
received null"). Esto importa porque `formData.get("campoOpcional")`
devuelve `null` cuando el campo **no está presente en absoluto** en el
body — distinto de mandarlo vacío `""` — y `z.string().optional()` (sin
`.nullable()`) rechaza `null`. Un formulario real del navegador siempre
manda todos sus `<input>` aunque estén vacíos, así que nunca lo dispara;
un curl armado a mano que omite un campo opcional sí, y el 500 resultante
puede venir acompañado de un ruido aparte ("Missing origin header from a
forwarded Server Actions request.") que **no** es la causa real.

**Regla al armar un curl de prueba para cualquier Server Action:** incluir
siempre TODOS los campos del form, incluidos los opcionales vacíos
(`-F "campo="`) — nunca omitir un campo solo porque es opcional en el
schema Zod.

## Reglas de negocio con validación real (afectan a datos de seed/demo)

- **`TimeEntry.hours` tiene un tope de 24h por carga**
  (`logTimeEntrySchema`/`updateTimeEntrySchema`) — modela un día de
  trabajo, no un total acumulado. Cualquier dato de seed/demo que use
  `prisma.timeEntry.create` directo (bypaseando Zod) con más de 24h por
  fila **funciona al insertar pero se rompe en cuanto se intenta editar**
  (la Server Action sí valida). Si se necesita simular muchas horas
  acumuladas, usar múltiples filas de ≤24h que sumen el total deseado.
- **Editar/borrar una `PlannedInvoice` con `invoiced: true` está bloqueado
  server-side** (`updatePlannedInvoice`/`deletePlannedInvoice`) — hay que
  corregir la `Invoice` real, no la previsión que la originó.
- **Limitación de modelo conocida, no resuelta:** al borrar una `Invoice`,
  la `PlannedInvoice` que la originó (si vino de "promover") no tiene FK de
  vuelta — queda con `invoiced: true` aunque la factura ya no exista.

## Patrón de verificación end-to-end (no asumir que "compila" = funciona)

Toda Server Action nueva se prueba con curl simulando login real (POST a
`/api/auth/csrf` para obtener el token + cookie, luego POST a
`/api/auth/callback/credentials` con `email`/`password`/`csrfToken`), y
extrayendo el `$ACTION_ID_<hash>` real del HTML de la página (los forms
"plain" de progressive enhancement lo exponen como
`<input type="hidden" name="$ACTION_ID_...">`). El ACTION_ID identifica la
función, no depende de qué fila se esté editando — se puede reusar el mismo
ID cambiando el resto de los campos del form para apuntar a otra fila.
