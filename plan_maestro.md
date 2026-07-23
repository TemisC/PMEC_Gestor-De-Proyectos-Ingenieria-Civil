# Plan Maestro — Evolución de PMEC

## 🖥️ Cómo continuar en otra máquina / otra red

Si estás retomando este proyecto en una computadora distinta — por ejemplo
porque la red actual bloquea los puertos de Postgres hacia Supabase (pasó
con la red corporativa de Quanam, ver `docs/gotchas.md`) — esto es lo que
hace falta para arrancar de cero:

1. **Clonar el repo:**
   `git clone https://github.com/TemisC/PMEC_Gestor-De-Proyectos-Ingenieria-Civil.git`
   (rama `main`). Este mismo archivo (`plan_maestro.md`) y `docs/gotchas.md`
   viajan con el clone — son la fuente de verdad portable del estado del
   proyecto y de los bugs ya resueltos, no dependen de memoria de ninguna
   sesión de IA en particular.
2. **Crear `.env` en la raíz de `pmec/`** (no está en git — `.gitignore` lo
   excluye a propósito, nunca pegarlo en un chat ni commitearlo). Variables
   necesarias, valores reales a sacar del dashboard de Supabase (Project
   Settings → Database) o de donde el usuario los tenga guardados:
   - `DATABASE_URL` — pooler modo *transaction*, puerto **6543**, con
     `?pgbouncer=true` al final.
   - `DIRECT_URL` — pooler modo *session*, puerto **5432**, sin
     `pgbouncer`.
   - `AUTH_SECRET` — secreto de Auth.js (`npx auth secret` genera uno).
   - Revisar `src/lib/prisma.ts` y `src/auth.ts` por si se agregó alguna
     variable nueva que no esté listada acá.
3. **Instalar y verificar que todo funciona:**
   ```
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm run typecheck && npm run lint && npm run test && npm run build
   ```
4. **Credenciales de prueba** (password `demo1234` para los 3):
   `gerencia@pmec.local`, `gestor@pmec.local`, `colaborador@pmec.local`.
5. **Estado exacto y próximo paso:** ver la nota "Corte del [fecha]" al
   principio de la sección 0.1, un poco más abajo — ahí está lo último que
   se cerró y lo que sigue.

Si los puertos de Postgres siguen bloqueados incluso en la red nueva, la
alternativa es `npx prisma dev` (Postgres local embebido, sin Docker) —
ver `docs/gotchas.md`.

---

**Versión:** 1.7 (+ reconciliación v1.9 de seguridad)
**Fecha:** 2026-07-15 (arranque de desarrollo — MVP priorizado), reconciliado el 2026-07-20
**Estado:** 🟢 En desarrollo — MVP en curso

> **Cambio respecto a v1.0:** se reemplaza el hosting gestionado (Vercel + Supabase como proveedor de base de datos) por un **VPS propio en Hostinger** para la app y la base de datos. Supabase queda reservado únicamente como futuro proveedor de **Auth/Storage** (a integrar más adelante, no ahora). Además, se define una **estrategia de desarrollo 100% local sin infraestructura** para poder seguir mejorando la app antes de tener el VPS o Supabase configurados. Ver secciones 3, 3.1 y 5.
>
> **Nota v1.2:** la elección entre VPS propio (Hostinger) e infraestructura gestionada (Vercel/Supabase pago) **quedó marcada como decisión pendiente, no cerrada**. Ver sección 8.1 para el análisis de trade-offs y sección 8.2 para el checklist de mantenimiento que implicaría optar por el VPS. Esta duda no bloquea el desarrollo (Fases 0-9), pero debe resolverse antes de la Fase 10.
>
> **Nota v1.3:** el proyecto se renombra de "Vicent PM" a **PMEC**. El cambio es solo de nombre — no afecta ninguna decisión técnica, de arquitectura ni de negocio ya tomada en versiones anteriores.
>
> **Nota v1.4:** se confirma que PMEC va a necesitar conectarse a un Odoo existente (leer información y subir información procesada). La conexión en sí **queda para más adelante** (ver sección 8.3, alcance sin definir todavía), pero la arquitectura se ajusta **desde ahora** para que esa integración se pueda sumar sin rediseñar el backend ni el modelo de datos. Ver secciones 3.2, 4 (tablas `IntegrationCredential` y `SyncLog`), 5 y 7 (Fase 4 y nueva Fase 12).
>
> **Nota v1.5:** se confirmó, mediante consulta directa a la API sin autenticación (`common.version`), que el Odoo de la empresa es **versión 18.0 Enterprise**, alojado como **Odoo Online (SaaS)** — no un servidor propio de Deltana. Esto define el protocolo de integración (JSON-RPC/XML-RPC clásico, ver sección 8.3, punto 2). Sigue pendiente confirmar si el plan contratado habilita la API externa.
>
> **Nota v1.6:** se agrega una **estimación de horas y presupuesto** para la Etapa 1 (sección 10), ajustada a un techo de 250 h con seguridad reforzada, y una **guía de etapas de desarrollo** (sección 11) pensada para ejecutarse paso a paso en un IDE con un agente de IA (Claude Code o similar). Esta sección **asume Vercel + Supabase como hosting** para simplificar la estimación — recordar que esto sigue siendo una variante frente a la decisión pendiente de la sección 8.1 (VPS Hostinger vs. gestionado), no un cambio de decisión definitivo.
>
> **Nota v1.7 — 🟢 ARRANCA EL DESARROLLO:** se define un **MVP mínimo prioritario** (sección 0.1), a construir de inmediato, hosteado en **Vercel + Supabase (tiers gratuitos)** para tener algo tangible que mostrarle a Deltana para aprobación antes de seguir invirtiendo horas en el resto del alcance. Este MVP acota el alcance completo de la sección 2 (roles) y la sección 4 (dominio) a lo estrictamente necesario para una primera demo funcional. La decisión de hosting final (sección 8.1) y la integración con Odoo (sección 8.3) **siguen sin resolverse y no bloquean este arranque.**
>
> **Nota v1.9 (2026-07-20) — reconciliación de seguridad con el MVP:** en la revisión anterior de este plan se había elevado el estándar de seguridad a OWASP ASVS Nivel 2 con controles obligatorios (MFA en los 3 roles, cifrado de campo, pentest externo, `audit_log` append-only, etc.). Esta versión del documento retoma el foco en el MVP (sección 0.1) y **no aplica ese checklist completo todavía** — decisión deliberada, no una regresión accidental: el MVP no maneja datos financieros (sección 0.1 lo excluye explícitamente), así que los controles más costosos (MFA, cifrado de campo, pentest, auditoría append-only) no tienen todavía qué proteger y se posponen sin riesgo real. Sí se mantienen, porque son baratos y de alto impacto, y porque Auth/RBAC **es** el corazón de lo que hay que demostrarle a Deltana: Zod en el 100% de los inputs, tests de autorización como gate bloqueante en CI, hashing de contraseñas con Argon2id/bcrypt (nunca texto plano), y escaneo de dependencias desde el primer commit. **El estándar ASVS Nivel 2 completo (sección 5) sigue vigente como objetivo — se retoma en la Etapa 5 en adelante (sección 11), en cuanto entren datos financieros reales al alcance.** No reabrir esta decisión sin que cambie el alcance del MVP.
>
> **Nota v1.10 (2026-07-21) — el MVP mínimo no alcanzaba, se adelanta la lógica financiera:** al mostrar el MVP acotado (solo `User`/`Project`/`TimeEntry`), se determinó que **no era lo bastante contundente para Gerencia** — faltaba justo lo que más le importa: previsión de cobro y rentabilidad, el pedido de negocio original de este proyecto. Se decidió adelantar esa lógica (Etapas 5/6 de la sección 11) en vez de esperar la aprobación formal del MVP mínimo. Se agregó: `ProjectAgreement`, `ProjectAdditional`, `PlannedInvoice`, `Invoice`, tarifa hora interna (`ProjectMember.hourlyRate`/`User.defaultHourlyRate`), y un módulo de cálculo de rentabilidad (`src/lib/financials.ts`, con tests) portado fielmente del SPA original. El dashboard de Gerencia y Gestor ya muestra el % de rentabilidad de cada proyecto con flag de riesgo (margen < 50%). **Esto NO resuelve la Etapa 0** (validación de las fórmulas con quien las diseñó, con ejemplos numéricos reales) — se porta la lógica interpretando el código fuente del SPA original como fuente de verdad, riesgo aceptado y ya documentado desde la Nota v1.7, que ahora se vuelve más relevante porque hay números financieros reales en pantalla. Sigue siendo prioritario recuperar esa validación antes de presentar estos números como definitivos ante Deltana (a más tardar, antes de la Etapa 10/UAT).

