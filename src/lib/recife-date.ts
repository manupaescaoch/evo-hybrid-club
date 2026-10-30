/** Datas do clube sempre no fuso America/Recife (UTC-3, sem horário de verão). */
export const TZ_CLUBE = "America/Recife";

/** Data (YYYY-MM-DD) em Recife para o instante informado. */
export function dataRecife(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_CLUBE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Soma dias a uma data YYYY-MM-DD (aritmética de calendário, sem fuso). */
export function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Segunda-feira (YYYY-MM-DD) da semana da data informada. */
export function segundaDaSemana(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return somarDias(iso, dow === 0 ? -6 : 1 - dow);
}

/** Intervalo [desde, ate] do período, em datas de Recife. */
export function intervaloPeriodo(
  periodo: "semana" | "mes" | "geral",
  agora: Date = new Date(),
): { desde: string | null; ate: string | null } {
  const hoje = dataRecife(agora);
  if (periodo === "semana") {
    const seg = segundaDaSemana(hoje);
    return { desde: seg, ate: somarDias(seg, 6) };
  }
  if (periodo === "mes") {
    const [y, m] = hoje.split("-").map(Number);
    const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const mm = String(m).padStart(2, "0");
    return { desde: `${y}-${mm}-01`, ate: `${y}-${mm}-${String(ultimo).padStart(2, "0")}` };
  }
  return { desde: null, ate: null };
}

/** Dias seguidos (contando hoje ou, se ainda não houver, a partir de ontem). */
export function sequenciaDias(datas: string[], agora: Date = new Date()): number {
  const set = new Set(datas);
  let k = dataRecife(agora);
  if (!set.has(k)) k = somarDias(k, -1);
  let n = 0;
  while (set.has(k)) {
    n++;
    k = somarDias(k, -1);
  }
  return n;
}
