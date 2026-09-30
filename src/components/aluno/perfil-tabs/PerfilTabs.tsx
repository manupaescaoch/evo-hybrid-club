import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, MODALIDADE_LABEL, fmtDate, fmtDateTime, type Aluno } from "@/lib/crm";
import { formatarResultado } from "@/lib/treino-hyrox";
import { AlertTriangle, CalendarDays, Dumbbell, Pencil, Plus, Trophy, Activity, HeartPulse } from "lucide-react";

const db = supabase as any;

function Card({ title, icon: Icon, action, children }: { title: string; icon?: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icon && <Icon className="h-4 w-4 text-primary" />} {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Linha({ label, value, alerta }: { label: string; value: React.ReactNode; alerta?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${alerta ? "font-semibold text-primary" : "text-foreground"}`}>{value || "—"}</span>
    </li>
  );
}

const vazio = (t: string) => <p className="py-4 text-center text-sm text-muted-foreground">{t}</p>;
const isoDia = (d: Date) => d.toISOString().slice(0, 10);
function diasAtras(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return isoDia(d); }

/* ---------- Dados ---------- */
export function DadosTab({ aluno, isAdmin, onEditar }: { aluno: Aluno; isAdmin: boolean; onEditar: () => void }) {
  const a = aluno as any;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Dados cadastrais" action={<button onClick={onEditar} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Editar</button>}>
        <ul className="divide-y divide-border">
          <Linha label="Nome" value={aluno.nome} />
          <Linha label="CPF" value={aluno.cpf} />
          <Linha label="Nascimento" value={a.data_nascimento ? fmtDate(a.data_nascimento) : "—"} />
          <Linha label="Sexo" value={a.sexo} />
          <Linha label="Telefone" value={aluno.whatsapp} />
          <Linha label="E-mail" value={aluno.email} />
          <Linha label="Unidade" value={aluno.modalidade ? MODALIDADE_LABEL[aluno.modalidade] : "—"} />
          <Linha label="Profissão" value={a.profissao} />
          <Linha label="Endereço" value={a.endereco} />
          <Linha label="Contato de emergência" value={a.contato_emergencia} />
        </ul>
      </Card>
      <Card title="Contrato">
        <ul className="divide-y divide-border">
          <Linha label="Plano" value={aluno.plano} />
          <Linha label="Status" value={STATUS_LABEL[aluno.status]} />
          <Linha label="Início do contrato" value={aluno.data_d0 ? fmtDate(aluno.data_d0) : "Não confirmado"} />
          <Linha label="Vencimento" value={aluno.data_expiracao ? fmtDate(aluno.data_expiracao) : "—"} />
          {isAdmin && <Linha label="Valor" value={aluno.valor_plano != null ? `R$ ${Number(aluno.valor_plano).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"} />}
          <Linha label="Meta semanal de treinos" value={a.meta_semanal_treinos ? `${a.meta_semanal_treinos}x` : "—"} />
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Anamnese ---------- */
const CAMPOS_ATENCAO = /les[aã]o|dor|cirurg|medic|restri|doen|condi|par-?q|hipert|diabet|card/i;
export function AnamneseTab({ forms, children }: { forms: any[]; children?: React.ReactNode }) {
  const anamnese = forms.find((f) => String(f.tipo ?? "").includes("anamnese"));
  const respostas: [string, string][] = anamnese?.respostas && typeof anamnese.respostas === "object"
    ? Object.entries(anamnese.respostas).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)] as [string, string]).filter(([, v]) => v && v !== "null" && v !== '""')
    : [];
  const atencao = respostas.filter(([k]) => CAMPOS_ATENCAO.test(k));
  return (
    <div className="space-y-4">
      {anamnese ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="Última atualização" value={fmtDate(anamnese.atualizado_em ?? anamnese.criado_em)} />
            <Kpi label="Preenchido por" value={anamnese.preenchido_por ?? "Aluno"} />
          </div>
          {atencao.length > 0 && (
            <Card title="Pontos de atenção" icon={AlertTriangle}>
              <ul className="divide-y divide-border">
                {atencao.map(([k, v]) => <Linha key={k} label={k.replace(/_/g, " ")} value={v} alerta />)}
              </ul>
            </Card>
          )}
        </>
      ) : (
        <Card title="Anamnese">{vazio("Nenhuma anamnese preenchida ainda.")}</Card>
      )}
      {children}
    </div>
  );
}

/* ---------- Treinos ---------- */
export function TreinosTab({ alunoId }: { alunoId: string }) {
  const [micros, setMicros] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data: m } = await db.from("corrida_microciclos").select("*").or(`is_global.eq.true,aluno_id.eq.${alunoId}`).order("data_inicio", { ascending: false }).limit(30);
      const lista = m ?? [];
      setMicros(lista);
      const atual = lista.find((x: any) => x.is_global && x.status === "publicada") ?? lista[0];
      if (atual) {
        const { data: s } = await db.from("corrida_sessoes").select("id,nome,data,tipo,categoria,objetivo").eq("microciclo_id", atual.id).order("data").order("ordem_no_dia");
        setSessoes(s ?? []);
      }
    })();
  }, [alunoId]);
  const atual = micros.find((x) => x.is_global && x.status === "publicada") ?? micros[0];
  const anteriores = micros.filter((x) => x !== atual);
  return (
    <div className="space-y-4">
      <Card title="Treino atual" icon={Dumbbell} action={
        <div className="flex gap-2">
          <Link to="/treinos" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Ver treino</Link>
          <Link to="/treinos" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Editar treino</Link>
        </div>}>
        {atual ? (
          <>
            <ul className="divide-y divide-border">
              <Linha label="Programa" value={atual.is_global ? "Programação oficial EVO HYBRID CLUB" : "Programa individual"} />
              <Linha label="Objetivo" value={atual.objetivo} />
              <Linha label="Semana" value={atual.numero_semana ? `Semana ${atual.numero_semana} · ${atual.tipo_semana}` : atual.tipo_semana} />
              <Linha label="Responsável" value={atual.criado_por} />
              <Linha label="Início" value={fmtDate(atual.data_inicio)} />
              <Linha label="Sessões" value={String(sessoes.length)} />
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sessoes.map((s) => (
                <div key={s.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="font-medium text-foreground">{s.nome || s.tipo}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(s.data)} · {s.categoria ?? s.tipo}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">O treino é o mesmo para todos os alunos e é montado na página Treinos.</p>
          </>
        ) : vazio("Nenhum treino publicado.")}
      </Card>
      <Card title="Histórico de treinos">
        {anteriores.length ? (
          <ul className="divide-y divide-border">
            {anteriores.map((m) => <Linha key={m.id} label={`${fmtDate(m.data_inicio)} · ${m.tipo_semana}`} value={m.status === "publicada" ? "Publicada" : "Rascunho"} />)}
          </ul>
        ) : vazio("Sem programas anteriores.")}
      </Card>
    </div>
  );
}

/* ---------- Frequência ---------- */
export function FrequenciaTab({ alunoId, aluno }: { alunoId: string; aluno: Aluno }) {
  const [dias, setDias] = useState<{ data: string; origem: string; hora?: string }[]>([]);
  const [periodo, setPeriodo] = useState(30);
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  useEffect(() => {
    (async () => {
      const desde = diasAtras(365);
      const [{ data: at }, { data: rs }, { data: ck }] = await Promise.all([
        db.from("aluno_atividades_dia").select("data_referencia,tipo,criado_em").eq("aluno_id", alunoId).eq("concluido", true).gte("data_referencia", desde),
        db.from("treino_resultados").select("data_treino,criado_em").eq("aluno_id", alunoId).gte("criado_em", desde),
        db.from("daily_checkins").select("data_checkin,created_at").eq("aluno_id", alunoId).gte("data_checkin", desde),
      ]);
      const out: any[] = [];
      (at ?? []).forEach((r: any) => out.push({ data: r.data_referencia, origem: r.tipo === "cardio" ? "Cardio" : "Treino", hora: r.criado_em }));
      (rs ?? []).forEach((r: any) => out.push({ data: r.data_treino ?? r.criado_em.slice(0, 10), origem: "Resultado registrado", hora: r.criado_em }));
      (ck ?? []).forEach((r: any) => out.push({ data: r.data_checkin, origem: "Check-in", hora: r.created_at }));
      setDias(out.sort((a, b) => b.data.localeCompare(a.data)));
    })();
  }, [alunoId]);
  const treinoDias = useMemo(() => new Set(dias.filter((d) => d.origem !== "Check-in").map((d) => d.data)), [dias]);
  const cont = (n: number) => [...treinoDias].filter((d) => d >= diasAtras(n)).length;
  const meta = Number((aluno as any).meta_semanal_treinos) || 4;
  const ultima = [...treinoDias].sort().pop();
  const semTreinar = ultima ? Math.floor((Date.now() - new Date(ultima + "T12:00").getTime()) / 86400000) : null;
  const ader = Math.min(100, Math.round((cont(30) / ((meta * 30) / 7)) * 100));
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const fim = diasAtras(i * 7), ini = diasAtras(i * 7 + 6);
    return { label: `S-${i}`, n: [...treinoDias].filter((d) => d >= ini && d <= fim).length };
  }).reverse();
  const max = Math.max(meta, ...semanas.map((s) => s.n));
  const primeiroDia = mes.getDay();
  const nDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const lista = dias.filter((d) => d.data >= diasAtras(periodo));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Últimos 7 dias" value={String(cont(7))} />
        <Kpi label="Últimos 30 dias" value={String(cont(30))} />
        <Kpi label="Meta semanal" value={`${meta}x`} />
        <Kpi label="Aderência" value={`${ader}%`} />
        <Kpi label="Última presença" value={ultima ? fmtDate(ultima) : "—"} />
        <Kpi label="Dias sem treinar" value={semTreinar == null ? "—" : String(semTreinar)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Treinos por semana" icon={Activity}>
          <div className="flex h-36 items-end gap-2">
            {semanas.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] tabular-nums text-muted-foreground">{s.n}</span>
                <div className="w-full rounded-t bg-primary" style={{ height: `${(s.n / max) * 100}%`, minHeight: 2 }} />
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title={mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} icon={CalendarDays} action={
          <div className="flex gap-1 text-xs">
            <button className="rounded border border-border px-2" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</button>
            <button className="rounded border border-border px-2" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>›</button>
          </div>}>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i} className="text-muted-foreground">{d}</span>)}
            {Array.from({ length: primeiroDia }).map((_, i) => <span key={"v" + i} />)}
            {Array.from({ length: nDias }, (_, i) => {
              const iso = isoDia(new Date(Date.UTC(mes.getFullYear(), mes.getMonth(), i + 1)));
              const on = treinoDias.has(iso);
              return <span key={i} className={`rounded-md py-1 tabular-nums ${on ? "bg-primary font-semibold text-primary-foreground" : "text-foreground"}`}>{i + 1}</span>;
            })}
          </div>
        </Card>
      </div>
      <Card title="Histórico" action={
        <select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
          <option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option><option value={365}>12 meses</option>
        </select>}>
        {lista.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Data</th><th>Horário</th><th>Unidade</th><th>Registro</th></tr></thead>
              <tbody>{lista.map((d, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1.5">{fmtDate(d.data)}</td>
                  <td>{d.hora ? new Date(d.hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td>{aluno.modalidade ? MODALIDADE_LABEL[aluno.modalidade] : "—"}</td>
                  <td>{d.origem}</td>
                </tr>))}</tbody>
            </table>
          </div>
        ) : vazio("Sem registros no período.")}
      </Card>
    </div>
  );
}

