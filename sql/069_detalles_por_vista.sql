-- ============================================================
-- Doble check por bloque de "Detalles" en la cotización: cada bloque
-- (Transporte, Forma de pago, Nota, Validez, Tiempo de entrega, Garantía)
-- ahora puede mostrarse en la vista galería, en la vista lista, en ambas o
-- en ninguna, de forma independiente del check "activo" general (que decide
-- si el bloque está configurado). Default true en ambas para que las
-- cotizaciones ya existentes no pierdan nada al aplicar esta migración.
-- Directriz del usuario 2026-08-07: "no siempre quiero tomar todos en
-- ambas vistas".
-- ============================================================
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS envio_gratis_mostrar_galeria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS envio_gratis_mostrar_lista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS forma_pago_mostrar_galeria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS forma_pago_mostrar_lista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nota_mostrar_galeria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nota_mostrar_lista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validez_mostrar_galeria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validez_mostrar_lista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tiempo_entrega_mostrar_galeria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tiempo_entrega_mostrar_lista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS garantia_mostrar_galeria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS garantia_mostrar_lista boolean NOT NULL DEFAULT true;

-- "Mensajes destacados" es un array JSONB (destacados_json), no columnas —
-- cada ítem gana mostrar_galeria/mostrar_lista dentro de su propio objeto
-- JSON al guardarse desde la app, sin necesitar migración de esquema.
