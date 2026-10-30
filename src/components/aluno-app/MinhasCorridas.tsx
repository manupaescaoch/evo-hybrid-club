import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listarMinhasCorridas, type CorridaRegistrada } from "@/backend/corridas.functions";
import { formatPace, formatTempo } from "@/lib/ranking-pontos";
import { intervaloPeriodo } from "@/lib/recife-date";

const fmtKm = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Perfil do aluno: km da semana/mês e histórico das corridas. */
export function MinhasCorridas() {
  const fn = useServerFn(listarMinhasCorridas);
  const [rows, setRows] = useState<CorridaRegistrada[]>([]);
  useEffect(() => {
    fn().then((r) => setRows(Array.isArray(r) ? r : [])).catch(() => setRows([]));
  }, [fn]);

  const sem = intervaloPeriodo("semana");
  const mes = intervaloPeriodo("mes");
  const ok = rows.filter((r) => r.status === "aprovada");
  const soma = (d: string, a: string) => ok.filter((r) => r.data >= d && r.data <= a).reduce((s, r) => s + Number(r.distancia_km), 0);

  return (
    <section className="rounded-3xl bg-white border border-black/5 p-4 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.08)]">
      <h3 className="text-[14px] font-bold">Corridas</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#0033FF]/5 p-3">
          <p className="text-[18px] font-extrabold text-[#0033FF] tabular-nums">{fmtKm(soma(sem.desde!, sem.ate!))} km</p>
          <p className="text-[11px] text-zinc-500">nesta semana</p>
        </div>
        <div className="rounded-2xl bg-zinc-100 p-3">
          <p className="text-[18px] font-extrabold text-zinc-900 tabular-nums">{fmtKm(soma(mes.desde!, mes.ate!))} km</p>
          <p className="text-[11px] text-zinc-500">neste mês</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12px] text-zinc-500">Nenhuma corrida registrada ainda. Use "Registrar corrida" na página Treino.</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/5">
          {rows.slice(0, 30).map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <img src={r.print_url} alt="Print" className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-zinc-900">
                  {fmtKm(Number(r.distancia_km))} km · {formatTempo(r.tempo_segundos)}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")} · {formatPace(r.pace_segundos_km)}
                </p>
              </div>
              {r.status === "recusada" && <span className="text-[11px] font-bold text-destructive">Recusada</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
