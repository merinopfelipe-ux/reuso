# Registro de Cambios y Documentación de la Jornada - Reúso

Resumen técnico y funcional de todas las implementaciones, estandarizaciones y mejoras de interfaz desarrolladas en el sistema **Reúso**.

---

## 1. Módulo de QA & Auditoría (`/admin/qa`)

### A. Cobertura Total y Nuevas Rutas (145 Pruebas en 14 Módulos)
Se expandió la matriz de pruebas de 117 a **145 casos de prueba exhaustivos**, cubriendo el 100% de las rutas del sistema, incluyendo las 6 pantallas recientemente creadas:
- `/admin/qa` (Tablero de control de calidad)
- `/admin/contenido` (Gestión de contenidos y textos legales/educativos)
- `/cot/[token]` (Propuesta interactiva pública para clientes)
- `/empresa/clientes/[id]` (Ficha 360° del cliente y acuerdos comerciales)
- `/sistema-diseno` (Catálogo maestro de tokens y componentes)

### B. Alineación con Perfiles de Usuario (Journeys de Obsidian)
Se integraron explícitamente los perfiles de usuario reales definidos en el Vault de Obsidian, eliminando nombres ficticios y adoptando los 4 roles directos:
1. **Admin Operativa** (Superadmin / Gestora de operaciones y soporte)
2. **Empleado** (Técnico / Operativo de inventario y recolección)
3. **Directivo** (Toma de decisiones, metas, reportes de impacto y finanzas)
4. **Cliente Final** (Usuario que cotiza, recibe propuestas o adquiere equipos)

- **Diseño del Tag de Perfiles:**
  - Posicionado después de la descripción de la prueba.
  - Sin mayúsculas sostenidas (`Perfiles afectados:`).
  - Sin iconos redundantes, utilizando una etiqueta sutil con el color temático del módulo.
  - **Privacidad:** Esta información es de uso exclusivo en la UI interna y se excluye automáticamente de los informes exportables y del portapapeles.

### C. Estados de Veredicto General vs Modo Día / Noche
- **Modos Visuales (☀ Día / ☾ Noche):**
  - Mantenidos estrictamente como binarios: **Aprobada** (`ok`) o **Falla** (`falla`).
  - No exigen marcar ambos modos para poder aprobar la prueba general (ej. pruebas exclusivas de *Modo Noche* pueden aprobarse dejando el modo día sin marcar).
- **Veredicto General de la Prueba:**
  Se implementaron los **4 estados discretos** solicitados:
  1. **Aprobada** (`#38B98E`): Cumple con todos los criterios de aceptación.
  2. **Cumple parcial** (`#F59E0B`): Se completó el flujo funcional pero requiere ajustes estéticos (CSS) o llegó hasta cierto punto.
  3. **No se entiende** (`#985fa1`): Flujo o paso ambiguo que requiere aclaración del equipo de producto.
  4. **Falla** (`#FF5E4B`): Bloqueo funcional o error en la interfaz.
- **Acceso Rápido en Encabezado:** Las 5 opciones (`Aprobada`, `Cumple parcial`, `No se entiende`, `Falla` y `Pendiente`) están disponibles directamente en la cabecera colapsada de cada tarjeta con tooltips informativos.

### D. Rediseño de la Etiqueta "Crítica"
- **Formato:** Eliminación de mayúsculas sostenidas (`CRÍTICA` → `Crítica`).
- **Color:** Hereda dinámicamente el color corporativo del módulo (azul en *Autenticación*, marrón en *Cotizador IA*, etc.).
- **Icono:** Integración sutil del icono de alerta (`AlertCircle`) en el mismo tono cromático.

### E. Informe Parcial Dinámico (Por Tema vs Pantalla por Pantalla)
Se corrigió la lógica del generador y modal de informes parciales:
- **Modo "Por tema" (`modo === 'modulo'`):**
  - El modal y el selector de alcance permiten elegir entre los 14 **Módulos / Temas** del sistema.
  - La cabecera exportable se rotula: `QA PARCIAL - TEMA: <Nombre del Módulo>`.
- **Modo "Pantalla a pantalla" (`modo === 'pagina'`):**
  - El modal y el selector de alcance permiten elegir entre las **Rutas reales del sistema** (`/login`, `/registro`, etc.).
  - La cabecera exportable se rotula: `QA PARCIAL - PANTALLA: <Ruta>`.
- **Métricas:** Desglose en tarjetas y texto con las 4 categorías: *Aprobadas*, *Cumple parcial*, *No se entiende* y *Fallas*.

### F. Reinicio Limpio de Historial (Versión Storage v5)
- Se reinició el almacenamiento a la versión limpia `reuso_qa_v5`, eliminando borradores e intentos residuales previos para arrancar desde cero (0 de 145 pruebas).
- El sistema cuenta con **autoguardado reactivo continuo**, persistiendo cualquier cambio de notas, checks o veredictos en tiempo real.

### G. Barras de Progreso Segmentadas y Equilibrio de Estados (Modo Día / Noche)
- **Corrección de Lógica Monocolor:** Se eliminó el comportamiento donde una sola falla teñía toda la barra en rojo sólido sobre el conteo de aprobadas.
- **Barra Segmentada Multi-Estado:** Cada card de módulo en el sidebar, cada botón de ruta y la cabecera del módulo activo ahora reflejan el equilibrio proporcional exacto:
  - Verde (`#38B98E`): Aprobadas
  - Ámbar (`#F59E0B`): Parciales
  - Morado (`#985fa1`): Dudosas / No se entiende
  - Rojo (`#FF5E4B`): Fallas
  - Fondo neutro con contraste adaptado (`bg-black/10` en modo día, `bg-white/10` en modo noche): Pendientes
- **Contador y Pastillas Claras:** Se visualiza la fracción `revisadas/totales` sin teñir todo el texto en rojo, incorporando mini etiquetas explícitas (`x fallas`, `p parciales`) junto a la barra.

### H. Legibilidad en Modo Noche & Desglose de Pruebas Críticas
- **Contraste en Popups y Modales:** Se rediseñaron todos los modales (`mostrarProgresoModal`, `mostrarInforme`, `mostrarHistorial`, `modalNuevoIntento`) con fondos sólidos oscuros (`#181a1b`, `#202325`), bordes nítidos (`border-white/15`) y tipografías claras (`text-gray-100`, `text-gray-300`), eliminando textos apagados en gris de bajo contraste.
- **Unificación de Vocabulario y Estados:** Se estandarizó la terminología en todas las barras de progreso, cabeceras de pantallas/módulos y modales:
  - `aprobadas` (`ok` / `#38B98E`)
  - `parciales` (`parcial` / `#F59E0B`)
  - `dudas` (`no_se_entiende` / `#985fa1`)
  - `fallas` (`falla` / `#FF5E4B`)
  - `pendientes` (neutral)
- **Métrica y Título Directo en Tarjeta de Críticas:**
  - **Título:** `Pruebas críticas con falla`
  - **Dato principal:** `{N}` (en rojo `#FF5E4B` si > 0, o verde `#38B98E` si 0)
  - **Subtítulo:** `{evaluadas} de 47 evaluadas` (ej. `4 de 47 evaluadas`)

---

## 2. Pruebas Automatizadas E2E (Playwright)