---

## 0. Resumen ejecutivo

PMEC nació como una SPA local (React + Vite, sin backend, datos en `localStorage`) para gestionar proyectos de ingeniería civil/arquitectura: proyectos, clientes, colaboradores externos, equipo interno, previsiones de cobro/pago y rentabilidad. Funciona y su lógica de negocio — en particular cómo se proyectan cobros y pagos fase a fase para saber si un proyecto va a ser rentable **antes** de que cierre — está bien pensada y validada por quien la diseñó. **No se reescribe esa lógica: se migra, se blinda y se potencia.**

El objetivo de esta siguiente etapa es transformarla en una aplicación web real:
- con **persistencia en base de datos** (hoy vive en el navegador de cada uno, sin respaldo real),
- con **varios consultores trabajando en paralelo**, cada uno con sus propios proyectos,
- con **jerarquía de roles** (Presidencia/Gerencia, Administradores, Gestores de proyecto),
- **hosteada en un dominio propio, sobre infraestructura gestionada de bajo costo**, y
- con un **nivel de seguridad acorde a información financiera sensible**.

Decisiones ya acordadas con el usuario (no reabrir salvo que cambien las condiciones del negocio):
1. **No es un SaaS multi-empresa.** Es una sola organización (**Deltana**, la empresa de ingeniería) con múltiples consultores internos. El "aislamiento" es entre consultores dentro de la misma empresa, no entre empresas distintas.
2. **Hosting:** infraestructura gestionada/serverless (Vercel + Postgres gestionado), no servidor propio ni cloud empresarial complejo — al menos para el MVP (sección 0.1); la decisión de hosting final sigue abierta (sección 8.1).
3. **Presupuesto:** priorizar tiers gratuitos/económicos al inicio, escalar el gasto solo cuando haya uso real.

---

## 0.1 🟢 MVP prioritario — a construir de inmediato

**Estado: EN CURSO. Esto es lo que se está desarrollando ahora mismo, por delante de cualquier otra sección de este documento.**

> **Corte del 2026-07-22 (fin de jornada) — estado real, para retomar mañana:** el alcance ya superó ampliamente el MVP mínimo original (sección 0.1) por decisión explícita del usuario ("continuemos todo, hasta tener una app 100% funcional"). Ver Nota v1.10 más abajo. **Lo que ya está construido, verificado con curl end-to-end, y desplegado en producción (Vercel+Supabase):**
> - Etapas 1-4 completas (login, roles, RBAC con 43 tests bloqueantes en CI, CRUD de Proyectos/horas).
> - Lógica financiera completa: acuerdo, adicionales, previsión de facturación (con promoción a factura real), coste interno (horas × tarifa), **colaboradores externos con pagos reales** (coste externo), rentabilidad/margen con alerta de riesgo.
> - Gestión de usuarios reales (`/users`, Gerencia) — ya no depende solo del seed.
> - Diseño visual completo (tema oscuro/sidebar/tarjetas, igual que el SPA original).
> - **Cliente como entidad completa** (`/clients`, `/clients/[id]`): catálogo global de Deltana (no scoped a un Gestor — cualquier Gestor ve/usa todos los clientes, coherente con "catálogos compartidos" de la sección 2), con contactos técnico/económico (`ClientContact`) y datos existentes migrados sin pérdida (cada valor distinto que había en el viejo `Project.client` de texto libre se convirtió en un `Client` real). Acceso vía `canAccessClients` (Gestor + Gerencia, no Colaborador).
> - **3 proyectos de demo con casos de rentabilidad reales** (mismo cliente "Inversiones Pampa S.A.", mismo Gestor): Pavimentación Ruta Provincial 45 (66.7%, sano), Construcción vivienda unifamiliar Los Aromos (-11.1%, en pérdida), Torre Belgrano — estructura de acero 15 pisos (0.6%, al límite) — para que el dashboard de Gerencia muestre contraste real, no solo el caso feliz del seed original.
> - **Gestión de proyecto de punta a punta (editar/borrar en todas las entidades)**, cerrada hoy: hasta ayer solo se podía crear/agregar, nada se podía corregir ni borrar. Se agregó edición/borrado transversal a `Project` (rename + cambio de cliente), `TimeEntry`, `ProjectAdditional`, `PlannedInvoice`/`Invoice`, y `ExternalCollaborator` + sus adicionales/pagos. Decisiones de diseño (confirmadas con el usuario):
>   - **Archivar, no borrar proyectos** — `Project.status` (ACTIVE/ARCHIVED), soft-close. Archivar solo saca el proyecto de la lista activa del dashboard (con toggle "Ver archivados"/"Ver activos") — deliberadamente NO bloquea seguir editando/cargando horas en un proyecto archivado (simplificación aceptada para esta tanda).
>   - **Corrección de horas cargadas:** el propio Colaborador dueño de la entrada, o el Gestor responsable del proyecto (para cualquier entrada), vía la nueva `canManageTimeEntry` en `src/lib/authorization.ts` (con 5 tests propios). Gerencia nunca edita nada, en ningún lado — consistente con el resto de las políticas.
>   - **Cliente/ClientContact quedaron fuera de esta tanda a propósito** (catálogo compartido, el usuario prefirió dejarlo para después).
>   - Editar/borrar una `PlannedInvoice` ya facturada está bloqueado server-side (hay que corregir la `Invoice`, no la previsión) — probado explícitamente con curl.
>   - **Limitación aceptada, documentada, no resuelta:** al borrar una `Invoice`, la `PlannedInvoice` que la originó (si vino de "promover") no tiene FK de vuelta — queda con `invoiced: true` aunque la factura real ya no exista. No se resolvió porque cambiaría el modelo más allá de lo pedido; queda anotado para si se vuelve a tocar este módulo.
>   - **Migración** (`add_project_status`) fue no destructiva y corrió normal (`prisma migrate dev`), sin necesitar el workaround de SQL a mano de la migración de `Client`.
> - Último commit pusheado: `eff5e64`.
>
> **Pendiente explícito para retomar:**
> 1. **Etapa 0 (validación de la lógica financiera con quien la diseñó)** — sigue sin resolver, cada vez más urgente porque ya hay números de rentabilidad reales en pantalla (ver Nota v1.10).
> 2. Decisión de hosting final (VPS vs. gestionado) — sin resolver, no bloquea nada de lo anterior.
> 3. Odoo — sin resolver, no bloquea nada de lo anterior.
> 4. La limitación de `Invoice`/`PlannedInvoice` sin FK de vuelta (arriba) — no urgente, pero anotada.
>
> **Próximo paso sugerido al retomar:** con la gestión de proyecto ya de punta a punta, el próximo salto natural de funcionalidad sería revisar qué le falta a "Usuarios"/"Clientes" en el mismo sentido (editar/borrar), o directamente confirmar con el usuario si ya es momento de mostrárselo a Deltana tal como está.
>
> **Corte del 2026-07-23 (mismo día, sesión siguiente) — cambio de máquina/red:** el usuario detectó que la red interna de la empresa (Quanam) bloquea los puertos de Postgres hacia Supabase (5432/6543) — confirmado en vivo (DNS y HTTPS/443 funcionan, esos dos puertos dan timeout). En vez de usar un Postgres local temporal, el usuario prefirió **verificar que todo esté al día en GitHub y mover este documento + los gotchas técnicos dentro del repo** (antes vivían solo en la carpeta local fuera de git y en la memoria del asistente, ninguna de las dos viaja a otra máquina) para retomar desde otra computadora/red sin perder contexto. Se movió `plan_maestro.md` a la raíz de `pmec/` (antes estaba un nivel arriba, fuera de cualquier repo git) y se creó `docs/gotchas.md` con los bugs técnicos reales ya resueltos, referenciado desde `AGENTS.md`. **No se tocó código ni base de datos en esta sesión** — es puramente un commit de continuidad/documentación. Ver la sección "Cómo continuar en otra máquina/red" al principio de este archivo para los pasos exactos de arranque.

Objetivo del MVP: tener algo **desplegado y tangible en Vercel + Supabase (tiers gratuitos, costo cero)** lo antes posible, para mostrarle a Deltana y conseguir la aprobación de que se siga invirtiendo tiempo en el resto del alcance. No es un prototipo descartable — es la base real sobre la que se sigue construyendo (Etapas 2 en adelante de la sección 11), pero acotada a lo mínimo indispensable para que sea demostrable.

