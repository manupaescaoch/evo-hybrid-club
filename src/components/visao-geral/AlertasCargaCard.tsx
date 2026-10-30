import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analisar, type PaceRegistro } from "@/lib/corrida-analise";
import { aumentoSobreMedia4, PROGRESSAO } from "@/lib/corrida-progressao";
import { dataRecife, somarDias } from "@/lib/recife-date";

type Alerta = { id: string; nome: string; textos: string[] };

async function todas<T>(q: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await q(de, de + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** Alunos com Fadiga alta / Excesso de carga, ou volume semanal >10% sobre a média das 4 semanas anteriores. */
export function AlertasCargaCard() {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  useEffect(() => {
    (async () => {
      const hoje = dataRecife();
      const desde = somarDias(hoje, -176);
      const [alunos, corridas, paces] = await Promise.all([
        todas((a, b) => supabase.from("alunos").select("id, nome").neq("status", "cancelado").range(a, b)),
        todas((a, b) => supabase.from("corridas_registradas").select("id, aluno_id, data, distancia_km, tempo_segundos, pace_segundos_km, status").gte("data", desde).neq("status", "recusada").order("data").range(a, b)),
        todas((a, b) => supabase.from("aluno_paces").select("*").order("data_teste", { ascending: false }).order("created_at", { ascending: false }).range(a, b)),
      ]);
      const out: Alerta[] = [];
      for (const al of alunos) {
        const cs = corridas.filter((c) => c.aluno_id === al.id).map((c) => ({ ...c, distancia_km: Number(c.distancia_km) }));
        if (cs.length === 0) continue;
        const p = (paces.find((x) => x.aluno_id === al.id) as unknown as PaceRegistro) ?? null;
        const r = analisar(p, cs, [], hoje);
        const textos: string[] = [];
        if (r.faixa?.alerta) textos.push(r.faixa.nome);
        const [atual, ...ant] = r.volumesSemanais.map((v) => v.km);
        const aum = aumentoSobreMedia4(atual, ant.slice(0, 4));
        if (aum != null && aum > PROGRESSAO.alertaAumentoSobreMedia4) textos.push(`Volume da semana +${Math.round(aum * 100)}% sobre a média de 4 semanas`);
        if (textos.length) out.push({ id: al.id, nome: al.nome, textos });
      }
      setAlertas(out);
    })().catch(() => setAlertas([]));
  }, []);

  if (!alertas || alertas.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <AlertTriangle className="h-4 w-4 text-destructive" /> Carga de corrida — atenção
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {alertas.map((a) => (
          <li key={a.id} className="py-2">
            <Link to="/alunos/$id" params={{ id: a.id }} search={{ tab: "treinos" } as never} className="text-sm font-semibold hover:underline">{a.nome}</Link>
            <p className="text-xs text-muted-foreground">{a.textos.join(" · ")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