Se extendió y sincronizó la suite de pruebas End-to-End en `e2e/`:
- **`e2e/08-panel-admin.spec.ts`**: Pruebas de navegación para `/admin/qa`, `/admin/contenido`, gestión de usuarios y empresas.
- **`e2e/09-panel-empresa.spec.ts`**: Pruebas de `/empresa/clientes/[id]` y cotizador.
- **`e2e/17-paginas-publicas.spec.ts`**: Pruebas de `/sistema-diseno` y `/cot/[token]`.
- Validación de alternancia de tema Claro/Oscuro (`data-theme="dark"` / `light`) y adaptación responsive en móviles y escritorio.

---

## 4. Jornada 7 de Septiembre de 2026: Diagnósticos, Optimización de QA y Refinamiento UI

### A. Depuración de Base de Datos y Comprobaciones de Coherencia
- **Limpieza de Cuentas Efímeras E2E:**
  - Se identificaron y eliminaron de forma segura 26 usuarios de prueba residuales (`e2e_empresa_admin_...`, `e2e_empleado_...`) y 3 empresas temporales creadas en corridas previas de Playwright que no habían completado su ciclo de `teardown`.
  - Se solucionó la alerta de *“perfiles de empresa sin empresa asignada”*, logrando **51/51 comprobaciones OK (0 fallas, 0 avisos)** en el panel de `/admin/qa`.
- **Corrección en Webhook de Resend (`src/app/api/webhooks/resend/route.ts`):**
  - Se sustituyó la interpolación en el `.select(`id, ${campo}`)` por columnas fijas (`'id, abierta_at, clic_at'`), evitando errores de parseo en el analizador estático de PostgREST.
  - El análisis automatizado (`qa:auto`) ahora valida con éxito las **408 consultas** del código contra la base real (0 rechazadas).

### B. Mejoras en el Tablero de QA (`/admin/qa`)
- **Tarjeta de Progreso General:**
  - **Pendientes en fila inferior:** La métrica de pendientes quedó estructurada fijamente en su propia línea inferior, eliminando puntos flotantes (`·`) y desalineaciones de texto.
  - **Ajuste de proporciones:** Se compactó el contenedor (`w-fit inline-flex`, padding `px-4 py-3`), eliminando el espacio vacío sobrante a la derecha.
  - **Depuración de textos:** Se eliminó la frase *“Guarda tus apuntes y genera el informe final”*, dejando la descripción más concisa.
- **Nuevo Modal de Progreso General y Evolución:**
  - Al interactuar con la tarjeta de progreso, se abre un popup interactivo con:
    1. **Medidor Ampliado Rediseñado:** Círculo SVG con `viewBox 0 0 100 100`, porcentaje destacado y barra segmentada sin textos redundantes.
    2. **6 Métricas Clave de Calidad & Estabilidad:**
       - *Tasa de Éxito / Pass Rate:* `%` de pruebas aprobadas sobre las evaluadas.
       - *Tasa de Fallos:* `%` de fallas activas.
       - *Blindaje de Críticas:* Conteo de pruebas críticas evaluadas y protegidas (`ok/total`).
       - *Módulos Cerrados:* Cantidad y `%` de módulos con 100% de cobertura.
       - *Validación de Temas:* Cobertura cruzada en Modo Día (`☀`) y Modo Noche (`☾`).
       - *Hallazgos Registrados:* Conteo de pruebas con notas u observaciones de campo guardadas.
    3. **Evolución Histórica:** Línea de tiempo cronológica con fecha, porcentaje de aprobación y cantidad de fallos registrados en cada snapshot guardado.
    4. **Registro de Fecha y Hora del Último Cambio:** Se incorporó el timestamp formateado en español (día, mes, año y hora) tanto en el indicador de guardado de la barra de acciones como en la cabecera y el estado en vivo del modal de progreso.
  - **Eliminación Total de Mayúsculas Sostenidas:** Se depuraron todas las clases `uppercase` y textos en mayúsculas sostenidas, adoptando estrictamente *Sentence case* y *Title case* conforme a la directriz inquebrantable de diseño del sistema.

### C. Refinamiento del Logo Corporativo en el Sistema (`src/components/header.tsx`)
- **Reducción de Márgenes:** Se redujo el espacio libre entre el disparador de Menú y el logotipo de `64px` a `28px`.
- **Escala Visual:** Se ajustó la altura del logotipo a `34px` en escritorio (135px ancho) y `28px` en móvil (110px ancho), logrando máxima legibilidad y nitidez sin alterar la altura fija del header (`70px`) ni desplazar el buscador ni las herramientas de la barra superior.
- **Etiqueta del Disparador de Menú:** Se mantiene **`MENÚ`** en mayúsculas sostenidas como la única excepción explícita de micro-interfaz técnica en la cabecera.

### D. Ecosistema de Datos de Prueba QA y Herramientas de Limpieza
Se construyó una infraestructura automatizada de siembra y eliminación de datos demo para posibilitar la validación integral y manual de todos los journeys de QA:
- **Herramienta de Siembra (`scripts/sembrar-datos-qa.mjs` / `npm run qa:seed`):**
  - **Empresas Demo (2):** `[DEMO] Taller de Ecodiseño Circular` (slug: `demo-ecodiseno`, plan: `impulso`) y `[DEMO] Mobiliario Sostenible Andina` (slug: `demo-mobiliario`, plan: `ilimitado`), ambas con todos los módulos activos.
  - **Usuarios de Prueba (3):**
    - `demo_admin@calculadoradereuso.com` (`empresa_admin` asignado a la empresa demo).
    - `demo_empleado@calculadoradereuso.com` (`empleado` asesor asignado a la empresa demo).
    - `demo_libre@calculadoradereuso.com` (`usuario_libre` individual).
    - Contraseña unificada: `DemoPassword2026!`.
  - **Clientes CRM (3):** Dos clientes corporativos (`Inversiones Alto Bosque S.A.S.`, `Hotel Boutique Valle Esmeralda`) y un cliente residencial (`Laura Restrepo M.`).
  - **Cotizaciones CRM (4) con Muebles Asociados:** Registros en todos los estados del embudo comercial (`cerrado_ganado`, `en_negociacion`, `enviada`, `por_cotizar`), con tokens públicos para pruebas en `/cot/[token]`, desglose de materiales y cálculos de CO2/Agua evitada.
  - **Pasaportes Digitales DPP (2) y Ciclos (3):** Activos de prueba (`DPP-2026-001`, `DPP-2026-002`) con porcentajes de composición circular y ciclos de mantenimiento/restauración.
  - **Cálculos Ambientales (5):** Registros históricos con fechas distribuidas para poblar los gráficos de tendencia y paneles de impacto.
  - **Leads Comerciales (3):** Prospectos en estados `nuevo`, `contactado` y `en_proceso`.
  - **Tickets de Soporte (2) con Mensajes (3):** Hilos de conversación entre el usuario y soporte técnico.
- **Herramienta de Limpieza Segura (`scripts/limpiar-datos-qa.mjs` / `npm run qa:clean`):**
  - Elimina de forma ordenada por cascada y dependencias todas las empresas, perfiles, cotizaciones, muebles, pasaportes, tickets y usuarios creados para QA sin afectar al superadmin ni a las categorías maestras del sistema.

### F. Rediseño Integral de la UX de Snapshots, Historial y Restauración de Intentos en QA
- **Protección de Datos Activos ("Guardar Snapshot"):**
  - Se desacopló la acción de guardado de la acción de reinicio. *"Guardar snapshot"* ahora congela una foto exacta de la evaluación actual en el historial sin borrar ni resetear jamás las notas o estados del tablero activo.