### Alcance mínimo del MVP

**1. Usuarios con roles (versión acotada de la sección 2, solo para el MVP):**

| Rol MVP | Qué puede hacer en el MVP |
|---|---|
| **Gerencia** | Login, ve todos los proyectos cargados (solo lectura), ve las horas cargadas por todos los colaboradores en todos los proyectos. |
| **Gestor de Proyectos** | Login, crea/edita **sus** proyectos, ve las horas que los colaboradores le cargaron en sus proyectos. |
| **Colaborador** | Login, ve **solo los proyectos donde está asignado**, y carga sus propias horas trabajadas por proyecto (fecha, cantidad de horas, proyecto). No ve datos financieros ni proyectos ajenos. |

*Nota: el rol Admin (sección 2) queda fuera del MVP — para esta primera demo, sus funciones mínimas (crear usuarios) las asume Gerencia. Se suma como rol separado en la Etapa 4 completa (sección 11), no ahora.*

**2. Entidades mínimas del modelo de datos (subconjunto acotado de la sección 4):**
- `User` (con rol: Gerencia / Gestor / Colaborador).
- `Project` (nombre, cliente en texto libre por ahora, gestor asignado, colaboradores asignados).
- `TimeEntry` (colaborador, proyecto, fecha, horas, descripción opcional) — esta es la funcionalidad núcleo del MVP: la carga de horas.

**Explícitamente fuera del MVP** (se suman en las etapas siguientes, no ahora): previsiones de cobro/pago, panel de cashflow, márgenes, facturas, clientes/colaboradores externos como entidades separadas, auditoría, integración con Odoo. El MVP demuestra la base de usuarios/roles/carga de horas — no la lógica financiera completa todavía.

### Por qué este alcance y no otro
Es el subconjunto más pequeño que permite mostrar, de forma creíble, las dos cosas que más le importan a Deltana en la reunión: que **los roles y el aislamiento de datos funcionan de verdad** (un Colaborador no ve lo de otro, un Gestor no ve proyectos ajenos), y que **hay una base real de datos de horas por proyecto**, que es el insumo que después alimenta toda la lógica de previsiones (sección 4.1) en la siguiente etapa.

### Seguridad aplicada en el MVP (ver Nota v1.9)
Aunque el checklist completo de la sección 5 (ASVS Nivel 2) se pospone hasta que haya datos financieros reales, en el MVP **no se sacrifica** lo que es barato y de alto impacto, precisamente porque Auth/RBAC es lo que hay que demostrar:
- Zod validando el 100% de los inputs de `Project`/`TimeEntry`/`User`.
- Tests de autorización (Etapa 3) como **gate bloqueante en CI** — no se demuestra "de palabra" que un Colaborador no ve proyectos ajenos, se prueba automáticamente.
- Contraseñas con hashing Argon2id/bcrypt, nunca texto plano.
- Escaneo de dependencias activo desde el primer commit.

Quedan explícitamente para después de la aprobación (no aplican todavía porque no hay datos financieros que proteger): MFA, cifrado a nivel de campo, `audit_log` append-only, pentest externo.

### Cómo se construye (usando la guía de la sección 11)
Este MVP corresponde a una versión comprimida de las **Etapas 0 a 4** de la sección 11, con el alcance recortado a lo de arriba: esqueleto en Vercel (Etapa 1) → modelo de datos mínimo (Etapa 2, solo `User`/`Project`/`TimeEntry`) → autenticación + los 3 roles con tests de autorización (Etapa 3) → CRUD de Proyectos y carga de horas (Etapa 4, solo esas dos entidades). El resto de la Etapa 4 (Clientes, Colaboradores externos, Facturas/Previsiones) y las Etapas 5 en adelante (lógica financiera, seguridad reforzada, Odoo) **quedan para después de la aprobación**, no antes.

### Criterio de "terminado" del MVP
- Desplegado en una URL de Vercel real, con base de datos en Supabase (tier gratuito).
- Los 3 roles pueden loguearse y cada uno ve exactamente lo que le corresponde (probado, no solo asumido).
- Un Colaborador puede cargar horas en un proyecto donde está asignado, y esas horas aparecen para su Gestor y para Gerencia.
- Nada de datos financieros, previsiones ni Odoo todavía — eso es a propósito.

---

## 1. Principios rectores

1. **La lógica financiera existente es la fuente de verdad.** Todo lo que hoy calcula `Dashboard.tsx`, `EconomicTracking.tsx`, `InternalTeam.tsx` y `Projects.tsx` sobre horas, previsión de facturación y márgenes se **porta tal cual**, se centraliza en un solo módulo de dominio (hoy está duplicado en 4 archivos) y se cubre con tests antes de tocarla. Ningún refactor puede cambiar un resultado numérico sin que el usuario que diseñó la lógica lo valide explícitamente.
2. **Seguimiento continuo, no solo al cierre.** El objetivo declarado del usuario — "no esperar a que el proyecto cierre para darte cuenta si fue rentable" — se convierte en un requisito de producto explícito (sección 4.1): un panel de **cashflow proyectado vs. real por fase**, visible durante todo el ciclo de vida del proyecto, con alertas cuando el margen proyectado se aleja del objetivo.
3. **Migración sin pérdida de datos.** Cualquier backup `.json` ya exportado por el usuario debe poder importarse a la nueva base de datos sin pérdida ni reinterpretación de campos.
4. **Seguridad por defecto, no por capas agregadas después.** Roles, aislamiento de datos y validación se diseñan en el esquema y en el backend desde el día 1, no como parche sobre la UI.
5. **Incremental, no big-bang.** Se avanza por fases entregables y probables de usar en paralelo con la app actual hasta el corte definitivo (ver sección 6).

---

## 2. Roles y jerarquía

| Rol | Quién | Qué ve | Qué puede hacer |
|---|---|---|---|
| **PRESIDENCIA / GERENCIA** | Dirección de la empresa | **Todos** los proyectos de **todos** los consultores. Dashboard ejecutivo consolidado (gráficos, KPIs globales, cashflow de toda la cartera). | Solo lectura sobre datos operativos (no edita proyectos ajenos). Puede exportar reportes. |
| **ADMIN** | Quien administra la plataforma | Todos los usuarios, configuración global (tarifas internas por defecto, calendario de festivos, catálogo de roles/tipos). Puede ver proyectos con fines de soporte. | Alta/baja de consultores, asignación de roles, gestión de catálogos globales, resolución de incidencias de datos. No es necesariamente quien carga datos de proyectos día a día. |
| **GESTOR DE PROYECTOS (consultor)** | Cada consultor/responsable de proyecto | Solo **sus** proyectos (aquellos donde figura como responsable o miembro del equipo). | CRUD completo sobre sus proyectos: equipo, previsiones, facturas, hitos, clientes/colaboradores asociados. |
| **COLABORADOR** | Miembro de equipo interno asignado a uno o más proyectos | Solo los proyectos donde está asignado. | Carga sus propias horas trabajadas por proyecto. No ve datos financieros ni proyectos ajenos. *(Este rol se introduce ya en el MVP — sección 0.1 — como pieza mínima necesaria para la carga de horas; su alcance completo se amplía en etapas posteriores.)* |

**Reglas de diseño:**
- La autorización se valida **siempre en el backend** (API/servidor), nunca solo en la UI. Un gestor que intente acceder por API a un proyecto ajeno debe recibir 403, sin importar lo que muestre el frontend.
- **Catálogos compartidos** (clientes, colaboradores externos, equipo interno, tarifas) son de la organización completa — evita que dos consultores dupliquen el mismo cliente o colaborador con datos distintos. Lo que se restringe por rol es el **detalle financiero de cada proyecto**, no la existencia de la entidad "cliente X" o "colaborador Y".
- Un proyecto puede tener **más de un gestor asignado** (ej. un responsable + un apoyo), igual que hoy el `team[]` ya admite varios miembros.
- A futuro (no ahora) se puede sumar un rol de solo-lectura para clientes externos o auditoría — el modelo de roles debe quedar abierto a agregar roles nuevos sin rediseñar el esquema (tabla de roles, no un enum rígido).

---

## 3. Stack tecnológico recomendado

