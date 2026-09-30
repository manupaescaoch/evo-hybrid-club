import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Library,
  Plus,
  Trash2,
  Trophy,
  BookmarkPlus,
  LayoutTemplate,
} from "lucide-react";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TIPOS_SESSAO, type SessaoTipo } from "@/lib/corrida-tipos";
import {
  TIPOS_BLOCO_HYROX,
  FORMATOS,
  TIPOS_RESULTADO,
  FILTROS_RANKING,
  ESTRUTURA_PADRAO,
  tipoBlocoMeta,
  formatoMeta,
  sugerirResultado,
  sugerirCriterio,
} from "@/lib/treino-hyrox";

export type Bloco = {
  id: string;
  ordem: number;
  tipo: string;
  nome: string;
  descricao: string;
  duracao_min: string;
  pace: string;
  zona: string;
  series: string;
  distancia_serie: string;
  recuperacao: string;
  formato: string | null;
  prescricao: string;
  orientacoes: string;
  resultado_habilitado: boolean;
  resultado_tipo: string | null;
  ranking_habilitado: boolean;
  ranking_criterio: string | null;
  ranking_filtros: string[];
};

export type Sessao = {
  id: string;
  data: string;
  ordem_no_dia: number;
  tipo: SessaoTipo;
  nome: string;
  duracao_min: number | null;
  distancia_km: number | null;
  pace_alvo: string | null;
  zona_fc: string | null;
  objetivo: string | null;
  observacao: string | null;
  executada: boolean;
  categoria: string | null;
  resultado_geral_habilitado: boolean;
  resultado_geral_tipo: string | null;
  resultado_geral_criterio: string | null;
  blocos: Bloco[];
};

const tmpId = () => `tmp_${Math.random().toString(36).slice(2, 9)}`;

export function novoBlocoHyrox(tipo = "custom"): Bloco {
  return {
    id: tmpId(),
    ordem: 0,
    tipo,
    nome: "",
    descricao: "",
    duracao_min: "",
    pace: "",
    zona: "",
    series: "",
    distancia_serie: "",
    recuperacao: "",
    formato: null,
    prescricao: "",
    orientacoes: "",
    resultado_habilitado: false,
    resultado_tipo: null,
    ranking_habilitado: false,
    ranking_criterio: null,
    ranking_filtros: ["geral"],
  };
}

/** Assinatura das configurações que afetam ranking (para alertar sobre resultados existentes). */
export function assinaturaResultado(b: Pick<Bloco, "resultado_habilitado" | "resultado_tipo" | "ranking_habilitado" | "ranking_criterio" | "formato">) {
  return [b.resultado_habilitado, b.resultado_tipo, b.ranking_habilitado, b.ranking_criterio, b.formato].join("|");
}

const inputCls = "w-full rounded-lg bg-muted/40 border border-input px-3 py-2 text-sm";

