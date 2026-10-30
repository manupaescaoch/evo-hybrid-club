import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAlunoAuth } from "./aluno-middleware";
import { carregarAnaliseCorrida } from "@/lib/corrida-analise";
import { calcularVdot, pacesDoVdot, DISTANCIAS_TESTE } from "@/lib/corrida-vdot";
import { dataRecife } from "@/lib/recife-date";

export const getMinhaCorridaAnalise = createServerFn({ method: "POST" })
  .middleware([requireAlunoAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return carregarAnaliseCorrida(supabaseAdmin, context.alunoId);
  });

export const salvarMeuTestePace = createServerFn({ method: "POST" })
  .middleware([requireAlunoAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        distancia_km: z.number().refine((v) => (DISTANCIAS_TESTE as readonly number[]).includes(v)),
        tempo_segundos: z.number().int().min(240).max(4 * 3600),
        data_teste: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.data_teste > dataRecife()) return { ok: false as const, error: "A data não pode ser no futuro." };
    const pace = data.tempo_segundos / data.distancia_km;
    if (pace < 150 || pace > 720) return { ok: false as const, error: "Tempo fora do esperado para essa distância." };
    const vdot = calcularVdot(data.distancia_km, data.tempo_segundos);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("aluno_paces").insert({
      aluno_id: context.alunoId,
      vdot: Math.round(vdot * 10) / 10,
      teste_distancia_km: data.distancia_km,
      teste_tempo_segundos: data.tempo_segundos,
      data_teste: data.data_teste,
      paces: pacesDoVdot(vdot),
      origem: "aluno",
    });
    if (error) return { ok: false as const, error: "Não foi possível salvar o teste." };
    return { ok: true as const };
  });
