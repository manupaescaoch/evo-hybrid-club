ALTER TABLE public.corrida_sessao_blocos
  ADD COLUMN IF NOT EXISTS formato text,
  ADD COLUMN IF NOT EXISTS prescricao text,
  ADD COLUMN IF NOT EXISTS orientacoes text,
  ADD COLUMN IF NOT EXISTS resultado_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resultado_tipo text,
  ADD COLUMN IF NOT EXISTS ranking_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ranking_criterio text,
  ADD COLUMN IF NOT EXISTS ranking_filtros text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.corrida_sessoes
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS resultado_geral_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resultado_geral_tipo text,
  ADD COLUMN IF NOT EXISTS resultado_geral_criterio text;

CREATE TABLE public.treino_resultados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid REFERENCES public.corrida_sessoes(id) ON DELETE SET NULL,
  bloco_id uuid REFERENCES public.corrida_sessao_blocos(id) ON DELETE SET NULL,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  resultado_tipo text NOT NULL,
  valor numeric,
  valor_texto text,
  unidade text,
  data_treino date,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX treino_resultados_bloco_aluno ON public.treino_resultados(bloco_id, aluno_id) WHERE bloco_id IS NOT NULL;
CREATE UNIQUE INDEX treino_resultados_geral_aluno ON public.treino_resultados(sessao_id, aluno_id) WHERE bloco_id IS NULL AND sessao_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treino_resultados TO authenticated;
GRANT ALL ON public.treino_resultados TO service_role;
ALTER TABLE public.treino_resultados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe vê resultados" ON public.treino_resultados FOR SELECT TO authenticated USING (public.is_crm_user(auth.uid()));
CREATE POLICY "Equipe gerencia resultados" ON public.treino_resultados FOR ALL TO authenticated USING (public.is_equipe_or_admin(auth.uid())) WITH CHECK (public.is_equipe_or_admin(auth.uid()));
CREATE TRIGGER tg_treino_resultados_touch BEFORE UPDATE ON public.treino_resultados FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();