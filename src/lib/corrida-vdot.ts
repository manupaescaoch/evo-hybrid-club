// Cálculos de corrida individualizada (sem IA, sem Strava).
// VDOT pelas fórmulas públicas de Jack Daniels; carga e forma adaptadas da
// lógica do Coach Watts (Apache 2.0, github.com/newpush/coach), reescritas aqui.
import { somarDias } from "@/lib/recife-date";

export type ZonaPace = "E" | "M" | "T" | "I" | "R";
/** Paces em segundos por km. E é faixa (min = mais rápido, max = mais lento). */
export type Paces = { E: { min: number; max: number }; M: number; T: number; I: number; R: number };

export const ZONAS_PACE: { z: ZonaPace; nome: string; desc: string }[] = [
  { z: "E", nome: "Fácil", desc: "Ritmo confortável, dá para conversar" },
  { z: "M", nome: "Maratona", desc: "Ritmo firme e contínuo" },
  { z: "T", nome: "Limiar", desc: "Forte, mas sustentável por ~1 hora" },
  { z: "I", nome: "Intervalado", desc: "Tiros de 3 a 5 minutos" },
  { z: "R", nome: "Repetição", desc: "Tiros curtos e rápidos" },
];
export const nomeZona = (z: ZonaPace) => ZONAS_PACE.find((x) => x.z === z)?.nome ?? z;

export const DISTANCIAS_TESTE = [1.6, 3, 5, 10, 21.1] as const;

/** % do VO2max usado em cada zona (calibrado na tabela do Daniels). */
const PCT_ZONA = { Emin: 0.745, Emax: 0.64, M: 0.82, T: 0.88, I: 0.975, R: 1.06 };

