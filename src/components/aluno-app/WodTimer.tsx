import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X, Flag, Plus, Minus } from "lucide-react";

type Modo = "up" | "amrap" | "emom" | "intervals";

function modoDe(formato: string | null | undefined): Modo {
  const f = (formato ?? "").toUpperCase();
  if (f === "AMRAP" || f.startsWith("MAX")) return "amrap";
  if (/^E\d?MOM$/.test(f)) return "emom";
  if (f === "INTERVALS" || f === "WORK / REST") return "intervals";
  return "up";
}

function extrairMin(txt: string | null | undefined): number | null {
  const m = (txt ?? "").match(/(\d+)\s*(?:min|'|minutos)/i);
  return m ? Number(m[1]) : null;
}

export function fmt(s: number) {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), ss = t % 60;
  const mm = `${String(m).padStart(h ? 2 : 1, "0")}:${String(ss).padStart(2, "0")}`;
  return h ? `${h}:${mm}` : mm;
}

let ctx: AudioContext | null = null;
function beep(freq = 880, dur = 0.15) {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    o.start(); o.stop(ctx.currentTime + dur);
    navigator.vibrate?.(dur * 1000);
  } catch { /* sem áudio */ }
}

const TITULO: Record<Modo, string> = {
  up: "Cronômetro",
  amrap: "Contagem regressiva",
  emom: "Intervalo a cada minuto",
  intervals: "Trabalho / descanso",
};

