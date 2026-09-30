import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, Loader2, ChevronRight, X, Timer } from "lucide-react";
import { WodTimer } from "./WodTimer";
import { toast } from "sonner";
import { getRankingTreino, registrarResultadoTreino, type RankingResp } from "@/backend/treino-resultados.functions";
import { formatarResultado, resultadoMeta } from "@/lib/treino-hyrox";

const PLACEHOLDER: Record<string, string> = {
  tempo: "18:42",
  rounds_reps: "5+12",
  reps: "120",
  distancia: "1500",
  calorias: "85",
  carga: "100",
  pontos: "250",
  custom: "Seu resultado",
};

type Filtro = "geral" | "masculino" | "feminino" | "faixa_etaria";

export function ResultadoTreino({ sessaoId, blocoId, tipo, podeRegistrar, formato, prescricao, duracaoMin }: { sessaoId: string; blocoId: string | null; tipo: string; podeRegistrar: boolean; formato?: string | null; prescricao?: string | null; duracaoMin?: number | null }) {
  const [timer, setTimer] = useState(false);
  const temTimer = podeRegistrar && (tipo === "tempo" || tipo === "rounds_reps");
  const fetchRanking = useServerFn(getRankingTreino);
  const salvar = useServerFn(registrarResultadoTreino);
  const [rk, setRk] = useState<RankingResp | null>(null);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("geral");

  const carregar = useCallback(
    (f: Filtro = filtro) =>
      fetchRanking({ data: { sessao_id: sessaoId, bloco_id: blocoId, filtro: f } })
        .then(setRk)
        .catch(() => {}),
    [fetchRanking, sessaoId, blocoId, filtro],
  );
  useEffect(() => {
    carregar("geral");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId, blocoId]);

  async function enviar() {
    if (!valor.trim()) return;
    setSaving(true);
    try {
      await salvar({ data: { sessao_id: sessaoId, bloco_id: blocoId, valor } });
      toast.success("Resultado registrado!");
      setEditando(false);
      setValor("");
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar. Saia e entre de novo.");
    } finally {
      setSaving(false);
    }
  }

  const meu = rk?.meu;
  const label = resultadoMeta(tipo)?.label ?? "Resultado";

  return (
    <div className="mt-3 rounded-xl bg-black/[0.03] p-3">
      {meu && !editando ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-black/45">Seu resultado</p>
            <p className="text-[24px] font-black tabular-nums leading-none mt-1">{formatarResultado(tipo, meu.valor, meu.valor_texto)}</p>
            {rk?.ranking_habilitado && meu.posicao && (
              <p className="text-[12px] font-bold text-[#0033FF] mt-1.5 inline-flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" /> #{meu.posicao} de {rk.total} atletas
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {podeRegistrar && (
              <button type="button" onClick={() => setEditando(true)} className="text-[11px] font-bold text-black/50 underline">Editar</button>
            )}
            {rk?.ranking_habilitado && (
              <button type="button" onClick={() => setAberto(true)} className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-[#0033FF]">
                Ranking <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : editando ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={`${label}: ${PLACEHOLDER[tipo] ?? ""}`}
            inputMode={tipo === "custom" ? "text" : "decimal"}
            className="flex-1 rounded-lg bg-white ring-1 ring-black/10 px-3 py-2 text-[14px] font-bold tabular-nums"
          />
          <button type="button" onClick={enviar} disabled={saving} className="rounded-lg bg-black text-white px-4 text-[13px] font-extrabold disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditando(false)} className="px-1 text-black/40" aria-label="Cancelar"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-black/55"><b className="text-black">{label}</b>{rk?.ranking_habilitado ? ` · ${rk.total} atletas no ranking` : ""}</p>
          <div className="flex items-center gap-2">
            {rk?.ranking_habilitado && rk.total > 0 && (
              <button type="button" onClick={() => setAberto(true)} className="text-[11px] font-bold text-[#0033FF]">Ver ranking</button>
            )}
            {temTimer && (
              <button type="button" onClick={() => setTimer(true)} className="inline-flex items-center gap-1 rounded-full bg-black text-white px-3 py-1.5 text-[12px] font-extrabold">
                <Timer className="h-3.5 w-3.5" /> Timer
              </button>
            )}
            {podeRegistrar && (
              <button type="button" onClick={() => setEditando(true)} className="rounded-full bg-[#0033FF] text-white px-3.5 py-1.5 text-[12px] font-extrabold">
                Registrar resultado
              </button>
            )}
          </div>
        </div>
      )}

      {timer && (
        <WodTimer
          formato={formato ?? (tipo === "rounds_reps" ? "AMRAP" : "FOR TIME")}
          prescricao={prescricao}
          duracaoMin={duracaoMin}
          onClose={() => setTimer(false)}
          onResult={(v) => { setTimer(false); setValor(v); setEditando(true); }}
        />
      )}

      {aberto && rk && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setAberto(false)}>
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-black inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-[#0033FF]" /> Ranking</h3>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto">
              {([["geral", "Geral"], ["masculino", "Masculino"], ["feminino", "Feminino"], ["faixa_etaria", "Minha faixa"]] as [Filtro, string][]).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setFiltro(v); carregar(v); }}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${filtro === v ? "bg-black text-white" : "bg-black/5 text-black/60"}`}
                >{l}</button>
              ))}
            </div>
            <ol className="mt-3 divide-y divide-black/5">
              {rk.linhas.length === 0 && <li className="py-6 text-center text-[12px] text-black/50">Nenhum resultado ainda.</li>}
              {rk.linhas.map((l) => (
                <li key={l.aluno_id} className={`flex items-center gap-3 py-2.5 ${l.eu ? "bg-[#0033FF]/5 -mx-2 px-2 rounded-lg" : ""}`}>
                  <span className={`w-7 text-[13px] font-black tabular-nums ${l.posicao <= 3 ? "text-[#0033FF]" : "text-black/40"}`}>#{l.posicao}</span>
                  <span className="flex-1 text-[13px] font-bold truncate">{l.nome}{l.eu ? " (você)" : ""}</span>
                  <span className="text-[14px] font-black tabular-nums">{formatarResultado(rk.resultado_tipo ?? tipo, l.valor, l.valor_texto)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
