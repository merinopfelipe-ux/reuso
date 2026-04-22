---
tags: [nextjs, webpack, dev, cache, debugging]
aliases: [caché webpack, next cache, MODULE_NOT_FOUND]
fecha: 2026-04-05
---

# Caché de Webpack en Next.js (dev mode)

## Explicación

Next.js en modo desarrollo usa webpack con caché persistente en `.next/`. Esta caché guarda chunks compilados para acelerar reinicios. El problema: cuando se agregan muchos archivos nuevos en una sesión (5+), la caché puede quedar en estado inconsistente — referencia módulos que aún no existen o tiene versiones antiguas de chunks.

El síntoma más común es `MODULE_NOT_FOUND` o `Cannot find module './XXXX.js'` aunque el archivo sí exista en disco.

## Síntomas
- Página en blanco sin error en consola
- Error `MODULE_NOT_FOUND` en los logs del servidor
- 404s en `/_next/static/chunks/*.js` que sí deberían existir
- El build de producción (`npm run build`) pasa bien, pero el dev falla

## Diagnóstico

```bash
# Ver logs del servidor dev
tail -50 /tmp/reuso-dev.log

# Buscar errores específicos
grep -i "MODULE_NOT_FOUND\|cannot find" /tmp/reuso-dev.log
```

## Solución correcta

```bash
# 1. PRIMERO matar el proceso (crítico — si solo borras la carpeta sin matar el proceso,
#    el servidor puede recompilar sobre el estado anterior)
pkill -f "next dev"
# o: pkill -f "node.*next"

# 2. Borrar la caché completa
rm -rf .next

# 3. Reiniciar el servidor
npm run dev
```

**Importante:** El orden importa. Si se hace `rm -rf .next` mientras el servidor sigue corriendo, el proceso detecta el cambio y puede recompilar generando un estado aún más inconsistente.

## Cuándo ocurre

- Después de agregar 5+ archivos nuevos en una sesión
- Al cambiar `tsconfig.json`, `tailwind.config.ts` o `next.config.mjs`
- Al instalar nuevas dependencias sin reiniciar el servidor
- Después de resolver conflictos de git que involucran archivos de componentes

## En reuso.lurdes.co

Documentado en `CLAUDE.md` bajo "Errores conocidos". La regla es: `rm -rf .next && npm run dev` al terminar cualquier sesión que haya creado 5+ archivos nuevos. La sesión del 2026-04-05 añadió ~15 archivos nuevos — suficiente para corromper la caché.

El blank page del 2026-04-05 tuvo dos causas simultáneas:
1. Esta caché corrupta
2. [[useSearchParams-suspense-nextjs]] — el Suspense faltante

## Wikilinks relacionados
- [[useSearchParams-suspense-nextjs]] — el otro bug que causó el blank page
- [[n-plus-one-supabase]] — otros problemas de performance detectados en la misma sesión