/* ---------- Saúde ---------- */
export function SaudeTab({ alunoId, children }: { alunoId: string; children?: React.ReactNode }) {
  const [ck, setCk] = useState<any[]>([]);
  useEffect(() => {
    db.from("daily_checkins").select("*").eq("aluno_id", alunoId).order("data_checkin", { ascending: false }).limit(30).then(({ data }: any) => setCk(data ?? []));
  }, [alunoId]);
  const u = ck[0];
  const serie = [...ck].reverse();
  const Mini = ({ campo, max }: { campo: string; max: number }) => (
    <div className="flex h-10 items-end gap-0.5">
      {serie.map((c, i) => <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${((Number(c[campo]) || 0) / max) * 100}%`, minHeight: 1 }} />)}
    </div>
  );
  return (
    <div className="space-y-4">
      <Card title="Prontidão" icon={HeartPulse}>
        {u ? (
          <>
            <p className="mb-2 text-xs text-muted-foreground">Último check-in: {fmtDate(u.data_checkin)}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="Sono" value={u.sono_horas != null ? `${u.sono_horas} h` : "—"} />
              <Kpi label="Qualidade do sono" value={u.qualidade_sono != null ? `${u.qualidade_sono}/5` : "—"} />
              <Kpi label="Energia" value={u.energia != null ? `${u.energia}/5` : "—"} />
              <Kpi label="Humor" value={u.humor != null ? `${u.humor}/5` : "—"} />
            </div>
            {ck.length >= 3 && (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div><div className="mb-1 text-xs text-muted-foreground">Sono (h)</div><Mini campo="sono_horas" max={10} /></div>
                <div><div className="mb-1 text-xs text-muted-foreground">Energia</div><Mini campo="energia" max={5} /></div>
                <div><div className="mb-1 text-xs text-muted-foreground">Humor</div><Mini campo="humor" max={5} /></div>
              </div>
            )}
          </>
        ) : vazio("O aluno ainda não fez check-in.")}
      </Card>
      {children}
      <p className="text-xs text-muted-foreground">Observações de saúde (restrição, dor, retorno de lesão, liberação médica) podem ser registradas em Ocorrências com a categoria Saúde ou Lesão e aparecem no Resumo.</p>
    </div>
  );
}

/* ---------- Resultados ---------- */
export function ResultadosTab({ alunoId }: { alunoId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    db.from("treino_resultados")
      .select("*, bloco:corrida_sessao_blocos(nome,tipo,formato,ranking_criterio), sessao:corrida_sessoes(nome)")
      .eq("aluno_id", alunoId).order("criado_em", { ascending: false })
      .then(({ data }: any) => setRows(data ?? []));
  }, [alunoId]);
  const grupos = useMemo(() => {
    const m = new Map<string, any[]>();
    rows.forEach((r) => {
      const nome = r.bloco?.nome || r.bloco?.formato || r.sessao?.nome || "Resultado";
      if (!m.has(nome)) m.set(nome, []);
      m.get(nome)!.push(r);
    });
    return [...m.entries()];
  }, [rows]);
  return (
    <Card title="Resultados e PRs" icon={Trophy}>
      {grupos.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Nome</th><th>Data</th><th>Resultado</th><th>Anterior</th><th>Evolução</th></tr></thead>
            <tbody>{grupos.map(([nome, lista]) => {
              const [atual, ant] = lista;
              const menor = (atual.bloco?.ranking_criterio ?? (atual.resultado_tipo === "tempo" ? "menor" : "maior")) === "menor";
              const vals = lista.map((x) => Number(x.valor)).filter((v) => !isNaN(v));
              const pr = vals.length && Number(atual.valor) === (menor ? Math.min(...vals) : Math.max(...vals));
              const fmt = (r: any) => r ? (r.valor_texto || formatarResultado(r.resultado_tipo, Number(r.valor))) : "—";
              let evo = "—";
              if (ant && atual.valor != null && ant.valor != null) {
                const d = Number(atual.valor) - Number(ant.valor);
                const melhor = menor ? d < 0 : d > 0;
                evo = d === 0 ? "=" : melhor ? "Melhorou" : "Piorou";
              }
              return (
                <tr key={nome} className="border-t border-border">
                  <td className="py-1.5 font-medium">{nome} {pr && <span className="ml-1 rounded bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">PR</span>}</td>
                  <td>{fmtDate(atual.data_treino ?? atual.criado_em)}</td>
                  <td className="tabular-nums">{fmt(atual)}</td>
                  <td className="tabular-nums text-muted-foreground">{fmt(ant)}</td>
                  <td>{evo}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : vazio("Nenhum resultado registrado ainda.")}
    </Card>
  );
}

/* ---------- Ocorrências ---------- */
export const OCORRENCIA_CATEGORIAS = ["atendimento", "comportamento", "saude", "lesao", "reclamacao", "elogio", "financeiro", "comercial", "operacional", "outros"];
const CAT_LABEL: Record<string, string> = { atendimento: "Atendimento", comportamento: "Comportamento", saude: "Saúde", lesao: "Lesão", reclamacao: "Reclamação", elogio: "Elogio", financeiro: "Financeiro", comercial: "Comercial", operacional: "Operacional", outros: "Outros" };
const STATUS_OC: Record<string, string> = { aberta: "Aberta", em_analise: "Em análise", resolvida: "Resolvida" };

export function useOcorrencias(alunoId: string) {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => db.from("aluno_ocorrencias").select("*").eq("aluno_id", alunoId).order("data", { ascending: false }).order("criado_em", { ascending: false }).then(({ data }: any) => setRows(data ?? []));
  useEffect(() => { void load(); }, [alunoId]);
  return { rows, reload: load };
}

export function OcorrenciasTab({ alunoId, responsavel, canEdit }: { alunoId: string; responsavel: string; canEdit: boolean }) {
  const { rows, reload } = useOcorrencias(alunoId);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ titulo: "", categoria: "atendimento", descricao: "", prioridade: "media", data: isoDia(new Date()) });
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    if (!f.titulo.trim()) return;
    setSalvando(true);
    const { error } = await db.from("aluno_ocorrencias").insert({ ...f, aluno_id: alunoId, responsavel });
    setSalvando(false);
    if (error) { alert(error.message); return; }
    setOpen(false); setF({ ...f, titulo: "", descricao: "" }); reload();
  }
  async function mudarStatus(id: string, status: string) {
    await db.from("aluno_ocorrencias").update({ status, atualizado_em: new Date().toISOString() }).eq("id", id);
    reload();
  }
  const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <Card title="Ocorrências" action={canEdit && <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Nova ocorrência</button>}>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
          <input className={inp + " sm:col-span-2"} placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          <select className={inp} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{OCORRENCIA_CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select>
          <select className={inp} value={f.prioridade} onChange={(e) => setF({ ...f, prioridade: e.target.value })}><option value="baixa">Prioridade baixa</option><option value="media">Prioridade média</option><option value="alta">Prioridade alta</option></select>
          <input type="date" className={inp} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
          <textarea className={inp + " sm:col-span-2"} rows={3} placeholder="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-xs">Cancelar</button>
            <button disabled={salvando} onClick={salvar} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">{salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      )}
      {rows.length ? (
        <ol className="relative space-y-4 border-l border-border pl-4">
          {rows.map((o) => (
            <li key={o.id} className="relative">
              <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${o.status === "resolvida" ? "bg-muted-foreground" : "bg-primary"}`} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{fmtDate(o.data)}</span>
                <span className="rounded bg-muted px-1.5">{CAT_LABEL[o.categoria] ?? o.categoria}</span>
                <span className={o.prioridade === "alta" ? "font-semibold text-primary" : ""}>Prioridade {o.prioridade}</span>
                {o.responsavel && <span>· {o.responsavel}</span>}
              </div>
              <div className="mt-0.5 text-sm font-medium text-foreground">{o.titulo}</div>
              {o.descricao && <p className="text-sm text-muted-foreground">{o.descricao}</p>}
              <select disabled={!canEdit} value={o.status} onChange={(e) => mudarStatus(o.id, e.target.value)} className="mt-1 rounded-md border border-input bg-background px-2 py-0.5 text-xs">
                {Object.entries(STATUS_OC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </li>
          ))}
        </ol>
      ) : vazio("Nenhuma ocorrência registrada.")}
    </Card>
  );
}

