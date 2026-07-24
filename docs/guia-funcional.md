# Guía Funcional — PMEC

> **Documento vivo.** Se actualiza cada vez que se agrega o modifica una funcionalidad.
> Última actualización: 2026-07-24.

---

## ¿Qué es PMEC?

PMEC es el sistema de gestión de proyectos de ingeniería civil de **Deltana**. Permite que los Gestores administren sus proyectos con toda la información financiera (presupuesto, facturas, rentabilidad), que los Colaboradores carguen sus horas trabajadas, y que Gerencia tenga una vista consolidada de toda la cartera de la empresa en tiempo real.

---

## Acceso y roles

### Cómo entrar
Ingresá en la URL de la app con tu **email** y **contraseña**. Si tus credenciales son inválidas o tu usuario fue desactivado, verás un mensaje de error en la pantalla de login.

### Los tres roles
Cada usuario tiene uno de estos roles. Lo que ves y podés hacer depende de tu rol:

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Gerencia** | Dirección / presidencia | Ve todos los proyectos de todos los Gestores, con rentabilidad completa. No edita proyectos ajenos. Gestiona usuarios. |
| **Gestor de Proyectos** | Consultor responsable de proyectos | Crea y gestiona sus propios proyectos: equipo, presupuesto, facturas, colaboradores externos. No ve proyectos de otros Gestores. |
| **Colaborador** | Miembro del equipo interno | Ve solo los proyectos donde está asignado. Carga sus horas trabajadas. No ve datos financieros. |

> **Nota de seguridad:** el sistema valida el rol en el servidor. Aunque alguien intente acceder a una URL de un proyecto ajeno, recibirá un error — no hay forma de saltarse los permisos desde el navegador.

---

## Dashboard

El dashboard es la pantalla principal al ingresar. Su contenido varía según el rol.

### Dashboard — Gerencia (vista ejecutiva)

Pensado para tener en un vistazo el estado de toda la cartera de la empresa.

**KPIs de cartera (4 indicadores en la parte superior):**
- **Presupuesto cartera:** suma de los presupuestos de todos los proyectos activos.
- **Facturado total:** suma de todas las facturas reales emitidas en proyectos activos.
- **Margen cartera:** rentabilidad ponderada de toda la empresa (si el margen cae por debajo del 50%, el número se muestra en rojo).
- **Proyectos en riesgo:** cantidad de proyectos con margen por debajo del 50%. Verde si no hay ninguno, rojo si hay alguno.

**Proyectos que necesitan atención:**
Sección con fondo rojo que aparece solo si hay proyectos en riesgo. Muestra cada uno con su gestor, presupuesto y margen. Es la alerta central de la vista ejecutiva.

**Ranking de Gestores:**
Tabla con cada Gestor, su cantidad de proyectos activos, presupuesto total y margen promedio. Ordenada de peor a mejor margen para que los problemas se vean primero.

**Cartera completa:**
Lista de todos los proyectos activos, ordenados de menor a mayor margen (los más críticos primero). Cada fila muestra: nombre del proyecto, gestor responsable, cliente, presupuesto, facturado real y porcentaje de rentabilidad.
- Usar el link **"Ver archivados"** para ver proyectos cerrados.

### Dashboard — Gestor de Proyectos

**3 KPIs:** cantidad de proyectos activos, presupuesto total de su cartera, y cantidad de proyectos en riesgo.

**Lista de proyectos:** sus proyectos activos con presupuesto y porcentaje de margen. Desde acá se puede crear un proyecto nuevo con el botón **"+ Nuevo proyecto"**.

### Dashboard — Colaborador

Lista de los proyectos donde el Colaborador está asignado. Sin datos financieros. Desde cada proyecto puede acceder para cargar sus horas.

---

## Proyectos

### Crear un proyecto (Gestor)
1. En el dashboard, hacer click en **"+ Nuevo proyecto"**.
2. Completar nombre y cliente (se puede elegir uno existente del catálogo, escribir el nombre de uno nuevo, o dejarlo vacío).
3. El proyecto queda activo y se puede configurar desde su página de detalle.

### Página de detalle del proyecto

Accesible haciendo click en cualquier proyecto. Contiene varias secciones:

#### Información general
- Nombre del proyecto, cliente y gestor responsable.
- El Gestor puede editar el nombre y cambiar el cliente desde acá.
- Botón **"Archivar proyecto"**: mueve el proyecto a la lista de archivados (no lo borra, toda la información queda intacta). Se puede reactivar después con **"Reactivar proyecto"**.