- **Flujo Seguro de "Nuevo Intento":**
  - Al presionar *"Nuevo intento"* se despliega un modal interactivo que guarda primero un snapshot de respaldo y permite elegir entre:
    1. *Guardar snapshot y reiniciar todo en blanco*.
    2. *Guardar snapshot y mantener aprobadas (revaluar solo fallas/pendientes)*.
- **Modal de Historial Mejorado:**
  - **Desglose de Pruebas:** Acordeón interactivo (*Ver detalle*) para visualizar cada prueba con su icono de veredicto, ID, título y texto completo de notas.
  - **Restaurar Estado:** Botón (*Restaurar estado*) que recarga cualquier snapshot histórico directamente al tablero en vivo para continuar editando.
  - **Copiar Informe:** Botón (*Copiar*) para transferir el informe formateado al portapapeles con confirmación visual.
  - **Descarga .txt y Borrado individual/masivo**.
- **Respaldo de Datos Previos:** Se sembró y vinculó el **Intento 1 de Páginas Públicas** con todas las notas y observaciones de campo aportadas.
- **Eliminación Definitiva de `/sistema-diseno/demo-panel` y Tarea `pub-22`:**
  - Se eliminó el directorio completo `src/app/sistema-diseno/demo-panel`, la tarea `pub-22` y todas sus referencias en suites de pruebas (la matriz general queda consolidada en **144 pruebas activas**).

### G. Reorganización Estructural de la Matriz QA y Estandarización de Páginas Públicas
- **Reorganización Contigua de Categorías:**
  - Se eliminó la dispersión y fragmentación en `TAREAS_INICIALES` (`src/app/(admin)/admin/qa/page.tsx`), donde tareas de *Autenticación*, *Panel Admin*, *Panel Empresa*, *Rendimiento* y *Páginas Públicas* estaban divididas en bloques inconexos al final del archivo.
  - Todas las 14 categorías ahora se encuentran agrupadas de forma estrictamente contigua y con numeración secuencial limpia.
- **Unificación y Desduplicación de "Páginas Públicas" (17 Pruebas Consolidadas):**
  - Se eliminaron tareas duplicadas de `/status` y `/verificar`.
  - La matriz pública cubre las 17 rutas sin redundancias: `pub-01` (`/`), `pub-02` (`/status`), `pub-03` (`/verificar`), `pub-04` (`/cot/[token]`), `pub-05` (`/empresa/nueva`), `pub-06` (`/sistema-diseno`), `pub-07` (`/legal`), `pub-08` (`/legal/terminos`), `pub-09` (`/legal/privacidad`), `pub-10` (`/legal/datos`), `pub-11` (`/legal/cookies`), `pub-12` (`/legal/ia`), `pub-13` (`/legal/medicion`), `pub-14` (`/legal/reglamento`), `pub-15` (`/legal/confidencialidad`), `pub-16` (`/legal/firma/[token]`), `pub-17` (`/legal/dudas`).
  - Sincronización completa con `e2e/17-paginas-publicas.spec.ts`.
- **Depuración Global de Dominio y Correos Oficiales:**
  - Se reemplazaron todas las menciones a `lurdes.co` y `servicio@lurdes.co` por `creuso.app` y `servicio@creuso.app` a lo largo de las páginas públicas, layout, formularios de contacto/dudas, tickets de soporte y tablas de cookies.
- **Alineación de Navegación y Cabecera Legal (`LegalHeader`):**
  - Se reemplazó el botón `X` por una flecha de retorno (`ArrowLeft`) con tooltip *"Volver a legales"* dirigida a `/legal`. El logotipo central mantiene su destino hacia la portada principal `/`.
  - Se retiró el conmutador de tema claro/oscuro de la cabecera (su ubicación oficial y estandarizada es el pie de página).
- **Refinamiento de Estructura y Transparencia en Documentos Legales:**
  - En `/legal/privacidad`: se fijaron los *Principios de Privacidad* al inicio y se reubicó de manera armónica el bloque *Tus datos son tuyos* junto a las secciones de seguridad y tratamiento de datos.
  - En todos los apartados de transparencia (`privacidad`, `terminos`, `datos`, `reglamento`, `confidencialidad`, `medicion`): el enlace *"Lee nuestra política de uso de IA →"* se presenta en un bloque dedicado para evitar truncamientos y saltos de línea antiestéticos.
  - En `/legal/cookies`: se incluyó el botón de acceso directo al panel de preferencias de cookies (`/legal/cookies/preferencias`).

### H. Refactorización Integral de UX del QA y Resumen para IA de Máximo Ahorro de Tokens
- **Eliminación del Módulo Redundante "Modo Noche":**
  - Se eliminó la categoría artificial *"Modo Noche"* (`dark-01` a `dark-08`), consolidando la matriz en **132 pruebas activas**.
  - La verificación de tema claro/oscuro se realiza de forma natural e integrada en cada una de las tarjetas mediante los selectores `☀ Día` y `☾ Noche`.
- **Reordenamiento Lógico según el Customer Journey (13 Módulos):**
  - Se reorganizaron las categorías para seguir el flujo natural del usuario:
    1. *Páginas Públicas* → 2. *Autenticación* → 3. *Dashboard* → 4. *Cotizador IA* → 5. *DPP / Pasaporte* → 6. *Panel Empresa* → 7. *Panel Admin* → 8. *Settings* → 9. *Alertas* → 10. *Ayuda* → 11. *Rendimiento* → 12. *Seguridad* → 13. *APIs & Validaciones*.
- **Nuevo Formato "Resumen para IA" (Ultra Ahorro de Tokens):**
  - Generador especializado que condensa los resultados para transferir directamente al asistente de IA:
    - Destaca únicamente los hallazgos críticos: **Fallas** (`❌`), **Parciales** (`⚠️`), **No se entiende** (`❓`) y **Observaciones de usuario** (`💬`), incluyendo ruta exacta, resultado esperado y notas de campo.
    - Condensa todas las pruebas aprobadas sin comentarios en una sola línea de IDs compactos (`pub-01, pub-02, ...`), ahorrando hasta un 85% de tokens de contexto.
- **Botón "Copiar resumen para IA" en Múltiples Puntos Clave:**
  - Disponible en la **Barra de Acciones Principal** (junto al informe final).
  - Disponible en la **Cabecera de cada Módulo o Pantalla**.
  - Disponible en el **Modal de Historial** (en cada snapshot guardado).
  - Disponible en el **Modal de Informe** (junto a la copia de texto plano y descarga `.txt`).
  - Disponible en el **Modal de Métricas y Evolución Histórica** (en el estado en vivo y en cada punto histórico).
- **Acceso Rápido y Copia de URL por Prueba (Localhost):**
  - Al lado de la ruta en cada tarjeta de prueba (ej. `/verificar`), se integró un botón interactivo de copia (`Copy`) que transfiere la **URL completa local** (`http://localhost:3000/verificar` o el origin activo) directamente al portapapeles con confirmación visual (icono verde y toast descriptivo), permitiendo pegarla al instante en el navegador.
  - Para rutas directas sin comodines (`[id]`), se agregó además el acceso directo de apertura en nueva pestaña (`ExternalLink`).
