ALTER TABLE public.corrida_microciclos
ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS corrida_microciclos_global_semana_uidx
ON public.corrida_microciclos (data_inicio)
WHERE is_global = true;