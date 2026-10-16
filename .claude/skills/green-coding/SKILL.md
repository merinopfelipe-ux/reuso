---
name: green-coding
description: Green Coding y Zero Waste digital a 2035 como regla universal de desarrollo, con reglas anti-greenwashing. Usar SIEMPRE antes de escribir o modificar código (frontend, API, SQL, crons, IA, correos, PDF) y antes de publicar cualquier cifra ambiental (UI, legales, Vault, correos). Tiene presupuestos de peso medidos, cómo medir y la regla de evidencia para cifras.
metadata:
  version: 1.0
  actualizado: 2026-10-16
---

# Green Coding y Zero Waste digital a 2035

## Regla universal
Aplica a TODO código nuevo o modificado. Primero se evita el desperdicio, después se mide. Una compensación nunca reemplaza una ineficiencia que se podía evitar. Si una regla de esta skill choca con una prisa, gana la regla y se documenta la excepción.

## 1. Regla de evidencia (anti-greenwashing)
1. Toda cifra ambiental que se publique (UI, legales, Vault, correos) lleva valor, unidad, método, fecha de medición y fuente. Si falta uno, no se publica.
2. Cada cifra se rotula **Medido**, **Estimado** o **Meta**. Una meta o proyección a 2035 nunca se presenta como estado actual.
3. Prohibido escribir a mano un número y describirlo como "real", "calibrado" o "medido". Un número en el código sin fuente es un error, igual que un secreto en el repo.
4. Compensaciones: solo se menciona una con certificado de retiro (registro, serial, fecha, toneladas). Sin certificado no existe y no se cita. Nunca se restan de las emisiones brutas.
5. Sin "Top X %", "neutral", "cero" ni "verificado" si no hay salida de la herramienta que lo respalde, con enlace. Website Carbon ahora exige clave (responde 401): sin clave no se cita.
6. Toda estimación de energía y CO2 nombra el modelo y su versión. Hoy se usa Sustainable Web Design v4: 0,194 kWh/GB operacional, 0,300 kWh/GB con energía incorporada, 494 g CO2e/kWh promedio mundial (Ember 2022). No mezclar factores de modelos distintos sin decirlo.
7. Lenguaje prudente (regla legal del CLAUDE.md): estimado, de referencia. La Directiva (UE) 2024/825 prohíbe afirmaciones ambientales genéricas sin sustento.

## 2. Reglas de código y cómo se verifican
| Área | Regla | Verificación |
|---|---|---|
| Peso de página | Cada página pública tiene tope en `scripts/presupuesto-verde.json`. El tope solo baja | `npm run verde:medir -- https://calculadoradereuso.com` |
| JavaScript | Sin librerías pesadas en la primera carga de rutas públicas (gráficos, editores, jsdom). Carga diferida con `import()` | `js_kb` de la herramienta y Lighthouse |
| Terceros | GA y Clarity solo con consentimiento. Todo script externo nuevo exige justificación escrita y carga diferida | Revisar `layout.tsx` y `microsoft-clarity.tsx` |
| Imágenes | `next/image`, WebP, dimensiones declaradas, carga diferida. AVIF está desactivado a propósito por GHSA-2xp9-vwfh-vxw4, no activarlo | `next.config.mjs` |
| Fuentes | Open Sans propia con `font-display: swap`. Nunca una fuente que se descargue donde no hace falta | Skill `seo-rendimiento` |
| Caché | Páginas públicas con ISR. Lecturas no personales con cabeceras de caché. `no-store` solo con motivo escrito | Revisar `revalidate` y `cache:` en el cambio |
| Consultas | Solo columnas necesarias, paginación o límite, índice para cada filtro y orden, sin N+1, consultas independientes en paralelo | `EXPLAIN` y revisión del cambio |
| Segundo plano | Sin polling. Crons con la frecuencia mínima necesaria e idempotentes. Nada de IA ni PDF que se dispare solo en cada carga | `vercel.json` |
| Datos | Retención definida y purga automática (por ejemplo audit_logs 2 meses). Sin duplicados. Sin archivos huérfanos en Storage | `sql/` y crons de purga |
| IA | Tokens mínimos, caché por nivel real de variación, imágenes comprimidas, el modelo más barato que cumpla | Regla de IA del CLAUDE.md |
| Archivos generados | PDF, Excel y ZIP solo bajo demanda | Revisar la ruta |
| Código muerto | Sin dependencias ni archivos sin uso. Correr `npx knip` al cerrar una fase | `npx knip` |
| Correos | Livianos, sin imágenes pesadas ni seguimiento innecesario | Skill `email-design` |

