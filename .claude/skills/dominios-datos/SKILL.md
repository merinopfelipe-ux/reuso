# Dominios de datos — Calculadora de Reúso

Mapa mental **obligatorio** (Domain-Driven Design) para clasificar cualquier tabla, columna o cálculo nuevo. Es conceptual: no implica esquemas físicos de Postgres separados ni tablas renombradas, todo sigue viviendo en el esquema `public` con los nombres actuales. Verificado contra el schema real el 2026-08-06 (grep en `sql/` + inspección de columnas), no es una lista de memoria.

**Esto es un inventario de lo que YA existe, no una lista de tablas por construir.** Ninguna tabla de esta skill se crea de forma especulativa ni "porque encaja en el mapa". Una tabla nueva solo se crea cuando una funcionalidad real la pide explícitamente — esta skill sirve entonces para decidir en qué dominio va y evitar duplicar un dato que ya existe en otro.

## Los 5 dominios

### (A) Costos — exclusivo del Cotizador
Tarifas de mano de obra, precios de insumos comprados, márgenes de rentabilidad, la cotización en sí y sus clientes.
`item_servicios`, `item_insumos`, `categoria_servicios_base`, `categoria_insumos_base`, `crm_config_costos`, `crm_cotizaciones`, `crm_cotizaciones_aperturas`, `crm_cotizaciones_estado_historial`, `crm_cotizaciones_notas`, `crm_clientes`, `crm_clientes_atributos`, `crm_clientes_notas`, `crm_empresas_clientes`.

### (B) Cálculo Ambiental — científico y global
Peso de materiales, factores de CO₂/agua por kg, nivel de confianza y fuente. No sabe de precios ni de un mueble específico.
`item_materiales`, `categoria_materiales_base`, `calculos`, `informes`.

### (C) DPP y Finanzas Circulares — Pasaporte Digital de Producto y ciclo de vida
Identidad física del activo, sus ciclos de vida, verificación pública, y su historia financiera circular (TCO, E-ROI, RRV, Inflow Circular, ICE) — todo lo que le pasa al activo DESPUÉS de cotizado. Aclarado 2026-09-05 en el nombre corto porque generaba confusión: la mitad financiera no es un dominio aparte ni vive en (A), es parte de (C).
`dpp_activos`, `dpp_ciclos`, `dpp_verificaciones`, `dpp_documentos_ingesta`.
`dpp_metricas_financieras` es financiero puro (TCO, ROI circular) pero vive prefijada `dpp_` porque solo tiene sentido atada a un `dpp_activos.id` — trátala como una extensión de (C), no la muevas a (A).

### (D) Metadatos del Negocio — gobernanza, seguridad y operación
Cuentas, roles, estructura de empresa, cumplimiento legal, soporte, y el propio funnel comercial del SaaS.
`profiles`, `empresas`, `invitaciones`, `modulos`, `modulos_empresas`, `modulos_usuarios`, `lineas_negocio`, `lineas_negocio_empresas`, `firmas_solicitudes`, `log_firmas_confidencialidad`, `logs_auditoria`, `rate_limits`, `rate_limits_sensibles`, `tickets`, `tickets_mensajes`, `leads`, `item_permisos_empresa`, `dpp_incidencias` (status page técnico, no del activo físico).

### (E) Genérico — común y utilidades
Taxonomía compartida y CMS de la plataforma.
`categorias`, `contenido_landing`, `contenido_legal`, `plantillas_documentos`, `alertas`, `alertas_leidas`.

## Regla mandatoria: prohibido cruzar dominios en un cálculo directo

Ninguna función, endpoint o query mezcla datos de más de un dominio en el mismo cálculo salvo a través de un **punto de unión ya definido explícitamente** (ver siguiente sección). Si vas a escribir un cálculo que necesita, por ejemplo, costo (A) y CO₂ (B) a la vez, o CO₂ (B) y kilómetros de transporte (C), la pregunta no es "¿qué join hago" sino "¿cuál es el punto de unión ya definido, y si no existe, hay que crearlo explícitamente (columna o snapshot), nunca improvisarlo con un join ad hoc".

## Tablas que cruzan dominios por diseño (no son un error, no las repartas)

- **`items`**: rollup ambiental (B: `co2_por_unidad`, `agua_por_unidad`, `peso_kg`) + `factor_rentabilidad` (A). Es el punto de unión intencional entre catálogo y ambos motores — así lo define la migración 031 (Motor Universal, ver `CLAUDE.md`).
- **`crm_muebles_cotizados`**: mezcla precio/`factor_rentabilidad` (A) con `co2_evitado_kg`/`agua_evitada_l` (B) en la misma fila, a propósito. Es el snapshot editable de una cotización: congela A y B juntos al confirmar un ítem para que editar la cotización nunca vuelva a tocar el catálogo compartido. Separarla en dos tablas rompería esa atomicidad. Trátala como el punto de unión oficial A↔B a nivel de cotización.
- **`metas`**: metas ambientales (B) pero registradas por empresa (D, `empresa_id`). Clasifícala como (B) para efectos de cálculo, (D) para efectos de permisos/quién la edita.

## Gap conocido en (C) — no existe todavía, no lo asumas implementado ni lo construyas por adelantado

A 2026-08-06, `dpp_ciclos` **no tiene** columnas de tipo de camión, combustible, ni de residuos de taller (peso/tipo de material descartado, destino final). Solo existe `distancia_transporte_km` (escalar) y `co2_ciclo_kg`/`co2_evitado_kg`. Si en el futuro se pide una funcionalidad que necesite esos datos, ahí sí serían tabla o columnas nuevas, no una migración de datos existentes. Mientras nadie lo pida, no se crean. Antes de asumir que ya existen, verifica con grep en `sql/`.

## Gap conocido en (D) — Líneas de Negocio no bloquean nada todavía

`lineas_negocio`/`lineas_negocio_empresas` (migración 070, capa 2 de la "Arquitectura de Permisos (3 capas)" de `CLAUDE.md`) solo tienen CRUD de super_admin y el toggle de asignación por empresa en `/admin/empresas/[id]`. Verificado por grep 2026-08-10: ningún endpoint de Cotizador, DPP ni Cálculo Ambiental lee `linea_negocio_id` — asignar/quitar una línea hoy no restringe nada en el producto real, es pura UI de catálogo. El usuario decidió explícitamente NO implementar el bloqueo real todavía (no inventar qué debe bloquear cada módulo sin que lo pida). Antes de asumir que una empresa "limitada a Muebles" ya funciona, verifica con grep.

## Tabla huérfana fuera del mapa

`public.audit_logs` (migración 024) existe en paralelo a `logs_auditoria`, alimentada solo por triggers automáticos, sin ningún archivo en `src/` que la lea. No se clasifica en ningún dominio hasta que el usuario decida si se elimina o se le da un uso real.

## Al crear una tabla nueva (solo cuando una funcionalidad real la pida)

No crees tablas de esta skill por adelantado ni "para completar el mapa". Cuando una funcionalidad real requiera una tabla nueva, antes de escribir el `CREATE TABLE`: (1) revisa esta skill para confirmar que el dato no vive ya en otra tabla de algún dominio (evitar duplicar), (2) decide a cuál de los 5 dominios pertenece la tabla nueva y documéntalo en el comentario de la migración SQL. Si genuinamente pertenece a dos dominios (como ya ocurre por diseño con `items` o `crm_muebles_cotizados`), dilo explícitamente y explica cuál es el punto de unión, no lo dejes implícito.