#### Equipo interno
Lista de Colaboradores asignados al proyecto. El Gestor puede:
- Agregar colaboradores desde un selector de usuarios del sistema.
- Configurar la **tarifa hora** de cada colaborador para este proyecto (si no se configura, se usa la tarifa por defecto del usuario).
- Remover colaboradores del proyecto.

#### Horas cargadas
Registro de horas trabajadas por los Colaboradores. El Gestor ve todas las entradas; el Colaborador solo ve las propias.
- El **Colaborador** puede cargar horas: fecha, cantidad de horas (máximo 24 por carga) y descripción opcional.
- El **Gestor** y el propio Colaborador pueden editar o borrar una entrada de horas.

#### Financiero (solo Gestor y Gerencia)

> El Colaborador nunca ve esta sección.

Contiene el detalle económico completo del proyecto:

**Rentabilidad (resumen):**
- Presupuesto total, facturado, pendiente de facturar, previsto sin facturar.
- Coste interno (horas × tarifa), coste externo (pagos a subcontratistas), rentabilidad en monto y porcentaje.
- Si el margen cae por debajo del 50%, aparece el indicador **"En riesgo"** en rojo.

**Acuerdo base:** el monto del contrato/oferta principal. Se puede cargar la URL del documento (oferta y/o contrato).

**Adicionales:** trabajos extra fuera del alcance base. Cada adicional tiene descripción, monto y URL de referencia opcional. Se pueden editar y borrar.

**Previsiones de cobro:** cuándo se espera cobrar (por fecha). Cada previsión tiene descripción, fecha, monto y origen (acuerdo o adicional). Se puede:
- Editar o borrar una previsión mientras no esté facturada.
- **Promover a factura real**: cuando el cobro se efectiviza, se convierte la previsión en una factura real (con PDF opcional).

**Facturas emitidas:** registro de cobros reales. Cada factura tiene monto, fecha y URL de PDF opcional. Se pueden editar y borrar.

#### Cashflow mensual (solo Gestor y Gerencia)

Tabla que muestra mes a mes la evolución financiera del proyecto. Aparece solo cuando hay datos cargados (facturas, previsiones o horas con tarifa configurada).

| Columna | Qué muestra |
|---|---|
| **Cobrado** | Facturas reales emitidas ese mes |
| **Previsto** | Previsiones de cobro que todavía no se promovieron a factura |
| **Coste int.** | Horas registradas × tarifa de cada colaborador ese mes |
| **Coste ext.** | Pagos realizados a subcontratistas ese mes |
| **Resultado** | Cobrado + Previsto − Coste interno − Coste externo (verde si positivo, rojo si negativo) |

La fila **Total** al pie suma todas las columnas. Los meses sin actividad se muestran como filas en cero (para mantener la continuidad del rango temporal).

#### Colaboradores externos / Subcontratistas (solo Gestor y Gerencia)

Personas o empresas a las que se les paga por trabajos tercerizados en el proyecto (no son usuarios del sistema, no cargan horas).

Cada colaborador externo tiene: nombre, empresa, contacto, monto de acuerdo y URL de referencia.
- **Adicionales:** trabajos extra del subcontratista.
- **Pagos realizados:** registros de pagos reales ya efectuados (fecha, monto, descripción). Los pagos son lo que cuenta como **coste externo** en la rentabilidad.
- Se pueden editar y borrar tanto el colaborador externo como sus adicionales y pagos.

---

## Clientes

Sección accesible para **Gestores y Gerencia** (no Colaboradores).

El catálogo de clientes es **global de la empresa** — todos los Gestores comparten los mismos clientes, sin duplicados. Cualquier proyecto puede estar asociado a cualquier cliente del catálogo.

### Lista de clientes (`/clients`)
- Ver todos los clientes ordenados alfabéticamente, con la cantidad de proyectos de cada uno.
- Crear un nuevo cliente con nombre y datos de contacto general (nombre, email, teléfono).
- Hacer click en un cliente para ver su detalle.

### Detalle del cliente (`/clients/[id]`)

**Editar datos del cliente:** nombre y datos del contacto general, con botón Guardar.

**Eliminar cliente:** solo disponible si el cliente no tiene proyectos asociados. Si tiene proyectos, se muestra la cantidad como referencia.

