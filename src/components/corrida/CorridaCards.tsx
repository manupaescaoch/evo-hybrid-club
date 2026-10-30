import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DISTANCIAS_TESTE, ZONAS_PACE, textoPaceZona, fmtPace, ROTULO_ADERENCIA, type Aderencia } from "@/lib/corrida-vdot";
import type { AnaliseCorrida, Vinculo } from "@/lib/corrida-analise";
import { dataRecife } from "@/lib/recife-date";

const card = "rounded-3xl bg-card border border-border p-4 shadow-sm";
const fmtKm = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtData = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

function parseTempo(t: string): number | null {
  const p = t.trim().split(":").map(Number);
  if (p.some((n) => !Number.isFinite(n))) return null;
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return null;
}

export function MeusPacesCard({
  analise,
  titulo = "Meus paces",
  onSalvar,
}: {
  analise: AnaliseCorrida | null;
  titulo?: string;
  onSalvar: (d: { distancia_km: number; tempo_segundos: number; data_teste: string }) => Promise<string | null>;
}) {
  const p = analise?.paces ?? null;
  const [aberto, setAberto] = useState(false);
  const [dist, setDist] = useState<number>(5);
  const [tempo, setTempo] = useState("");
  const [data, setData] = useState(dataRecife());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const seg = parseTempo(tempo);
    if (!seg || seg < 240) return setErro("Informe o tempo como mm:ss ou h:mm:ss.");
    setSalvando(true);
    setErro(null);
    const e = await onSalvar({ distancia_km: dist, tempo_segundos: seg, data_teste: data });
    setSalvando(false);
    if (e) setErro(e);
    else {
      setAberto(false);
      setTempo("");
    }
  }

  return (
    <section id="p-paces" className={`${card} scroll-mt-16`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold">{titulo}</h3>
        <button type="button" onClick={() => setAberto((a) => !a)} className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-bold text-primary">
          {p ? "Novo teste" : "Cadastrar teste"}
        </button>
      </div>
      {p ? (
        <>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Teste de {fmtKm(Number(p.teste_distancia_km))} km em {fmtPace(p.teste_tempo_segundos)} ({fmtData(p.data_teste)}) · índice {Number(p.vdot).toFixed(1)}
          </p>
          <ul className="mt-3 divide-y divide-border">
            {ZONAS_PACE.map((z) => (
              <li key={z.z} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[13px] font-bold">{z.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{z.desc}</p>
                </div>
                <span className="text-[14px] font-extrabold tabular-nums">{textoPaceZona(p.paces, z.z)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">Cadastre seu teste de 5 km pra ver seus paces em cada treino de corrida.</p>
      )}
      {aberto && (
        <div className="mt-3 space-y-2 rounded-2xl bg-muted/40 p-3">
          <div className="flex flex-wrap gap-1.5">
            {DISTANCIAS_TESTE.map((d) => (
              <button key={d} type="button" onClick={() => setDist(d)} className={`rounded-full px-3 py-1 text-[12px] font-bold border ${dist === d ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>
                {fmtKm(d)} km
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Tempo
              <input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="25:30" inputMode="numeric" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-[14px] text-foreground" />
            </label>
            <label className="text-[11px] font-semibold text-muted-foreground">
              Data do teste
              <input type="date" value={data} max={dataRecife()} onChange={(e) => setData(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-[14px] text-foreground" />
            </label>
          </div>
          {erro && <p className="text-[12px] text-destructive">{erro}</p>}
          <button type="button" disabled={salvando} onClick={salvar} className="w-full rounded-xl bg-primary py-2.5 text-[13px] font-bold text-primary-foreground disabled:opacity-60">
            {salvando ? "Salvando..." : "Calcular e salvar"}
          </button>
        </div>
      )}
    </section>
  );
}

export function MinhaFormaCard({ analise, titulo = "Minha forma" }: { analise: AnaliseCorrida | null; titulo?: string }) {
  const a = analise?.atual;
  const dados: PontoForma[] = (analise?.forma ?? []).map((d) => ({ data: fmtData(d.data), dataLonga: new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }), Condicionamento: +d.ctl.toFixed(1), Fadiga: +d.atl.toFixed(1), Forma: +d.tsb.toFixed(1) }));
  return (
    <section className={card}>
      <h3 className="text-[14px] font-bold">{titulo}</h3>
      {!a ? (
        <p className="mt-1 text-[12px] text-muted-foreground">Registre corridas para acompanhar sua forma.</p>
      ) : (
        <>
          <p className="mt-1 text-[13px]">
            Você está em <b className={analise?.faixa?.alerta ? "text-destructive" : "text-primary"}>{analise?.faixa?.nome}</b>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ["Condicionamento", a.ctl],
              ["Fadiga", a.atl],
              ["Forma", a.tsb],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-muted/50 p-2">
                <p className="text-[17px] font-extrabold tabular-nums">{(v as number).toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <FormaGrafico dados={dados} />
          <p className="mt-1 text-[10px] text-muted-foreground">Últimas 8 semanas. Condicionamento sobe com treino constante; Fadiga reflete os últimos dias; Forma é a diferença entre os dois.</p>
        </>
      )}
    </section>
  );
}

const corSelo: Record<Aderencia, string> = {
  dentro: "bg-primary/10 text-primary",
  acima: "bg-accent text-accent-foreground",
  abaixo: "bg-destructive/10 text-destructive",
};
export function SeloAderencia({ a }: { a: Aderencia | null }) {
  if (!a) return null;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${corSelo[a]}`}>{ROTULO_ADERENCIA[a]}</span>;
}

function LinhaVinculo({ v }: { v: Vinculo }) {
  return (
    <div className="text-[12px] text-muted-foreground">
      Distância: {v.prescrito_km != null ? `${fmtKm(v.prescrito_km)} km prescritos` : "—"} x <b className="text-foreground">{fmtKm(v.feito_km)} km feitos</b>
      <br />
      Pace: {v.pace_alvo ? `${fmtPace(v.pace_alvo)}/km alvo` : "sem pace cadastrado"} x <b className="text-foreground">{fmtPace(v.pace_feito)}/km feito</b>
    </div>
  );
}

export function PrescritoRealizadoCard({ analise, titulo = "Corrida: prescrito x realizado" }: { analise: AnaliseCorrida | null; titulo?: string }) {
  const semana = analise?.prescritosSemana ?? [];
  const outros = (analise?.vinculos ?? []).filter((v) => v.sessao_nome && !semana.some((s) => s.corrida?.corrida_id === v.corrida_id)).slice(-5).reverse();
  return (
    <section className={card}>
      <h3 className="text-[14px] font-bold">{titulo}</h3>
      {semana.length === 0 && outros.length === 0 && <p className="mt-1 text-[12px] text-muted-foreground">Nenhum treino de corrida estruturado nesta semana.</p>}
      <ul className="mt-2 divide-y divide-border">
        {semana.map((s) => (
          <li key={s.data + s.sessao_nome} className="py-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold">{fmtData(s.data)} · {s.sessao_nome}</p>
              {s.corrida ? <SeloAderencia a={s.corrida.aderencia} /> : <span className="text-[10px] text-muted-foreground">{s.data <= dataRecife() ? "Sem corrida registrada" : "A fazer"}</span>}
            </div>
            {s.corrida ? <LinhaVinculo v={s.corrida} /> : <p className="text-[12px] text-muted-foreground">{fmtKm(s.prescrito_km)} km prescritos{analise?.paces ? ` · pace alvo ${fmtPace(s.pace_alvo)}/km` : ""}</p>}
          </li>
        ))}
        {outros.map((v) => (
          <li key={v.corrida_id} className="py-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold">{fmtData(v.data)} · {v.sessao_nome}</p>
              <SeloAderencia a={v.aderencia} />
            </div>
            <LinhaVinculo v={v} />
          </li>
        ))}
      </ul>
    </section>
  );
}

type PontoForma = { data: string; dataLonga: string; Condicionamento: number; Fadiga: number; Forma: number };

const COR = {
  ctl: "var(--forma-condicionamento)",
  atl: "var(--forma-fadiga)",
  pos: "var(--forma-positiva)",
  neg: "var(--forma-negativa)",
};

function dominioLinhas(d: PontoForma[]): [number, number] {
  const vals = d.flatMap((p) => [p.Condicionamento, p.Fadiga]);
  if (!vals.length) return [0, 1];
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = Math.max(1, (max - min) * 0.15);
  return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
}

function TooltipForma({ active, payload }: { active?: boolean; payload?: { payload: PontoForma }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] shadow-sm">
      <p className="font-bold">{p.dataLonga}</p>
      <p style={{ color: COR.ctl }}>Condicionamento: <b>{p.Condicionamento.toFixed(1)}</b></p>
      <p style={{ color: COR.atl }}>Fadiga: <b>{p.Fadiga.toFixed(1)}</b></p>
      <p style={{ color: p.Forma >= 0 ? COR.pos : COR.neg }}>Forma: <b>{p.Forma.toFixed(1)}</b></p>
    </div>
  );
}

function FormaGrafico({ dados }: { dados: PontoForma[] }) {
  const intervalo = Math.max(0, Math.floor(dados.length / 4) - 1);
  const maxAbs = Math.max(1, ...dados.map((d) => Math.abs(d.Forma)));
  const lim = Math.ceil(maxAbs * 1.1);
  return (
    <div className="mt-3 space-y-1" data-testid="grafico-forma">
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} syncId="forma" margin={{ left: -18, right: 6, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="data" hide />
            <YAxis tick={{ fontSize: 9 }} domain={dominioLinhas(dados)} allowDecimals={false} width={44} />
            <Tooltip content={<TooltipForma />} />
            <Legend verticalAlign="top" height={20} iconType="plainline" wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="Condicionamento" stroke={COR.ctl} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Fadiga" stroke={COR.atl} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground">Forma</p>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} syncId="forma" margin={{ left: -18, right: 6, top: 2, bottom: 0 }}>
            <XAxis dataKey="data" tick={{ fontSize: 9 }} interval={intervalo} />
            <YAxis tick={{ fontSize: 9 }} domain={[-lim, lim]} allowDecimals={false} width={44} />
            <Tooltip content={<TooltipForma />} cursor={{ fill: "var(--muted)" }} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Bar dataKey="Forma" isAnimationActive={false}>
              {dados.map((d, i) => <Cell key={i} fill={d.Forma >= 0 ? COR.pos : COR.neg} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
