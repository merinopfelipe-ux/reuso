---
description: Reglas estrictas para la generación y resolución de URLs públicas y el manejo de identificadores de fallback en el enrutamiento.
---

# Reglas de Enrutamiento y Fallbacks de Identificadores

Para evitar errores 404 causados por desincronización entre el cliente (UI) y el servidor (Rutas/APIs) al generar enlaces públicos, siempre debes seguir estos principios arquitectónicos:

1. **Paridad de Identificadores (Single Source of Truth)**
   Si la interfaz de usuario utiliza una lógica de fallback para construir una URL (por ejemplo: `enlace = token ?? codigo_interno`), la ruta pública o API que recibe esa petición **debe obligatoriamente** soportar ambos identificadores en su consulta a la base de datos.
   
2. **Consultas Flexibles en Supabase**
   Cuando busques un registro basado en un parámetro de URL `[id]` o `[token]` que podría ser un UUID, un slug, un código alfanumérico o un token generado:
   - Nunca asumas que el parámetro corresponde a una única columna si existe una política de fallback en el cliente.
   - Utiliza `.or()` en Supabase para buscar en todas las columnas candidatas.
   *Ejemplo correcto:* `.or(\`enlace_publico_token.eq.${params.token},codigo_cotizacion.eq.${params.token}\`)`

3. **Nunca dejes un Endpoint Ciego**
   Antes de escribir o modificar la consulta de un endpoint público como `src/app/ruta/[token]/page.tsx`, busca en el código cliente cómo se está construyendo y concatenando ese `token` en la URL. Si el cliente inyecta una variable distinta a la que esperabas, ajusta el endpoint para soportarla.