/* ---------- Alertas para o Resumo ---------- */
export function ResumoAlertas({ alunoId }: { alunoId: string }) {
  const { rows } = useOcorrencias(alunoId);
  const alertas = rows.filter((o) => o.status !== "resolvida" && (["saude", "lesao"].includes(o.categoria) || o.prioridade === "alta"));
  if (!alertas.length) return null;
  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary"><AlertTriangle className="h-4 w-4" /> Alertas importantes</div>
      <ul className="space-y-0.5 text-sm text-foreground">
        {alertas.slice(0, 4).map((o) => <li key={o.id}>• {o.titulo} <span className="text-xs text-muted-foreground">({CAT_LABEL[o.categoria]} · {fmtDate(o.data)})</span></li>)}
      </ul>
    </div>
  );
}

/* ---------- Timeline do Histórico ---------- */
const FILTROS_HIST = ["Todos", "Dados", "Treinos", "Frequência", "Saúde", "Avaliações", "Resultados", "Financeiro", "Ocorrências"];
export function HistoricoTimeline({ alunoId, hist, children }: { alunoId: string; hist: any[]; children?: React.ReactNode }) {
  const { rows: ocs } = useOcorrencias(alunoId);
  const [extra, setExtra] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("Todos");
  useEffect(() => {
    (async () => {
      const [{ data: rs }, { data: av }, { data: ck }] = await Promise.all([
        db.from("treino_resultados").select("criado_em,valor_texto,resultado_tipo,valor").eq("aluno_id", alunoId),
        db.from("physical_assessments").select("*").eq("aluno_id", alunoId),
        db.from("daily_checkins").select("created_at").eq("aluno_id", alunoId).limit(60),
      ]);
      const e: any[] = [];
      (rs ?? []).forEach((r: any) => e.push({ quando: r.criado_em, cat: "Resultados", desc: `Resultado registrado: ${r.valor_texto || formatarResultado(r.resultado_tipo, Number(r.valor))}`, resp: "Aluno" }));
      (av ?? []).forEach((r: any) => e.push({ quando: r.created_at ?? r.criado_em ?? r.assessment_date, cat: "Avaliações", desc: "Avaliação física realizada", resp: r.evaluator_name ?? "—" }));
      (ck ?? []).forEach((r: any) => e.push({ quando: r.created_at, cat: "Saúde", desc: "Check-in diário", resp: "Aluno" }));
      setExtra(e);
    })();
  }, [alunoId]);
  const eventos = useMemo(() => {
    const e = [...extra];
    hist.forEach((h) => e.push({ quando: h.criado_em, cat: "Dados", desc: `Status: ${h.status_anterior ?? "—"} → ${h.status_novo ?? "—"}`, resp: h.alterado_por ?? h.usuario ?? "—" }));
    ocs.forEach((o) => {
      e.push({ quando: o.criado_em, cat: "Ocorrências", desc: `Ocorrência criada: ${o.titulo}`, resp: o.responsavel ?? "—" });
      if (o.status === "resolvida") e.push({ quando: o.atualizado_em, cat: "Ocorrências", desc: `Ocorrência resolvida: ${o.titulo}`, resp: o.responsavel ?? "—" });
    });
    return e.filter((x) => x.quando).sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
  }, [extra, hist, ocs]);
  const lista = filtro === "Todos" ? eventos : eventos.filter((e) => e.cat === filtro);
  return (
    <div className="space-y-4">
      <Card title="Linha do tempo">
        <div className="mb-3 flex gap-1 overflow-x-auto no-scrollbar">
          {FILTROS_HIST.map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${filtro === f ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border text-muted-foreground"}`}>{f}</button>
          ))}
        </div>
        {lista.length ? (
          <ol className="relative space-y-3 border-l border-border pl-4">
            {lista.slice(0, 150).map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="text-xs text-muted-foreground">{fmtDateTime(e.quando)} · {e.cat} · {e.resp}</div>
                <div className="text-sm text-foreground">{e.desc}</div>
              </li>
            ))}
          </ol>
        ) : vazio("Nenhum evento para este filtro.")}
      </Card>
      {children}
    </div>
  );
}
