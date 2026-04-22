---
name: modelo-negocio-reuso
description: Modelo de negocio, planes, límites, roles y diferencial de Calculadora de Reúso. LEER SIEMPRE antes de implementar cualquier feature relacionado con planes, permisos, empresa o usuarios.
---

# Modelo de negocio — Calculadora de Reúso

## ¿Cómo genera ingresos?

Planes de suscripción pagados por **empresas**. El super_admin sube o baja el plan de cada empresa manualmente desde `/admin/empresas`. El campo de notas de la empresa sirve para registrar el pago recibido. **No hay pasarela de pagos integrada.**

---

## Planes y límites (valores oficiales)

| Plan | Empleados | Cálculos/mes | Certificados/mes | CSV |
|---|---|---|---|---|
| **Free** | 1 | 5 | 0 | No |
| **Pyme** | 3 | 15 | 5 | No |
| **Corporativo** | 5 | 25 | 10 | No |
| **Enterprise** | ∞ | ∞ | ∞ | Sí |

Estos límites están implementados en `src/lib/plan-limits.ts`.

---

## Diferencial competitivo

1. **Certificados verificables con QR** — cada cálculo genera un certificado PDF con código RCO2-XXXX-YYYY y QR que apunta a `/verificar/[codigo]`. Verificable públicamente sin login.
2. **Enfoque exclusivo en reúso de objetos** — no compra nueva, no reciclaje clásico, sino el acto de reutilizar un objeto que ya existe (ropa, muebles, electrónicos, madera, etc.).
3. **Módulo de cotización** (futuro, solo plan Pyme) — cotiza diseños desde la circularidad. Aún no implementado.

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
- **No puede**: cambiar su propio plan (solo el super_admin), ver datos de otras empresas, agregar un segundo admin, exportar CSV (salvo Enterprise).

### empleado
- Solo existe si fue **invitado** por un empresa_admin.
- Sus cálculos consumen cuota del plan empresarial.
- Genera certificados **a nombre de la empresa** (nunca personales).
- Si la empresa llega al límite mensual, ve alerta y no puede continuar hasta el siguiente ciclo.

### usuario_libre
- Plan Free obligatorio: 1 empleado (él mismo), 5 cálculos/mes, 0 certificados, sin CSV.
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
- El cotizador de circularidad es **solo para plan Pyme** y aún no está implementado.
