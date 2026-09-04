---
name: modelo-negocio-reuso
description: Modelo de negocio, planes, límites, roles y diferencial de Calculadora de Reúso. LEER SIEMPRE antes de implementar cualquier feature relacionado con planes, permisos, empresa o usuarios.
---

# Modelo de negocio — Calculadora de Reúso

## ¿Quién es el cliente? (público objetivo)

La plataforma es un SaaS para **3 tipos de empresas o personas con negocio propio**, todas dentro de la economía circular (usan materiales u objetos reciclados/reusados, nunca materia prima nueva como su propuesta de valor):

1. **Restauración** — talleres que reparan/restauran muebles y objetos existentes (el caso de uso real de hoy, Lurdes).
2. **Diseño interior** — estudios que arman espacios con piezas reusadas/recicladas.
3. **Producto (moda o industrial)** — marcas que fabrican prendas u objetos nuevos a partir de materiales reciclados/reusados.

**No es un público genérico ni de consumo masivo.** Cada uno de los 3 necesita lo mismo del sistema (calcular y comunicar impacto ambiental, cotizar, trazabilidad DPP), pero el vocabulario de "ítem"/"mueble" en el Cotizador y el catálogo de materiales debe poder aplicar a los 3, no solo a mobiliario — ver "MOTOR LÓGICO UNIVERSAL" en `CLAUDE.md` (muebles es el primer caso real, no el techo del sistema). Antes de asumir que una feature o copy solo aplica a "muebles", verifica si también tiene sentido para diseño interior o producto moda/industrial.

---

## ¿Cómo genera ingresos?

Planes de suscripción pagados por **empresas**. El super_admin sube o baja el plan de cada empresa manualmente desde `/admin/empresas`. El campo de notas de la empresa sirve para registrar el pago recibido. **No hay pasarela de pagos integrada.**

---

## Planes y límites (valores oficiales)

Ver la tabla de referencia (nombres, IDs en BD, cálculos/informes/cotizaciones/empleados por plan) en la sección "ROLES, PLANES Y LÍMITES" de `CLAUDE.md` — no la dupliques aquí, se desactualiza. **Desde `sql/115`/`117`/`118` (2026-09) los planes ya NO son fijos en código**: la tabla `config_planes` (editable en `/admin/planes`, borrador→publicar, precio mensual y anual en COP/USD/EUR + límites) es la fuente real. `src/lib/plan-limits.ts` solo aplica esos límites y trae un respaldo fijo por si la base no responde — nunca es la fuente de verdad, solo el enforcement. Antes de dar un precio o límite por cierto, consulta `config_planes`, no asumas del código ni de esta tabla.

---

## Diferencial competitivo

1. **Certificados verificables con QR** — cada cálculo genera un certificado PDF con código RCO2-XXXX-YYYY y QR que apunta a `/verificar/[codigo]`. Verificable públicamente sin login.
2. **Enfoque exclusivo en reúso de objetos** — no compra nueva, no reciclaje clásico, sino el acto de reutilizar un objeto que ya existe (ropa, muebles, electrónicos, madera, etc.).
3. **Cotizador Inteligente con IA** — el comercial sube una foto, la IA identifica los ítems del catálogo universal y el motor calcula precio + CO₂ por unidad × cantidad. Disponible en los planes Impulso Sostenible e Impacto Ilimitado (ver `CLAUDE.md`, módulo ya implementado y conectado al catálogo universal, migración 031).

---

## Estructura de roles

### super_admin
- Control absoluto del SaaS. Nunca tiene empresa ni empresa_id.
- **No tiene calculadora propia** (rol de control, no de uso). Sus límites = cero (no aplican).
- Puede: cambiar planes manualmente, agregar notas de pago, crear categorías e ítems con factores científicos trazables, enviar alertas a todos o a empresas específicas, revocar certificados sospechosos.

### empresa_admin
- **Solo uno por empresa**. Gestiona UNA empresa.
- Puede: ver dashboard consolidado, invitar empleados (hasta el límite del plan), generar certificados e informes con el logo de su empresa.
- Sus propios cálculos **consumen cuota del plan** de la empresa.
- Desde el header (icono con su nombre) puede **cambiar a vista de empleado** → accede a `/dashboard`.
- **No puede**: cambiar su propio plan (solo el super_admin), ver datos de otras empresas, agregar un segundo admin.

### empleado
- Solo existe si fue **invitado** por un empresa_admin.
- Sus cálculos consumen cuota del plan empresarial.
- Genera certificados **a nombre de la empresa** (nunca personales).
- Si la empresa llega al límite mensual, ve alerta y no puede continuar hasta el siguiente ciclo.

### usuario_libre
- Plan Explora (`free`) obligatorio: 1 empleado (él mismo), ver límites exactos en `CLAUDE.md`.
- Ve los botones de certificado **deshabilitados con tooltip** explicativo.
- Único camino para subir de plan: ir a `/empresa/nueva` → crear empresa → pasa a ser `empresa_admin`.

**Regla fundamental**: todo usuario (excepto super_admin) SIEMPRE pertenece a exactamente una empresa.

---

## Flujo completo de onboarding

1. `usuario_libre` va a `/empresa/nueva` → crea su empresa → pasa a ser `empresa_admin`
2. `empresa_admin` va a `/empresa/equipo` → invita empleados por email
3. Invitado recibe email → abre `/invitacion/[token]` → se registra → queda como `empleado`
4. `empleado` usa `/dashboard` para calcular impacto, generar certificados (según plan)

---

## Notas de implementación

- Los límites se verifican en **cada API route** via `plan-limits.ts`, nunca solo en el frontend.
- El plan del usuario se obtiene de `empresa.plan` (no del perfil del usuario).
- El super_admin NO tiene `empresa_id` en su perfil.
- El Cotizador ya está implementado (ver arriba) y solo se habilita para planes con `cotizador: true` en `CLAUDE.md`.
