# Anexos de Implementación: Tareas de Desarrollo

## Premisas Fundamentales de Desarrollo

1. **Excelencia en Interfaz y Experiencia de Usuario (UI/UX):**
   - Todo componente, vista y flujo interactivo debe contar con un estándar visual de alto nivel, ser intuitivo y comunicarse con total claridad.
   - El diseño está centrado en objetivos: busca facilitar de manera ágil que todos los actores (vendedores, administradores, comités de compra y auditores) alcancen sus metas comerciales y ambientales con mínima fricción.

2. **Arquitectura y Escalabilidad Nativa:**
   - Toda funcionalidad se concibe, diseña y programa bajo un modelo de escalabilidad y aislamiento multi-tenant estricto.
   - La arquitectura debe garantizar el aislamiento total de datos entre organizaciones, manteniendo un rendimiento óptimo, consistencia operativa y capacidad de crecimiento escalable.

---

### Infraestructura Base y DevOps — Trabajo Seguro, Seguridad y Estabilidad

**1. Entorno de Taller y Datos Simulados (Paso 1):**
- **Unificación de Seeds:** Crear script `scripts/seed-ecosistema.mjs` que unifique la generación de datos de prueba estructurados.
- **Modelado de Datos Ficticios:** Poblar automáticamente dos empresas simuladas (Empresa A y Empresa B) con administradores, vendedores, clientes B2B con múltiples contactos, 5 cotizaciones en distintas etapas del embudo y 3 pasaportes DPP con ciclos.
- **Comando Estandarizado:** Integrar en `package.json` el comando ejecutable `npm run db:seed`.
- **Protección de Producción:** Incluir una guarda de seguridad al inicio del script que aborte la ejecución si detecta credenciales o variables de entorno de producción.

**2. Entorno de Ensayo Aislado (Staging y Previews) (Paso 2):**
- **Segregación de Base de Datos:** Configurar un proyecto independiente de Supabase exclusivo para Staging/Testing.
- **Variables de Entorno en Vercel:** Asignar las credenciales de la base de datos de staging al entorno `Preview` de Vercel.
- **Protección de Acceso:** Habilitar autenticación de Vercel en despliegues de preview para evitar indexación en motores de búsqueda.
- **Protocolo de Validación Móvil:** Generar un enlace protegido por Pull Request para revisión del equipo comercial y técnico en dispositivos móviles previo a la integración.

**3. Integración y Subida Automática (Pipeline CI/CD) (Paso 3):**
- **Workflow de GitHub Actions:** Crear `.github/workflows/ci.yml` que se dispare automáticamente en cada Pull Request dirigido a la rama `main`.
- **Validación de Código y Tipos:** Ejecutar `npm run lint` (ESLint) y `npx tsc --noEmit` (verificación estricta de tipos TypeScript).
- **Pruebas Unitarias y de Lógica:** Ejecutar suite de pruebas con Vitest (`npm run test`) para validadores numéricos, formateo telefónico y cálculos de CO₂.
- **Pruebas de Interfaz End-to-End (E2E):** Ejecutar Playwright en modo headless para flujos críticos (autenticación, guardado de cotizaciones y creación de pasaportes).
- **Protección de Rama Principal:** Configurar en GitHub la regla de bloqueo de merges si los checks del CI no concluyen satisfactoriamente.

**4. Seguridad Multi-Tenant y Protección de Secretos (RLS y Auditoría) (Paso 4):**
- **Automatización de Pruebas RLS:** Incorporar el script `scripts/run-rls-test.ts` en el pipeline de CI para simular intentos de lectura y modificación cruzada entre empresas.
- **Prevención de Fuga de Secretos:** Configurar Husky y Gitleaks (`.gitleaks.toml`) en pre-commit para bloquear la inclusión accidental de claves de servicio, tokens de API o contraseñas en los commits.
- **Monitoreo de Dependencias:** Mantener activo el análisis automatizado de vulnerabilidades en paquetes mediante Dependabot.