function vo2DaVelocidade(mPorMin: number) {
  return -4.6 + 0.182258 * mPorMin + 0.000104 * mPorMin * mPorMin;
}
function pctMaxPelaDuracao(min: number) {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * min) + 0.2989558 * Math.exp(-0.1932605 * min);
}
function velocidadeDoVo2(vo2: number) {
  const a = 0.000104, b = 0.182258, c = -(4.6 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

export function calcularVdot(distanciaKm: number, tempoSeg: number): number {
  const min = tempoSeg / 60;
  const v = (distanciaKm * 1000) / min;
  return vo2DaVelocidade(v) / pctMaxPelaDuracao(min);
}

const paceDoPct = (vdot: number, pct: number) => Math.round(60000 / velocidadeDoVo2(vdot * pct));

export function pacesDoVdot(vdot: number): Paces {
  return {
    E: { min: paceDoPct(vdot, PCT_ZONA.Emin), max: paceDoPct(vdot, PCT_ZONA.Emax) },
    M: paceDoPct(vdot, PCT_ZONA.M),
    T: paceDoPct(vdot, PCT_ZONA.T),
    I: paceDoPct(vdot, PCT_ZONA.I),
    R: paceDoPct(vdot, PCT_ZONA.R),
  };
}

/** Pace único da zona (E usa o meio da faixa). */
export function paceDaZona(p: Paces, z: ZonaPace): number {
  return z === "E" ? Math.round((p.E.min + p.E.max) / 2) : p[z];
}

export function fmtPace(seg: number): string {
  const s = Math.round(seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function textoPaceZona(p: Paces, z: ZonaPace): string {
  return z === "E" ? `${fmtPace(p.E.min)}–${fmtPace(p.E.max)}/km` : `${fmtPace(p[z])}/km`;
}

/** Paces de referência (VDOT 45) usados só para estimar volume no painel. */
export const PACES_REFERENCIA = pacesDoVdot(45);

// ===== Bloco de corrida estruturado =====
export type EtapaCorrida = { medida: "distancia" | "tempo"; valor: number; zona: ZonaPace }; // valor: metros ou segundos
export type EstruturaCorrida = {
  aquecimento: EtapaCorrida | null;
  principal: EtapaCorrida & { repeticoes: number };
  recuperacao: EtapaCorrida | null;
  desaquecimento: EtapaCorrida | null;
};

export function estruturaPadrao(): EstruturaCorrida {
  return {
    aquecimento: { medida: "tempo", valor: 600, zona: "E" },
    principal: { medida: "distancia", valor: 800, zona: "I", repeticoes: 6 },
    recuperacao: { medida: "tempo", valor: 120, zona: "E" },
    desaquecimento: { medida: "tempo", valor: 600, zona: "E" },
  };
}

export function isEstrutura(x: unknown): x is EstruturaCorrida {
  return !!x && typeof x === "object" && !!(x as EstruturaCorrida).principal;
}

function etapaMetrosSeg(e: EtapaCorrida, p: Paces) {
  const pace = paceDaZona(p, e.zona);
  return e.medida === "distancia"
    ? { m: e.valor, s: (e.valor / 1000) * pace }
    : { m: (e.valor / pace) * 1000, s: e.valor };
}

/** Distância (km) e tempo (s) totais da estrutura com os paces dados. */
export function totaisEstrutura(est: EstruturaCorrida, p: Paces): { km: number; seg: number } {
  let m = 0, s = 0;
  const add = (e: EtapaCorrida | null, n = 1) => {
    if (!e || n <= 0) return;
    const r = etapaMetrosSeg(e, p);
    m += r.m * n;
    s += r.s * n;
  };
  const reps = Math.max(1, Math.round(est.principal.repeticoes || 1));
  add(est.aquecimento);
  add(est.principal, reps);
  add(est.recuperacao, reps - 1);
  add(est.desaquecimento);
  return { km: m / 1000, seg: s };
}

function fmtMedida(e: EtapaCorrida) {
  if (e.medida === "distancia") return e.valor >= 1000 ? `${(e.valor / 1000).toLocaleString("pt-BR")} km` : `${e.valor} m`;
  const min = Math.floor(e.valor / 60), s = e.valor % 60;
  return s ? `${min}min${String(s).padStart(2, "0")}` : `${min} min`;
}

/** Linhas para exibir. Com paces: "6x 800 m @ 4:35/km (seu pace Intervalado)". */
export function linhasEstrutura(est: EstruturaCorrida, p: Paces | null): string[] {
  const alvo = (e: EtapaCorrida) =>
    p ? `@ ${textoPaceZona(p, e.zona)} (seu pace ${nomeZona(e.zona)})` : `em ritmo ${nomeZona(e.zona)}`;
  const out: string[] = [];
  if (est.aquecimento) out.push(`Aquecimento: ${fmtMedida(est.aquecimento)} ${alvo(est.aquecimento)}`);
  const reps = Math.max(1, Math.round(est.principal.repeticoes || 1));
  out.push(`${reps > 1 ? `${reps}x ` : ""}${fmtMedida(est.principal)} ${alvo(est.principal)}`);
  if (est.recuperacao && reps > 1) out.push(`Recuperação entre tiros: ${fmtMedida(est.recuperacao)} trote ${alvo(est.recuperacao)}`);
  if (est.desaquecimento) out.push(`Desaquecimento: ${fmtMedida(est.desaquecimento)} ${alvo(est.desaquecimento)}`);
  return out;
}

// ===== Prescrito x realizado =====
/** Resumo curto de uma linha para cards: "6x 800 m @ 4:51/km · 9,5 km · ~53 min". Sem paces, versão genérica. */
export function resumoEstrutura(est: EstruturaCorrida, p: Paces | null): string {
  const reps = Math.max(1, Math.round(est.principal.repeticoes || 1));
  const principal = `${reps > 1 ? `${reps}x ` : ""}${fmtMedida(est.principal)}`;
  const alvo = p ? `@ ${textoPaceZona(p, est.principal.zona)}` : `em ritmo ${nomeZona(est.principal.zona)}`;
  const t = totaisEstrutura(est, p ?? PACES_REFERENCIA);
  const km = t.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${principal} ${alvo} · ${p ? "" : "~"}${km} km · ~${Math.round(t.seg / 60)} min`;
}

export const TOLERANCIA_ADERENCIA = 0.05;
export type Aderencia = "dentro" | "acima" | "abaixo";
/** Compara pace feito com pace alvo. "acima" = mais rápido que o alvo, "abaixo" = mais lento. */
export function aderenciaPace(paceFeito: number, paceAlvo: number): Aderencia {
  const d = (paceFeito - paceAlvo) / paceAlvo;
  if (d < -TOLERANCIA_ADERENCIA) return "acima";
  if (d > TOLERANCIA_ADERENCIA) return "abaixo";
  return "dentro";
}
export const ROTULO_ADERENCIA: Record<Aderencia, string> = {
  dentro: "Dentro do alvo",
  acima: "Acima do alvo",
  abaixo: "Abaixo do alvo",
};

// ===== Carga e forma =====
export const CARGA_SEM_PACE_POR_HORA = 50;
export const CTL_DIAS = 42;
export const ATL_DIAS = 7;

/** rTSS = horas × IF² × 100, IF = velocidade da corrida ÷ velocidade do Limiar. */
export function cargaCorrida(distanciaKm: number, tempoSeg: number, paceLimiarSeg: number | null): number {
  const horas = tempoSeg / 3600;
  if (!paceLimiarSeg || distanciaKm <= 0 || tempoSeg <= 0) return horas * CARGA_SEM_PACE_POR_HORA;
  const intensidade = (distanciaKm / tempoSeg) / (1 / paceLimiarSeg);
  return horas * intensidade * intensidade * 100;
}

export type DiaForma = { data: string; carga: number; ctl: number; atl: number; tsb: number };

/** Série diária de Condicionamento/Fadiga/Forma de `inicio` a `fim` (datas de Recife). */
export function serieForma(cargas: Record<string, number>, inicio: string, fim: string): DiaForma[] {
  const out: DiaForma[] = [];
  let ctl = 0, atl = 0;
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
    const carga = cargas[d] ?? 0;
    ctl = ctl + (carga - ctl) / CTL_DIAS;
    atl = atl + (carga - atl) / ATL_DIAS;
    out.push({ data: d, carga, ctl, atl, tsb: ctl - atl });
  }
  return out;
}

export type FaixaForma = { chave: string; nome: string; alerta: boolean };
export function faixaForma(tsb: number): FaixaForma {
  if (tsb > 25) return { chave: "destreinando", nome: "Destreinando", alerta: false };
  if (tsb >= 5) return { chave: "pico", nome: "Pico de forma", alerta: false };
  if (tsb >= -10) return { chave: "manutencao", nome: "Manutenção", alerta: false };
  if (tsb >= -25) return { chave: "construindo", nome: "Construindo condicionamento", alerta: false };
  if (tsb >= -40) return { chave: "fadiga_alta", nome: "Fadiga alta", alerta: true };
  return { chave: "excesso", nome: "Excesso de carga", alerta: true };
}
