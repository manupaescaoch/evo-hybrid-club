import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAlunoAuth } from "./aluno-middleware";
import { dataRecife } from "@/lib/recife-date";

/** Salva a conclusão do treino (uma por sessão por aluno). Vale +30 no ranking via `ranking_scores`. */
export const concluirTreino = createServerFn({ method: "POST" })
  .middleware([requireAlunoAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessao_ids: z.array(z.string().uuid()).min(1).max(10),
        duracao_seg: z.number().int().min(0).max(24 * 3600).nullable().optional(),
        distancia_km: z.number().min(0).max(300).nullable().optional(),
        pse: z.number().int().min(1).max(10).nullable().optional(),
        observacao: z.string().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const hoje = dataRecife();
    // Só sessões publicadas do clube, com data até hoje.
    const { data: sessoes } = await sb
      .from("corrida_sessoes")
      .select("id, data, corrida_microciclos!inner(is_global, status)")
      .in("id", data.sessao_ids)
      .eq("corrida_microciclos.is_global", true)
      .eq("corrida_microciclos.status", "publicada")
      .lte("data", hoje);
    const validas = (sessoes ?? []) as { id: string; data: string }[];
    if (!validas.length) return { ok: false as const, error: "Treino não encontrado para hoje." };
    const rows = validas.map((s) => ({
      aluno_id: context.alunoId,
      sessao_id: s.id,
      data_treino: s.data,
      duracao_seg: data.duracao_seg ?? null,
      distancia_km: data.distancia_km ?? null,
      pse: data.pse ?? null,
      observacao: data.observacao?.trim() || null,
    }));
    const { error } = await sb.from("treino_conclusoes").upsert(rows, { onConflict: "aluno_id,sessao_id" });
    if (error) return { ok: false as const, error: "Não foi possível salvar o treino." };
    return { ok: true as const, sessoes: validas.length };
  });