**5. Estrategia de Rollback y Migraciones Seguras (Zero-Downtime) (Paso 5):**
- **Patrón de Migración Expandir-Contraer:** Toda modificación de base de datos se realiza en fases: primero se crean columnas o tablas nuevas con valores por defecto (aditivas); solo en versiones posteriores se retiran estructuras obsoletas.
- **Versionado Semántico:** Etiquetar cada versión desplegada en Git mediante tags estructurados (`v1.0.0`, `v1.1.0`).
- **Rollback Inmediato en Vercel:** Mantener configurada la reversión con 1 clic en Vercel hacia la versión estable anterior ante cualquier eventualidad.

---

### Versión 1 (V1) — Listo para Producción (Ventas B2B y Aislamiento Base)

**1. Catálogo privado por empresa (Paso 1):**
- **Interfaz:** Construir pantalla `/empresa/catalogo` para gestión propia de materiales e insumos de cada empresa.
- **Conexión:** Programar endpoints bloqueando el acceso cruzado a catálogos de terceros y garantizando aislamiento por `empresa_id`.

**2. Múltiples contactos por cliente B2B (Paso 2):**
- **Base de datos:** Crear tabla `crm_clientes_contactos` (nombre, cargo, correo, teléfono). Restringir lectura y escritura por empresa.
- **Interfaz:** Agregar pestaña "Contactos" al perfil del cliente en `/empresa/clientes/[id]`.
- **Conexión:** Crear endpoints de creación, edición y eliminación de contactos asociados al cliente.

**3. Selección de contactos en nueva cotización (Paso 3):**
- **Interfaz:** En `/empresa/cotizador/nueva`, permitir seleccionar a qué contacto(s) específico(s) del cliente va dirigida la propuesta comercial.

**4. Envíos múltiples a comités de compra (Paso 4):**
- **Interfaz:** Cambiar envío de correos en `/empresa/cotizador/[id]` por un checklist de múltiples contactos del cliente.
- **Marca:** Inyectar el nombre y logo de la empresa emisora en el correo saliente.
- **Historial:** Crear tabla `crm_cotizaciones_envios` para auditar correos enviados (destinatarios, fecha, remitente).

**5. Ajustes de cuenta y perfil corporativo (Paso 5):**
- **Interfaz:** Construir pantalla `/empresa/configuracion` (o `/ajustes`) para permitir que el administrador de la empresa corrija su NIT, razón social, país y dirección post-registro.

**6. Persistencia de preferencias personales (Paso 6):**
- **Base de datos:** Corregir el almacenamiento persistente de preferencias de usuario en `/settings` para que no se reinicien al recargar.

**7. Control de roles y aislamiento de equipo (Paso 7):**
- **Seguridad:** Reforzar en `/empresa/equipo` la asignación de permisos por rol (administrador de empresa vs. asesor/vendedor) asegurando aislamiento estricto de vistas operativas.

---

### Versión 2 (V2) — Pasaporte Digital de Producto (DPP) y Métricas Avanzadas

**1. Edición y trazabilidad de activos DPP (Paso 1):**
- **Conexión:** Diseñar e implementar endpoint `PATCH` para permitir la corrección y edición estructurada del activo en `/empresa/dpp/[id]` tras su creación.
- **Trazabilidad y Mano de Obra:** Registrar ciclos físicos, operaciones de mantenimiento, estado de materiales ($CO_{2,\text{acumulado}} = CO_{2,\text{base}} \times N_{\text{ciclos}}$) e información del ejecutor del reacondicionamiento (`responsable_intervencion_json`: nombre, oficio, taller, horas de mano de obra, técnicas aplicadas y firma de calidad).

