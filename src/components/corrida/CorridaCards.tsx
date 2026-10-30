import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const dados = (analise?.forma ?? []).map((d) => ({ data: fmtData(d.data), Condicionamento: +d.ctl.toFixed(1), Fadiga: +d.atl.toFixed(1), Forma: +d.tsb.toFixed(1) }));
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
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dados} margin={{ left: -24, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="data" tick={{ fontSize: 9 }} interval={13} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Area type="monotone" dataKey="Condicionamento" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} />
                <Line type="monotone" dataKey="Fadiga" stroke="var(--destructive)" dot={false} />
                <Line type="monotone" dataKey="Forma" stroke="var(--muted-foreground)" dot={false} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