export function SessaoEditor({
  sessao,
  onChange,
  onRemove,
  onAplicarModelo,
  onSalvarModelo,
}: {
  sessao: Sessao;
  onChange: (patch: Partial<Sessao>) => void;
  onRemove: () => void;
  onAplicarModelo: () => void;
  onSalvarModelo: () => void;
}) {
  const dataFmt = new Date(sessao.data + "T00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  const [addOpen, setAddOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setBlocos = (blocos: Bloco[]) => onChange({ blocos: blocos.map((b, i) => ({ ...b, ordem: i })) });
  const addBloco = (tipo: string) => {
    setBlocos([...sessao.blocos, novoBlocoHyrox(tipo)]);
    setAddOpen(false);
  };
  const updateBloco = (id: string, patch: Partial<Bloco>) =>
    setBlocos(sessao.blocos.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBloco = (id: string) => setBlocos(sessao.blocos.filter((b) => b.id !== id));
  const duplicarBloco = (id: string) => {
    const i = sessao.blocos.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copia = { ...sessao.blocos[i], id: tmpId() };
    const arr = [...sessao.blocos];
    arr.splice(i + 1, 0, copia);
    setBlocos(arr);
  };
  const mover = (id: string, dir: -1 | 1) => {
    const i = sessao.blocos.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sessao.blocos.length) return;
    setBlocos(arrayMove(sessao.blocos, i, j));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = sessao.blocos.findIndex((b) => b.id === e.active.id);
    const to = sessao.blocos.findIndex((b) => b.id === e.over!.id);
    setBlocos(arrayMove(sessao.blocos, from, to));
  };

  return (
    <div className="space-y-5 pb-6">
      <SheetHeader>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg">Treino</SheetTitle>
            <p className="text-xs text-muted-foreground">Crie e organize a sessão por blocos.</p>
          </div>
          <button type="button" onClick={onAplicarModelo} className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 text-xs font-semibold">
            <Library className="h-3.5 w-3.5" /> Usar modelo
          </button>
          <button type="button" onClick={onRemove} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="Remover treino">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </SheetHeader>

      {/* Informações do treino */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Field label="Nome do treino">
          <input value={sessao.nome} onChange={(e) => onChange({ nome: e.target.value })} placeholder="HYROX ENGINE #12" className={`${inputCls} font-semibold`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <div className={`${inputCls} capitalize text-muted-foreground`}>{dataFmt}</div>
          </Field>
          <Field label="Categoria / nível">
            <input value={sessao.categoria ?? ""} onChange={(e) => onChange({ categoria: e.target.value || null })} placeholder="RX, Scaled, Iniciante…" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de sessão">
            <select value={sessao.tipo} onChange={(e) => onChange({ tipo: e.target.value as SessaoTipo })} className={inputCls}>
              {TIPOS_SESSAO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Objetivo (opcional)">
            <input value={sessao.objetivo ?? ""} onChange={(e) => onChange({ objetivo: e.target.value || null })} placeholder="Ex: Engine + força" className={inputCls} />
          </Field>
        </div>
        <Field label="Observações gerais (opcional)">
          <textarea value={sessao.observacao ?? ""} onChange={(e) => onChange({ observacao: e.target.value || null })} rows={2} className={`${inputCls} resize-y`} />
        </Field>
      </section>

      {/* Blocos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold">Blocos <span className="text-muted-foreground font-medium">({sessao.blocos.length})</span></h4>
        </div>

        {sessao.blocos.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">Comece vazio ou carregue a estrutura sugerida.</p>
            <button
              type="button"
              onClick={() => setBlocos(ESTRUTURA_PADRAO.map((t) => novoBlocoHyrox(t)))}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
            >
              <LayoutTemplate className="h-3.5 w-3.5" /> Warm-up · Strength · HYROX · Finisher · Cool Down
            </button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sessao.blocos.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sessao.blocos.map((b, i) => (
                <BlocoCard
                  key={b.id}
                  bloco={b}
                  index={i}
                  total={sessao.blocos.length}
                  onChange={(p) => updateBloco(b.id, p)}
                  onRemove={() => removeBloco(b.id)}
                  onDuplicate={() => duplicarBloco(b.id)}
                  onMove={(d) => mover(b.id, d)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <Plus className="h-4 w-4" /> Adicionar bloco
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="center">
            <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
              {TIPOS_BLOCO_HYROX.map((t) => (
                <button key={t.value} type="button" onClick={() => addBloco(t.value)} title={t.desc} className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-bold hover:bg-muted">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                  {t.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </section>

      {/* Resultado geral */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Resultado geral do treino</p>
            <p className="text-[11px] text-muted-foreground">Um único resultado para toda a sessão, com ranking.</p>
          </div>
          <Switch
            checked={sessao.resultado_geral_habilitado}
            onCheckedChange={(v) =>
              onChange({
                resultado_geral_habilitado: v,
                resultado_geral_tipo: sessao.resultado_geral_tipo ?? "tempo",
                resultado_geral_criterio: sessao.resultado_geral_criterio ?? "menor",
              })
            }
          />
        </div>
        {sessao.resultado_geral_habilitado && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de resultado">
              <select
                value={sessao.resultado_geral_tipo ?? "tempo"}
                onChange={(e) => onChange({ resultado_geral_tipo: e.target.value, resultado_geral_criterio: sugerirCriterio(e.target.value) })}
                className={inputCls}
              >
                {TIPOS_RESULTADO.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Classificação">
              <select value={sessao.resultado_geral_criterio ?? "menor"} onChange={(e) => onChange({ resultado_geral_criterio: e.target.value })} className={inputCls}>
                <option value="menor">Menor resultado vence</option>
                <option value="maior">Maior resultado vence</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      <button type="button" onClick={onSalvarModelo} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-muted py-2.5 text-sm font-semibold">
        <BookmarkPlus className="h-4 w-4" /> Salvar como modelo
      </button>
      <p className="text-[11px] text-center text-muted-foreground -mt-3">
        Para salvar como rascunho ou publicar, use os botões da semana.
      </p>
    </div>
  );
}

function BlocoCard({
  bloco,
  index,
  total,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: {
  bloco: Bloco;
  index: number;
  total: number;
  onChange: (p: Partial<Bloco>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const [aberto, setAberto] = useState(true);
  const meta = tipoBlocoMeta(bloco.tipo);
  const fmt = formatoMeta(bloco.formato);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloco.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  function escolherFormato(v: string) {
    const novo = bloco.formato === v ? null : v;
    const patch: Partial<Bloco> = { formato: novo };
    if (bloco.resultado_habilitado) {
      const sug = sugerirResultado(novo, bloco.tipo);
      if (sug) {
        patch.resultado_tipo = sug;
        patch.ranking_criterio = sugerirCriterio(sug);
      }
    }
    onChange(patch);
  }

  return (
    <div ref={setNodeRef} style={{ ...style, borderLeftColor: meta.cor }} className="rounded-xl border border-border border-l-4 bg-card">
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button type="button" {...attributes} {...listeners} className="h-7 w-6 flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing" aria-label="Arrastar">
          <GripVertical className="h-4 w-4" />
        </button>
        <select
          value={meta.value}
          onChange={(e) => onChange({ tipo: e.target.value })}
          className="text-[11px] font-extrabold tracking-wider bg-transparent border-0 focus:outline-none cursor-pointer"
          style={{ color: meta.cor }}
        >
          {TIPOS_BLOCO_HYROX.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="button" onClick={() => setAberto((a) => !a)} className="flex-1 min-w-0 text-left text-xs text-muted-foreground truncate">
          {bloco.nome || (fmt ? fmt.label : "")}
          {bloco.resultado_habilitado && <Trophy className="inline h-3 w-3 ml-1.5 text-primary" />}
        </button>
        <IconBtn label="Subir" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Descer" disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Duplicar" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Excluir" danger onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
      </div>

      {aberto && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-[11px] text-muted-foreground -mt-1">{meta.desc}</p>
          <input value={bloco.nome} onChange={(e) => onChange({ nome: e.target.value })} placeholder="Nome do bloco (opcional) — ex: Lower Body Strength" className={inputCls} />

          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Formato</span>
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
              {FORMATOS.map((f) => {
                const ativo = bloco.formato === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => escolherFormato(f.value)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold border transition-colors ${ativo ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            {fmt && <p className="mt-1 text-[11px] text-muted-foreground"><b className="text-foreground">{fmt.label}</b> — {fmt.desc}</p>}
          </div>

          <Field label="Prescrição">
            <textarea
              value={bloco.prescricao}
              onChange={(e) => onChange({ prescricao: e.target.value })}
              rows={5}
              placeholder={"Exemplo:\n4 Rounds\n1 km Run\n500 m SkiErg\n20 Wall Balls\n50 m Farmers Carry\nRest 2 min entre rounds"}
              className={`${inputCls} resize-y font-mono text-[13px] leading-relaxed`}
            />
          </Field>
          <Field label="Orientações do treinador (opcional)">
            <input value={bloco.orientacoes} onChange={(e) => onChange({ orientacoes: e.target.value })} placeholder="Manter RPE 7. Transições rápidas." className={inputCls} />
          </Field>

          <div className="rounded-lg bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Registrar resultado no app</span>
              <Switch
                checked={bloco.resultado_habilitado}
                onCheckedChange={(v) => {
                  const sug = bloco.resultado_tipo ?? sugerirResultado(bloco.formato, bloco.tipo) ?? "tempo";
                  onChange({ resultado_habilitado: v, resultado_tipo: sug, ranking_criterio: bloco.ranking_criterio ?? sugerirCriterio(sug), ranking_habilitado: v ? bloco.ranking_habilitado : false });
                }}
              />
            </div>
            {bloco.resultado_habilitado && (
              <>
                <select
                  value={bloco.resultado_tipo ?? "tempo"}
                  onChange={(e) => onChange({ resultado_tipo: e.target.value, ranking_criterio: sugerirCriterio(e.target.value) })}
                  className={inputCls}
                >
                  {TIPOS_RESULTADO.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Criar ranking deste bloco</span>
                  <Switch checked={bloco.ranking_habilitado} onCheckedChange={(v) => onChange({ ranking_habilitado: v })} />
                </div>
                {bloco.ranking_habilitado && (
                  <>
                    <select value={bloco.ranking_criterio ?? "menor"} onChange={(e) => onChange({ ranking_criterio: e.target.value })} className={inputCls}>
                      <option value="menor">Menor resultado vence</option>
                      <option value="maior">Maior resultado vence</option>
                    </select>
                    <div className="flex flex-wrap gap-1.5">
                      {FILTROS_RANKING.map((f) => {
                        const on = bloco.ranking_filtros.includes(f.value);
                        return (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => onChange({ ranking_filtros: on ? bloco.ranking_filtros.filter((x) => x !== f.value) : [...bloco.ranking_filtros, f.value] })}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${on ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground disabled:opacity-30 ${danger ? "hover:text-destructive hover:bg-destructive/10" : "hover:text-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