**2. Cumplimiento de normativa europea ESPIR y adaptación a Latam (Paso 2):**
- **Cumplimiento Obligatorio UE:** Estructurar el formulario `/empresa/dpp/nuevo` según los lineamientos del reglamento **ESPIR (UE 2024/1781)**:
  - **Identificación Única:** Código UID estandarizado con enlace GS1 Digital Link y portador QR.
  - **Desglose de Materiales:** Composición porcentual en peso ($\ge 1\%$), contenido reciclado (%) y declaración de sustancias preocupantes (**SVHC / REACH**).
  - **Durabilidad y Reparabilidad:** Puntuación del Índice de Reparabilidad (1.0 a 10.0), años de suministro garantizado de repuestos y enlace al manual de desensamble.
  - **Fin de Vida:** Instrucciones de separación selectiva y cálculo de Tasa de Reciclabilidad al Fin de Vida ($R_{\text{fin\_vida}} = \frac{\sum M_{\text{reciclables}}}{M_{\text{total\_activo}}} \times 100$) y Tasa de Inflow Circular ($Inflow_{\text{circular}} = \frac{M_{\text{secundario}} + M_{\text{renovable}}}{M_{\text{total\_input}}} \times 100$).
  - **Declaración Legal:** Enlace a declaración de conformidad técnica.
- **Adaptación Latam:** Compatibilidad con identificación tributaria regional (NIT) y normativas locales de economía circular y responsabilidad extendida del productor (REP).

**3. Directorio avanzado y filtros de DPP (Paso 3):**
- **Interfaz:** Adaptar filtros por categoría, grado estético (Grado A/B/C), estado de ciclo, buscador de código UID y exportaciones en `/empresa/dpp` con soporte normativo.

**4. Verificación pública interactiva del pasaporte (Paso 4):**
- **Interfaz:** Enriquecer `/pasaporte/[codigo]` y `/verificar/[codigo]` con:
  - Desglose visual interactivo de componentes y porcentaje de circularidad.
  - Sello de trazabilidad y firma del **Maestro Reacondicionador / Operador de Circularidad** con horas de trabajo local invertidas.
  - Puntuación de reparabilidad y guía de separación al final de la vida útil.
  - Sello criptográfico SHA-256 (`hash_integridad`) anti-greenwashing para auditorías regulatorias y comités B2B.

**5. Métrica de valor económico recuperado y finanzas circulares (Paso 5):**
- **Cálculo:** Desarrollar funciones en `src/lib/calculos/financiero.ts` y visualizadores en `/empresa/metas`:
  - **Ratio de Retención de Valor:** $RRV = \left(\frac{\text{Precio Recuperado}}{\text{Precio Nuevo}}\right) \times 100$.
  - **Costo Total de Propiedad por Ciclo:** $TCO_{\text{ciclo}} = \frac{C_{\text{adquisición}} + C_{\text{operación}} + C_{\text{mantenimiento}} + C_{\text{disposición}} - V_{\text{reventa}}}{\max(N_{\text{ciclos}}, 1)}$.
  - **Costo Económico Evitado:** $Costo_{\text{evitado}} = (P_{\text{virgen}} \times Q_{\text{circular}}) + C_{\text{disposición\_evitado}} + C_{\text{impuesto\_evitado}}$.
  - **Retorno de Inversión Circular:** $E\text{-}ROI = \left(\frac{\text{Ahorro Operativo} + Costo_{\text{evitado}}}{\text{Inversión Circular}}\right) \times 100$.
- **Indicadores:** Ampliar el desglose de metas ambientales (CO2 y agua) con grado de confianza y trazabilidad de fuentes.

**6. Generación de informes consolidados de sostenibilidad (Paso 6):**
- **Interfaz y PDF:** En `/empresa/informes`, generar reportes consolidados ejecutivos que articulen el impacto ambiental medido en los pasaportes DPP y metas de la empresa.

---

### Versión 3 (V3) — Idiomas, Monedas, Personalización Avanzada y Marca Blanca

**1. Marca blanca integral en propuestas y documentos (Paso 1):**
- **Marca:** Habilitar en `/empresa/configuracion/marca` la configuración de marca blanca (logo, WhatsApp, colores de acento en PDFs, propuestas públicas y correos sin mención de Reúso).

**2. Personalización de etapas del embudo de ventas (Paso 2):**
- **Base de datos:** Permitir la personalización de nombres, colores, reglas de transición y orden de etapas del embudo en `/empresa/cotizador` guardadas por empresa.

