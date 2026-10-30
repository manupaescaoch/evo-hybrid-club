CREATE TABLE public.corridas_registradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data date NOT NULL,
  distancia_km numeric(6,2) NOT NULL CHECK (distancia_km > 0 AND distancia_km <= 60),
  tempo_segundos integer NOT NULL CHECK (tempo_segundos > 0),
  pace_segundos_km integer NOT NULL CHECK (pace_segundos_km BETWEEN 150 AND 900),
  print_url text NOT NULL,
  observacao text,
  status text NOT NULL DEFAULT 'aprovada' CHECK (status IN ('aprovada','recusada')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX corridas_registradas_aluno_data_idx ON public.corridas_registradas(aluno_id, data);
GRANT SELECT, UPDATE ON public.corridas_registradas TO authenticated;
GRANT ALL ON public.corridas_registradas TO service_role;
ALTER TABLE public.corridas_registradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe vê corridas" ON public.corridas_registradas FOR SELECT TO authenticated USING (public.is_equipe_or_admin(auth.uid()));
CREATE POLICY "Equipe revisa corridas" ON public.corridas_registradas FOR UPDATE TO authenticated USING (public.is_equipe_or_admin(auth.uid())) WITH CHECK (public.is_equipe_or_admin(auth.uid()));

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS corrida_id uuid REFERENCES public.corridas_registradas(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.ranking_scores(
  _desde date, _ate date,
  _p_treino int, _p_resultado int, _p_km int, _max_km numeric,
  _p_checkin int, _p_post int, _p_seq_bonus int, _seq_dias int
) RETURNS TABLE(aluno_id uuid, score bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH
  treinos AS (
    SELECT r.aluno_id, count(DISTINCT r.sessao_id)::bigint * _p_treino AS pts
    FROM treino_resultados r
    WHERE r.sessao_id IS NOT NULL
      AND (_desde IS NULL OR r.data_treino >= _desde) AND (_ate IS NULL OR r.data_treino <= _ate)
    GROUP BY r.aluno_id
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
  dias AS (
    SELECT DISTINCT d.aluno_id, d.data_checkin AS dia FROM daily_checkins d
  ),
  ilhas AS (
    SELECT aluno_id, dia, dia - (row_number() OVER (PARTITION BY aluno_id ORDER BY dia))::int AS grp FROM dias
  ),
  pos AS (
    SELECT aluno_id, dia, row_number() OVER (PARTITION BY aluno_id, grp ORDER BY dia) AS n FROM ilhas
  ),
  bonus AS (
    SELECT aluno_id, count(*)::bigint * _p_seq_bonus AS pts FROM pos
    WHERE n % _seq_dias = 0
      AND (_desde IS NULL OR dia >= _desde) AND (_ate IS NULL OR dia <= _ate)
    GROUP BY aluno_id
  ),
  todos AS (
    SELECT * FROM treinos UNION ALL SELECT * FROM resultados UNION ALL SELECT * FROM corridas
    UNION ALL SELECT * FROM checkins UNION ALL SELECT * FROM posts UNION ALL SELECT * FROM bonus
  )
  SELECT t.aluno_id, sum(t.pts)::bigint AS score FROM todos t GROUP BY t.aluno_id;
$$;
REVOKE ALL ON FUNCTION public.ranking_scores(date,date,int,int,int,numeric,int,int,int,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ranking_scores(date,date,int,int,int,numeric,int,int,int,int) TO service_role;