| Capa | Elección | Por qué |
|---|---|---|
| **Lenguaje** | TypeScript de punta a punta (frontend + backend) | Ya es el lenguaje del proyecto actual; comparte tipos entre cliente y servidor; reduce errores en cálculos financieros por tipado fuerte. |
| **Framework full-stack** | **Next.js 14+ (App Router)** | Permite mantener React (mínima curva de aprendizaje sobre el código actual), pero suma backend (API routes / Server Actions), autenticación server-side, SSR para el dashboard ejecutivo, y despliegue nativo en Vercel. |
| **Base de datos** | **PostgreSQL** | Relacional, con integridad referencial fuerte (crítico para datos financieros: facturas, previsiones, montos), soporta **Row-Level Security (RLS)** nativo para reforzar el aislamiento por consultor a nivel de base de datos (no solo en la app), y JSON columns para los campos más flexibles (ej. adjuntos, metadatos). |
| **Proveedor de base de datos (MVP / corto plazo)** | **Supabase (tier gratuito)** | Para el MVP (sección 0.1): rápido de levantar, cero costo, incluye Postgres real. |
| **Proveedor de base de datos (producción final, a decidir)** | **VPS propio en Hostinger** (Docker) *o* Supabase en plan pago — ver sección 8.1, sigue sin resolverse | Decisión pendiente entre infraestructura propia (más control, más responsabilidad operativa) y gestionada (menos control, menos responsabilidad operativa). No bloquea el MVP ni el desarrollo hasta la Fase 10. |
| **Base de datos (desarrollo local)** | **SQLite** vía Prisma | Permite seguir desarrollando y testeando toda la lógica **100% en local, sin infraestructura configurada todavía** (ver sección 3.1). El mismo `schema.prisma` se reutiliza al pasar a Postgres — solo cambia el `datasource` y se reejecutan las migraciones. |
| **ORM** | **Prisma** | Tipado extremo a extremo con TypeScript, migraciones versionadas (hoy no existen), y es justamente lo que permite el cambio SQLite → Postgres sin reescribir la capa de datos ni la lógica de negocio. |
| **Autenticación (MVP / corto plazo)** | **Auth.js (NextAuth) con proveedor Credentials** + tabla propia `User` (password hasheado con Argon2id/bcrypt) | No depende de Supabase Auth para arrancar. Se modela ya la tabla de usuarios y roles (necesaria de todas formas para el RBAC). |
| **Autenticación (a futuro)** | **Supabase Auth**, integrado como proveedor de identidad adicional en Auth.js (MFA/TOTP para los 3 roles cuando se retome el estándar ASVS L2 — Nota v1.9) | Se agrega cuando el usuario lo decida. Al guardar en `User` un id propio, el cambio de proveedor no afecta al modelo de roles/asignaciones ni a la lógica de negocio. |
| **Autorización (RBAC)** | Tabla `roles` + tabla `project_members`/asignación proyecto↔usuario↔rol + políticas RLS en Postgres como segunda barrera (aplican cuando la BD sea Postgres; en SQLite local solo aplica el filtrado a nivel de aplicación) | Defensa en profundidad: aunque un bug en el backend olvide filtrar por usuario, la base de datos igual bloquea el acceso. |
| **Validación de datos** | **Zod** en cada input de formulario y cada endpoint | Evita que datos mal formados (montos negativos, fechas inválidas, horas negativas) lleguen a la base de datos. Aplica desde el MVP, sin excepciones. |
| **Hosting app (MVP)** | **Vercel (tier gratuito)** | Simplicidad y velocidad para el MVP — objetivo es mostrarle algo tangible a Deltana lo antes posible. |
| **Hosting app (producción final, a decidir)** | Vercel *o* VPS Hostinger — sección 8.1, sigue sin resolverse | No bloquea el MVP. |
| **Almacenamiento de archivos** | Por definir — hoy se mantienen enlaces externos (igual que la app actual); cuando se aborde gestión documental real, evaluar **Supabase Storage** o un bucket self-hosted (MinIO) | No es una prioridad para el MVP ni para el arranque; no bloquea nada de lo demás. |
| **Protección perimetral** | **Cloudflare** delante del dominio (proxy gratuito), a incorporar cuando haya dominio propio (después del MVP, que corre sobre el dominio de Vercel) | WAF básico, mitigación DDoS, rate limiting adicional sin costo. |
| **Monitoreo/errores** | **Sentry** (tier gratuito) | Visibilidad de errores en producción sin exponer datos sensibles en logs. |
| **CI/CD** | GitHub + GitHub Actions (lint, typecheck, tests, escaneo de dependencias) + deploy automático a Vercel | Hoy no hay ni siquiera repositorio git — es la base mínima antes de escalar el equipo, y aplica desde la Etapa 1 del MVP. |
| **Integraciones externas (preparación)** | Capa de adaptadores aislada (`/lib/integrations/`), sin proveedor concreto implementado todavía | PMEC va a necesitar conectarse a un Odoo existente (leer y subir información). No se implementa ahora ni en el MVP, pero el backend se estructura desde la Fase 4 completa para que sumar Odoo sea agregar un adaptador nuevo, no rediseñar la API ni el modelo de datos. Ver sección 3.2. |

> Nota: se evita deliberadamente introducir un backend separado (NestJS, Express standalone) o un cloud empresarial (Azure/AWS) porque no aportan beneficio real a esta escala y suman costo operativo y complejidad de seguridad que no hace falta pagar todavía. Si el proyecto crece mucho (decenas de consultores, integraciones corporativas, SSO con Microsoft 365 de Quanam), se puede migrar sin rehacer el modelo de datos.

### 3.1 Estrategia de desarrollo local (sin infraestructura todavía)

Objetivo: seguir mejorando la app **ya mismo**, en local, sin esperar a tener el VPS contratado ni Supabase configurado, pero sin generar trabajo descartable.

1. **Ahora (desarrollo local):** el `schema.prisma` se define completo desde el día 1 (todas las entidades de la sección 4, aunque el MVP solo use el subconjunto de la sección 0.1), apuntando a un archivo **SQLite local** (`dev.db`, ni siquiera requiere Docker ni un servicio corriendo). La autenticación usa Auth.js con Credentials contra la tabla `User` propia, sin ningún servicio externo.
2. **Para el MVP:** se conecta a **Supabase (tier gratuito)** como base de datos real desplegada, cambiando el `datasource` de `sqlite` a `postgresql` — mismo schema, mismas migraciones.
3. **Cuando se resuelva la decisión de producción final (sección 8.1):** si se opta por VPS, se migra de Supabase a Postgres en Docker en el VPS con el mismo mecanismo (cambio de `datasource`/connection string). La lógica de negocio y la API **no cambian** en ningún paso de esta cadena.

Ventaja concreta de este enfoque: cero riesgo de "trabajo tirado" — el schema, las migraciones, la API y el frontend migran de SQLite → Supabase → (eventual VPS) sin reescritura, solo con cambios de configuración.

### 3.2 Preparación arquitectónica para integraciones externas (Odoo y futuras)

PMEC va a necesitar, más adelante, leer información desde un Odoo existente y subir a Odoo información procesada dentro de la app (ver alcance pendiente de definir en sección 8.3). Para que esa conexión se pueda agregar el día de mañana **sin tocar el núcleo del backend ni el modelo de datos ya construido**, se aplican desde ahora estas decisiones de diseño — ninguna requiere tener Odoo conectado hoy, y ninguna es parte del MVP:

1. **Capa de adaptadores aislada, no llamadas directas desde la lógica de negocio.** Todo lo que hable con un sistema externo vive en `/lib/integrations/<proveedor>/` (ej. `/lib/integrations/odoo/`), detrás de una interfaz genérica (`ExternalDataProvider` o similar: métodos como `fetchRecords()`, `pushRecords()`). El módulo de dominio (cashflow, previsiones, márgenes — sección 4.1) **nunca importa un cliente de Odoo directamente**; si mañana cambia el ERP o se agrega un segundo sistema externo, se escribe un adaptador nuevo sin tocar la lógica financiera ya validada.
2. **Credenciales como configuración, no como código.** Se modela una tabla `IntegrationCredential` (proveedor, alias, credencial cifrada, activo/inactivo, quién la configuró, cuándo) en vez de variables de entorno sueltas — así, cuando exista la conexión con Odoo, un Admin la carga desde la propia app sin que un desarrollador tenga que tocar el servidor. Mientras no haya integración activa, esta tabla simplemente queda vacía.
3. **Registro de sincronización (`SyncLog`) desde el modelo de datos.** Tabla separada de `audit_log` (sección 4), pensada específicamente para operaciones con sistemas externos: qué se leyó/escribió, en qué modelo externo, resultado (éxito/error), y el detalle del error si lo hubo.
4. **Endpoints/Server Actions de integración, aislados y con permisos propios.** Cuando exista, la sincronización con Odoo se expone bajo una ruta propia (ej. `/api/integrations/odoo/*`), accesible **solo para el rol Admin**.
5. **Feature flag, no rama de código paralela.** La activación se controla con una variable de entorno/config (`ODOO_INTEGRATION_ENABLED`) y el estado de `IntegrationCredential`, no con un branch de Git separado.

