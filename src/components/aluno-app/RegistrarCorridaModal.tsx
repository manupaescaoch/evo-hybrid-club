import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Footprints, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { registrarCorrida } from "@/backend/corridas.functions";
import { formatPace, paceSegundos, validarCorrida } from "@/lib/ranking-pontos";
import { dataRecife } from "@/lib/recife-date";

function parseTempo(t: string): number {
  const p = t.trim().split(":").map((x) => Number(x));
  if (!p.length || p.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (p.length === 3) return Math.round(p[0] * 3600 + p[1] * 60 + p[2]);
  if (p.length === 2) return Math.round(p[0] * 60 + p[1]);
  return 0;
}

async function toBase64(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function RegistrarCorridaButton({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl py-3 text-[13.5px] font-extrabold ring-1 ring-[#0033FF]/30 bg-white text-[#0033FF] inline-flex items-center justify-center gap-2 active:scale-[0.99] transition"
      >
        <Footprints className="h-4 w-4" />
        Registrar corrida
      </button>
      <AnimatePresence>{open && <Modal onClose={() => setOpen(false)} onSaved={onSaved} />}</AnimatePresence>
    </>
  );
}

function Modal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const hoje = dataRecife();
  const [data, setData] = useState(hoje);
  const [km, setKm] = useState("");
  const [tempo, setTempo] = useState("");
  const [obs, setObs] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(registrarCorrida);

  const dist = Number(km.replace(",", "."));
  const seg = parseTempo(tempo);
  const erro = dist > 0 && seg > 0 ? validarCorrida(dist, seg) : null;
  const pace = useMemo(() => (dist > 0 && seg > 0 ? formatPace(paceSegundos(dist, seg)) : "—"), [dist, seg]);

  const salvar = async () => {
    const e = validarCorrida(dist, seg);
    if (e) return toast.error(e);
    if (!file) return toast.error("Envie o print do relógio ou app.");
    setSaving(true);
    try {
      const r = await fn({
        data: {
          data,
          distancia_km: dist,
          tempo_segundos: seg,
          observacao: obs || null,
          file_base64: await toBase64(file),
          content_type: file.type || "image/jpeg",
        },
      });
      if (!r.ok) return toast.error(r.error);
      toast.success("Corrida registrada e publicada na comunidade!");
      onSaved?.();
      onClose();
    } catch {
      toast.error("Não foi possível salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl bg-black/[0.04] px-3 py-2.5 text-[14px] text-black outline-none focus:ring-2 focus:ring-[#0033FF]/40";
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-black">Registrar corrida</h2>
          <button onClick={onClose} aria-label="Fechar" className="h-8 w-8 rounded-full bg-black/5 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-[12px] font-semibold text-black/60">
          Data
          <input type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[12px] font-semibold text-black/60">
            Distância (km)
            <input inputMode="decimal" placeholder="5,2" value={km} onChange={(e) => setKm(e.target.value)} className={input} />
          </label>
          <label className="block text-[12px] font-semibold text-black/60">
            Tempo (hh:mm:ss)
            <input inputMode="numeric" placeholder="00:28:30" value={tempo} onChange={(e) => setTempo(e.target.value)} className={input} />
          </label>
        </div>
        <div className="rounded-xl bg-[#0033FF]/5 px-3 py-2 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-black/60">Pace médio</span>
          <span className="text-[15px] font-extrabold text-[#0033FF] tabular-nums">{pace}</span>
        </div>
        {erro && <p className="text-[12px] font-semibold text-destructive">{erro}</p>}
        <label className="flex items-center gap-3 rounded-xl border border-dashed border-black/15 p-3 cursor-pointer">
          <Camera className="h-5 w-5 text-[#0033FF]" />
          <span className="text-[13px] font-semibold text-black/70 truncate">{file ? file.name : "Print do relógio/app (obrigatório)"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="block text-[12px] font-semibold text-black/60">
          Observação (opcional)
          <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} className={input} />
        </label>
        <button
          disabled={saving}
          onClick={salvar}
          className="w-full rounded-2xl py-3.5 text-[14px] font-extrabold bg-[#0033FF] text-white disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar corrida"}
        </button>
      </motion.div>
    </motion.div>
  );
}