**Contactos técnicos / económicos:** personas de contacto del cliente según su función:
- *Técnico:* para consultas técnicas del proyecto.
- *Económico:* para temas de facturación y pagos.
- Se pueden agregar, editar y borrar contactos.

**Proyectos asociados:** lista de los proyectos de este cliente que el usuario puede ver (respetando la visibilidad por rol — un Gestor no ve los proyectos de otro Gestor aunque compartan cliente).

---

## Usuarios

Sección accesible solo para **Gerencia**.

### Lista de usuarios (`/users`)

Muestra todos los usuarios del sistema, separando activos (arriba) e inactivos (abajo, con opacidad reducida y badge "Inactivo").

**Crear usuario:** formulario con nombre, email, rol, contraseña inicial y tarifa hora por defecto (opcional).

**Editar usuario:** cada fila tiene un formulario inline para modificar nombre, email, rol y tarifa hora. Botón Guardar por fila.

**Desactivar / Reactivar:** impide que el usuario inicie sesión, pero conserva todo su historial (proyectos, horas). Útil cuando alguien deja la empresa. No se puede desactivar el propio usuario ni al último Gerencia activo.

**Eliminar:** solo disponible cuando el usuario no tiene proyectos gestionados, asignaciones ni entradas de horas. La UI muestra el conteo `Np/Na/Nh` como referencia cuando no se puede eliminar.

---

## Exportar PDF

### Reporte de proyecto (Gestor y Gerencia)

En la cabecera de cada proyecto aparece el botón **"Descargar PDF"** (solo visible para quienes pueden ver datos financieros — Gestor responsable y Gerencia).

El PDF incluye:
- Nombre del proyecto, cliente, gestor y estado (activo/archivado).
- **Resumen financiero:** 8 KPIs en 2 filas — presupuesto, facturado, pendiente de facturar, previsto sin facturar, coste interno, coste externo, resultado y margen. El resultado y el margen se muestran en rojo si el proyecto está en riesgo (margen < 50%).
- **Tabla de cashflow mensual** (si hay datos): cobrado, previsto, coste interno, coste externo y resultado por mes; fila de totales al pie.
- Número de página en el pie.

### Cartera completa en PDF (solo Gerencia)

En el **Dashboard Ejecutivo** de Gerencia aparece el botón **"Descargar cartera PDF"** (visible solo cuando se está viendo la cartera activa).

El PDF en formato A4 apaisado incluye:
- Cinco KPIs: proyectos activos, presupuesto de la cartera, facturado total, margen de la cartera, proyectos en riesgo.
- **Tabla completa de proyectos**, ordenada de menor a mayor margen (los más críticos primero): proyecto, gestor, cliente, presupuesto, facturado, resultado y margen. El resultado y el margen se muestran en rojo si el proyecto está en riesgo.

---

## Preguntas frecuentes

**¿Puedo borrar un proyecto?**
No se borran proyectos — se archivan. Archivar conserva toda la información financiera y de horas intacta; solo saca el proyecto de la lista activa del dashboard. Desde el dashboard, el link "Ver archivados" permite consultar proyectos cerrados.

**¿Qué pasa si cargo mal las horas?**
El propio Colaborador puede editar o borrar sus entradas de horas. El Gestor responsable del proyecto también puede hacerlo (por ejemplo, si el Colaborador ya no está disponible).

**¿Puedo editar una factura ya emitida?**
Sí. Se puede editar el monto, la fecha y el PDF de una factura real. Lo que no se puede editar es la previsión de cobro que la originó (si vino de una promoción) — la corrección se hace directamente sobre la factura.

**¿Puedo cambiar mi propia contraseña?**
Todavía no — esta funcionalidad está en la hoja de ruta. Por ahora, Gerencia puede resetear la contraseña borrando y recreando el usuario, o editando sus datos directamente.

**¿Cómo sé si un proyecto está en riesgo?**
Un proyecto se marca "en riesgo" cuando su margen de rentabilidad cae por debajo del 50%. El indicador aparece en rojo en el dashboard, en la lista de proyectos y en la sección financiera del proyecto. Gerencia tiene además una sección dedicada a proyectos en riesgo al tope del dashboard ejecutivo.

---

*Este documento se actualiza con cada nueva funcionalidad. Para consultar el estado del desarrollo y los próximos pasos, ver `plan_maestro.md` en la raíz del proyecto.*
