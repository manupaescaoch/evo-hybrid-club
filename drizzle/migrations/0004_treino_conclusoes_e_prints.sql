CREATE TABLE public.treino_conclusoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  sessao_id uuid NOT NULL REFERENCES public.corrida_sessoes(id) ON DELETE CASCADE,
  data_treino date NOT NULL,
  duracao_seg integer,
  distancia_km numeric,
  pse integer CHECK (pse BETWEEN 1 AND 10),
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, sessao_id)
);
GRANT SELECT ON public.treino_conclusoes TO authenticated;
GRANT ALL ON public.treino_conclusoes TO service_role;
ALTER TABLE public.treino_conclusoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe le conclusoes" ON public.treino_conclusoes FOR SELECT TO authenticated USING (public.is_equipe_or_admin(auth.uid()));

CREATE POLICY "equipe le prints corrida" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'corridas-prints' AND public.is_equipe_or_admin(auth.uid()));
CREATE POLICY "equipe apaga prints corrida" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'corridas-prints' AND public.is_equipe_or_admin(auth.uid()));
CREATE POLICY "equipe envia prints corrida" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'corridas-prints' AND public.is_equipe_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.ranking_scores(_desde date, _ate date, _p_treino integer, _p_resultado integer, _p_km integer, _max_km numeric, _p_checkin integer, _p_post integer, _p_seq_bonus integer, _seq_dias integer)
 RETURNS TABLE(aluno_id uuid, score bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH
  concluidas AS (
    SELECT r.aluno_id, r.sessao_id, r.data_treino AS dia FROM treino_resultados r WHERE r.sessao_id IS NOT NULL
    UNION
    SELECT c.aluno_id, c.sessao_id, c.data_treino FROM treino_conclusoes c
  ),
  treinos AS (
    SELECT x.aluno_id, count(DISTINCT x.sessao_id)::bigint * _p_treino AS pts
    FROM concluidas x
    WHERE (_desde IS NULL OR x.dia >= _desde) AND (_ate IS NULL OR x.dia <= _ate)
    GROUP BY x.aluno_id
  ),
  resultados AS (
    SELECT r.aluno_id, count(*)::bigint * _p_resultado AS pts
    FROM treino_resultados r JOIN corrida_sessao_blocos b ON b.id = r.bloco_id
    WHERE b.resultado_habilitado
      AND (_desde IS NULL OR r.data_treino >= _desde) AND (_ate IS NULL OR r.data_treino <= _ate)
    GROUP BY r.aluno_id
  ),
  corridas AS (
    SELECT x.aluno_id, sum(floor(least(x.km, _max_km) * _p_km))::bigint AS pts
    FROM (
      SELECT c.aluno_id, c.data, sum(c.distancia_km) AS km
      FROM corridas_registradas c
      WHERE c.status = 'aprovada'
        AND (_desde IS NULL OR c.data >= _desde) AND (_ate IS NULL OR c.data <= _ate)
      GROUP BY c.aluno_id, c.data
    ) x GROUP BY x.aluno_id
  ),
  checkins AS (
    SELECT d.aluno_id, count(DISTINCT d.data_checkin)::bigint * _p_checkin AS pts
    FROM daily_checkins d
    WHERE (_desde IS NULL OR d.data_checkin >= _desde) AND (_ate IS NULL OR d.data_checkin <= _ate)
    GROUP BY d.aluno_id
  ),
  posts AS (
    SELECT p.aluno_id, count(DISTINCT (p.created_at AT TIME ZONE 'America/Recife')::date)::bigint * _p_post AS pts
    FROM community_posts p
    WHERE p.origem = 'manual'
      AND (_desde IS NULL OR (p.created_at AT TIME ZONE 'America/Recife')::date >= _desde)
      AND (_ate IS NULL OR (p.created_at AT TIME ZONE 'America/Recife')::date <= _ate)
    GROUP BY p.aluno_id
  ),
  dias AS (SELECT DISTINCT d.aluno_id, d.data_checkin AS dia FROM daily_checkins d),
  ilhas AS (SELECT aluno_id, dia, dia - (row_number() OVER (PARTITION BY aluno_id ORDER BY dia))::int AS grp FROM dias),
  pos AS (SELECT aluno_id, dia, row_number() OVER (PARTITION BY aluno_id, grp ORDER BY dia) AS n FROM ilhas),
  bonus AS (
    SELECT aluno_id, count(*)::bigint * _p_seq_bonus AS pts FROM pos
    WHERE n % _seq_dias = 0 AND (_desde IS NULL OR dia >= _desde) AND (_ate IS NULL OR dia <= _ate)
    GROUP BY aluno_id
  ),
  todos AS (
    SELECT * FROM treinos UNION ALL SELECT * FROM resultados UNION ALL SELECT * FROM corridas
    UNION ALL SELECT * FROM checkins UNION ALL SELECT * FROM posts UNION ALL SELECT * FROM bonus
  )
  SELECT t.aluno_id, sum(t.pts)::bigint AS score FROM todos t GROUP BY t.aluno_id;
$function$;