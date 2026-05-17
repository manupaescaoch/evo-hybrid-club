import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Flame,
  Footprints,
  Zap,
  Timer,
  Activity,
  MessageSquare,
  Save,
  Dumbbell,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type BlocoTipo = "aquecimento" | "rodagem" | "intervalado" | "strides" | "desaquecimento";

type Bloco = {
  id: string;
  tipo: BlocoTipo;
  nome: string;
  descricao: string;
  duracao: string;
  pace: string;
  zona: string;
  series: string;
  distanciaSerie: string;
  recuperacao: string;
};

const TIPOS: { value: BlocoTipo; label: string; Icon: typeof Flame }[] = [
  { value: "aquecimento", label: "Aquecimento", Icon: Flame },
  { value: "rodagem", label: "Rodagem base", Icon: Footprints },
  { value: "intervalado", label: "Intervalado", Icon: Activity },
  { value: "strides", label: "Strides", Icon: Zap },
  { value: "desaquecimento", label: "Desaquecimento", Icon: Timer },
];

const novoBloco = (tipo: BlocoTipo, nome: string): Bloco => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  tipo,
  nome,
  descricao: "",
  duracao: "",
  pace: "",
  zona: "Z2",
  series: "",
  distanciaSerie: "",
  recuperacao: "",
});