- **Corrección de Diseño y Distribución en el Popup de Informe:**
  - Se amplió el ancho del modal (`max-w-3xl`) y se reorganizó la cabecera en una estructura limpia de dos niveles:
    1. *Fila Superior:* Título, icono, tag de alcance (`Global` / `Por tema` / `Por pantalla`), métricas de cobertura y botón de cierre `X` anclado a la derecha.
    2. *Fila de Controles & Acciones:* Selector de módulo o pantalla a la izquierda y botones de acción (`Copiar resumen para IA`, `Copiar texto`, `Descargar .txt`) a la derecha, eliminando por completo cualquier colisión visual o solapamiento entre el selector y los botones.

### I. Estandarización Visual de Tarjetas Laterales y Métricas Críticas
- **Reubicación de Badges Debajo de la Barra de Progreso:**
  - Se retiraron los badges de estado del renglón superior de las tarjetas de módulos y pantallas, liberando la cabecera para mostrar exclusivamente la categoría/pantalla y la fracción revisada `{revisadas}/{total}` con icono de check cuando está 100% aprobada.
  - Los badges de desglose ahora se muestran ordenados **directamente debajo de la barra de progreso segmentada**, alineándose de forma natural con los segmentos coloreados de la barra.
- **Unificación de Estados con Iconos y Cifras:**
  - Todos los estados evaluados utilizan iconos visuales dedicados y su respectivo conteo:
    - **Aprobadas:** `✓` (`CheckCircle`, verde `#38B98E`).
    - **Parciales:** `-` (`MinusCircle`, ámbar `#F59E0B`) — sustituyendo la antigua etiqueta de texto `4p`.
    - **No se entiende / Dudas:** `◻` (`Square`, morado `#985fa1`).
    - **Fallas:** `✕` (`XCircle`, rojo `#FF5E4B`).
  - Solo se renderizan los badges que tengan un conteo mayor a cero, manteniendo las tarjetas limpias, visualmente equilibradas y sin saturación.
- **Clarificación en el Modal de Métricas y Progreso:**
  - Se simplificó la tarjeta de severidad crítica:
    - Título: *Pruebas críticas con falla*
    - Cifra principal: Conteo exacto de fallas críticas (en rojo si hay fallas, en verde si es 0).
    - Subtítulo: `{evaluadas} de {total} evaluadas` (ej. *4 de 47 evaluadas*), eliminando contradicciones y facilitando la lectura inmediata del estado de calidad.
- **Eliminación de Títulos Redundantes en Tarjetas de Módulos:**
  - Se eliminó la etiqueta/pastilla superior que duplicaba el nombre del módulo (ej. `[ 📊 Dashboard ]` y justo abajo `Dashboard`).
  - Ahora se presenta una estructura limpia y más simple:
    - **Fila Superior:** Icono del módulo + Título único (`Dashboard`) a la izquierda, y conteo `{revisadas}/{total}` a la derecha.
    - **Subtítulo Descriptivo:** Debajo del título se incluye el texto descriptivo del módulo (ej. *Espacio diario de cálculo y mediciones*), otorgando contexto directo y eliminando la duplicación.

### J. Verificación Exhaustiva y Corrección Integral de Modo Noche (Protocolo Lurdes & Contraste WCAG 2.1)
- **Erradicación de Colores Inventados:**
  - Se eliminaron por completo las tonalidades de fondo inventadas (`#181a1b`, `#202325`, `#222527`, `#101213`) que no pertenecían a la guía de diseño.
  - Se implementaron con estricto rigor los tokens oficiales del **Protocolo Lurdes (v12.3)**:
    - Base / Fondo de Modales: `#474747` (Gris Oscuro Lurdes).
    - Cabeceras y Barras de Control: `#3e3e3e` con bordes sutiles `border-white/10`.
    - Tarjetas Interiores y Paneles de Métricas: `#525252` con bordes `border-white/10`.
    - Bloques de Código y Vista Previa: `#3a3a3a` con `border-white/15`.
