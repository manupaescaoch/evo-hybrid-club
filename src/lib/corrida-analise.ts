// Junta paces, corridas registradas e treinos publicados para gerar
// prescrito x realizado, volume semanal e forma. Funciona com qualquer cliente
// do banco (servidor ou painel), sem dependências de servidor.
import { dataRecife, segundaDaSemana, somarDias } from "@/lib/recife-date";
import {
  aderenciaPace,
  cargaCorrida,
  faixaForma,
  isEstrutura,
  PACES_REFERENCIA,
  serieForma,
  totaisEstrutura,
  type Aderencia,
  type DiaForma,
  type EstruturaCorrida,
  type FaixaForma,
  type Paces,
} from "@/lib/corrida-vdot";

export type PaceRegistro = {
  id: string;
  vdot: number;
  teste_distancia_km: number;
  teste_tempo_segundos: number;
  data_teste: string;
  paces: Paces;
  origem: "aluno" | "treinador";
  created_at: string;
};

type CorridaRow = { id: string; data: string; distancia_km: number; tempo_segundos: number; pace_segundos_km: number; status?: string };
type SessaoRow = { id: string; data: string; nome: string; estruturas: EstruturaCorrida[] };

export type Vinculo = {
  corrida_id: string;
  data: string;
  sessao_nome: string | null;
  prescrito_km: number | null;
  pace_alvo: number | null;
  feito_km: number;
  pace_feito: number;
  aderencia: Aderencia | null;
};

export type AnaliseCorrida = {
  paces: PaceRegistro | null;
  vinculos: Vinculo[];
  prescritosSemana: { data: string; sessao_nome: string; prescrito_km: number; pace_alvo: number; corrida: Vinculo | null }[];
  forma: DiaForma[]; // últimas 8 semanas
  atual: DiaForma | null;
  faixa: FaixaForma | null;
  volumesSemanais: { semana: string; km: number }[]; // mais recente primeiro (inclui semana atual)
};

const DIAS_AQUECIMENTO = 120;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function carregarAnaliseCorrida(sb: any, alunoId: string, hoje = dataRecife()): Promise<AnaliseCorrida> {
  const desde = somarDias(hoje, -(DIAS_AQUECIMENTO + 56));
  const [{ data: pacesRows }, { data: corridas }, { data: micros }] = await Promise.all([
    sb.from("aluno_paces").select("*").eq("aluno_id", alunoId).order("data_teste", { ascending: false }).order("created_at", { ascending: false }).limit(1),
    sb.from("corridas_registradas").select("id, data, distancia_km, tempo_segundos, pace_segundos_km, status").eq("aluno_id", alunoId).gte("data", desde).order("data"),
    sb.from("corrida_microciclos").select("id").eq("status", "publicada").eq("is_global", true),
  ]);
  const microIds = (micros ?? []).map((m: { id: string }) => m.id);
  let sessoes: SessaoRow[] = [];
  if (microIds.length) {
    const { data: ss } = await sb
      .from("corrida_sessoes")
      .select("id, data, nome, corrida_sessao_blocos(corrida_estrutura)")
      .in("microciclo_id", microIds)
      .gte("data", somarDias(hoje, -56))
      .lte("data", somarDias(hoje, 7));
    sessoes = (ss ?? [])
      .map((s: { id: string; data: string; nome: string; corrida_sessao_blocos?: { corrida_estrutura: unknown }[] }) => ({
        id: s.id,
        data: s.data,
        nome: s.nome,
        estruturas: (s.corrida_sessao_blocos ?? []).map((b) => b.corrida_estrutura).filter(isEstrutura),
      }))
      .filter((s: SessaoRow) => s.estruturas.length > 0);
  }
  const paces = (pacesRows?.[0] as PaceRegistro | undefined) ?? null;
  return analisar(paces, (corridas ?? []).filter((c: CorridaRow) => c.status !== "recusada"), sessoes, hoje);
}

export function prescritoSessao(s: SessaoRow, p: Paces | null) {
  let km = 0, seg = 0;
  for (const e of s.estruturas) {
    const t = totaisEstrutura(e, p ?? PACES_REFERENCIA);
    km += t.km;
    seg += t.seg;
  }
  return { km, pace: km > 0 ? seg / km : 0 };
}

export function analisar(paces: PaceRegistro | null, corridas: CorridaRow[], sessoes: SessaoRow[], hoje = dataRecife()): AnaliseCorrida {
  const p = paces?.paces ?? null;
  const porData = new Map<string, SessaoRow>();
  for (const s of sessoes) if (!porData.has(s.data)) porData.set(s.data, s);

  const vinculos: Vinculo[] = corridas.map((c) => {
    const s = porData.get(c.data);
    const pr = s ? prescritoSessao(s, p) : null;
    const paceFeito = Number(c.pace_segundos_km) || Number(c.tempo_segundos) / Number(c.distancia_km);
    return {
      corrida_id: c.id,
      data: c.data,
      sessao_nome: s?.nome ?? null,
      prescrito_km: pr?.km ?? null,
      pace_alvo: pr && p ? pr.pace : null,
      feito_km: Number(c.distancia_km),
      pace_feito: paceFeito,
      aderencia: pr && p ? aderenciaPace(paceFeito, pr.pace) : null,
    };
  });

  const seg = segundaDaSemana(hoje);
  const prescritosSemana = sessoes
    .filter((s) => s.data >= seg && s.data <= somarDias(seg, 6))
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((s) => {
      const pr = prescritoSessao(s, p);
      return { data: s.data, sessao_nome: s.nome, prescrito_km: pr.km, pace_alvo: pr.pace, corrida: vinculos.find((v) => v.data === s.data) ?? null };
    });

  const cargas: Record<string, number> = {};
  for (const c of corridas) cargas[c.data] = (cargas[c.data] ?? 0) + cargaCorrida(Number(c.distancia_km), Number(c.tempo_segundos), p?.T ?? null);
  const inicio = corridas[0]?.data && corridas[0].data < hoje ? corridas[0].data : somarDias(hoje, -56);
  const serie = serieForma(cargas, inicio, hoje);
  const forma = serie.slice(-56);
  const atual = serie[serie.length - 1] ?? null;

  const volumesSemanais: { semana: string; km: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const ini = somarDias(seg, -7 * i);
    const fim = somarDias(ini, 6);
    volumesSemanais.push({ semana: ini, km: corridas.filter((c) => c.data >= ini && c.data <= fim).reduce((a, c) => a + Number(c.distancia_km), 0) });
  }

  return { paces, vinculos, prescritosSemana, forma, atual, faixa: atual ? faixaForma(atual.tsb) : null, volumesSemanais };
}
