import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { carregarAnaliseCorrida, type AnaliseCorrida } from "@/lib/corrida-analise";
import { calcularVdot, pacesDoVdot } from "@/lib/corrida-vdot";
import { MeusPacesCard, MinhaFormaCard, PrescritoRealizadoCard } from "@/components/corrida/CorridaCards";

/** Ficha do aluno (painel): paces, forma e prescrito x realizado da semana. */
export function CorridaAlunoPainel({ alunoId }: { alunoId: string }) {
  const [analise, setAnalise] = useState<AnaliseCorrida | null>(null);
  const carregar = useCallback(() => {
    carregarAnaliseCorrida(supabase, alunoId).then(setAnalise).catch(() => setAnalise(null));
  }, [alunoId]);
  useEffect(carregar, [carregar]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MeusPacesCard
        titulo="Paces do aluno"
        analise={analise}
        onSalvar={async (d) => {
          const vdot = calcularVdot(d.distancia_km, d.tempo_segundos);
          const { error } = await supabase.from("aluno_paces").insert({
            aluno_id: alunoId,
            vdot: Math.round(vdot * 10) / 10,
            teste_distancia_km: d.distancia_km,
            teste_tempo_segundos: d.tempo_segundos,
            data_teste: d.data_teste,
            paces: pacesDoVdot(vdot),
            origem: "treinador",
          });
          if (error) return "Não foi possível salvar o teste.";
          toast.success("Teste salvo");
          carregar();
          return null;
        }}
      />
      <MinhaFormaCard titulo="Forma do aluno" analise={analise} />
      <PrescritoRealizadoCard titulo="Corrida da semana: prescrito x realizado" analise={analise} />
    </div>
  );
}
