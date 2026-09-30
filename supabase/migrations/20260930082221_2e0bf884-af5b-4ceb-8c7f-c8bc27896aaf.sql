CREATE TABLE public.aluno_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  titulo text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  descricao text,
  responsavel text,
  prioridade text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'aberta',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aluno_ocorrencias TO authenticated;
GRANT ALL ON public.aluno_ocorrencias TO service_role;
ALTER TABLE public.aluno_ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm le ocorrencias" ON public.aluno_ocorrencias FOR SELECT TO authenticated USING (public.is_crm_user(auth.uid()));
CREATE POLICY "equipe gerencia ocorrencias" ON public.aluno_ocorrencias FOR ALL TO authenticated USING (public.is_equipe_or_admin(auth.uid())) WITH CHECK (public.is_equipe_or_admin(auth.uid()));
CREATE INDEX idx_aluno_ocorrencias_aluno ON public.aluno_ocorrencias(aluno_id, data DESC);