Ninguno de estos puntos agrega trabajo significativo (son decisiones de dónde poner las cosas, no funcionalidad nueva a construir), pero evita que conectar Odoo en el futuro implique reabrir el backend ya construido.

---

## 4. Modelo de dominio objetivo

La migración de `types.ts` a un esquema Prisma/Postgres **preserva los nombres y semántica de los campos actuales** para minimizar el riesgo de reinterpretar mal la lógica de negocio. El MVP (sección 0.1) implementa solo `User`/`Project`/`TimeEntry` de este modelo completo; el resto se retoma después de la aprobación. Cambios principales respecto al modelo actual de la SPA:

- `Project.client: string` y `TeamMember` embebido pasan a ser **relaciones reales** (`Client`, `TeamMember` como entidades con FK), no texto libre ni objetos duplicados por proyecto — así se resuelve el bug actual de que el nombre de un colaborador puede desincronizarse entre proyectos. (El MVP usa `client` como texto libre todavía, por simplicidad — sección 0.1.)
- Se agrega `Organization` (una sola fila, ya que no es multi-empresa) y `User` (con `role`), y `ProjectAssignment` (usuario ↔ proyecto ↔ rol en ese proyecto) para sostener el control de acceso de la sección 2.
- Los sub-objetos financieros (`Agreement`, `Additional`, `PlannedInvoice`, `Invoice`, `CollaboratorInfo`, `InternalWorkRange`, `PartialDelivery`, etc.) se mantienen como **tablas propias** relacionadas por `projectId`/`teamMemberId`, en vez de JSON embebido — permite auditar, indexar y consultar con SQL en vez de recorrer JSON en el cliente. (Ninguno de estos entra al MVP.)
- Se agrega **auditoría**: tabla `audit_log` (quién cambió qué, cuándo) — se retoma en la Etapa 5+ (Nota v1.9), no en el MVP.
- Se agregan dos tablas de **preparación para integraciones externas** (sección 3.2): `IntegrationCredential` e `IntegrationSyncLog`. No tienen impacto en la lógica actual ni en el MVP — quedan vacías hasta que exista una integración real.

### 4.1 Módulo reforzado: Previsión financiera continua

Este es el punto que el usuario marcó como no-negociable: la posibilidad de ver si un proyecto va bien o mal **durante** su ejecución, no solo al final. Se formaliza como módulo propio (hoy está repartido entre Dashboard/EconomicTracking), **a construir después del MVP** (Etapa 5 en adelante de la sección 11):

- **Curva de cashflow por proyecto**: combina `plannedInvoices` (ingresos previstos), `invoices` reales (ingresos cobrados), coste interno prorrateado por mes (`InternalWorkRange` × tarifa), y pagos previstos/reales a colaboradores externos — todo en una línea de tiempo mensual, comparando **proyectado vs. real** mes a mes.
- **Alerta de margen en riesgo**: si en cualquier punto del proyecto el margen proyectado (`profit / totalBudget`) cae por debajo del objetivo (hoy 50% fijo — se propone hacerlo **configurable por proyecto**, con 50% como default), se marca visualmente el proyecto como "en riesgo".
- Esto no cambia ninguna fórmula existente — solo las hace visibles de forma continua y las convierte en una alerta activa en vez de un número que hay que ir a buscar.

---

## 5. Seguridad (información financiera sensible) — objetivo ASVS Nivel 2, aplicado gradualmente (ver Nota v1.9)

> **Alcance en el MVP (sección 0.1):** se aplican los ítems marcados 🟢 abajo — son los de mayor impacto por menor costo, y cubren exactamente lo que el MVP necesita demostrar (Auth/RBAC funcionando de verdad). El resto queda pendiente **hasta que haya datos financieros reales en el alcance** (Etapa 5 en adelante de la sección 11) — no se abandona el objetivo ASVS L2, se secuencia.

- 🟢 **Autenticación real** vía Auth.js con Credentials (o Supabase Auth), contraseñas nunca en código ni en texto plano; hashing Argon2id/bcrypt.
- ⏳ **MFA** — obligatorio para los 3 roles cuando se retome el estándar completo (post-MVP); no aplica todavía porque no hay datos financieros que proteger.
- 🟢 **RBAC server-side** en cada endpoint/Server Action, verificado con **tests automatizados como gate bloqueante en CI** — esto es intocable incluso en el MVP, es la demo misma.
- ⏳ **Row-Level Security en Postgres** como segunda barrera — se suma cuando la base de datos final esté decidida (sección 8.1); Supabase del MVP ya soporta RLS nativamente, se puede adelantar sin costo si se prioriza.
- 🟢 **Validación de entrada con Zod** en el 100% de los formularios y endpoints, incluidos los del MVP.
- 🟢 **Secretos fuera del repositorio**: variables de entorno gestionadas por Vercel/Supabase, nunca commiteadas.
- 🟢 **HTTPS forzado** (por defecto en Vercel).
- ⏳ **Cabeceras de seguridad avanzadas** (CSP estricta con nonces, HSTS preload, etc.) — se refuerzan post-MVP; Vercel aplica buenos defaults, pero la configuración fina se retoma en la Etapa 8.
- ⏳ **Backups automáticos y cifrados** — Supabase los incluye por defecto en el MVP; la política formal (retención, restauración probada) se documenta post-aprobación.
- 🟢 **Principio de mínimo privilegio** en credenciales de base de datos.
- ⏳ **Auditoría** (`audit_log` append-only) — se suma en la Etapa 5+, cuando entran datos financieros.
- 🟢 **Dependencias**: Dependabot/escaneo en CI, sin vulnerabilidades altas/críticas — activo desde el primer commit del MVP.
- 🟢 **Rate limiting** en el endpoint de login, desde el MVP.
- ⏳ **Pentest externo** — obligatorio antes de cargar datos financieros reales de producción, no antes.
- ⏳ **Integraciones externas (Odoo):** credenciales cifradas, usuario de servicio con permisos mínimos, endpoints solo para Admin — se implementa junto con la Fase 12, no antes.

**Hardening específico de VPS propio** (aplica solo si la sección 8.1 se resuelve a favor del VPS — no aplica al MVP, que corre en Vercel+Supabase):
- [ ] Acceso solo por clave SSH, usuario de despliegue sin privilegios root.
- [ ] Firewall (`ufw`) abierto solo a los puertos necesarios.
- [ ] `fail2ban` contra fuerza bruta de SSH.
- [ ] Postgres nunca expuesto a internet.
- [ ] Actualizaciones de seguridad del sistema operativo automáticas.
- [ ] TLS/HTTPS gestionado por Caddy o Nginx+Certbot.
- [ ] Contenedores Docker con usuario no-root.
- [ ] Monitoreo básico de recursos del servidor.

---

## 6. Funcionalidades sugeridas para "potenciar" la app (estándar de mercado, post-MVP)

Priorizadas — las primeras son las que más valor agregan sin desviarse del objetivo core:

**Alta prioridad (recomendado incluir después del MVP):**
1. **Notificaciones** (email o in-app) de facturas previstas próximas a vencer, hitos próximos, o margen en riesgo.
2. **Gestión documental real**: adjuntar PDFs (contratos, ofertas, facturas) a Supabase Storage en vez de solo guardar URLs sueltas a OneDrive.
3. **Dashboard ejecutivo para Gerencia**: cartera completa, proyectos en riesgo, cashflow consolidado de toda la empresa, ranking de rentabilidad por consultor/cliente.
4. **Historial/auditoría visible**: "quién cambió este monto y cuándo" en la ficha de cada proyecto.

**Media prioridad (siguiente etapa, post-lanzamiento):**
5. Flujo de aprobación: una `Propuesta` pasa a `En proceso` solo con aprobación de Gerencia.
6. Reportes exportables en PDF.
7. Gantt con librería real.
8. Multi-moneda.