export function WodTimer({
  formato, prescricao, duracaoMin, onClose, onResult,
}: {
  formato: string | null | undefined;
  prescricao?: string | null;
  duracaoMin?: number | null;
  onClose: () => void;
  onResult: (valor: string) => void;
}) {
  const modo = modoDe(formato);
  const f = (formato ?? "").toUpperCase();
  const intervaloPadrao = modo === "emom" ? Number(f.match(/^E(\d)MOM$/)?.[1] ?? 1) * 60 : 0;
  const minPadrao = extrairMin(prescricao) ?? duracaoMin ?? (modo === "amrap" ? 12 : modo === "emom" ? 10 : 20);

  const [config, setConfig] = useState(modo !== "up");
  const [totalMin, setTotalMin] = useState(minPadrao);
  const [capMin, setCapMin] = useState<number>(extrairMin(prescricao) ?? 0);
  const [work, setWork] = useState(40);
  const [rest, setRest] = useState(20);
  const [rounds, setRounds] = useState(8);

  const [pre, setPre] = useState<number | null>(null);
  const [rodando, setRodando] = useState(false);
  const [decorrido, setDecorrido] = useState(0);
  const [fim, setFim] = useState(false);
  const [rondasFeitas, setRondasFeitas] = useState(0);
  const [reps, setReps] = useState("");
  const base = useRef<number>(0);
  const acumulado = useRef(0);
  const ultimoSeg = useRef(-1);

  const total =
    modo === "amrap" || modo === "emom" ? totalMin * 60
    : modo === "intervals" ? rounds * (work + rest)
    : capMin > 0 ? capMin * 60 : Infinity;

  // wake lock para a tela não apagar
  useEffect(() => {
    let lock: any;
    if (rodando) (navigator as any).wakeLock?.request("screen").then((l: any) => (lock = l)).catch(() => {});
    return () => { lock?.release?.().catch?.(() => {}); };
  }, [rodando]);

  useEffect(() => {
    if (pre == null) return;
    if (pre === 0) { beep(1320, 0.4); setPre(null); base.current = performance.now(); setRodando(true); return; }
    beep(660);
    const t = setTimeout(() => setPre((p) => (p ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [pre]);

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      const d = acumulado.current + (performance.now() - base.current) / 1000;
      const seg = Math.floor(d);
      if (seg !== ultimoSeg.current) {
        ultimoSeg.current = seg;
        if (modo === "emom" && seg > 0 && seg % intervaloPadrao === 0 && seg < total) beep(1100, 0.3);
        if (modo === "intervals" && seg > 0 && seg < total) {
          const p = seg % (work + rest);
          if (p === 0 || p === work) beep(p === 0 ? 1100 : 500, 0.3);
        }
        if (Number.isFinite(total) && total - seg <= 3 && total - seg > 0) beep(660);
      }
      if (d >= total) {
        setDecorrido(total); acumulado.current = total; setRodando(false); setFim(true); beep(1320, 0.8);
      } else setDecorrido(d);
    }, 100);
    return () => clearInterval(id);
  }, [rodando, modo, total, intervaloPadrao, work, rest]);

  function iniciar() { setConfig(false); setPre(10); }
  function pausar() {
    if (rodando) { acumulado.current = decorrido; setRodando(false); }
    else { base.current = performance.now(); setRodando(true); }
  }
  function zerar() {
    setRodando(false); setPre(null); setDecorrido(0); acumulado.current = 0; ultimoSeg.current = -1; setFim(false); setRondasFeitas(0);
  }
  function finalizar() {
    acumulado.current = decorrido; setRodando(false); setFim(true); beep(1320, 0.5);
  }
  function salvar() {
    if (modo === "amrap") onResult(`${rondasFeitas}+${Number(reps) || 0}`);
    else onResult(fmt(decorrido));
  }

  // valores exibidos
  let grande = fmt(decorrido);
  let sub = "";
  if (modo === "amrap") { grande = fmt(total - decorrido); sub = `AMRAP ${totalMin} min`; }
  if (modo === "emom") {
    const r = Math.min(Math.floor(decorrido / intervaloPadrao) + 1, Math.round(total / intervaloPadrao));
    grande = fmt(intervaloPadrao - (decorrido % intervaloPadrao));
    sub = `Round ${r} de ${Math.round(total / intervaloPadrao)} · total ${fmt(decorrido)}`;
  }
  let fase: "work" | "rest" | null = null;
  if (modo === "intervals") {
    const p = decorrido % (work + rest);
    fase = p < work ? "work" : "rest";
    grande = fmt(fase === "work" ? work - p : work + rest - p);
    sub = `Round ${Math.min(Math.floor(decorrido / (work + rest)) + 1, rounds)} de ${rounds}`;
  }
  if (modo === "up" && capMin > 0) sub = `Time cap ${capMin} min`;

  const bg = fase === "rest" ? "bg-[#22C55E]" : "bg-black";

  return (
    <div className={`fixed inset-0 z-[60] ${bg} text-white flex flex-col`}>
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-white/60">{formato || "WOD"}</p>
          <p className="text-[14px] font-extrabold">{TITULO[modo]}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar timer" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center"><X className="h-5 w-5" /></button>
      </div>

      {config ? (
        <div className="flex-1 px-6 flex flex-col justify-center gap-5">
          {(modo === "amrap" || modo === "emom") && <Ajuste label="Duração total (min)" v={totalMin} set={setTotalMin} min={1} />}
          {modo === "intervals" && (
            <>
              <Ajuste label="Trabalho (s)" v={work} set={setWork} min={5} step={5} />
              <Ajuste label="Descanso (s)" v={rest} set={setRest} min={0} step={5} />
              <Ajuste label="Rounds" v={rounds} set={setRounds} min={1} />
            </>
          )}
          {modo === "emom" && <p className="text-[12px] text-white/60 text-center">Bipe a cada {intervaloPadrao / 60} min.</p>}
          <button type="button" onClick={iniciar} className="mt-4 rounded-full bg-[#0033FF] py-4 text-[16px] font-black">Iniciar</button>
        </div>
      ) : pre != null ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[12px] font-extrabold tracking-[0.2em] uppercase text-white/60">Prepare-se</p>
          <p className="text-[140px] font-black tabular-nums leading-none">{pre}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {fase && <p className="text-[14px] font-black tracking-[0.2em] uppercase">{fase === "work" ? "Trabalho" : "Descanso"}</p>}
          <p className="text-[88px] font-black tabular-nums leading-none">{grande}</p>
          {sub && <p className="mt-3 text-[13px] font-bold text-white/70">{sub}</p>}

          {modo === "amrap" && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-white/60">Rounds completos</p>
              <div className="flex items-center gap-5">
                <button type="button" onClick={() => setRondasFeitas((r) => Math.max(0, r - 1))} className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center" aria-label="Menos um round"><Minus /></button>
                <span className="text-[48px] font-black tabular-nums w-16 text-center">{rondasFeitas}</span>
                <button type="button" onClick={() => setRondasFeitas((r) => r + 1)} className="h-16 w-16 rounded-full bg-[#0033FF] flex items-center justify-center" aria-label="Mais um round"><Plus className="h-7 w-7" /></button>
              </div>
            </div>
          )}

          {fim ? (
            <div className="mt-10 w-full max-w-xs space-y-3">
              {modo === "amrap" && (
                <input value={reps} onChange={(e) => setReps(e.target.value)} inputMode="numeric" placeholder="Reps extras do último round"
                  className="w-full rounded-xl bg-white/10 px-4 py-3 text-center text-[15px] font-bold placeholder:text-white/40" />
              )}
              <button type="button" onClick={salvar} className="w-full rounded-full bg-[#0033FF] py-4 text-[16px] font-black">
                Usar {modo === "amrap" ? `${rondasFeitas}+${Number(reps) || 0}` : fmt(decorrido)} como resultado
              </button>
              <button type="button" onClick={zerar} className="w-full text-[13px] font-bold text-white/60">Refazer</button>
            </div>
          ) : (
            <div className="mt-10 flex items-center gap-5">
              <button type="button" onClick={zerar} aria-label="Zerar" className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center"><RotateCcw /></button>
              {decorrido === 0 && !rodando ? (
                <button type="button" onClick={iniciar} aria-label="Iniciar" className="h-20 w-20 rounded-full bg-[#0033FF] flex items-center justify-center"><Play className="h-9 w-9" /></button>
              ) : (
                <button type="button" onClick={pausar} aria-label={rodando ? "Pausar" : "Continuar"} className="h-20 w-20 rounded-full bg-white text-black flex items-center justify-center">
                  {rodando ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
                </button>
              )}
              <button type="button" onClick={finalizar} disabled={decorrido === 0} aria-label="Finalizar" className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30"><Flag /></button>
            </div>
          )}
          {modo === "up" && decorrido === 0 && !rodando && !fim && (
            <div className="mt-8 w-full max-w-xs"><Ajuste label="Time cap (min, 0 = sem)" v={capMin} set={setCapMin} min={0} /></div>
          )}
        </div>
      )}
    </div>
  );
}

function Ajuste({ label, v, set, min = 0, step = 1 }: { label: string; v: number; set: (n: number) => void; min?: number; step?: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-[13px] font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => set(Math.max(min, v - step))} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center"><Minus className="h-4 w-4" /></button>
        <span className="w-10 text-center text-[18px] font-black tabular-nums">{v}</span>
        <button type="button" onClick={() => set(v + step)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
