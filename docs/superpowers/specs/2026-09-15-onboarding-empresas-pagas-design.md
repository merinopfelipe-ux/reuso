# Onboarding directo para empresas que ya pagaron — Design

## Contexto

Hoy solo existe **un** camino para crear una empresa: autogestión pura. Un `usuario_libre` se registra por su cuenta, va a `/empresa/nueva`, llena un formulario completo (nombre, NIT, teléfono, país, región, ciudad, sitio web — todos obligatorios, verificado en `crear/route.ts`), y al enviarlo queda como `empresa_admin` de una empresa que **siempre nace en plan Free** (fijo en código, `crear/route.ts:84`). No existe ningún camino donde el `super_admin` cree una empresa o invite a alguien a ser dueño de una empresa que todavía no existe — confirmado con grep exhaustivo: no hay endpoint `POST` de creación de empresa fuera de `/api/empresa/crear`, y esa página redirige al `super_admin` si intenta entrar.

El problema real: cuando alguien **ya compró** un plan pago, hoy no hay forma de darle acceso directo a ese plan — tendría que registrarse como Free y esperar a que el `super_admin` le cambie el plan manualmente después, sin ningún onboarding guiado.

Investigación adicional que informa este diseño (verificada en código real, no supuesta):
- El PDF de un Informe (`generar-pdf.ts` + `informes/generar/route.ts`) solo usa `nombre` y `logo_url`/`logo_propuesta_url` de la empresa. El PDF/reporte del DPP no usa ningún campo de empresa. **NIT, teléfono, país, región, ciudad, sitio web y sector nunca aparecen en ningún documento generado hoy** — no hay ninguna validación real de "faltan datos" en el código actual.
- El sector CIIU no alimenta ningún cálculo real hoy (grep sin resultados en `src/lib/calculos/` y `src/lib/reportes/`). Es la base de una función futura ("Técnica G", promedio sectorial CIIU/DANE) que **no está construida**.
- La DIAN permite registrar hasta 3 códigos CIIU por empresa (principal + 2 secundarios/otras actividades) — fuente: sitios de información tributaria colombiana consultados el 2026-09-15. El DANE, al clasificar estadísticamente una empresa, **no tiene en cuenta las actividades secundarias**, solo la principal — fuente: página oficial del DANE sobre clasificación CIIU.
- Editar datos de empresa hoy es exclusivo de `empresa_admin` (`api/empresa/config/route.ts`), y ese endpoint solo permite `nombre`, `sector`, `logo_url` — ni siquiera el propio `empresa_admin` puede editar NIT/teléfono/país/ciudad hoy; esos campos solo los toca el `super_admin` vía `PATCH /api/admin/empresas/[id]`.
- El sistema de invitaciones de empleados (`api/empresa/invitar`, `/invitacion/[token]`) exige `empresa_id` no nulo — está diseñado para invitar a alguien a una empresa que ya existe, nunca para crear una.

## Alcance: qué se toca y qué no

**No se toca, queda exactamente igual:** el flujo de autogestión (`usuario_libre` → `/empresa/nueva` → Free, formulario completo obligatorio). Es un camino de entrada aparte, ya probado, que sigue funcionando como hoy.

**Se construye:** un segundo camino de entrada, exclusivo para cuando el `super_admin` ya sabe que alguien compró un plan pago.

## 1. Flujo de invitación del super_admin

Un solo formulario nuevo en `/admin/empresas`, botón **"Invitar empresa nueva"**:
- Correo del dueño (obligatorio).
- Plan comprado: Circular Lab / Impulso Sostenible / Impacto Ilimitado (obligatorio, nunca Free).
- Nombre de la empresa (**opcional**).

**Si el super_admin pone el nombre:** la empresa se crea de inmediato con `nombre` + el `plan` elegido. El dueño recibe el correo de invitación y, al aceptar, solo crea su cuenta (contraseña) — entra directo a una empresa que ya existe, como `empresa_admin`.

**Si lo deja vacío:** el correo lleva un token "abierto" (sin empresa asociada todavía). Al aceptar, el dueño ve un formulario corto: **nombre + NIT + teléfono + país + ciudad** (los 5 campos obligatorios de la sección 2). Al enviarlo, se crea la empresa con esos datos + el plan que ya venía fijado desde la invitación (nunca cae en Free). El dueño queda como `empresa_admin`.

El NIT que el dueño escribe aquí es exactamente "la primera vez que alguien lo completa" de la regla especial de la sección 3: después de este momento, solo el `super_admin` puede cambiarlo — el propio dueño ya no podrá editarlo después, aunque haya sido quien lo escribió.

