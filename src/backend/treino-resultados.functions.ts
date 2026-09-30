import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAlunoAuth, optionalAlunoAuth } from "./aluno-middleware";
import { parseResultado, resultadoMeta } from "@/lib/treino-hyrox";

const alvo = z.object({
  sessao_id: z.string().uuid(),
  bloco_id: z.string().uuid().nullable(),
});

export type RankingLinha = { posicao: number; aluno_id: string; nome: string; valor: number | null; valor_texto: string | null; eu: boolean };
export type RankingResp = {
  resultado_tipo: string | null;
  ranking_habilitado: boolean;
  meu: { valor: number | null; valor_texto: string | null; posicao: number | null } | null;
  total: number;
  linhas: RankingLinha[];
};

async function configAlvo(sb: any, sessao_id: string, bloco_id: string | null) {
  if (bloco_id) {
    const { data } = await sb
      .from("corrida_sessao_blocos")
      .select("id, sessao_id, resultado_habilitado, resultado_tipo, ranking_habilitado, ranking_criterio")
      .eq("id", bloco_id)
      .maybeSingle();
    if (!data || data.sessao_id !== sessao_id || !data.resultado_habilitado) return null;
    return { tipo: data.resultado_tipo ?? "custom", ranking: !!data.ranking_habilitado, criterio: data.ranking_criterio ?? "maior" };
  }
  const { data } = await sb
    .from("corrida_sessoes")
    .select("id, data, resultado_geral_habilitado, resultado_geral_tipo, resultado_geral_criterio")
    .eq("id", sessao_id)
    .maybeSingle();
  if (!data || !data.resultado_geral_habilitado) return null;
  return { tipo: data.resultado_geral_tipo ?? "tempo", ranking: true, criterio: data.resultado_geral_criterio ?? "menor" };
}

export const registrarResultadoTreino = createServerFn({ method: "POST" })
  .middleware([requireAlunoAuth])
  .inputValidator((d) => alvo.extend({ valor: z.string().trim().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const cfg = await configAlvo(sb, data.sessao_id, data.bloco_id);
    if (!cfg) throw new Error("Este bloco não aceita resultado.");
    const num = parseResultado(cfg.tipo, data.valor);
    if (cfg.tipo !== "custom" && num == null) throw new Error("Resultado inválido. Ex.: 18:42, 5+12, 120.");
    const { data: sess } = await sb.from("corrida_sessoes").select("data").eq("id", data.sessao_id).maybeSingle();
    const row = {
      sessao_id: data.sessao_id,
      bloco_id: data.bloco_id,
      aluno_id: context.alunoId,
      resultado_tipo: cfg.tipo,
      valor: num,
      valor_texto: cfg.tipo === "custom" ? data.valor : null,
      unidade: resultadoMeta(cfg.tipo)?.unidade ?? null,
      data_treino: sess?.data ?? null,
    };
    let q = sb.from("treino_resultados").select("id").eq("aluno_id", context.alunoId).eq("sessao_id", data.sessao_id);
    q = data.bloco_id ? q.eq("bloco_id", data.bloco_id) : q.is("bloco_id", null);
    const { data: existente } = await q.maybeSingle();
    const { error } = existente
      ? await sb.from("treino_resultados").update(row).eq("id", existente.id)
      : await sb.from("treino_resultados").insert(row);
    if (error) throw new Error("Não foi possível salvar o resultado.");
    return { ok: true };
  });

export const getRankingTreino = createServerFn({ method: "POST" })
  .middleware([optionalAlunoAuth])
  .inputValidator((d) => alvo.extend({ filtro: z.enum(["geral", "masculino", "feminino", "faixa_etaria"]).default("geral") }).parse(d))
  .handler(async ({ data, context }): Promise<RankingResp> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const alunoId = (context as { alunoId: string | null }).alunoId;
    const cfg = await configAlvo(sb, data.sessao_id, data.bloco_id);
    if (!cfg) return { resultado_tipo: null, ranking_habilitado: false, meu: null, total: 0, linhas: [] };

    let q = sb
      .from("treino_resultados")
      .select("aluno_id, valor, valor_texto, alunos(nome, sexo, data_nascimento)")
      .eq("sessao_id", data.sessao_id);
    q = data.bloco_id ? q.eq("bloco_id", data.bloco_id) : q.is("bloco_id", null);
    const { data: rows } = await q;
    let lista: any[] = rows ?? [];

    const idade = (dn?: string | null) => (dn ? Math.floor((Date.now() - new Date(dn).getTime()) / 31557600000) : null);
    const faixa = (i: number | null) => (i == null ? null : Math.floor(i / 5) * 5);
    const eu = lista.find((r) => r.aluno_id === alunoId);
    if (data.filtro === "masculino") lista = lista.filter((r) => /^m/i.test(r.alunos?.sexo ?? ""));
    if (data.filtro === "feminino") lista = lista.filter((r) => /^f/i.test(r.alunos?.sexo ?? ""));
    if (data.filtro === "faixa_etaria" && eu) {
      const f = faixa(idade(eu.alunos?.data_nascimento));
      lista = lista.filter((r) => faixa(idade(r.alunos?.data_nascimento)) === f);
    }

    const menor = cfg.criterio === "menor";
    lista.sort((a, b) => {
      if (a.valor == null) return 1;
      if (b.valor == null) return -1;
      return menor ? a.valor - b.valor : b.valor - a.valor;
    });
    const linhas: RankingLinha[] = lista.map((r, i) => ({
      posicao: i + 1,
      aluno_id: r.aluno_id,
      nome: String(r.alunos?.nome ?? "Atleta").split(" ").slice(0, 2).join(" "),
      valor: r.valor != null ? Number(r.valor) : null,
      valor_texto: r.valor_texto,
      eu: r.aluno_id === alunoId,
    }));
    const minha = linhas.find((l) => l.eu);
    return {
      resultado_tipo: cfg.tipo,
      ranking_habilitado: cfg.ranking,
      meu: eu ? { valor: eu.valor != null ? Number(eu.valor) : null, valor_texto: eu.valor_texto, posicao: minha?.posicao ?? null } : null,
      total: linhas.length,
      linhas: cfg.ranking ? linhas : [],
    };
  });