**Baja prioridad / a evaluar más adelante:**
9. Portal de solo-lectura para que el cliente final vea el avance de su proyecto.
10. Integración con sistema contable existente vía API/export automatizado.

---

## 7. Plan de trabajo por fases

| Fase | Contenido | Entregable |
|---|---|---|
| **0. Fundamentos** | Crear repositorio Git, definir estructura del proyecto Next.js, configurar CI (lint/typecheck/dependencias), entorno de desarrollo local con **SQLite vía Prisma**. | Repo inicializado, pipeline verde, app corriendo en local. |
| **MVP (0.1)** | 🟢 **En curso.** Ver sección 0.1 — `User`/`Project`/`TimeEntry`, 3 roles, desplegado en Vercel+Supabase. | Demo aprobable por Deltana. |
| **1. Modelo de datos completo** | Traducir `types.ts` a schema Prisma (sección 4) más allá del subconjunto del MVP, migraciones, seed de datos de prueba. | Schema Prisma versionado completo. |
| **2. Autenticación y roles completos** | Sumar rol Admin, MFA (Nota v1.9), Supabase Auth si se decide. | Login multi-rol completo, con MFA. |
| **3. Lógica de negocio centralizada** | Extraer y unificar en un módulo único (compartido, con tests) todo el cálculo de horas/capacidad, previsiones y márgenes hoy duplicado en 4 archivos. Validación con el usuario dueño de la lógica sobre casos reales. | Módulo de dominio con tests, resultados idénticos a la app actual. |
| **4. Backend completo** | Endpoints CRUD para clientes, colaboradores externos, facturas, previsiones — todos con Zod + control de acceso por rol. Capa de adaptadores de integraciones (sección 3.2). | API funcional completa cubierta por tests de autorización. |
| **5. Migración del frontend completo** | Portar el resto de las vistas actuales (Planning, Clients, Collaborators, InternalTeam, EconomicTracking) a Next.js. | App funcional con paridad funcional a la SPA actual. |
| **6. Módulo de previsión financiera continua** | Panel de cashflow proyectado vs. real y alertas de margen (sección 4.1). | Panel nuevo, validado con el usuario de negocio. |
| **7. Dashboard ejecutivo (Gerencia)** | Vista consolidada multi-consultor con gráficos de cartera. | Panel de Gerencia funcional. |
| **8. Migración de datos existentes** | Script de importación de los backups `.json` a la base de datos nueva. | Herramienta de importación probada con backups reales. |
| **9. Seguridad ASVS L2 completa** | Retomar el checklist completo de la sección 5 (ítems ⏳): MFA, RLS, cifrado de campo, auditoría append-only, pentest. | Checklist firmado, sin hallazgos críticos abiertos. |
| **10. Decisión de hosting final y despliegue** | Resolver sección 8.1 (VPS vs. gestionado); si es VPS, provisión completa (Docker, firewall, Postgres, Caddy/TLS). | App en producción definitiva. |
| **11. UAT y puesta en marcha** | Validación funcional con los consultores reales y con quien diseñó la lógica de previsiones, capacitación breve, plan de corte desde la app actual. | Go-live. |
| **12. Integración con Odoo** | Alcance pendiente — sección 8.3. | Sincronización Odoo ↔ PMEC funcionando, con registro en `IntegrationSyncLog`. |

**Recomendación de secuencia:** el MVP es el foco inmediato y precede a todo lo demás. Una vez aprobado, las fases 1-4 son estrictamente secuenciales; las fases 5, 6 y 7 pueden avanzar en paralelo una vez lista la fase 4. La fase 9 (seguridad completa) se retoma en cuanto entren datos financieros reales, no se espera al final del todo. La fase 12 es independiente y no bloqueante.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Reinterpretar mal una fórmula financiera al migrarla | Tests automatizados que comparan el resultado del nuevo módulo contra los cálculos actuales, revisados por el usuario que diseñó la lógica original. No aplica al MVP (sin lógica financiera todavía). |
| Pérdida de datos históricos que hoy solo existen en `localStorage` | Pedir explícitamente los backups `.json` más recientes antes de apagar la app actual; script de importación con reporte de qué se importó y qué se descartó. |
| Costos inesperados si el uso crece rápido en tiers gratuitos | Monitorear consumo de Supabase/Vercel desde el MVP; alertas de uso antes de llegar a límites de plan. |
| Un bug de autorización expone proyectos de un consultor a otro | Doble barrera: autorización en servidor + RLS en base de datos, tests automatizados de autorización por rol — **ya aplica desde el MVP**, es el riesgo más relevante en esta etapa. |
| Scope creep por las funcionalidades sugeridas en la sección 6 | Se marcan explícitamente como "post-MVP" — no entran hasta después de la aprobación de Deltana. |
| Escribir en Odoo datos que rompan reglas de negocio propias del ERP | El adaptador de integración solo opera sobre modelos/campos definidos explícitamente; toda escritura queda registrada y se prueba primero contra una base de Odoo de prueba. |
| Posponer MFA/pentest/cifrado de campo (Nota v1.9) más allá de lo previsto | Estos ítems quedan marcados como bloqueantes explícitos de la Fase 9/10 — no se puede llegar a producción con datos financieros reales sin ellos, sin importar la presión de tiempo. |

---

## 8.1 Decisión pendiente: VPS propio (Hostinger) vs. infraestructura gestionada

**Estado: sin resolver, requiere decisión explícita del usuario antes de la Fase 10. No bloquea el MVP (que corre en Vercel+Supabase gratuito).**

- **Infraestructura gestionada (Vercel + Supabase pago):** el proveedor asume parches del sistema operativo, hardening del runtime, backups automáticos, TLS, WAF/DDoS básico. Menos control, factura variable.
- **VPS propio (Hostinger):** más control, costo fijo, pero traslada la responsabilidad operativa (SSH, firewall, Docker, actualizaciones, TLS, backups) a la empresa — ver checklist de mantenimiento en sección 8.2.

**La pregunta real es organizativa:** ¿hay alguien en el equipo que pueda sostener el mantenimiento continuo del VPS mes a mes? Si sí, el VPS es sólido y más económico a largo plazo. Si no, migrar a gestionado (aunque sea solo la base de datos) reduce el riesgo real en el componente más sensible del sistema.

## 8.2 Checklist de mantenimiento continuo si se opta por VPS propio (Hostinger)

Si la decisión final es VPS propio, estas son las tareas recurrentes:

**Diario:** backup fuera del VPS, verificación de que corrió, monitoreo de recursos.
**Semanal:** revisión de logs SSH/app, alertas de Sentry, verificar `fail2ban`.
**Mensual:** actualizaciones de seguridad del SO, rotación de claves SSH, `npm audit`/Dependabot, prueba real de restauración de backup, revisión de certificados TLS.
**Trimestral:** revisión de firewall, revisión de accesos al VPS, confirmar que Postgres sigue sin exponerse, actualización de versiones mayores, revisión de espacio en disco.
**Ante incidentes:** plan de respuesta documentado, contacto de soporte de Hostinger a mano.

**Nota:** si hoy nadie en la empresa tiene tiempo/experiencia para sostener esto, es el argumento más fuerte a favor de una base de datos gestionada.

## 8.3 Integración futura con Odoo — alcance pendiente de definir

**Estado: confirmado que va a hacer falta. Versión de Odoo ya confirmada; resto del alcance sin definir. No bloquea el MVP ni el desarrollo actual.**

1. **Plan/hosting de Odoo:** confirmado, es Odoo Online (SaaS) de Deltana (`deltana.odoo.com`). Pendiente confirmar si el plan contratado habilita la API externa.
2. **Versión de Odoo:** confirmada por API — **18.0 Enterprise**. Protocolo: JSON-RPC/XML-RPC clásico.
3. **Qué se lee y qué se sube exactamente** — pendiente de definir con quien administra Odoo en Deltana.
4. **Usuario de servicio con permisos acotados** — pendiente de coordinar.
5. **Dirección y frecuencia de sincronización** — Odoo no tiene webhooks salientes, así que es polling desde PMEC.
6. **Ambiente de testing de Odoo** — instancia Docker de prueba y/o duplicado de la instancia real, antes de escribir contra producción.

La arquitectura ya quedó preparada para esto desde la Fase 4 (sección 3.2).

---

## 10. Estimación de horas y presupuesto