En ambos casos, el dueño **nunca ve el formulario largo de `/empresa/nueva`** ni cae en Free.

## 2. Campos de empresa: qué bloquea crear la empresa y qué solo dispara el recordatorio

Importante: lo único que de verdad es obligatorio para que la empresa **exista** es `nombre` + `plan` — eso nunca falta, porque ambos casos del flujo (sección 1) los piden desde el primer paso. Todo lo demás nunca bloquea la creación, en ninguno de los 2 caminos:

- **Camino A (super_admin crea con nombre puesto)**: la empresa nace con solo `nombre` + `plan`. NIT, teléfono, país y ciudad quedan pendientes desde el primer momento.
- **Camino B (token abierto, dueño llena al aceptar)**: como el dueño ya está llenando un formulario en ese momento, se le pide de una vez NIT + teléfono + país + ciudad junto con el nombre — no porque sean "obligatorios para crear", sino porque es el momento natural de pedirlos y evitar que queden pendientes desde el día uno.

| Campo | ¿Dispara el banner de recordatorio si falta? |
|---|---|
| NIT | Sí |
| Teléfono | Sí |
| País | Sí |
| Ciudad | Sí |
| Región | No |
| Sitio web | No |
| Dirección física | No |
| CIIU principal | No |
| CIIU complementario (hasta 2) | No |
| Logo | No (además, ni se ofrece en plan Free) |

**Ningún campo faltante bloquea técnicamente generar Informes o DPP** — confirmado que hoy el código no valida nada de esto. Lo que existe es un **banner fijo y permanente** (nunca un popup, nunca interrumpe el clic de generar) en `/empresa` y `/empresa/configuracion`, visible mientras falte NIT, teléfono, país o ciudad — es un recordatorio, no un candado.

## 3. Quién puede editar cada campo

- **NIT — regla especial**: lo escribe **quien complete los datos por primera vez** (el dueño al aceptar la invitación abierta, o cualquier empleado después si quedó pendiente). Una vez guardado por primera vez, **solo el `super_admin` puede cambiarlo** — nadie del equipo de la empresa, ni siquiera el `empresa_admin`.
- **Nombre, teléfono, país, ciudad, región, sitio web, dirección, CIIU (principal y complementarios)**: cualquier empleado invitado de esa empresa puede editarlos, en cualquier momento — esto es un cambio de permiso respecto a hoy (hoy es exclusivo de `empresa_admin`, y ni siquiera él puede tocar la mayoría de estos campos).
- **Logo**: cualquier empleado invitado, salvo que el plan sea Free — ahí el campo ni se muestra.

## 4. CIIU: principal + hasta 2 complementarios

Aunque la DIAN permite hasta 3 códigos, el DANE solo usa el principal para clasificar estadísticamente una empresa — los secundarios no tienen peso para ninguna función real, ni hoy ni en la futura "Técnica G" de promedio sectorial. Por eso:
- Se guardan los 3 (para que coincida con lo que la empresa tiene registrado ante la DIAN), pero **solo el CIIU principal se usará** el día que se construya la función de promedio sectorial.
- Los 3 son opcionales, sin ninguna prioridad de llenado sobre otros campos.

## 5. Modelo de datos (dirección técnica, sin detalle de migración exacta todavía)

- `empresas`: agregar `sector_ciiu_principal` (texto, opcional) y `sector_ciiu_secundarios` (lista de hasta 2 textos, opcional) — reemplaza conceptualmente al campo `sector` actual de texto libre, sin borrar la columna vieja (regla expandir-contraer).
- Tabla de invitaciones: necesita soportar `empresa_id` nulo + guardar el `plan` elegido, para el caso del token "abierto". Puede ser una extensión de la tabla actual de invitaciones de empleados, o una tabla nueva — se decide en la fase de plan, no aquí.
- Nuevo endpoint (o ampliación de `api/empresa/config`) que acepte NIT/teléfono/país/ciudad/región/sitio_web/dirección/CIIU, con el permiso ampliado a cualquier empleado, y la regla especial de NIT (solo escribible una vez por cualquiera, después solo por `super_admin`).

## Fuera de alcance de este diseño

- La función de promedio sectorial CIIU/DANE ("Técnica G") — no se construye aquí, solo se deja el dato disponible para cuando se construya.
- El hueco de `F_U` (peso de insumos para el MCI) — tema aparte, ya identificado, pendiente de diseñar después de este.
