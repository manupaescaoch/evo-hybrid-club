import { createServerFn } from "@tanstack/react-start";
import { requireAlunoAuth } from "./aluno-middleware";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PONTOS, ligaDe } from "@/lib/ranking-pontos";
import { intervaloPeriodo, sequenciaDias } from "@/lib/recife-date";

export type RankingItem = {
  aluno_id: string;
  nome: string;
  username: string | null;
  foto_url: string | null;
  score: number;
};

export type RankingResposta = {
  periodo: "semana" | "mes" | "geral";
  top: RankingItem[];
  meu: {
    posicao: number | null;
    score: number;
    sequencia: number;
    liga: string;
    proximaLiga: string | null;
    falta: number;
    progresso: number;
  } | null;
};

/** Soma por aluno calculada no banco (sem limite de 1.000 linhas). */
async function scores(desde: string | null, ate: string | null): Promise<Map<string, number>> {
  const { data, error } = await (supabaseAdmin as any).rpc("ranking_scores", {
    _desde: desde,
    _ate: ate,
    _p_treino: PONTOS.treinoConcluido,
    _p_resultado: PONTOS.resultadoBloco,
    _p_km: PONTOS.corridaPorKm,
    _max_km: PONTOS.corridaMaxKmDia,
    _p_checkin: PONTOS.checkin,
    _p_post: PONTOS.post,
    _p_seq_bonus: PONTOS.bonusSequencia,
    _seq_dias: PONTOS.diasSequencia,
  });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r: any) => [r.aluno_id as string, Number(r.score) || 0]));
}

export const getRanking = createServerFn({ method: "POST" }).middleware([requireAlunoAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        periodo: z.enum(["semana", "mes", "geral"]),
        aluno_id: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<RankingResposta> => {
    const sb = supabaseAdmin as any;
    const { desde, ate } = intervaloPeriodo(data.periodo);
    const scoreMap = await scores(desde, ate);
    const geralMap = data.periodo === "geral" ? scoreMap : await scores(null, null);

    const ids = Array.from(scoreMap.keys());
    let alunos: any[] = [];
    if (ids.length) {
      const { data: arows } = await sb.from("alunos").select("id, nome, username, foto_url").in("id", ids);
      alunos = arows ?? [];
    }
    const alunoMap = new Map(alunos.map((a) => [a.id, a]));

    const ranking: RankingItem[] = ids
      .map((id) => {
        const a = alunoMap.get(id);
        if (!a) return null;
        return { aluno_id: id, nome: a.nome ?? "Aluno", username: a.username ?? null, foto_url: a.foto_url ?? null, score: scoreMap.get(id) ?? 0 };
      })
      .filter((x): x is RankingItem => !!x && x.score > 0)
      .sort((a, b) => b.score - a.score);

    const alunoId = context.alunoId;
    const idx = ranking.findIndex((r) => r.aluno_id === alunoId);
    const { data: meusCheckins } = await sb
      .from("daily_checkins")
      .select("data_checkin")
      .eq("aluno_id", alunoId)
      .order("data_checkin", { ascending: false })
      .limit(400);
    const sequencia = sequenciaDias((meusCheckins ?? []).map((r: any) => r.data_checkin));
    const scoreTotal = geralMap.get(alunoId) ?? 0;
    const liga = ligaDe(scoreTotal);
    const falta = liga.proxMin ? Math.max(0, liga.proxMin - scoreTotal) : 0;
    const progresso = liga.proxMin
      ? Math.min(100, Math.round(((scoreTotal - liga.min) / (liga.proxMin - liga.min)) * 100))
      : 100;

    return {
      periodo: data.periodo,
      top: ranking.slice(0, 50),
      meu: {
        posicao: idx >= 0 ? idx + 1 : null,
        score: idx >= 0 ? ranking[idx].score : 0,
        sequencia,
        liga: liga.nome,
        proximaLiga: liga.prox,
        falta,
        progresso,
      },
    };
  });
