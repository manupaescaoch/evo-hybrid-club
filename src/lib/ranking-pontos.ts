/** Regras de pontuação do ranking — ajuste os valores somente aqui. */
export const PONTOS = {
  treinoConcluido: 30, // por sessão com ao menos um resultado
  resultadoBloco: 10, // por resultado em bloco com resultado habilitado
  corridaPorKm: 5,
  corridaMaxKmDia: 30,
  checkin: 10, // máx. 1 por dia
  post: 5, // máx. 1 post pontuável por dia (posts automáticos não contam)
  bonusSequencia: 50,
  diasSequencia: 7,
} as const;

export const LIGAS = [
  { nome: "Liga Bronze", min: 0 },
  { nome: "Liga Prata", min: 500 },
  { nome: "Liga Ouro", min: 1000 },
  { nome: "Liga Diamante", min: 2000 },
] as const;

export const REGRAS_PONTUACAO = [
  { label: "Treino do dia concluído", score: `+${PONTOS.treinoConcluido}`, detalhe: "1 vez por sessão" },
  { label: "Resultado registrado", score: `+${PONTOS.resultadoBloco}`, detalhe: "por bloco com resultado" },
  { label: "Corrida registrada", score: `+${PONTOS.corridaPorKm}/km`, detalhe: `até ${PONTOS.corridaMaxKmDia} km por dia` },
  { label: "Check-in diário", score: `+${PONTOS.checkin}`, detalhe: "1 vez por dia" },
  { label: "Post na comunidade", score: `+${PONTOS.post}`, detalhe: "1 post por dia" },
  { label: `Sequência de ${PONTOS.diasSequencia} dias`, score: `+${PONTOS.bonusSequencia}`, detalhe: `a cada ${PONTOS.diasSequencia} dias seguidos de check-in` },
];

/** Limites antifraude da corrida manual. */
export const CORRIDA_LIMITES = { paceMin: 150, paceMax: 900, maxKm: 60 } as const;

export function paceSegundos(distanciaKm: number, tempoSeg: number): number {
  return Math.round(tempoSeg / distanciaKm);
}

export function validarCorrida(distanciaKm: number, tempoSeg: number): string | null {
  if (!(distanciaKm > 0)) return "Informe a distância.";
  if (distanciaKm > CORRIDA_LIMITES.maxKm) return "Distância acima de 60 km não é aceita.";
  if (!(tempoSeg > 0)) return "Informe o tempo total.";
  const p = paceSegundos(distanciaKm, tempoSeg);
  if (p < CORRIDA_LIMITES.paceMin) return "Pace mais rápido que 2:30/km não é aceito.";
  if (p > CORRIDA_LIMITES.paceMax) return "Pace mais lento que 15:00/km não é aceito.";
  return null;
}

export function formatPace(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export function formatTempo(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function ligaDe(score: number) {
  let idx = 0;
  LIGAS.forEach((l, i) => {
    if (score >= l.min) idx = i;
  });
  const atual = LIGAS[idx];
  const prox = LIGAS[idx + 1] ?? null;
  return { nome: atual.nome, min: atual.min, prox: prox?.nome ?? null, proxMin: prox?.min ?? null };
}
