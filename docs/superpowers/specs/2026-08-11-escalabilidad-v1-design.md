# Plan de Acción: Escalabilidad de Reúso

## 1. Versionado, Seguridad y Estabilidad (Trabajo Seguro)

### A. Entorno de Taller y Datos Simulados (Desarrollo Local)
- **Objetivo:** Permitir el desarrollo y prueba de funcionalidades en computadoras locales con un ecosistema multi-empresa completo sin tocar jamás datos reales.
- **Paso a paso técnico de implementación:**
  1. **Unificación de Seeds:** Crear script `scripts/seed-ecosistema.mjs` que unifique la generación de datos de prueba estructurados.
  2. **Modelado de Datos Ficticios:** Poblar automáticamente dos empresas simuladas (Empresa A y Empresa B) con sus respectivos administradores, vendedores, clientes B2B con múltiples contactos, 5 cotizaciones en distintas etapas del embudo y 3 pasaportes DPP con ciclos.
  3. **Comando Estandarizado:** Integrar en `package.json` el comando ejecutable `npm run db:seed`.
  4. **Protección de Producción:** Incluir una guarda de seguridad al inicio del script que aborte la ejecución si detecta credenciales o variables de entorno de producción.

### B. Entorno de Ensayo Aislado (Staging y Previews)
- **Objetivo:** Disponer de una plataforma de ensayo idéntica a producción para validar cambios desde celulares y computadoras antes del lanzamiento público.
- **Paso a paso técnico de implementación:**
  1. **Segregación de Base de Datos:** Configurar un proyecto independiente de Supabase exclusivo para Staging/Testing.
  2. **Variables de Entorno en Vercel:** Asignar las credenciales de la base de datos de staging al entorno `Preview` de Vercel.
  3. **Protección de Acceso:** Habilitar autenticación de Vercel en despliegues de preview para evitar indexación en motores de búsqueda.
  4. **Protocolo de Validación Móvil:** Generar un enlace protegido por Pull Request para revisión del equipo comercial y técnico en dispositivos móviles previo a la integración.

### C. Integración y Subida Automática (Pipeline CI/CD)
- **Objetivo:** Automatizar la verificación de calidad de código, tipos y pruebas para impedir que errores o regresiones lleguen a la plataforma viva.
- **Paso a paso técnico de implementación:**
  1. **Workflow de GitHub Actions:** Crear `.github/workflows/ci.yml` que se dispare automáticamente en cada Pull Request dirigido a la rama `main`.
  2. **Validación de Código y Tipos:** Executar `npm run lint` (ESLint) y `npx tsc --noEmit` (verificación estricta de tipos TypeScript).
  3. **Pruebas Unitarias y de Lógica:** Ejecutar suite de pruebas con Vitest (`npm run test`) para validadores numéricos, formateo telefónico y cálculos de CO₂.
  4. **Pruebas de Interfaz End-to-End (E2E):** Ejecutar Playwright en modo headless para flujos críticos (autenticación, guardado de cotizaciones y creación de pasaportes).
  5. **Protección de Rama Principal:** Configurar en GitHub la regla de bloqueo de merges si los checks del CI no concluyen satisfactoriamente.

### D. Seguridad Multi-Tenant y Protección de Secretos (RLS y Auditoría)
- **Objetivo:** Garantizar el aislamiento inviolable de datos entre empresas y proteger credenciales sensibles de la plataforma.
- **Paso a paso técnico de implementación:**
  1. **Automatización de Pruebas RLS:** Incorporar el script `scripts/run-rls-test.ts` en el pipeline de CI para simular intentos de lectura y modificación cruzada entre empresas.
  2. **Prevención de Fuga de Secretos:** Configurar Husky y Gitleaks (`.gitleaks.toml`) en pre-commit para bloquear la inclusión accidental de claves de servicio, tokens de API o contraseñas en los commits.
  3. **Monitoreo de Dependencias:** Mantener activo el análisis automatizado de vulnerabilidades en paquetes mediante Dependabot.

### E. Estrategia de Rollback y Migraciones Seguras (Zero-Downtime)
- **Objetivo:** Asegurar la continuidad operativa del sistema y permitir revertir versiones en segundos sin desestabilizar la base de datos.
- **Paso a paso técnico de implementación:**
  1. **Patrón de Migración Expandir-Contraer:** Toda modificación de base de datos se realiza en fases: primero se crean columnas o tablas nuevas con valores por defecto (aditivas); solo en versiones posteriores se retiran estructuras obsoletas.
  2. **Versionado Semántico:** Etiquetar cada versión desplegada en Git mediante tags estructurados (`v1.0.0`, `v1.1.0`).
  3. **Rollback Inmediato en Vercel:** Mantener configurada la reversión con 1 clic en Vercel hacia la versión estable anterior ante cualquier eventualidad.

## 2. Escalabilidad (Fases V1, V2 y V3)

