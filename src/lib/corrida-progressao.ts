// Regras de progressão de volume de corrida (referência para o treinador; só avisam, não bloqueiam).
export const PROGRESSAO = {
  /** A cada N semanas, uma é de recuperação (3:1). */
  cicloRecuperacaoSemanas: 4,
  /** Volume da semana de recuperação em relação à semana anterior. */
  volumeRecuperacao: 0.6,
  /** Semana 1: no máximo 1,2× a média das 4 semanas anteriores. */
  rampaSemana1: 1.2,
  /** Depois: no máximo +10% por semana de carga. */
  aumentoMaxSemanal: 0.1,
  /** Polimento: volume na semana da prova cai até 50%. */
  volumePolimentoProva: 0.5,
  /** Alerta no painel: volume semanal > média das 4 semanas anteriores em +10%. */
  alertaAumentoSobreMedia4: 0.1,
} as const;

export type ContextoSemana = {
  volumeKm: number;
  anterioresKm: number[]; // até 4 semanas anteriores, mais recente primeiro
  tipoSemana?: string | null; // "normal" | "regenerativa" | "polimento" | "prova" ...
  primeiraSemana?: boolean;
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function avisosProgressao(c: ContextoSemana): string[] {
  const avisos: string[] = [];
  const ant = c.anterioresKm.filter((x) => x > 0);
  if (!c.volumeKm || ant.length === 0) return avisos;
  const media4 = ant.slice(0, 4).reduce((a, b) => a + b, 0) / Math.min(4, ant.length);
  const anterior = c.anterioresKm[0] ?? 0;
  const tipo = (c.tipoSemana ?? "").toLowerCase();

  if (tipo.includes("regener") || tipo.includes("recupera")) {
    const alvo = anterior * PROGRESSAO.volumeRecuperacao;
    if (anterior > 0 && c.volumeKm > alvo * 1.05)
      avisos.push(`Semana de recuperação: volume deveria ficar perto de ${fmt(alvo)} km (60% da semana anterior).`);
    return avisos;
  }
  if (tipo.includes("prova")) {
    const alvo = media4 * PROGRESSAO.volumePolimentoProva;
    if (c.volumeKm > alvo * 1.05) avisos.push(`Semana da prova: volume deveria cair para ~${fmt(alvo)} km (50%).`);
    return avisos;
  }
  if (tipo.includes("polim")) {
    if (anterior > 0 && c.volumeKm >= anterior) avisos.push("Polimento: o volume deveria ser menor que o da semana anterior.");
    return avisos;
  }
  if (c.primeiraSemana) {
    const lim = media4 * PROGRESSAO.rampaSemana1;
    if (c.volumeKm > lim) avisos.push(`Semana 1 acima de 1,2× a média das últimas semanas (${fmt(lim)} km).`);
    return avisos;
  }
  if (anterior > 0) {
    const lim = anterior * (1 + PROGRESSAO.aumentoMaxSemanal);
    if (c.volumeKm > lim) avisos.push(`Volume subiu mais de 10% sobre a semana anterior (limite ${fmt(lim)} km).`);
  }
  const seguidas = c.anterioresKm.slice(0, PROGRESSAO.cicloRecuperacaoSemanas - 1);
  if (seguidas.length === PROGRESSAO.cicloRecuperacaoSemanas - 1 && seguidas.every((v, i) => i === 0 || v <= (seguidas[i - 1] ?? 0)) && seguidas.every((v) => v > 0) && c.volumeKm >= anterior) {
    avisos.push("Já são 3 semanas de carga seguidas: planeje uma semana de recuperação (3:1).");
  }
  return avisos;
}

export function aumentoSobreMedia4(volumeKm: number, anterioresKm: number[]): number | null {
  const ant = anterioresKm.slice(0, 4);
  if (ant.length === 0) return null;
  const media = ant.reduce((a, b) => a + b, 0) / ant.length;
  if (media <= 0) return null;
  return (volumeKm - media) / media;
}
