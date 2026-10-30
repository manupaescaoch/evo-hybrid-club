import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAlunoAuth } from "./aluno-middleware";
import { decodeAndValidateImage } from "./image-validation.server";
import { formatPace, formatTempo, paceSegundos, validarCorrida } from "@/lib/ranking-pontos";
import { dataRecife } from "@/lib/recife-date";

export type CorridaRegistrada = {
  id: string;
  aluno_id: string;
  data: string;
  distancia_km: number;
  tempo_segundos: number;
  pace_segundos_km: number;
  print_url: string;
  observacao: string | null;
  status: "aprovada" | "recusada";
  created_at: string;
};

export const registrarCorrida = createServerFn({ method: "POST" })
  .middleware([requireAlunoAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        distancia_km: z.number(),
        tempo_segundos: z.number().int(),
        observacao: z.string().max(500).optional().nullable(),
        file_base64: z.string().min(20),
        content_type: z.string().min(3).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const aluno_id = context.alunoId;
    if (data.data > dataRecife()) return { ok: false as const, error: "A data não pode ser no futuro." };
    const erro = validarCorrida(data.distancia_km, data.tempo_segundos);
    if (erro) return { ok: false as const, error: erro };
    const v = decodeAndValidateImage(data.file_base64, data.content_type, 8 * 1024 * 1024);
    if (!v.ok) return { ok: false as const, error: v.error };
    const path = `corridas/${aluno_id}/${Date.now()}.${v.ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("aluno-fotos")
      .upload(path, v.buf, { contentType: v.mime, upsert: false });
    if (upErr) return { ok: false as const, error: upErr.message };
    const { data: pub } = supabaseAdmin.storage.from("aluno-fotos").getPublicUrl(path);
    const pace = paceSegundos(data.distancia_km, data.tempo_segundos);
    const sb = supabaseAdmin as any;
    const { data: row, error } = await sb
      .from("corridas_registradas")
      .insert({
        aluno_id,
        data: data.data,
        distancia_km: Math.round(data.distancia_km * 100) / 100,
        tempo_segundos: data.tempo_segundos,
        pace_segundos_km: pace,
        print_url: pub.publicUrl,
        observacao: data.observacao?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    const km = data.distancia_km.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    await sb.from("community_posts").insert({
      aluno_id,
      foto_url: pub.publicUrl,
      legenda: `🏃 Corrida registrada: ${km} km em ${formatTempo(data.tempo_segundos)} · pace ${formatPace(pace)}`,
      origem: "corrida",
      corrida_id: row.id,
    });
    return { ok: true as const, id: row.id as string };
  });

export const listarMinhasCorridas = createServerFn({ method: "POST" })
  .middleware([requireAlunoAuth])
  .handler(async ({ context }) => {
    const { data } = await (supabaseAdmin as any)
      .from("corridas_registradas")
      .select("*")
      .eq("aluno_id", context.alunoId)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    return (data ?? []) as CorridaRegistrada[];
  });

