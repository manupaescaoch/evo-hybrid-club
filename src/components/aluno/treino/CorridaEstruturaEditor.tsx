import { ZONAS_PACE, PACES_REFERENCIA, totaisEstrutura, linhasEstrutura, type EstruturaCorrida, type EtapaCorrida, type ZonaPace } from "@/lib/corrida-vdot";

const inputCls = "rounded-lg bg-muted/40 border border-input px-2 py-1.5 text-sm";

function EtapaEditor({ label, etapa, onChange, opcional, reps, onReps }: {
  label: string;
  etapa: EtapaCorrida | null;
  onChange: (e: EtapaCorrida | null) => void;
  opcional?: boolean;
  reps?: number;
  onReps?: (n: number) => void;
}) {
  const ativa = !!etapa;
  const e = etapa ?? { medida: "tempo" as const, valor: 600, zona: "E" as ZonaPace };
  const set = (p: Partial<EtapaCorrida>) => onChange({ ...e, ...p });
  const valorUi = e.medida === "tempo" ? e.valor / 60 : e.valor;
  return (
    <div className="rounded-lg border border-border p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold">{label}</span>
        {opcional && (
          <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <input type="checkbox" checked={ativa} onChange={(ev) => onChange(ev.target.checked ? e : null)} /> incluir
          </label>
        )}
      </div>
      {ativa && (
        <div className="flex flex-wrap items-center gap-2">
          {onReps && (
            <>
              <input type="number" min={1} max={50} value={reps ?? 1} onChange={(ev) => onReps(Math.max(1, Number(ev.target.value) || 1))} className={`${inputCls} w-16`} aria-label="Repetições" />
              <span className="text-xs text-muted-foreground">x</span>
            </>
          )}
          <input
            type="number"
            min={0}
            step={e.medida === "tempo" ? 0.5 : 50}
            value={valorUi}
            onChange={(ev) => {
              const n = Number(ev.target.value) || 0;
              set({ valor: e.medida === "tempo" ? Math.round(n * 60) : Math.round(n) });
            }}
            className={`${inputCls} w-20`}
            aria-label="Valor"
          />
          <select
            value={e.medida}
            onChange={(ev) => {
              const medida = ev.target.value as EtapaCorrida["medida"];
              set({ medida, valor: medida === "tempo" ? 300 : 1000 });
            }}
            className={inputCls}
          >
            <option value="distancia">metros</option>
            <option value="tempo">minutos</option>
          </select>
          <span className="text-xs text-muted-foreground">em</span>
          <select value={e.zona} onChange={(ev) => set({ zona: ev.target.value as ZonaPace })} className={inputCls}>
            {ZONAS_PACE.map((z) => <option key={z.z} value={z.z}>{z.z} · {z.nome}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

export function CorridaEstruturaEditor({ valor, onChange }: { valor: EstruturaCorrida; onChange: (v: EstruturaCorrida) => void }) {
  const t = totaisEstrutura(valor, PACES_REFERENCIA);
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Etapas da corrida</span>
      <EtapaEditor label="Aquecimento" opcional etapa={valor.aquecimento} onChange={(e) => onChange({ ...valor, aquecimento: e })} />
      <EtapaEditor
        label="Principal (repetições)"
        etapa={valor.principal}
        reps={valor.principal.repeticoes}
        onReps={(n) => onChange({ ...valor, principal: { ...valor.principal, repeticoes: n } })}
        onChange={(e) => e && onChange({ ...valor, principal: { ...e, repeticoes: valor.principal.repeticoes } })}
      />
      <EtapaEditor label="Recuperação entre tiros" opcional etapa={valor.recuperacao} onChange={(e) => onChange({ ...valor, recuperacao: e })} />
      <EtapaEditor label="Desaquecimento" opcional etapa={valor.desaquecimento} onChange={(e) => onChange({ ...valor, desaquecimento: e })} />
      <div className="rounded-lg bg-muted/30 p-2.5 text-[11px] text-muted-foreground space-y-0.5">
        {linhasEstrutura(valor, null).map((l, i) => <p key={i}>{l}</p>)}
        <p className="pt-1 font-semibold text-foreground">
          ≈ {t.km.toFixed(1)} km · {Math.round(t.seg / 60)} min (estimativa para um corredor médio; cada aluno vê o próprio pace)
        </p>
      </div>
    </div>
  );
}
