// Catálogo do builder de treino HYROX / Hybrid (compartilhado entre painel e app do aluno).

export const TIPOS_BLOCO_HYROX: { value: string; label: string; desc: string; cor: string }[] = [
  { value: "warmup", label: "WARM-UP", desc: "Aquecimento geral e específico para preparar o atleta para a sessão.", cor: "#F59E0B" },
  { value: "mobility", label: "MOBILITY", desc: "Trabalho de mobilidade articular e amplitude de movimento.", cor: "#14B8A6" },
  { value: "activation", label: "ACTIVATION", desc: "Exercícios de ativação muscular antes do trabalho principal.", cor: "#84CC16" },
  { value: "skill", label: "SKILL / TECHNIQUE", desc: "Prática técnica de movimentos, estações ou habilidades específicas.", cor: "#06B6D4" },
  { value: "strength", label: "STRENGTH", desc: "Bloco de força com exercícios principais e acessórios.", cor: "#0033FF" },
  { value: "power", label: "POWER", desc: "Trabalho de potência, velocidade e produção rápida de força.", cor: "#6366F1" },
  { value: "engine", label: "ENGINE", desc: "Condicionamento cardiorrespiratório utilizando corrida, SkiErg, RowErg, BikeErg ou combinações.", cor: "#0EA5E9" },
  { value: "hyrox", label: "HYROX SPECIFIC", desc: "Treino específico utilizando movimentos, estações e demandas semelhantes às da competição HYROX.", cor: "#EAB308" },
  { value: "compromised", label: "COMPROMISED RUNNING", desc: "Corrida realizada sob fadiga após exercícios ou estações.", cor: "#F97316" },
  { value: "metcon", label: "METCON", desc: "Bloco metabólico combinando exercícios em intensidade elevada.", cor: "#EF4444" },
  { value: "conditioning", label: "CONDITIONING", desc: "Condicionamento físico geral e desenvolvimento da capacidade de trabalho.", cor: "#EC4899" },
  { value: "accessory", label: "ACCESSORY", desc: "Exercícios complementares de força, estabilidade ou prevenção.", cor: "#8B5CF6" },
  { value: "core", label: "CORE", desc: "Trabalho específico de tronco e estabilidade central.", cor: "#A855F7" },
  { value: "finisher", label: "FINISHER", desc: "Bloco curto e intenso realizado ao final da sessão.", cor: "#DC2626" },
  { value: "cooldown", label: "COOL DOWN", desc: "Redução gradual da intensidade após o treino.", cor: "#22C55E" },
  { value: "recovery", label: "RECOVERY", desc: "Atividades leves voltadas para recuperação, respiração e mobilidade.", cor: "#10B981" },
  { value: "custom", label: "CUSTOM", desc: "Bloco livre definido pelo treinador.", cor: "#64748B" },
];

export const FORMATOS: { value: string; label: string; desc: string }[] = [
  { value: "EMOM", label: "EMOM", desc: "Executar uma tarefa no início de cada minuto. O tempo restante é descanso." },
  { value: "E2MOM", label: "E2MOM", desc: "Executar uma tarefa a cada 2 minutos. O tempo restante é descanso." },
  { value: "E3MOM", label: "E3MOM", desc: "Executar uma tarefa a cada 3 minutos. O tempo restante é descanso." },
  { value: "E4MOM", label: "E4MOM", desc: "Executar uma tarefa a cada 4 minutos. O tempo restante é descanso." },
  { value: "AMRAP", label: "AMRAP", desc: "Realizar o maior número possível de rounds ou repetições dentro do tempo determinado." },
  { value: "FOR TIME", label: "FOR TIME", desc: "Completar o volume prescrito no menor tempo possível." },
  { value: "ROUNDS FOR TIME", label: "ROUNDS FOR TIME", desc: "Completar um número de rounds no menor tempo possível." },
  { value: "CHIPPER", label: "CHIPPER", desc: "Sequência longa de exercícios executados uma única vez, em ordem." },
  { value: "INTERVALS", label: "INTERVALS", desc: "Alternar períodos definidos de trabalho e recuperação." },
  { value: "WORK / REST", label: "WORK / REST", desc: "Trabalho e descanso com tempos fixos definidos." },
  { value: "LADDER", label: "LADDER", desc: "Volume crescente ou decrescente a cada round." },
  { value: "MAX REPS", label: "MAX REPS", desc: "Máximo de repetições possíveis." },
  { value: "MAX DISTANCE", label: "MAX DISTANCE", desc: "Máxima distância percorrida no tempo definido." },
  { value: "MAX CALORIES", label: "MAX CALORIES", desc: "Máximo de calorias no equipamento no tempo definido." },
  { value: "QUALITY", label: "QUALITY", desc: "Execução com foco em técnica e qualidade, sem cronômetro." },
  { value: "RACE PACE", label: "RACE PACE", desc: "Trabalho no ritmo alvo de prova." },
  { value: "CUSTOM", label: "CUSTOM", desc: "Formato livre definido pelo treinador." },
];

