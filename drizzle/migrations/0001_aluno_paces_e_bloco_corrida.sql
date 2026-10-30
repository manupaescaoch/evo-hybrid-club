CREATE TABLE public.aluno_paces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  vdot numeric NOT NULL,
  teste_distancia_km numeric NOT NULL,
  teste_tempo_segundos integer NOT NULL,
  data_teste date NOT NULL,
  paces jsonb NOT NULL,
  origem text NOT NULL DEFAULT 'aluno' CHECK (origem IN ('aluno','treinador')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aluno_paces_aluno_idx ON public.aluno_paces (aluno_id, data_teste DESC, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aluno_paces TO authenticated;
GRANT ALL ON public.aluno_paces TO service_role;
ALTER TABLE public.aluno_paces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe lê paces" ON public.aluno_paces FOR SELECT TO authenticated USING (public.is_equipe_or_admin(auth.uid()));
CREATE POLICY "Equipe cria paces" ON public.aluno_paces FOR INSERT TO authenticated WITH CHECK (public.is_equipe_or_admin(auth.uid()));
CREATE POLICY "Equipe edita paces" ON public.aluno_paces FOR UPDATE TO authenticated USING (public.is_equipe_or_admin(auth.uid()));
CREATE POLICY "Equipe apaga paces" ON public.aluno_paces FOR DELETE TO authenticated USING (public.is_equipe_or_admin(auth.uid()));

ALTER TABLE public.corrida_sessao_blocos ADD COLUMN IF NOT EXISTS corrida_estrutura jsonb;