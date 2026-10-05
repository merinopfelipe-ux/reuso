-- 141 · Leads: usuario de WhatsApp y notas internas (2026-10-05)
-- Expandir-contraer: solo ADD COLUMN IF NOT EXISTS, nada se borra ni se renombra.
--
-- usuario_whatsapp: WhatsApp permite abrir un chat por nombre de usuario
--   (https://wa.me/NombreDeUsuario), sin conocer el número. Se guarda sin la
--   arroba. Si está vacío, el botón de WhatsApp usa el teléfono como siempre.
-- notas: notas internas del equipo comercial sobre el contacto, visibles solo
--   en /admin/leads. Texto libre, nunca se muestra al prospecto.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS usuario_whatsapp text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notas text;

COMMENT ON COLUMN leads.usuario_whatsapp IS 'Nombre de usuario de WhatsApp, sin arroba. Abre https://wa.me/<usuario>.';
COMMENT ON COLUMN leads.notas IS 'Notas internas del equipo comercial. Nunca se muestran al prospecto.';