export const TIPOS_RESULTADO: { value: string; label: string; unidade: string }[] = [
  { value: "tempo", label: "Tempo", unidade: "mm:ss" },
  { value: "rounds_reps", label: "Rounds + Reps", unidade: "rounds+reps" },
  { value: "reps", label: "Repetições", unidade: "reps" },
  { value: "distancia", label: "Distância", unidade: "m" },
  { value: "calorias", label: "Calorias", unidade: "cal" },
  { value: "carga", label: "Carga", unidade: "kg" },
  { value: "pontos", label: "Pontuação", unidade: "pts" },
  { value: "custom", label: "Resultado personalizado", unidade: "" },
];

export const FILTROS_RANKING = [
  { value: "geral", label: "Geral" },
  { value: "unidade", label: "Por unidade" },
  { value: "turma", label: "Por turma" },
  { value: "categoria", label: "Por categoria" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "faixa_etaria", label: "Faixa etária" },
];

export function tipoBlocoMeta(v: string | null | undefined) {
  return TIPOS_BLOCO_HYROX.find((t) => t.value === v) ?? TIPOS_BLOCO_HYROX[TIPOS_BLOCO_HYROX.length - 1];
}
export function formatoMeta(v: string | null | undefined) {
  return FORMATOS.find((f) => f.value === v) ?? null;
}
export function resultadoMeta(v: string | null | undefined) {
  return TIPOS_RESULTADO.find((r) => r.value === v) ?? null;
}

export function sugerirResultado(formato: string | null, tipoBloco?: string): string | null {
  switch (formato) {
    case "FOR TIME":
    case "ROUNDS FOR TIME":
    case "CHIPPER":
      return "tempo";
    case "AMRAP":
      return "rounds_reps";
    case "MAX REPS":
      return "reps";
    case "MAX DISTANCE":
      return "distancia";
    case "MAX CALORIES":
      return "calorias";
  }
  if (tipoBloco === "strength" || tipoBloco === "power") return "carga";
  return null;
}

export function sugerirCriterio(resultadoTipo: string | null): "menor" | "maior" {
  return resultadoTipo === "tempo" ? "menor" : "maior";
}

/** Converte o texto digitado pelo aluno num número comparável para o ranking. */
export function parseResultado(tipo: string, texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!t) return null;
  if (tipo === "tempo") {
    const p = t.split(":").map(Number);
    if (p.some((n) => Number.isNaN(n))) return null;
    return p.reduce((acc, n) => acc * 60 + n, 0);
  }
  if (tipo === "rounds_reps") {
    const m = t.match(/^(\d+)\s*[+ ]\s*(\d+)$/);
    if (m) return Number(m[1]) * 1000 + Number(m[2]);
    const n = Number(t);
    return Number.isNaN(n) ? null : n * 1000;
  }
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

export function formatarResultado(tipo: string, valor: number | null, texto?: string | null): string {
  if (texto) return texto;
  if (valor == null) return "—";
  if (tipo === "tempo") {
    const s = Math.round(valor);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(ss).padStart(2, "0")}`;
    return h ? `${h}:${mmss}` : mmss;
  }
  if (tipo === "rounds_reps") return `${Math.floor(valor / 1000)} + ${valor % 1000}`;
  const u = resultadoMeta(tipo)?.unidade ?? "";
  return `${valor}${u ? ` ${u}` : ""}`;
}

export const ESTRUTURA_PADRAO = ["warmup", "strength", "hyrox", "finisher", "cooldown"];
