import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAlunoAuth } from "./aluno-middleware";

export type AlunoTreinoBloco = {
  id: string;
  ordem: number;
  tipo: string;
  nome: string;
  descricao: string | null;
  duracao_min: string | null;
  pace: string | null;
  zona: string | null;
  series: string | null;
  distancia_serie: string | null;
  recuperacao: string | null;
};

export type AlunoTreinoSessao = {
  id: string;
  data: string;
  ordem_no_dia: number;
  tipo: string;
  nome: string;
  duracao_min: number | null;
  distancia_km: number | null;
  pace_alvo: string | null;
  zona_fc: string | null;
  objetivo: string | null;
  observacao: string | null;
  executada: boolean;
  blocos: AlunoTreinoBloco[];
};

export const getSemanaTreinoAluno = createServerFn({ method: "POST" })
  .middleware([requireAlunoAuth])
  .inputValidator((d) =>
    z.object({ inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ sessoes: AlunoTreinoSessao[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const { data: micros } = await sb
      .from("corrida_microciclos")
      .select("id")
      .eq("aluno_id", context.alunoId)
      .eq("status", "publicada");
    const microIds = (micros ?? []).map((m: any) => m.id);
    if (microIds.length === 0) return { sessoes: [] };

    const { data: sessoes } = await sb
      .from("corrida_sessoes")
      .select(
        "id, data, ordem_no_dia, tipo, nome, duracao_min, distancia_km, pace_alvo, zona_fc, objetivo, observacao, executada, corrida_sessao_blocos(id, ordem, tipo, nome, descricao, duracao_min, pace, zona, series, distancia_serie, recuperacao)",
      )
      .eq("aluno_id", context.alunoId)
      .in("microciclo_id", microIds)
      .gte("data", data.inicio)
      .lte("data", data.fim)
      .order("data")
      .order("ordem_no_dia");

    return {
      sessoes: (sessoes ?? []).map((s: any) => ({
        ...s,
        blocos: [...(s.corrida_sessao_blocos ?? [])].sort((a: any, b: any) => a.ordem - b.ordem),
        corrida_sessao_blocos: undefined,
      })),
    };
  });