**El MVP (sección 0.1) se estima aparte, más chico:** aproximadamente **35-45 h** (Etapas 0-4 acotadas al alcance mínimo: esqueleto Next.js+Vercel, modelo `User`/`Project`/`TimeEntry`, Auth+RBAC con tests, CRUD de proyectos y carga de horas). A tarifa de referencia u$s 30/h, esto es **~u$s 1.050-1.350** para tener algo demostrable frente a Deltana.

La estimación completa de abajo (Etapa 1 "full scope", sin Odoo) sigue vigente como referencia para **después** de la aprobación del MVP — no es lo que se está ejecutando ahora mismo:

| Fase | Horas | Costo (u$s 30/h) | Nota |
|---|---|---|---|
| 0. Setup, repo, CI, entorno local | 10 | 300 | Ya cubierto por el MVP |
| 1. Modelo de datos (Prisma) + migraciones completas | 14 | 420 | Parcialmente cubierto por el MVP |
| 2. Auth + RBAC (3 roles) + RLS + MFA | 30 | 900 | MVP cubre Auth+RBAC básico sin MFA; MFA se suma post-aprobación (Nota v1.9) |
| 3. Backend CRUD completo (clientes, colaboradores, equipo, facturas) | 34 | 1.020 | Post-MVP |
| 4. Migración de la lógica de previsiones/cashflow | 30 | 900 | Post-MVP, intocable sin validación |
| 5. Frontend completo (dashboards, panel de cashflow) | 46 | 1.380 | Post-MVP |
| 6. Importador de backups `.json` existentes | 9 | 270 | Post-MVP |
| 7. Auditoría + capa de adaptadores (preparación Odoo) | 7 | 210 | Post-MVP |
| 8. Seguridad ASVS L2 completa (MFA, cifrado de campo, audit_log, CSP, pentest) | 78 | 2.340 | Post-MVP, retomando Nota v1.9 |
| 9. Testing (unitario/integración) | 22 | 660 | Parcialmente cubierto por el MVP (tests de autorización) |
| 10. Deploy definitivo | 6 | 180 | Depende de sección 8.1 |
| 11. UAT y ajustes finales | 8 | 240 | Post-aprobación |
| **Total post-MVP estimado** | **~284 h** | **~u$s 8.520** | Sin contar las horas ya invertidas en el MVP |

**Advertencias:**
1. El número del MVP (35-45h) es lo relevante ahora — el resto es referencia para la conversación con Deltana sobre continuar invirtiendo.
2. Se recomienda pagar/aprobar por hitos: MVP primero, y recién con esa aprobación seguir con el resto.
3. No incluye Odoo (Fase 12) ni el pentest externo, que sigue siendo obligatorio antes de datos reales de producción (sección 5).

---

## 11. Etapas de desarrollo para trabajar paso a paso en el IDE con un agente de IA

**🟢 Estado: en curso.** Las Etapas 0 a 4 de abajo son, ahora mismo, **las etapas del MVP** (sección 0.1), con el alcance recortado a `User`/`Project`/`TimeEntry` y los 3 roles del MVP. El resto del alcance completo de cada etapa (Clientes, Colaboradores externos como entidad, Facturas/Previsiones, etc.) se retoma recién después de la aprobación del MVP por parte de Deltana.

Esta sección traduce el plan a **etapas ejecutables una por una**, pensadas para dárselas a un agente de IA (Claude Code u otro) dentro del IDE, en el orden real de trabajo — por **rebanadas verticales** (dato → API → UI → test) con **despliegue desde el principio**, no por capas. Cada etapa indica objetivo, tareas concretas y el criterio de "terminado" antes de pasar a la siguiente. No conviene arrancar la etapa N+1 sin haber cerrado el criterio de "terminado" de la N.

### Etapa 0 — Conocimiento y datos reales (pospuesta, no cancelada)
- **Objetivo:** no depender de interpretar la lógica financiera solo leyendo código.
- **Tareas:** sesión con quien diseñó la lógica de previsiones, con 2-3 ejemplos reales; documentar fórmulas y ejemplos numéricos en `docs/logica-financiera.md`; conseguir 2-3 backups `.json` reales.
- **Estado:** pospuesta — no aplica al MVP (que no tiene lógica financiera todavía). Retomar antes de la Etapa 5 (lógica de previsiones) o, a más tardar, antes de la UAT final.

### Etapa 1 — Repositorio y esqueleto caminante (MVP) — ✅ Completada 2026-07-21
- **Objetivo:** tener algo real desplegado, aunque sea mínimo.
- **Tareas para el agente:** inicializar repo Git + Next.js 14 (App Router) + TypeScript; configurar CI (lint + typecheck + escaneo de dependencias) en GitHub Actions; Prisma con SQLite local; login básico; deploy a Vercel.
- **Terminado cuando:** hay una URL de Vercel funcionando con ese esqueleto mínimo, y el CI está en verde.
- **Resultado real:** repo Git inicializado en `pmec/` (carpeta nueva junto al SPA viejo). Se usó **Next.js 16** (no 14) y **Prisma 7** (create-next-app/Prisma instalan la última versión estable por defecto) — ambos con cambios de breaking que hubo que resolver: Prisma 7 requiere un *driver adapter* explícito incluso para SQLite (`@prisma/adapter-better-sqlite3`, ver `src/lib/prisma.ts`); Next 16 renombró `middleware.ts` a `proxy.ts` (siempre corre en Node.js, nunca Edge — en realidad esto favoreció a Prisma). Modelo mínimo `User`/`Project` con login Credentials (Auth.js v5) verificado de punta a punta con curl (redirect sin sesión, rechazo de password incorrecta, rechazo de cookie manipulada, contenido real solo autenticado). CI con lint+typecheck+`npm audit --audit-level=high`+build, Dependabot semanal. **Repo remoto:** https://github.com/TemisC/PMEC_Gestor-De-Proyectos-Ingenieria-Civil (rama `main`, pusheado 2026-07-21). **Pendiente (requiere acción manual del usuario, no automatizable desde este entorno):** conectar ese repo a Vercel — requiere login interactivo/OAuth en el navegador. **Actualización 2026-07-21:** conectado a Vercel por el usuario. Al hacerlo, se detectó que SQLite no sirve en serverless (sin disco persistente) — se creó un proyecto Supabase gratuito y se migró todo (local y producción) a Postgres en el momento, en vez de esperar a la Etapa 2. Detalles técnicos (driver adapter, pooler transaction/session, TLS) en `docs/gotchas.md`. Nota de red: los puertos de Postgres (5432/6543) están bloqueados en la red corporativa de Quanam — hay que estar en otra red (o usar `prisma dev` local) para correr `prisma migrate`/`db:seed` localmente contra Supabase.

**✅ Etapa 1 verificada en producción real el 2026-07-21:** login, rechazo de credenciales inválidas y contenido del dashboard confirmados en `https://pmec-gestor-de-proyectos-ingenieria.vercel.app` (no solo en local). Bug adicional encontrado y corregido en el camino: en HTTPS, Auth.js usa la cookie con prefijo `__Secure-` (`__Secure-authjs.session-token`) — `getToken()` en `src/proxy.ts` no la detectaba de forma confiable en el runtime de Vercel a pesar de que el login era exitoso (`/api/auth/session` resolvía bien), así que el proxy igual redirigía a `/login`. Se fuerza `secureCookie` según el protocolo real de la request (`req.nextUrl.protocol === "https:"`), no por `NODE_ENV`. **El MVP ya tiene una URL pública real y funcional para mostrarle a Deltana.**
- **Bug real encontrado y corregido durante la verificación:** Auth.js v5 **no incluye `user.id` en la sesión por defecto** (solo name/email/image) — sin el callback `session`/`jwt` explícito en `src/auth.ts`, cualquier chequeo de autorización que dependa de `session.user.id` falla siempre en silencio. Se agregó el callback + augment de tipos (`src/types/next-auth.d.ts`). Recordar esto para cualquier chequeo de rol/pertenencia en las etapas siguientes (Etapa 3 en adelante).