export function TreinoTab({
  alunoId,
  nomeAluno,
}: {
  alunoId: string;
  nomeAluno: string;
  whatsapp?: string | null;
}) {
  const { crmUser, canEdit } = useAuth();
  const [treinoId, setTreinoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(`Treino de ${nomeAluno}`);
  const [objetivo, setObjetivo] = useState("");
  const [duracao, setDuracao] = useState("50");
  const [distancia, setDistancia] = useState("10");
  const [paceAlvo, setPaceAlvo] = useState("5:30");
  const [zonaFc, setZonaFc] = useState("Z2");
  const [observacao, setObservacao] = useState("");

  const [blocos, setBlocos] = useState<Bloco[]>([
    novoBloco("aquecimento", "Aquecimento"),
    novoBloco("rodagem", "Rodagem base"),
    novoBloco("strides", "Strides"),
  ]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCarregando(true);
      const { data: plano } = await supabase
        .from("treinos_planos")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("atualizado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancel) return;

      if (plano) {
        setTreinoId(plano.id);
        setNome(plano.nome ?? `Treino de ${nomeAluno}`);
        setObjetivo(plano.objetivo ?? "");
        setDuracao(plano.duracao_min != null ? String(plano.duracao_min) : "");
        setDistancia(plano.distancia_km != null ? String(plano.distancia_km) : "");
        setPaceAlvo(plano.pace_alvo ?? "");
        setZonaFc(plano.zona_fc ?? "Z2");
        setObservacao(plano.observacao ?? "");

        const { data: bks } = await supabase
          .from("treinos_blocos")
          .select("*")
          .eq("treino_id", plano.id)
          .order("ordem", { ascending: true });

        if (!cancel && bks && bks.length > 0) {
          setBlocos(
            bks.map((b) => ({
              id: b.id,
              tipo: (b.tipo as BlocoTipo) ?? "rodagem",
              nome: b.nome ?? "",
              descricao: b.descricao ?? "",
              duracao: b.duracao ?? "",
              pace: b.pace ?? "",
              zona: b.zona ?? "Z2",
              series: b.series ?? "",
              distanciaSerie: b.distancia_serie ?? "",
              recuperacao: b.recuperacao ?? "",
            })),
          );
        }
      }
      setCarregando(false);
    })();
    return () => {
      cancel = true;
    };
  }, [alunoId, nomeAluno]);

  function updateBloco(id: string, patch: Partial<Bloco>) {
    setBlocos((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function removerBloco(id: string) {
    setBlocos((prev) => prev.filter((b) => b.id !== id));
  }
  function adicionarBloco() {
    setBlocos((prev) => [...prev, novoBloco("rodagem", "Novo bloco")]);
  }

  async function salvar() {
    if (!canEdit) {
      toast.error("Você não tem permissão para editar.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        aluno_id: alunoId,
        nome: nome.trim() || `Treino de ${nomeAluno}`,
        objetivo: objetivo.trim() || null,
        duracao_min: duracao ? Number(duracao) : null,
        distancia_km: distancia ? Number(distancia) : null,
        pace_alvo: paceAlvo.trim() || null,
        zona_fc: zonaFc || null,
        observacao: observacao.trim() || null,
        criado_por: crmUser?.nome ?? crmUser?.email ?? null,
      };

      let id = treinoId;
      if (id) {
        const { error } = await supabase.from("treinos_planos").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("treinos_planos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        setTreinoId(id);
      }

      // Replace blocos: delete + insert (mantém simples e consistente)
      const { error: delErr } = await supabase.from("treinos_blocos").delete().eq("treino_id", id);
      if (delErr) throw delErr;

      if (blocos.length > 0) {
        const rows = blocos.map((b, i) => ({
          treino_id: id,
          ordem: i,
          tipo: b.tipo,
          nome: b.nome,
          descricao: b.descricao || null,
          duracao: b.duracao || null,
          pace: b.pace || null,
          zona: b.zona || null,
          series: b.series || null,
          distancia_serie: b.distanciaSerie || null,
          recuperacao: b.recuperacao || null,
        }));
        const { error: insErr } = await supabase.from("treinos_blocos").insert(rows);
        if (insErr) throw insErr;
      }

      toast.success("Treino salvo!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao salvar treino");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando treino...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header card — dados gerais */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">
            {treinoId ? "Editar treino" : "Criar treino"}
          </h2>
        </div>

        <div className="space-y-4">
          <FieldLabel label="Nome do treino">
            <TextInput value={nome} onChange={setNome} placeholder="Ex: Rodagem + 4x100m" />
          </FieldLabel>

          <FieldLabel label="Objetivo">
            <TextInput
              value={objetivo}
              onChange={setObjetivo}
              placeholder="Ex: Base aeróbica com pitadas de velocidade"
            />
          </FieldLabel>

          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Duração (min)">
              <TextInput value={duracao} onChange={setDuracao} type="number" placeholder="50" />
            </FieldLabel>
            <FieldLabel label="Distância (km)">
              <TextInput value={distancia} onChange={setDistancia} type="number" placeholder="10" />
            </FieldLabel>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Pace alvo">
              <TextInput value={paceAlvo} onChange={setPaceAlvo} placeholder="5:30 /km" />
            </FieldLabel>
            <FieldLabel label="Zona FC">
              <SelectInput
                value={zonaFc}
                onChange={setZonaFc}
                options={["Z1", "Z2", "Z3", "Z4", "Z5"]}
              />
            </FieldLabel>
          </div>
        </div>
      </section>

      {/* Blocos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">Blocos do treino</h3>
          <span className="text-xs text-muted-foreground">{blocos.length} blocos</span>
        </div>

        {blocos.map((b) => (
          <BlocoCard
            key={b.id}
            bloco={b}
            onChange={(patch) => updateBloco(b.id, patch)}
            onRemove={() => removerBloco(b.id)}
          />
        ))}

        <button
          type="button"
          onClick={adicionarBloco}
          className="w-full rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition py-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Adicionar bloco
        </button>
      </div>

      {/* Observação */}
      <section
        className="rounded-xl bg-card p-5 shadow-sm border border-border"
        style={{ borderLeft: "4px solid hsl(var(--primary))" }}
      >
        <label className="flex items-center gap-2 text-sm font-semibold mb-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Observação para o aluno
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={4}
          placeholder="Mensagem, lembretes e orientações pessoais que aparecerão junto com o treino..."
          className="w-full rounded-lg bg-muted/40 focus:bg-background border border-input px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-y"
        />
      </section>

      {/* Ação salvar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || !canEdit}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-60"
        >
          {salvando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar treino
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function BlocoCard({
  bloco,
  onChange,
  onRemove,
}: {
  bloco: Bloco;
  onChange: (patch: Partial<Bloco>) => void;
  onRemove: () => void;
}) {
  const tipoDef = TIPOS.find((t) => t.value === bloco.tipo) ?? TIPOS[0];
  const Icon = tipoDef.Icon;
  const isIntervalado = bloco.tipo === "intervalado" || bloco.tipo === "strides";

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <select
            value={bloco.tipo}
            onChange={(e) => {
              const t = e.target.value as BlocoTipo;
              const def = TIPOS.find((x) => x.value === t);
              onChange({ tipo: t, nome: def?.label ?? bloco.nome });
            }}
            className="text-xs font-semibold bg-transparent border-0 focus:outline-none cursor-pointer"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={bloco.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold focus:outline-none border-b border-transparent focus:border-primary/40 px-1"
            placeholder="Nome do bloco"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover bloco"
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <div className="p-4 space-y-3">
        <FieldLabel label="Descrição">
          <TextArea
            value={bloco.descricao}
            onChange={(v) => onChange({ descricao: v })}
            placeholder="Descreva o bloco..."
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Duração (min)">
            <TextInput
              value={bloco.duracao}
              onChange={(v) => onChange({ duracao: v })}
              placeholder="10"
              type="number"
            />
          </FieldLabel>
          <FieldLabel label="Pace alvo">
            <TextInput
              value={bloco.pace}
              onChange={(v) => onChange({ pace: v })}
              placeholder="5:30 /km"
            />
          </FieldLabel>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Zona">
            <SelectInput
              value={bloco.zona}
              onChange={(v) => onChange({ zona: v })}
              options={["Z1", "Z2", "Z3", "Z4", "Z5"]}
            />
          </FieldLabel>
          <FieldLabel label="Recuperação">
            <TextInput
              value={bloco.recuperacao}
              onChange={(v) => onChange({ recuperacao: v })}
              placeholder="2 min trote"
            />
          </FieldLabel>
        </div>

        {isIntervalado && (
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Séries">
              <TextInput
                value={bloco.series}
                onChange={(v) => onChange({ series: v })}
                placeholder="4"
                type="number"
              />
            </FieldLabel>
            <FieldLabel label="Distância por série">
              <TextInput
                value={bloco.distanciaSerie}
                onChange={(v) => onChange({ distanciaSerie: v })}
                placeholder="100 m"
              />
            </FieldLabel>
          </div>
        )}
      </div>
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg bg-muted/40 focus:bg-background border border-input px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full rounded-lg bg-muted/40 focus:bg-background border border-input px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-y"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-muted/40 focus:bg-background border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