**3. Botones interactivos en propuesta pública (Paso 3):**
- **Interfaz:** Desarrollar botones interactivos "Aprobar propuesta" y "Rechazar propuesta" en `/cot/[token]` con confirmación, captura de comentarios y alertas instantáneas al vendedor.

**4. Multimoneda automática por país (Paso 4):**
- **Configuración:** Mapear la moneda oficial de 23 países latinos en `src/lib/locale.ts`.
- **Funciones:** Crear formateadores automáticos de precios, símbolos y fechas según país de la empresa emisora.

**5. Soporte multiidioma (i18n) (Paso 5):**
- **Interfaz:** Configurar soporte multiidioma (Español, Inglés, Portugués) mediante selectores personalizados del sistema para interfaz y propuestas públicas.

---

# Auditoría de Roles, Rutas y Plan de Acción 
*(Mapeo estructurado de todos los formularios, pantallas y rutas del sistema ordenado por prioridad de construcción para usar como checklist)*

## Tabla Maestra de Checklist por Prioridad de Construcción

| Versión / Prioridad | Perfil | Ruta / Pantalla | Estado Actual | Acción de Mejora / Requerimiento |
|---|---|---|---|---|
| **Base — DevOps 1** | DevOps / CI | `.github/workflows/ci.yml` | No existe pipeline de CI automatizado. | **Construir:** Workflow de GitHub Actions que valide TypeScript, linters, `vitest` y `playwright` en cada PR. |
| **Base — DevOps 2** | DevOps / DB | `scripts/seed.mjs` | Scripts de prueba dispersos. | **Estandarizar:** Comando `npm run db:seed` para generación de ecosistema completo de prueba local. |
| **Base — DevOps 3** | DevOps / Vercel | Vercel Preview Deployments | Previews sin ambiente de pruebas segregado. | **Configurar:** Entorno de Staging con base de datos de pruebas para revisión móvil previa a producción. |
| **Base — DevOps 4** | Seguridad / DB | `scripts/run-rls-test.ts` | Pruebas de RLS ejecutadas manualmente. | **Automatizar:** Ejecución de suite de pruebas de Row Level Security (RLS) en CI para garantizar aislamiento. |
| **Base — DevOps 5** | Arquitectura / DB | Migraciones Supabase | Sin protocolo formal de compatibilidad. | **Aplicar:** Regla de migraciones compatibles hacia atrás (expandir-contraer) para soportar rollbacks sin downtime. |
| **Base (Actual)** | Super Admin | `/admin` | Panel general con métricas globales y accesos directos. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/correos` | Historial, indicadores KPI y gestión de correos masivos/segmentados. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/correos/[id]` | Métricas de rendimiento, tasa de apertura, clics y trazabilidad individual por destinatario. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/correos/nuevo` | Redactor institucional con RichTextEditor, preview en vivo y despacho con Resend. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/categorias` | Gestión de categorías, íconos, descripciones y materiales base. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/catalogo-pendientes` | Revisión y homologación de factores CO2, peso y fuentes. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/catalogo-restringido` | Permisos y asignación de ítems por empresa. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/modulos` | Activación y parametrización de líneas de negocio. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/empresas` | Directorio y estado general de empresas registradas. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/empresas/[id]` | Edición de razón social, NIT, teléfono, logo, contacto y plan. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/calculos` | Historial global de cálculos ambientales del sistema. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/reportes` | Generación de consolidados analíticos de plataforma. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/usuarios` | Asignación de roles, empresas y restablecimiento de acceso. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/firmas` | Listado y trazabilidad de solicitudes legales. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/firmas/nueva` | Creación de solicitud de firma de documentos. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/alertas` | Creación y emisión de alertas globales del sistema. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/status` | Gestión de componentes e incidentes en status page. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/leads` | Gestión de contactos comerciales captados en landing. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/tickets` | Bandeja de soporte y resolución de solicitudes. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/contenido` | Configuración de textos y elementos dinámicos de landing. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/plantillas` | Editor de plantillas de correos y notificaciones. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/legal` | Control de versiones de términos, privacidad y normativas. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/logs` | Registro de eventos y auditoría del sistema. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/qa` | Panel de pruebas internas y aseguramiento de calidad. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Super Admin | `/admin/configuracion` | Ajustes globales y variables de entorno del sistema. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Prospecto | `/` (Landing Page) | Formulario de contacto, cálculo referencial y captación de leads. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Prospecto | `/login` | Autenticación con correo y contraseña. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Prospecto | `/registro` | Registro institucional y creación de cuentas. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Prospecto | `/recuperar` | Envío de enlace de restablecimiento de contraseña. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Prospecto | `/confirmar-email` | Validación de token de correo electrónico. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Empleado Invitado | `/invitacion/[token]` | Aceptación de invitación corporativa y asignación de clave. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa` | Panel principal de ventas (embudo de cotizaciones, metas, KPIs). | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/clientes` | Directorio y búsqueda de clientes corporativos. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/configuracion` | Ajustes de cuenta, datos fiscales y perfil de empresa. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/configuracion/marca` | Configuración de logo, WhatsApp y presentación de marca. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/configuracion/modulos` | Gestión de módulos activos para la empresa. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Vendedor | `/empresa/cotizador` | Vista Kanban y tabla de cotizaciones activas. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/calculos` | Historial y analítica de cálculos ambientales corporativos. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/reportes` | Reportes analíticos de mitigación, gobernanza, logística y rentabilidad. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/objetos` | Inventario de objetos y materiales recuperados. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Admin Empresa | `/empresa/soporte` | Creación de tickets de ayuda y solicitudes técnicas. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Usuario B2C | `/dashboard` | Calculadora ambiental personal por peso y categoría. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Usuario B2C | `/dashboard/historial` | Historial de cálculos ambientales individuales. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Usuario B2C | `/dashboard/informes` | Descarga de informes de huella personal. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Usuario B2C | `/dashboard/objetos` | Registro de ítems procesados individualmente. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Usuario B2C | `/dashboard/soporte` | Solicitudes de soporte para usuarios individuales. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Contacto B2B | `/cot/[token]` | Visualización de propuesta digital interactiva y descarga PDF. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Público / Auditor | `/verificar` y `/verificar/[codigo]` | Buscador y verificación pública de autenticidad de pasaportes. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Público | `/status` | Estado público de disponibilidad de servicios e infraestructura. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Firmante | `/legal/confidencialidad-firma` y `/legal/firma/[token]` | Firma digital de acuerdos de confidencialidad y contratos. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Público | `/legal/*` (Términos, Privacidad, Datos, Cookies, IA, Medición, Dudas) | Visualización de políticas legales, dudas y cookies. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Público | `/unsubscribe` | Formulario de baja de suscripciones por correo. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Público | `/ayuda` | Centro de documentación y preguntas frecuentes. | **No necesita tocarse:** Funciona correctamente. |
| **Base (Actual)** | Interno / Dev | `/sistema-diseno` y `/sistema-diseno/demo-panel` | Catálogo de componentes y pruebas de sistema de diseño. | **No necesita tocarse:** Funciona correctamente. |
| **V1 — Paso 1** | Admin Empresa | `/empresa/catalogo` | No existe la ruta. | **Construir:** Pantalla `/empresa/catalogo` para gestión propia de materiales con aislamiento multi-empresa. |
| **V1 — Paso 2** | Admin Empresa | `/empresa/clientes/[id]` | Muestra perfil de cliente, datos fiscales y notas. | **Implementar:** Pestaña "Contactos" y tabla `crm_clientes_contactos` para múltiples contactos y cargos. |
| **V1 — Paso 3** | Vendedor | `/empresa/cotizador/nueva` | Crea cotización asociando solo cliente general. | **Implementar:** Selector de contacto(s) destinatario(s) específico(s) del cliente al cotizar. |
| **V1 — Paso 4** | Vendedor | `/empresa/cotizador/[id]` | Envía correo a un único destinatario manual. | **Implementar:** Checklist de envío múltiple a comités de compra y tabla de auditoría `crm_cotizaciones_envios`. |
| **V1 — Paso 5** | Admin Empresa | `/registro` y `/empresa/nueva` | Registra empresa y cuenta inicial. | **Construir:** Pantalla `/empresa/configuracion` (o `/ajustes`) para permitir corregir NIT/País post-registro. |
| **V1 — Paso 6** | Usuario / Empleado | `/settings` | Permite editar nombres, clave y preferencias. | **Corregir:** Almacenamiento persistente de preferencias de notificación en base de datos. |
| **V1 — Paso 7** | Admin Empresa | `/empresa/equipo` | Gestión de invitaciones por rol general. | **Reforzar:** Aislamiento y permisos diferenciados por rol (administrador vs. vendedor). |
| **V2 — Paso 1** | Staff DPP | `/empresa/dpp/[id]` | Muestra detalle del activo y ciclos registrados. | **Construir:** Endpoint `PATCH` para edición del activo y registro estructurado de ciclos con datos de mano de obra/artesano (`responsable_intervencion_json`). |
| **V2 — Paso 2** | Admin Empresa | `/empresa/dpp/nuevo` | Formulario básico de activo (peso, foto, materiales). | **Implementar:** Estructuración bajo estándar ESPIR (UID, desglose $\ge 1\%$, sustancias SVHC, índice de reparabilidad 1-10, repuestos y tasa $R_{\text{fin\_vida}}$). |
| **V2 — Paso 3** | Admin Empresa | `/empresa/dpp` | Directorio básico de pasaportes digitales. | **Implementar:** Filtros avanzados por categoría, grado estético (A/B/C), estado de ciclo y trazabilidad física. |
| **V2 — Paso 4** | Público / Auditor | `/pasaporte/[codigo]` y `/verificar/[codigo]` | Vista pública básica del pasaporte. | **Implementar:** Vista enriquecida con componentes interactivos, insignia de artesano/taller, huella ambiental, manual de despiece y sello criptográfico SHA-256. |
| **V2 — Paso 5** | Admin Empresa | `/empresa/metas` | Metas ambientales básicas por objetivo numérico. | **Desarrollar:** Métricas financieras circulares: retención de valor ($RRV$), TCO unitario, costo evitado y $E\text{-}ROI$. |
| **V2 — Paso 6** | Admin Empresa | `/empresa/informes` | Generación de informes ejecutivos estándar. | **Implementar:** Reportes consolidados ejecutivos articulando impacto ambiental medido de pasaportes y metas. |
| **V2 — Paso 7** | Contacto B2B | `/cot/[token]/encuesta` | Encuesta de satisfacción (Likert) al cerrar cotización. | **Construir:** Encuesta (3 preguntas + 1 comentario) al ganar/perder. Si satisfacción > 70%, redirigir a calificar negocio en GMB (Manejo sucursales Bogotá/Medellín). |
| **V2 — Paso 8** | Admin Empresa | `/empresa/configuracion` | Exclusión de IPs internas para estadísticas. | **Implementar:** Gestión de IPs excluidas en configuración y filtro en el contador de vistas para no afectar métricas con accesos de administradores. |
| **V3 — Paso 1** | Admin Empresa | `/empresa/configuracion/marca` | Configura logo y WhatsApp de atención. | **Implementar:** Marca blanca completa en PDFs y correos dinámicos sin mención de Reúso. |
| **V3 — Paso 2** | Vendedor | `/empresa/cotizador` (Etapas) | Etapas estándar fijas del embudo de ventas. | **Implementar:** Personalización de nombres, colores y orden de etapas del embudo guardadas en BD por empresa. |
| **V3 — Paso 3** | Contacto B2B | `/cot/[token]` (Acciones) | Vista de solo lectura de la cotización. | **Implementar:** Botones interactivos de "Aprobar/Rechazar propuesta" con notificación inmediata. |
| **V3 — Paso 4** | Contacto B2B | `/cot/[token]` (Moneda) | Formato de moneda COP fijo. | **Implementar:** Formateador multimoneda automático de 23 países según país de la empresa emisora. |
| **V3 — Paso 5** | Plataforma Global | Toda la plataforma | Interfaz disponible en español. | **Implementar:** Soporte multiidioma (Español, Inglés, Portugués) con selector personalizado del sistema. |