### Versión 1 (V1) — Listo para Producción (Ventas B2B y Aislamiento Base)
- **Catálogos Privados:**
  - **Acción:** Construir `/empresa/catalogo` para que cada empresa administre sus propios materiales.
  - **Meta:** Promover la eficiencia en las ventas evitando que los vendedores busquen entre materiales de terceros.

- **Múltiples Contactos por Cliente:**
  - **Acción:** Agregar pestaña "Contactos" en clientes y permitir seleccionar a varios al enviar propuestas.
  - **Meta:** Facilitar que la propuesta llegue directo a los miembros del comité de compras registrados de manera estructurada.

- **Estabilización de Cuenta:**
  - **Acción:** Implementar mejoras en ajustes de NIT/país post-registro y corregir almacenamiento persistente de preferencias del usuario.
  - **Meta:** Garantizar un flujo operativo de administración e inicio de ventas sin fricciones.

### Versión 2 (V2) — Pasaporte Digital de Producto (DPP) y Métricas Avanzadas
- **Trazabilidad Normativa (DPP / ESPIR UE 2024/1781) y Mano de Obra Local:**
  - **Acción:** Estructurar el Pasaporte Digital de Producto con base en la normativa europea ESPIR adaptada a Latinoamérica:
    1. Identificación digital única (UID / GS1 Digital Link vía QR).
    2. Composición porcentual de materiales ($\ge 1\%$), contenido reciclado y sustancias SVHC/REACH.
    3. Puntuación de Reparabilidad (1-10), manual de desensamble y repuestos garantizados.
    4. Trazabilidad de ciclos con firma de mano de obra y taller (`responsable_intervencion_json`: nombre, oficio, taller, horas hombre y sello de calidad).
    5. Edición post-creación vía `PATCH` y medición de Tasa de Reciclabilidad al fin de vida ($R_{\text{fin\_vida}} = \frac{\sum M_{\text{reciclables}}}{M_{\text{total}}} \times 100$).
    6. Sello criptográfico SHA-256 (`hash_integridad`) anti-greenwashing.
  - **Meta:** Proveer verificación pública, trazabilidad multiciclo ($CO_{2,\text{acumulado}} = CO_{2,\text{base}} \times N_{\text{ciclos}}$), valorización del trabajo artesanal y cumplimiento con comités de compra internacionales.

- **Métricas Avanzadas de Valor y Finanzas Circulares:**
  - **Acción:** Desarrollar cálculos e indicadores financieros y de circularidad que sustenten el retorno de inversión:
    1. **Ratio de Retención de Valor:** $RRV (\%) = \left(\frac{\text{Precio Mercado Recuperado}}{\text{Precio Mercado Nuevo}}\right) \times 100$.
    2. **Costo Total de Propiedad por Ciclo:** $TCO_{\text{ciclo}} = \frac{C_{\text{adquisición}} + C_{\text{operación}} + C_{\text{mantenimiento}} + C_{\text{disposición}} - V_{\text{reventa}}}{\max(N_{\text{ciclos}}, 1)}$.
    3. **Costo Económico Evitado:** $Costo_{\text{evitado}} = (P_{\text{virgen}} \times Q_{\text{circular}}) + C_{\text{disposición\_evitado}} + C_{\text{impuesto\_evitado}}$.
    4. **Retorno de Inversión Circular:** $E\text{-}ROI (\%) = \left(\frac{\text{Ahorro Operativo} + Costo_{\text{evitado}}}{\text{Inversión Circular}}\right) \times 100$.
    5. **Tasa de Inflow Circular:** $Inflow_{\text{circular}} (\%) = \left(\frac{M_{\text{secundario}} + M_{\text{renovable}}}{M_{\text{total\_input}}}\right) \times 100$.
  - **Meta:** Sustentar cuantitativamente el retorno financiero, el ahorro en costos de adquisición y el valor residual retenido de los activos sostenibles.


### Versión 3 (V3) — Idiomas, Monedas, Personalización Avanzada y Marca Blanca
- **Internacionalización y Formatos:**
  - **Acción:** Mapear la moneda oficial de múltiples países y permitir traducción/adaptación de formatos e idiomas de manera automática.
  - **Meta:** Facilitar transacciones y visualización de propuestas según el contexto regional del cliente.

- **Personalización y Marca Blanca:**
  - **Acción:** Integrar marca blanca (logo y WhatsApp del vendedor en correos/PDFs sin branding de Reúso), personalización de etapas de embudo por empresa y botones interactivos de aprobación en propuestas.
  - **Meta:** Ofrecer una experiencia corporativa autónoma y adaptada a la identidad visual de cada empresa.

---
👉 **[Ver Anexos y Tareas de Desarrollo](file:///Users/merinop/Documents/Automatizaciones/Reuso/docs/superpowers/specs/2026-08-11-escalabilidad-v1-anexos.md)**
