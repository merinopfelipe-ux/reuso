-- 151: Retención de audit_logs a 2 meses (antes 3).
--
-- audit_logs la llena un trigger (sql/024) con copias de los cambios en profiles,
-- calculos e informes. La política de privacidad dice que se conservan 2 meses.
-- pg_cron reprograma el mismo trabajo (mismo nombre) cada domingo a las 3:00 AM.
--
-- Expandir-contraer: no toca tablas ni columnas, solo la programación.
-- Se corre a mano en el SQL Editor (staging primero).

SELECT cron.schedule(
  'purge-audit-logs-job',
  '0 3 * * 0',
  $$ DELETE FROM public.audit_logs WHERE created_at < now() - INTERVAL '2 months' $$
);

-- Comprobación: debe mostrar el trabajo con '2 months' en su comando.
-- SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'purge-audit-logs-job';
