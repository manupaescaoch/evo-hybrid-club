import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { PlanoSemanalTab } from "@/components/aluno/treino/PlanoSemanalTab";
import type { PerfilCorrida } from "@/lib/corrida-zonas";

const PERFIL_CLUBE: PerfilCorrida = {
  fc_max: null,
  fc_repouso: null,
  pace_limiar_seg: null,
};

export const Route = createFileRoute("/_app/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos — EVO HYBRID CLUB" },
      { name: "description", content: "Crie e publique a programação oficial de treinos do EVO HYBRID CLUB." },
      { property: "og:title", content: "Treinos — EVO HYBRID CLUB" },
      { property: "og:description", content: "Programação oficial de treinos do EVO HYBRID CLUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Dumbbell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Treinos</h1>
          <p className="text-sm text-muted-foreground">Programação oficial exibida igualmente para todos os alunos.</p>
        </div>
      </header>
      <PlanoSemanalTab global perfil={PERFIL_CLUBE} />
    </div>
  );
}