### Etapa 2 — Modelo de datos del MVP — ✅ Completada 2026-07-21
- **Objetivo:** schema Prisma para `User`, `Project`, `TimeEntry` (sección 0.1) conectado a Supabase.
- **Tareas para el agente:** definir el schema mínimo; migraciones; conectar a Supabase (tier gratuito); seed de datos de prueba.
- **Terminado cuando:** el schema del MVP corre contra Supabase sin errores, con datos de prueba cargados.
- **Resultado real:** `Role` enum (GERENCIA/GESTOR/COLABORADOR) en `User`; `Project.ownerId` renombrado a `managerId` + campo `client` (texto libre); `ProjectMember` (asignación Colaborador↔Proyecto, de acá sale el chequeo de la Etapa 3); `TimeEntry` (carga de horas). Base de Supabase reseteada con consentimiento explícito del usuario (solo tenía datos de seed) para evitar una migración manual de rename de columna. Seed con un usuario de prueba por rol (`gerencia@`/`gestor@`/`colaborador@pmec.local`, password `demo1234`). Nota: la URL de Vercel se redesplegó con este cambio — el usuario viejo `demo@pmec.local` ya no existe, usar los 3 nuevos.

### Etapa 3 — Autenticación y RBAC del MVP — ✅ Completada 2026-07-21
- **Objetivo:** los 3 roles del MVP (Gerencia, Gestor, Colaborador) funcionando de verdad, con tests, antes de construir pantallas.
- **Tareas para el agente:** Auth.js con Credentials + tabla `User`/`roles`; políticas de autorización server-side; **tests automatizados de autorización** (ej. "un Colaborador no puede ver proyectos donde no está asignado", "un Gestor no puede leer/editar el proyecto de otro Gestor" contra la API cruda, no contra la UI); hashing Argon2id/bcrypt.
- **Terminado cuando:** los tests de autorización pasan en CI **como gate bloqueante** para los 3 roles del MVP, sin ninguna pantalla construida todavía más que un login.
- **Resultado real:** `role` propagado a la sesión (`src/auth.ts`, mismo patrón que el fix del `id` en la Etapa 1 — Auth.js no lo incluye por defecto). Políticas de autorización como funciones puras en `src/lib/authorization.ts` (`canViewProject`, `canManageProject`, `canLogTimeEntry`, `canViewAllTimeEntries`), sin depender de Prisma ni de conexión a base — la futura API (Etapa 4) las va a llamar, no va a decidir acceso a mano. 17 tests con Vitest cubriendo los casos exactos del plan (Gestor no ve proyecto ajeno, Colaborador no asignado no ve ni carga horas, Gerencia ve todo pero no gestiona nada ajeno), corriendo como **gate bloqueante en CI antes del build** (confirmado en verde: https://github.com/TemisC/PMEC_Gestor-De-Proyectos-Ingenieria-Civil/actions). Sin cambios de UI — el dashboard sigue como en la Etapa 2, a propósito.

### Etapa 4 — Entidades del MVP, de punta a punta — ✅ Completada, y ampliamente superada (ver corte del 2026-07-22 en la sección 0.1)
- **Objetivo:** CRUD real y probado de `Project` y `TimeEntry` — con esto, el MVP está terminado.
- **Orden:** Proyectos (con gestor y colaboradores asignados) → Carga de horas (`TimeEntry`, por Colaborador) → vista de horas cargadas para Gestor y Gerencia.
- **Tareas para el agente, por entidad:** modelo (ya existe de Etapa 2) → API con Zod → tests de autorización → UI mínima funcional → deploy.
- **Terminado cuando:** `Project` y `TimeEntry` completan un ciclo real desplegado en Vercel — **el MVP está terminado** (ver criterio de la sección 0.1).
- **Resultado real:** además del CRUD mínimo, se sumó (ver corte 2026-07-22 en sección 0.1) la lógica financiera completa, colaboradores externos, gestión de usuarios reales, Cliente como entidad, y edición/borrado de punta a punta en todas las entidades de proyecto. El MVP mínimo quedó ampliamente atrás.

*(A partir de acá, las etapas siguientes son el alcance completo post lo ya construido — Clientes/Colaboradores externos ya están, el resto sigue pendiente.)*

### Etapa 5 — Lógica de previsiones/cashflow, como módulo aislado — ✅ Completada (adelantada, ver Nota v1.10), con un pendiente
- **Objetivo:** portar la lógica financiera sin reinterpretarla.
- **Tareas para el agente:** extraer el cálculo de horas/previsión/márgenes a un módulo único de funciones puras; escribir tests unitarios contra los ejemplos numéricos de la Etapa 0 (a retomar antes de esta etapa) **antes** de conectarlo a ninguna pantalla.
- **Terminado cuando:** los tests confirman resultados idénticos a los ejemplos reales, validados por quien diseñó la lógica original.
- **Estado real:** `src/lib/financials.ts` implementado y con tests (Nota v1.10, 2026-07-21), pero **sin la validación de la Etapa 0** — se interpretó el código del SPA original como fuente de verdad. Pendiente activo, ver sección 0.1.

### Etapa 6 — Importador de backups
- **Objetivo:** poder cargar datos reales en cualquier etapa siguiente.
- **Tareas para el agente:** script de importación `.json` → Postgres/Supabase con reporte de qué se importó y qué se descartó.
- **Terminado cuando:** corre sobre los backups reales sin pérdida de datos.

### Etapa 7 — Frontend completo (dashboards, panel de cashflow)
- **Objetivo:** invertir en la UI completa sobre una API que ya no va a cambiar.
- **Tareas para el agente:** panel de cashflow proyectado vs. real por fase con alertas de margen; dashboard ejecutivo consolidado para Gerencia; pulido de las vistas del MVP.
- **Terminado cuando:** validado visualmente contra 2-3 proyectos reales de los backups importados.

### Etapa 8 — Seguridad ASVS L2 completa (retomando Nota v1.9)
- **Objetivo:** cerrar todos los ítems ⏳ de la sección 5.
- **Tareas para el agente:** MFA para los 3 roles; RLS en Postgres; cifrado a nivel de campo; `audit_log` append-only a nivel de permisos de BD; CSP estricta con nonces; escaneo SAST bloqueante en CI.
- **Terminado cuando:** el checklist completo de la sección 5 está sin hallazgos críticos abiertos, y se ejecutó el pentest externo obligatorio.

### Etapa 9 — Capa de adaptadores para Odoo (estructura, no conexión real)
- **Objetivo:** dejar la puerta lista sin gastar tiempo de la integración real.
- **Tareas para el agente:** carpeta `/lib/integrations/`, interfaz `ExternalDataProvider`, tablas `IntegrationCredential`/`IntegrationSyncLog`, sin ningún adaptador concreto implementado.
- **Terminado cuando:** la estructura existe y compila, pero no hay ninguna llamada real a Odoo.

### Etapa 10 — UAT y go-live
- **Objetivo:** cierre validado, no una demo genérica.
- **Tareas:** comparar número contra número con la SPA vieja en 2-3 proyectos reales completos, junto con quien diseñó la lógica original; importar los datos de producción reales con el usuario presente; plan de rollback.
- **Terminado cuando:** el usuario da el visto bueno explícito sobre los números comparados.

**Cómo usar esta guía con el agente de IA en el día a día:** pegar una etapa completa por sesión de trabajo (no varias a la vez), exigir que el agente muestre el criterio de "terminado" cumplido antes de pasar a la siguiente, y hacer commit/PR al cierre de cada etapa para mantener un historial claro.

**Etapa 11 (fuera de esta guía, a futuro) — Integración con Odoo:** depende de resolver primero los puntos de la sección 8.3.

---

## 12. Próximos pasos inmediatos

**🟢 Ya arrancamos, y ya superamos ampliamente el alcance de esta lista** — se deja como referencia histórica de cómo arrancó el proyecto. El estado real y el próximo paso concreto están en la nota de "Corte del [fecha]" de la sección 0.1, más arriba.

1. Inicializar repositorio Git para el proyecto.
2. Ejecutar la **Etapa 1** (esqueleto caminante: Next.js + Prisma + SQLite local, deploy a Vercel) — hoy mismo.
3. Ejecutar la **Etapa 2 del MVP**: modelo de datos mínimo (`User`, `Project`, `TimeEntry`) conectado a Supabase.
4. Ejecutar la **Etapa 3**: autenticación + los 3 roles del MVP, con tests de autorización antes de construir ninguna pantalla.
5. Ejecutar la **Etapa 4 del MVP**: CRUD de Proyectos + carga de horas por Colaborador.
6. Con esto, el MVP queda demostrable — mostrarlo a Deltana para aprobación antes de seguir invirtiendo horas en el resto del alcance.
7. Recién después de esa aprobación, retomar en orden: Etapa 0 (validación de la lógica de previsiones), Etapa 5 en adelante (lógica financiera completa), la decisión de hosting final (sección 8.1), la seguridad ASVS L2 completa (Etapa 8, Nota v1.9), y los puntos pendientes de Odoo (sección 8.3).