## 3. Presupuestos vigentes
Línea base medida el 2026-10-16 con bytes transferidos por la red (piso: HTML y recursos enlazados en el HTML). CO2 estimado con SWD v4, primera visita sin caché, rango entre operacional y con energía incorporada.

| Ruta | KB medidos | Tope | CO2 estimado (g por visita) |
|---|---|---|---|
| `/` | 477 | 500 | 0,044 a 0,067 |
| `/faq` | 429 | 450 | 0,039 a 0,061 |
| `/login` | 470 | 495 | 0,043 a 0,066 |
| `/registro` | 415 | 435 | 0,038 a 0,059 |
| `/legal` | 420 | 440 | 0,038 a 0,059 |
| `/legal/privacidad` | 430 | 450 | 0,039 a 0,061 |

Trinquete: cuando una página baje de peso, se baja su tope en el mismo commit. Subir un tope solo con justificación escrita y aprobación de Felipe. La herramienta no ve lo que se carga después (fragmentos diferidos, datos, terceros tras el consentimiento). Para el peso completo se usa Lighthouse desde el widget de PageSpeed de `/admin/qa`.

## 4. Trayectoria a 2035
- **Qué significa Zero Waste digital aquí**: cero bytes y cero cómputo evitables. Es una disciplina verificable con las reglas de la sección 2. No es una promesa de emisiones netas cero. Esa afirmación no se hace mientras no haya medición real del servidor y certificados de retiro.
- **Cada año** se revisan los topes y se bajan al peso medido. Se registra una tabla antes y después en el diario del Vault.
- **Metas a 2030 y 2035**: las fija Felipe sobre la base medida, rotuladas como Meta. No se inventan curvas.
- **Lo que hoy no se puede medir** y por eso no se publica: tráfico real mensual (GA o Vercel Analytics), energía de cómputo por cliente (ni Vercel ni Supabase la entregan) y factores del proveedor. Mientras tanto solo se publican el peso transferido y la estimación SWD por visita, con su rótulo.

## 5. Caso que originó esta skill (auditoría 2026-10-15)
El panel `digital-zero-waste` creado con otra IA tenía cifras escritas a mano y rotuladas como reales: 38,45 kWh al mes, 88,5 % renovable, 99,2 % de caché, 7,50 kg compensados con Gold Standard o Verra (no hay certificados), AVIF activo (está desactivado), Supavisor en el puerto 6543 (no se usa), 168,4 KB por página (el piso real es 477 KB) y "Top 15 %" de una herramienta que ya no responde sin clave. Tampoco cumplía el proyecto: 6 errores del chequeo de build por `uppercase`, 582 clases de color fuera del sistema de diseño, sin `ProteccionPublica`. Se puede reconstruir solo con cifras Medido, Estimado o Meta que cumplan la sección 1.

## 6. Listas antes de actuar
**Antes de comitear código**
1. ¿Subió el peso de alguna página pública? Corre `npm run verde:medir`.
2. ¿Agregué una dependencia o un script externo? Justificación escrita y carga diferida.
3. ¿Hay consulta nueva sin índice, sin límite o en bucle?
4. ¿Hay trabajo que se dispare solo en cada carga?
5. ¿Dejé código o dependencias sin uso?

**Antes de publicar una cifra ambiental**
1. Valor, unidad, método, fecha y fuente.
2. Rótulo Medido, Estimado o Meta.
3. Enlace a la herramienta o al cálculo, y se puede repetir.
4. Sin compensación sin certificado, sin ranking sin evidencia, sin palabras absolutas.
5. Revisión con la regla legal de objetividad del CLAUDE.md.
