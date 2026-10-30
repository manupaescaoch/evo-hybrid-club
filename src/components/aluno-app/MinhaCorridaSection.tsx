import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMinhaCorridaAnalise, salvarMeuTestePace } from "@/backend/corrida-forma.functions";
import type { AnaliseCorrida } from "@/lib/corrida-analise";
import { MeusPacesCard, MinhaFormaCard, PrescritoRealizadoCard } from "@/components/corrida/CorridaCards";

export function MinhaCorridaSection() {
  const carregarFn = useServerFn(getMinhaCorridaAnalise);
  const salvarFn = useServerFn(salvarMeuTestePace);
  const [analise, setAnalise] = useState<AnaliseCorrida | null>(null);
  const carregar = useCallback(() => {
    carregarFn().then((r) => setAnalise(r ?? null)).catch(() => setAnalise(null));
  }, [carregarFn]);
  useEffect(carregar, [carregar]);

  return (
    <>
      <MeusPacesCard
        analise={analise}
        onSalvar={async (d) => {
          try {
            const r = await salvarFn({ data: d });
            if (!r.ok) return r.error;
            carregar();
            return null;
          } catch {
            return "Não foi possível salvar. Tente de novo.";
          }
        }}
      />
      <MinhaFormaCard analise={analise} />
      <PrescritoRealizadoCard analise={analise} />
    </>
  );
}