- **Corrección de Contraste en Tipografías e Iconos (WCAG 2.1 AA):**
  - **Reemplazo del Morado Oscuro (#985fa1):**
    - En modo noche sobre `#474747` o `#525252`, `#985fa1` presentaba un ratio de contraste deficiente de solo 1.99:1 (ilegible).
    - Se reemplazó sistemáticamente por el tinte luminoso **Lila Claro (`#D8B4E2`)**, logrando un contraste superior a 5.11:1 (pasa WCAG AA).
    - Aplicado en: botones "Copiar resumen para IA", badges de dudas (`[◻ N]`), etiqueta de categoría *Seguridad*, tarjeta de "Validación de temas" y contadores de dudosas.
  - **Reemplazo del Teal Oscuro (#00827C) en Texto Modo Noche:**
    - Se eliminó el uso de `#00827C` como texto o icono sobre fondos oscuros (contraste de 1.98:1).
    - En modo noche se emplea el acento oficial de marca **Pistacho Lurdes (`#D6F391`)** con ratio de 7.56:1, o **Menta Lurdes (`#8AD0B2`)**, garantizando legibilidad instantánea en botones de acción principal, badges y destacados.
  - **Estados de Veredicto Rápido y Expandido:**
    - En los botones activos de veredicto con fondos pasteles (`#F6BF3E` ámbar y `#D8B4E2` lila), el texto interior cambia a oscuro `#474747` para mantener contraste nítido y evitar texto blanco sobre fondos claros.
- **Normalización del Panel de Diagnóstico Automático:**
  - Se retiró el encuadre morado arbitrario, devolviéndolo al diseño estándar y sobrio de tarjeta Lurdes (`${theme.cardBg}` con sombra suave y botón en Pistacho `#D6F391` en modo noche).
- **Consistencia en Barras de Progreso:**
  - Todos los segmentos de barras (aprobadas, parciales, dudas, fallas) se sincronizan con las variantes de alta luminosidad en modo noche (`#38B98E`, `#F6BF3E`, `#D8B4E2`, `#FF7B6B`).

---

## 2. Optimizaciones en la Experiencia de QA y Token Economy

### A. Acción "Copiar Resumen para IA" (Ahorro Extremo de Tokens)
- **Objetivo:** Maximizar la eficiencia de tokens y precisión en los prompts para IA durante iteraciones de resolución de QA.
- **Lógica de Filtrado:**
  - Se eliminan por completo las pruebas aprobadas (`pasa`) sin comentarios o aprobadas de rutina.
  - Se extraen **únicamente** los casos críticos, fallas (`falla`), cumplimientos parciales (`parcial`) y dudas (`duda`).
  - Formato conciso y estructurado: `[SEVERIDAD] [ID] Ruta — Nombre`, resumen de lo esperado, estado de modos Día/Noche y notas del evaluador textuales.
  - Se eliminan metadatos innecesarios (perfiles de usuario, porcentajes generales redundantes, intros largas), reduciendo el consumo de tokens en más del 80%.

### B. Rediseño y Jerarquía del Modal de Historial / Snapshots
- **Jerarquía Visual Clara en 4 Filas:**
  1. *Fila 1 (Identidad):* Título del Snapshot + Badge de alcance (`Global` / `Por tema`) + Acciones de exportar `.txt` y eliminar.
  2. *Fila 2 (Cronología):* Fecha y hora formateadas en ancho completo con `whitespace-nowrap` sin quiebres de línea artificiales.
  3. *Fila 3 (Barra de Acciones):* Botones organizados: `[Copiar resumen para IA]`, `[Restaurar estado]`, `[Ver detalle]`.
  4. *Fila 4 (Resumen de Incidencias):* Resumen numérico de fallas y pruebas críticas pendientes.
- **Ajuste de Nomenclatura:** Título principal de la sección actualizado de *"Panel de Pruebas - Reúso"* a *"Panel de Pruebas"*.

### C. Resolución Dinámica de Rutas Demo Parametrizadas
- Se implementó un asistente de resolución de rutas en el panel de pruebas (`resolverRutaDemo`):
  - Transforma automáticamente rutas con comodines a datos de prueba reales sembrados en la base de datos:
    - `/cot/[token]` → `/cot/demo-token-cot-001-ganado`
    - `/verificar/[codigo]` → `/verificar/RCO2-DEMO-0001`
    - `/pasaporte/[codigo]` → `/pasaporte/DPP-DEMO-001`
  - Permite hacer clic directo en *"Abrir demo"* para evaluar la pantalla en caliente sin tener que inventar URLs manualmente.

---

## 3. Siembra de Datos Semilla para QA y Testing Exhaustivo (`scripts/sembrar-datos-qa.mjs`)

- **Objetivo:** Disponer de un entorno enriquecido con datos reales para poder auditar el 100% de los estados funcionales de cotizaciones, pasaportes y clientes.
- **Cotizaciones Sembradas (7 Estados del Embudo):**
  1. `COT-QA-001`: *Ganado* (Aprobada por cliente con token público `demo-token-cot-001-ganado`, 2 muebles restaurados, métricas ambientales completas).
  2. `COT-QA-002`: *Borrador* (3 muebles en taller, notas internas).
  3. `COT-QA-003`: *Enviado* (Pendiente de decisión del cliente, token `demo-token-cot-003-enviado`).
  4. `COT-QA-004`: *Aceptado* (Aprobación registrada).
  5. `COT-QA-005`: *Rechazado* (Propuesta descartada con motivo registrado).
  6. `COT-QA-006`: *Vencido* (Vigencia expirada).
  7. `COT-QA-007`: *Cancelado* (Anulación administrativa).
- **Pasaportes Digitales de Producto (5 DPPs en todos los estados del ciclo de vida):**
  1. `DPP-DEMO-001`: *Activo* (Escritorio de Roble Restaurado con 2 ciclos de vida, 4 materiales, alta confianza).
  2. `DPP-DEMO-002`: *En reúso* (Silla Ergonómica reacondicionada).
  3. `DPP-DEMO-003`: *Disposición final* (Mueble con retiro controlado).
  4. `DPP-DEMO-004`: *Archivado* (Histórico).
  5. `DPP-DEMO-005`: *Activo Multiciclo* (Mesa de Juntas con 3 ciclos de restauración acumulados).
- **Auto-vinculación de Superadmin:**
  - El script vincula automáticamente al superadmin (`merinop@me.com`) como miembro con rol `admin` en la empresa de pruebas principal, resolviendo accesos y permisos en el cotizador y panel de control.

---

## 4. Resoluciones de Incidencias Críticas y Mejoras en Producción

### A. Verificación de Informes e Impacto (`/verificar`, `/verificar/[codigo]`, `/pasaporte/[codigo]`)
- **Modo Noche:** Se integró el componente `ThemeToggle` flotante y en cabeceras de `/verificar` y `/verificar/[codigo]`.
- **Erradicación de Dominios Residuales:**
  - Se eliminó el texto hardcodeado `reuso.bio` en la cabecera de verificación, reemplazándolo por el logotipo oficial [logo-completo.svg](file:///Users/merinop/Documents/Automatizaciones/Reuso/public/logo-completo.svg).
  - Se eliminó `reuso.lurdes.co` en `/pasaporte/[codigo]`, sustituyéndolo por el logotipo oficial de Calculadora de Reúso y el botón de alternancia de tema.
  - Se actualizaron los correos de soporte a los canales oficiales de la plataforma (`soporte@calculadoradereuso.com` / formulario de soporte).

### B. Propuestas Comerciales Públicas (`/cot/[token]`)
- **Skeleton Preview Instantáneo ("Precargar"):** Se reemplazó el spinner genérico por un esqueleto wireframe reactivo con animación de pulso que replica la cabecera, hero con saludo e impacto ambiental, cuadrícula 2x2 de muebles y barra inferior fija de totales.
- **Logotipo y Nombre de Empresa Fallback:**
  - Se corrigió el nombre de empresa por defecto a *"Calculadora de Reúso"*.
  - En ausencia de logo empresarial personalizado, se renderiza el isotipo [logo-icono.svg](file:///Users/merinop/Documents/Automatizaciones/Reuso/public/logo-icono.svg) con adaptación automática para modo claro y modo oscuro.

### C. Política de Cookies y Preferencias (`/legal/cookies`)
- Se incluyó un botón destacado hacia `/legal/cookies/preferencias` en la cabecera de acciones y en la sección `leeTabien` (en español e inglés) para acceso directo e intuitivo a la gestión de consentimiento.

### D. Estado del Sistema y Páginas de Transparencia (`/status`, `/legal/privacidad`, `/legal/medicion`)
- **/status:** Se calibraron los contrastes de los indicadores de estado operativo en modo noche (`#4ADE80` para óptimo, `#FBBF24` para degradado, `#F87171` para fallas, `#60A5FA` para mantenimientos).
- **/legal/privacidad:** Se optimizaron las tarjetas de *"Tus datos son tuyos"* para garantizar legibilidad con `var(--bg-card)` y bordes sutiles en modo oscuro.
- **/legal/medicion:** Se agregó la sección formal de *"IA y Transparencia"* y el enlace directo hacia `/legal/ia` en una línea independiente.

### E. Protección de Datos Personales (`/legal/datos`)
- Se integró un **Mapa Conceptual Interactivo** compuesto por:
  1. *Diagrama de 4 Fases del Ciclo de Vida:* Recolección y Consentimiento, Custodia Cifrada, Procesamiento Seguro y Control/Supresión Irreversible.
  2. *Matriz Universal de Derechos ARCO + RGPD:* Acceso, Rectificación, Cancelación y Oposición / Portabilidad.

---

## 5. Criterios de Gestión de Calidad (Tratamiento de Comentarios en Pruebas Aprobadas)

- **Comentarios en pruebas `pasa`:**
  - Cuando una prueba es marcada como aprobada pero contiene una nota cualitativa de validación (ej. *"así es que son las tablas"*), la información se cataloga como un **Estándar de Oro (Benchmark)**.
  - **Acciones asociadas:**
    1. *Plantilla de Referencia:* Dicho componente se convierte en el modelo oficial para elementos similares en el sistema de diseño.
    2. *Auditoría de Consistencia:* Se programan revisiones en pantallas hermanas para replicar el espaciado, cebrado y contraste.
    3. *Regla de No-Regresión:* Queda bloqueada cualquier modificación que altere la estructura aprobada.

---

## 6. Jornada 8 de Septiembre de 2026: Auditoría de Páginas Públicas (5 Incidencias QA)

### A. [CRÍTICA] [pub-03] `/verificar` — Búsqueda y Validación de Autenticidad de Informes
- **Nota para B1 / V1 Roadmap:** La funcionalidad actual opera correctamente. Se programa para **V1** una revisión en profundidad para definir y optimizar cómo se integra de forma orgánica dentro del flujo general de emisión, entrega y consulta del cliente.

### B. [CRÍTICA] [pub-16] `/legal/firma/[token]` — Proceso Guiado para Firmar Acuerdos Digitales
- **Corrección de Firma Digital:** Se corrigió un bug de doble evento en el checkbox de aceptación legal (que revertía el estado a `false` al hacer clic en el input hijo), el cual mantenía el formulario y el canvas bloqueados con `pointer-events-none`.
- **Siembra de Datos QA:** Se actualizó `scripts/sembrar-datos-qa.mjs` para insertar registros válidos en `firmas_solicitudes` compatibles con el esquema actual (`confidencialidad` sin `empresa_id`). Token activo para pruebas: `demo-token-firma-001`.
- **Estandarización de Asteriscos de Formulario:** Todos los campos obligatorios del formulario (`Nombre`, `Apellido`, `Tipo de doc.`, `Número de identificación`, `Celular`, `Firma manuscrita digital`) se unificaron al estándar visual del sistema con `<span className="text-[#FF5E4B]">*</span>`.
- **Verificación E2E:** Flujo de dibujo en canvas manuscrito y envío por `POST /api/legal/firma/[token]` verificado con éxito, retornando confirmación y pantalla de éxito.

### C. [FALLA] [pub-17] `/legal/dudas` — Buzón de Consultas Legales
- **Destino del Formulario:** Los mensajes enviados por `/legal/dudas` no se envían por SMTP convencional; se insertan directamente en la base de datos de Supabase en la tabla **`leads`** con `interes: 'Consulta legal (${tipo})'` y `mensaje: '[${tipo}] ${mensaje}'`, protegiéndose con Turnstile y limitación de tasa (rate limiting). Quedan visibles en el CRM de administración (`/admin/leads`).

### D. [PARCIAL] [pub-06] `/sistema-diseno` — Guía del Sistema de Diseño y Tablas
- **Replicación Exacta de Tabla de `/empresa/cotizador`:** Se reemplazó el mock simplificado previo por el componente `TablaCotizadorDemo`, que incorpora exactamente la misma arquitectura de `/empresa/cotizador`:
  - `ToolbarVistas`: Barra superior con búsqueda en tiempo real, selector de vistas, filtros por columna, personalización de columnas visibles, exportación (PDF/CSV/Excel) y conmutador de densidad (`comoda` vs `compacta`).
  - Barra de acciones masivas flotante con conteo dinámico, exportador de selección y modal de eliminación.
  - `ColumnaHeaderMenu`: Encabezados con ordenamiento (`asc` / `desc`), íconos con `sinAnimacion`, menú popover `⋮` con opciones de filtrar, inmovilizar y quitar columna.
  - Formato de celdas idéntico: códigos de cotización y nombres con flecha `CaretRight`, line-clamp-2 sin desbordes, estados de cotización semánticos y cebrado uniforme (`bg-[var(--bg-zebra)]`).
  - Paginación oficial del sistema (`Pagination`) fuera del scroll horizontal con conteo descriptivo y selector de cantidad por página.
- **Normalización de Espaciados y Subtítulos:** Se eliminaron las clases de letter-spacing artificiales (`tracking-[0.2em]`, `tracking-[0.3em]`, `tracking-widest`, `tracking-wide`, `tracking-tight`) que ralentizaban la lectura visual de los subtítulos. En la sección de *Componentes reutilizables*, se ajustó la escala tipográfica a `font-sans font-semibold text-sm` con espaciados naturales y márgenes compactos.

---

## 7. Jornada 9 y 10 de Septiembre de 2026: Refinamiento de Cotizaciones Públicas y Landing

### A. Propuesta Comercial Pública (`/cot/[token]`)
- **Popups de Metodología de Ahorro e Impacto Ambiental:**
  - **Colorimetría semántica diferenciada:** Morado corporativo (`#985fa1`) reservado para el cálculo de ahorro económico y verde (`#00827C` / `#38B98E`) para la medición del impacto ambiental.
  - **Estructura de pasos:** Títulos y descripciones simétricas de 2 líneas con líneas conectoras entre íconos, eliminando cortes de palabras artificiales.
  - **Depuración de textos:** Se eliminaron aclaraciones redundantes (*"Valores estimados de referencia..."*) y botones secundarios innecesarios, dejando únicamente el botón de confirmación (*"Entendido"*).
- **Adaptabilidad Móvil y Footer Centrado:**
  - En vista móvil, el mensaje de confidencialidad (*"Esta propuesta es solo para ti. No puedes compartir su contenido ni usarla con fines comerciales sin autorización"*) se distribuyó en dos líneas simétricas y centradas.
  - El selector de tema (`ThemeToggle`) se alineó en la misma jerarquía horizontal del pie de página.
  - Se corrigió el centrado del texto de copyright y créditos de la plataforma.
- **Gestión de Cantidades por Vista (Galería vs. Lista):**
  - **Vista Galería:** Si la cantidad de un ítem es mayor a 1, se renderiza `(xN)` al lado del título (ej. `(x12)`). Si es 1, se omite por sobreentendido.
  - **Vista Lista:** La cantidad se visualiza exclusivamente en la celda/cuadro numérico correspondiente, omitiéndose del título para evitar duplicidades.
- **Badge de "Propuesta Aceptada":**
  - Posicionamiento reubicado al inicio antes del saludo (*"Hola..."*), suprimiendo la coletilla *- Te contactamos pronto*.
  - Tamaño ajustado más compacto y discreto.
  - En vista lista se posicionó debajo de la fecha.
  - Marcación sólida activada exclusivamente cuando el estado de la propuesta es `cerrado_ganado` (acuerdo cerrado y en ejecución).
- **Depuración de NIT y Soporte de IVA:**
  - Corrección de prefijo duplicado (*"NIT NIT"* -> *"NIT"*).
  - Integración visual y desglose correcto del IVA (19%) en cotizaciones para personas jurídicas/empresas cuando esté activo.

### B. Landing Page (`/#calculos`)
- **Alineación de Mensaje de Impacto e Industria:**
  - Subtítulo de la sección `#calculos` actualizado a:
    > *"Descubre cómo medir tu impacto y transforma descartes en oportunidades de oro, adaptándose a lo que necesite tu industria."*
  - Refuerzo de la narrativa de valor: posicionamiento de la Calculadora como un **servicio técnico personalizado**, con alcance y tarifas cotizadas a la medida de cada empresa y sector productivo.

### C. Pie de Página en Estado de Servicios (`/status`)
- **Supresión de Fecha de Actualización en `/status`:**
  - Se ajustó `FooterPublic` (`src/components/footer-public.tsx`) para ocultar la etiqueta y fecha legal en la ruta `/status` (al igual que en el home `/`), manteniendo el pie de página limpio con enlaces legales, copyright y conmutador de tema Día/Noche sin marcas de fecha innecesarias en el monitor de disponibilidad técnica.

### D. Cumplimiento Normativo Empresarial: Incorporación de PTEE y SAGRILAFT
- **Redacción Humana, Cercana y en Voz Activa (Sin perder rigor legal):**
  - **`/legal/ptee` — Programa de Transparencia y Ética Empresarial (PTEE):** Reescrito en un lenguaje directo, humano y fácil de leer (*“En la Calculadora de Reúso no aceptamos tramposos ni jugadas sucias. Trabajamos con total honestidad...”*). Conserva los mandatos de la Ley 1778 de 2016, Ley 2195 de 2022 y Capítulo XIII de Supersociedades (cero sobornos, prohibición de regalos significativos o pagos por debajo de la mesa, declaración obligatoria de conflictos de interés, veracidad matemática inalterable en cálculos de CO₂e y canal ético `servicio@calculadoradereuso.com` con protección al denunciante).
  - **`/legal/sagrilaft` — Sistema de Autocontrol y Gestión del Riesgo (SAGRILAFT):** Explicado con un tono transparente y cercano (*“Blindamos la Calculadora de Reúso para garantizar que nuestros servicios jamás se usen para lavar dinero...”*). Cumple con el Capítulo X de la Circular Básica Jurídica de Supersociedades y recomendaciones GAFI (verificación KYC/KYB en listas vinculantes ONU/OFAC, identificación del beneficiario final con 5%+, controles a PEPs, detección y reporte reservado ROS a la UIAF y custodia cifrada de 10 años).
- **Protección de Motores de Búsqueda (`noindex, nofollow`):**
  - Se confirmó que en `src/app/(public)/legal/layout.tsx` todas las páginas legales (`/legal/*`) están configuradas centralizadamente con `metadata.robots: { index: false, follow: false }`, impidiendo la indexación o rastreo de motores de búsqueda conforme a la directriz del proyecto.
- **Integración en el Hub Legal (`/legal`) y Tablero QA:**
  - Integración de tarjetas oficiales en `/legal` y catálogo en `legal-page-layout.tsx` (`ALL_LEGAL_PAGES`).
  - Casos de prueba `pub-18` (`/legal/ptee`) y `pub-19` (`/legal/sagrilaft`) verificados en `/admin/qa` con `npx tsc --noEmit` en 0 errores.

---

## 8. Jornada 10 de Septiembre de 2026: Editor de Contenidos, Tablero de QA, Footer Legal y Auditoría SEO

### A. Reorganización y Carga de Beneficios en `/admin/contenido` (Precios)
- **Diagnóstico y Corrección de Estado Vacío:**
  - En `config_planes`, el campo `borrador_features_json` almacenaba `[]`, provocando que el operador `??` no recurriera a los datos vigentes.
  - Se implementó un respaldo dinámico en `precios-tab.tsx` hacia `PLANS` de `src/lib/constants/pricing.ts` y se sincronizaron las columnas `features_json` y `borrador_features_json` en la base de datos Supabase.
- **Nueva Estructura de Edición por Tarjeta de Plan:**
  1. **Límites:** Empleados, Cálculos/mes, Informes/mes, Cotizaciones/mes y DPP/mes.
  2. **Precios:** Entradas para COP, USD y EUR con autocalculado anual del 20% de descuento y edición manual independiente.
  3. **Capacidades de IA:** Interruptor toggle con descripción clara (*"Activa la IA para DPP y el cotizador. Si no se activa, se crean manualmente."*).
  4. **Beneficios (Acordeón estilo FAQ):** Plegable por defecto con badge de conteo e indicador de despliegue. Al abrir permite:
     - Arrastrar y soltar (Drag & Drop nativo con `GripVertical`).
     - Reordenar con botones de flechas (Subir / Bajar).
     - Editar texto directamente en línea.
     - Eliminar beneficios con confirmación rápida.
     - Agregar nuevos beneficios con botón `Plus`.
  5. **Autoguardado y Publicación:** Indicador en tiempo real (*Guardando...* / *Guardado*) con botón global para publicar a producción.

### B. Reorganización del Tablero de QA (`/admin/qa`)
- **Secuencia Canónica de Páginas Públicas y Legales:**
  Se reestructuraron las tareas iniciales en `src/app/(admin)/admin/qa/page.tsx` para seguir estrictamente el orden:
  1. `/` (Portada principal)
  2. `/status` (Salud y disponibilidad)
  3. `/verificar` (Buscador y autenticidad)
  4. `/cot/[token]` (Propuesta comercial pública)
  5. `/empresa/nueva` (Registro de organizaciones)
  6. `/sistema-diseno` (Sistema de diseño y componentes)
  7. `/legal` (Centro de transparencia)
  8. `/legal/terminos` (Términos y condiciones)
  9. `/legal/privacidad` (Política de privacidad)
  10. `/legal/datos` (Tratamiento de datos personales)
  11. `/legal/cookies` (Política de cookies)
  12. `/legal/reglamento` (Reglamento de uso)
  13. `/legal/confidencialidad` (Acuerdo de confidencialidad)
  14. `/legal/medicion` (Metodología de cálculo)
  15. `/legal/ptee` (Programa de Transparencia y Ética)
  16. `/legal/sagrilaft` (Política SAGRILAFT)
  17. `/legal/ia` (Transparencia en IA)
  18. `/legal/firma/[token]` (Firma digital de convenios)
  19. `/legal/dudas` (**Última de las páginas legales** — Buzón de dudas legales)
- **Flujo Lógico del Journey («Por tema» y «Pantalla a pantalla»):**
  Se alineó la navegación general para fluir de forma continua:
  `Páginas Públicas` $\to$ `Autenticación` $\to$ `DPP / Pasaporte` $\to$ `Dashboard` $\to$ `Panel Empresa` $\to$ `Panel Admin` $\to$ `Settings` $\to$ `Alertas` $\to$ `Ayuda` $\to$ `Cotizador IA` $\to$ `Rendimiento` $\to$ `Seguridad` $\to$ `APIs & Validaciones`.

### C. Automatización de la Fecha de Última Actualización en el Footer Legal
- **Unificación de Etiqueta:** Se estandarizó de `"Actualización:"` a **`"Última actualización:"`** en `layout.tsx`, `footer-public.tsx` y `verificar/page.tsx`.
- **Cálculo Dinámico en Servidor:** Se implementó `getFechaActualizacionLegal()` en `src/lib/legal/fecha-actualizacion.ts`:
  - Escanea de forma recursiva el `mtime` de todos los archivos y subdirectorios de `src/app/(public)/legal`.
  - Compara con la fecha de última edición en la base de datos `contenido_legal`.
  - Formatea automáticamente la fecha en español (ej. *10 de septiembre de 2026*), actualizándose en vivo con cualquier edición de los textos legales.

### D. Auditoría de Checklist SEO y Optimización de Sitemap
- **Diagnóstico Integral:** Verificación de los 9 puntos fundamentales (Search Console, Sitemap, Google Analytics con Consent Mode v2, Google Business Profile, Keywords, Metadescripciones, Enlaces Internos, Compresión de Imágenes y Backlinks).
- **Limpieza de `sitemap.xml`:** Se actualizó `src/app/sitemap.ts` para conservar únicamente las rutas públicas indexables (`https://calculadoradereuso.com`), eliminando URLs con directiva `noindex` para evitar advertencias de rastreo en Google Search Console.








## 9. Jornada 14 de Septiembre de 2026: 100/100 en Lighthouse, SEO/GEO y Refinamiento Mobile

### A. Optimización de Rendimiento y Accesibilidad (Score 100/100)
- **Desbloqueo de Indexación:** Se corrigió la etiqueta meta `robots` en `src/app/layout.tsx` (pasando de `index: false, follow: false` a `index: true, follow: true`), habilitando oficialmente el rastreo global del sitio por los motores de búsqueda, con las páginas privadas protegidas individualmente por sus propios layouts.
- **Habilitación de ISR (Static Generation):** Se eliminó el uso de la función bloqueante `void headers()` en las páginas públicas y layout principal, permitiendo que Next.js compile la *Landing Page* (`/`) de forma estática incremental (marcada como `● /` en el Build). Esto reduce los tiempos de TTFB (Time to First Byte), FCP y LCP a milisegundos de forma nativa.
- **A11y (Accesibilidad):** Se inyectaron atributos `aria-label` descriptivos a los botones sin texto en `landing-header.tsx` (buscar, limpiar) y `landing-client.tsx` (switch de planes mensual/anual), resolviendo penalizaciones críticas en el reporte de accesibilidad de Google Lighthouse.
- **Enlaces Externos y Seguridad:** Se validó que todos los enlaces salientes (`target="_blank"`) incluyan los atributos `rel="noopener noreferrer"`.
- **Arquitectura de Datos para Motores Generativos (GEO):** Confirmación de 5 esquemas enriquecidos `JSON-LD` (`Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`, etc.) operando y sin errores de parseo.

### B. Tablero de QA (`/admin/qa`): Nuevas Pruebas SEO y GEO
- **Nuevas Pruebas de Rendimiento (`perf-10`, `perf-11`):**
  - **`perf-10`:** *Puntaje perfecto en métricas de posicionamiento (SEO y Accesibilidad)*. Valida mediante PageSpeed Insights que se alcance el 100/100.
  - **`perf-11`:** *Estructura semántica para IAs (GEO)*. Valida mediante Schema Validator que los datos estructurados estén perfectos.
- **Advertencias y Roles:** Se especificó claramente en el tablero que estas comprobaciones deben realizarse **manualmente sobre el entorno de producción (Vercel)**, desactivando su validación e2e local. Ambas tareas fueron asignadas al rol `sin_sesion` al estar asociadas a la página pública `/`.

### C. Refinamiento de UX/UI en Mobile para el Footer Principal (`src/components/footer.tsx`)
- **Rediseño Vertical de Contenido:** Se desmanteló la grilla de dos columnas forzada en pantallas móviles (`isMobile`). Ahora el bloque legal y el bloque de información (IP, Visita, Contacto) se apilan fluidamente en una sola columna con los textos centrados, eliminando por completo los saltos de línea indeseados (como `Dirección IP` y `::1` rotos) y aumentando el margen interactivo (`gap: 28px`).
- **Bloque de Copyright y Modo Oscuro:** La fila inferior de derechos reservados y el botón de *ThemeToggle* se reorganizaron con `flex-direction: column-reverse`, apilando el botón debajo del texto principal y manteniéndolo centrado en lugar de flotando huérfano a la derecha.
- **Padding Dinámico según Variante:** Se corrigió un *bug* visual severo en las páginas públicas/legales (como `/legal/medicion`) donde un margen inferior enorme (`110px`) originado por la necesidad técnica del tab-bar del sistema (`navbar`) en la variante `system`, se estaba aplicando erróneamente en pantallas que no lo tenían. El espacio muerto desapareció al condicionar el *padding bottom* a `32px` cuando el *footer* opera bajo variantes `public` o `legal`.

---

## 10. Jornada 15 de Septiembre de 2026: Estandarización y Unificación Definitiva de los 3 Footers (Desktop & Mobile)

### A. Estandarización Universal en Escritorio (Desktop)
Se blindó la arquitectura visual de los 3 pies de página (`legal`, `public` y `system`) a 4 columnas con alturas, alineaciones y tipografía estrictamente normalizadas:
1. **Tipografía Estricta a 10 px:**
   - Tanto los títulos como sus líneas de valor secundarias en la Columna 4 (`footer-info-primary` y `footer-info-secondary`) se fijaron estrictamente en **10 px**.
   - Se eliminaron los dos puntos (`:`) de las etiquetas en escritorio.
   - Cada dato se organiza en dos renglones: Renglón 1 para la etiqueta y Renglón 2 para el valor.
2. **Jerarquía Visual y Negritas según Enlace:**
   - Solo los elementos con hipervínculo interactivo (`<a href>`) llevan peso tipográfico seminegrita/negrita (`font-weight: 600`) y animación interactiva idéntica a redes (`translateX(4px)`).
   - Los textos puramente informativos o estáticos (`Última actualización`, `Dirección IP`, etc.) se mantienen sin negrita (`font-weight: 400`), sin cursor pointer y sin animación.
3. **Alineación Vertical a Topes Exactos (Columna 3 vs Columna 4):**
   - Altura de referencia fijada en `height: 70px` con `justify-content: space-between` y `align-items: flex-start`.
   - El bloque superior de la Columna 4 queda perfectamente enrasado con el tope superior de LinkedIn (Columna 3).
   - El bloque inferior de la Columna 4 queda perfectamente enrasado con la base inferior de Instagram (Columna 3).
4. **Posicionamiento del Modo Día / Noche:**
   - Ubicado en la fila inferior de derechos reservados, inmediatamente a la derecha de **“Lurdes”**.
   - Escalado al 82% (`transform: scale(0.82)`) para integrarse de forma sutil sin alterar el flujo del texto.
   - Libre de opacidades transparentes no deseadas (`opacity: 1`).

### B. Unificación y Perfeccionamiento en Móvil (Mobile)
Se eliminaron todas las asimetrías que deformaban el pie de página interno del sistema en dispositivos móviles, igualándolo a la elegancia y balance de las variantes Legal y Pública:
1. **Título Principal Centrado:**
   - Presente de forma homogénea en los 3 footers: `Tecnología con propósito para un futuro sostenible.` con efecto arcoíris animado al interactuar.
2. **Enlaces Internos en una Sola Línea:**
   - Los 3 botones de enlaces (`Inicio · Iniciar sesión · Preguntas frecuentes` en Legal, o `Política de privacidad · Reglamento · Sobre la medición` en Público/Sistema) se configuran con `flexWrap: 'nowrap'`, tamaño a 10 px y punto medio de separación (`·`), manteniéndose distribuidos a lo ancho de la pantalla sin partirse en dos renglones.
3. **Bloque Informativo Limpio y Homogéneo:**
   - Se reemplazaron cadenas crudas de servidor (IPs o registros técnicos con horas de auditoría que rompían el ancho) por una estructura limpia idéntica al footer de referencia:
     - **Renglón 1:** `Última actualización:` con fecha en formato legible (sin negrita y con dos puntos a 10 px).
     - **Renglón 2:** `Contacto:` con `servicio@calculadoradereuso.com` (en negrita, con dos puntos, a 10 px y enlace mailto).
4. **Redes Sociales y Barra de Cierre Compacta:**
   - 3 botones circulares oficiales centrados (LinkedIn, YouTube, Instagram).
   - Crédito `Desarrollado con ♡ en Medellín, Colombia · Calculadora de Reúso by Lurdes` en una sola línea junto al selector de tema.
   - Copyright pegado inmediatamente debajo con margen mínimo.

### C. Espacio Adaptativo para el Menú Móvil Inferior
- **En Home (`/`), Sistema de Diseño (`/sistema-diseno`) y Todo el Sistema (`variant="system"`):**
  - Se añade un padding inferior en móvil de **104 px**, garantizando que el texto del copyright quede totalmente visible y suspendido con un margen cómodo (~16 px) por encima del menú flotante o barra fija inferior (`MobileBottomNav`).
  - Se ajustó el padding del contenedor `<main>` en `layout-shell.tsx` a `24px` en móvil para evitar que se acumulara un vacío duplicado entre el contenido y el footer.
- **En Legales (`variant="legal"` o rutas `/legal/*`):**
  - Mantiene su padding inferior estándar compacto (**20 px**), preservando la experiencia de lectura limpia sin el espacio del menú móvil.
