import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Flame,
  Footprints,
  Download,
  Check,
  Play,
  X,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/aluno/treino")({
  head: () => ({
    meta: [
      { title: "Treino de hoje — App do Aluno | MPTEAM" },
      {
        name: "description",
        content:
          "Detalhes do treino de hoje: aquecimento, rodagem, intensidade por zona e blocos de execução.",
      },
    ],
  }),
  component: AlunoTreinoPage,
});

const BLUE = "#0033FF";

type Bloco = {
  id: string;
  titulo: string;
  descricao: string;
  done: boolean;
};

function AlunoTreinoPage() {
  const hoje = new Date();
  const dataLabel = hoje
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
    })
    .replace(".", "")
    .toUpperCase();

  const [blocos, setBlocos] = useState<Bloco[]>([
    {
      id: "01",
      titulo: "Aquecimento caminhada",
      descricao: "10 min · passo leve",
      done: true,
    },
    {
      id: "02",
      titulo: "Rodagem base",
      descricao: "30 min · 5:30–6:00 /km · Z2",
      done: true,
    },
    {
      id: "03",
      titulo: "4x Strides 100m",
      descricao: "4:00 /km · 2 min recuperação",
      done: false,
    },
    {
      id: "04",
      titulo: "Desaquecimento",
      descricao: "10 min caminhada + mobilidade",
      done: false,
    },
  ]);

  const intensidades = [
    { label: "Leve Z1", pct: 20, color: "#22C55E" },
    { label: "Base Z2", pct: 45, color: BLUE },
    { label: "Aeróbio Z3", pct: 25, color: "#0D0D0D" },
    { label: "Limiar Z4", pct: 10, color: "#D97706" },
  ];

  const concluidos = blocos.filter((b) => b.done).length;
  void concluidos;

  const toggle = (id: string) => {
    setBlocos((prev) =>
      prev.map((b) => (b.id === id ? { ...b, done: !b.done } : b)),
    );
  };

  // Finalizar treino modal
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [tempoMin, setTempoMin] = useState("50");
  const [tempoSec, setTempoSec] = useState("00");
  const [distancia, setDistancia] = useState("10");
  const [obs, setObs] = useState("");
  const [pse, setPse] = useState<number | null>(null);
  const [, setSalvo] = useState(false);

  const pseEscala = [
    { v: 1, emoji: "😌", label: "Muito leve" },
    { v: 2, emoji: "🙂", label: "Leve" },
    { v: 3, emoji: "😀", label: "Confortável" },
    { v: 4, emoji: "😅", label: "Moderado" },
    { v: 5, emoji: "😬", label: "Um pouco difícil" },
    { v: 6, emoji: "😮‍💨", label: "Difícil" },
    { v: 7, emoji: "😣", label: "Muito difícil" },
    { v: 8, emoji: "🥵", label: "Bem pesado" },
    { v: 9, emoji: "😵", label: "Extremo" },
    { v: 10, emoji: "🥶", label: "Máximo" },
  ];

  const abrirFinalizar = () => {
    setStep(1);
    setModalOpen(true);
  };

  const salvarTempo = () => {
    setSalvo(true);
    setStep(2);
  };

  const salvarPse = () => {
    toast.success("Treino registrado com sucesso!");
    setModalOpen(false);
    setSalvo(false);
    setPse(null);
  };

  return (
    <div className="px-4 pt-2 pb-6 space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/aluno"
          aria-label="Voltar"
          className="h-9 w-9 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition"
        >
          <ArrowLeft className="h-5 w-5 text-black" />
        </Link>
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-black/50">
          {dataLabel}
        </p>
        <div className="w-9" />
      </div>

      {/* Semana */}
      <SemanaSelector />

      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[11px] font-extrabold tracking-[0.2em] text-black">
          TREINO DE HOJE
        </h1>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0033FF] active:scale-95 transition"
        >
          <Download className="h-3.5 w-3.5" />
          PDF
        </button>
      </div>

      {/* Hero card */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0033FF]/10 px-2.5 py-1">
          <Footprints className="h-3 w-3 text-[#0033FF]" />
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#0033FF]">
            AERÓBICO — RODAGEM + STRIDES
          </span>
        </div>
        <h2 className="mt-2.5 text-[19px] font-extrabold leading-tight text-black">
          Aquecimento + Rodagem + 4x100m
        </h2>
        <p className="mt-0.5 text-[12px] text-black/55">
          Pace alvo: 5:30–6:00 /km
        </p>
        <div className="mt-3 flex items-center gap-4 text-[12px] text-black/70">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-black/50" />
            <span className="font-semibold">50 min</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-black/50" />
            <span className="font-semibold">10 km</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-black/50" />
            <span className="font-semibold">Leve</span>
          </span>
        </div>
      </motion.section>

      {/* Distribuição de intensidade */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
      >
        <h3 className="text-[13px] font-extrabold text-black">
          Distribuição de intensidade
        </h3>
        <ul className="mt-3 space-y-2.5">
          {intensidades.map((i) => (
            <li key={i.label} className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-black/70 w-[68px] shrink-0 leading-tight">
                {i.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${i.pct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: i.color }}
                />
              </div>
              <span className="text-[11px] font-extrabold tabular-nums text-black/70 w-9 text-right">
                {i.pct}%
              </span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* Blocos */}
      <ul className="space-y-2">
        {blocos.map((b, i) => (
          <motion.li
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 * i }}
            className={`rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.18)] flex items-center gap-3 p-3 ${
              b.done ? "ring-[#22C55E]/30" : ""
            }`}
          >
            <div
              className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-[12px] font-extrabold tabular-nums ${
                b.done
                  ? "bg-[#22C55E]/10 text-[#16a34a]"
                  : "bg-black/5 text-black/60"
              }`}
            >
              {b.id}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold text-black leading-tight">
                {b.titulo}
              </p>
              <p className="text-[11px] text-black/55 mt-0.5">{b.descricao}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(b.id)}
              aria-label={b.done ? "Desmarcar bloco" : "Marcar bloco concluído"}
              className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center transition active:scale-90 ${
                b.done
                  ? "bg-[#22C55E]"
                  : "border-2 border-black/15 bg-white"
              }`}
            >
              {b.done && (
                <Check className="h-4 w-4 text-white" strokeWidth={3.5} />
              )}
            </button>
          </motion.li>
        ))}
      </ul>

      {/* Finalizar treino */}
      <button
        type="button"
        onClick={abrirFinalizar}
        className="w-full mt-1 rounded-2xl py-3.5 text-[14px] font-extrabold ring-1 transition active:scale-[0.99] inline-flex items-center justify-center gap-2 bg-[#0033FF] text-white ring-[#0033FF] hover:bg-[#0033FF]/90"
      >
        <Play className="h-4 w-4" fill="currentColor" />
        Finalizar treino
      </button>

      {/* Modal finalizar */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-extrabold tracking-[0.18em] text-black/50">
                  {step === 1 ? "ETAPA 1 DE 2" : "ETAPA 2 DE 2"}
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/5"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4 text-black/60" />
                </button>
              </div>

              {step === 1 && (
                <div>
                  <h3 className="text-[20px] font-extrabold text-black leading-tight">
                    Como foi o treino?
                  </h3>
                  <p className="text-[12px] text-black/55 mt-1">
                    Anote o tempo e a distância para salvar seu treino.
                  </p>

                  {/* Tempo */}
                  <div className="mt-4">
                    <label className="text-[11px] font-extrabold tracking-[0.14em] text-black/60">
                      TEMPO
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1 rounded-2xl bg-black/[0.04] ring-1 ring-black/5 px-3 py-2.5">
                        <Clock className="h-4 w-4 text-black/40" />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={tempoMin}
                          onChange={(e) => setTempoMin(e.target.value)}
                          className="w-full bg-transparent outline-none text-[16px] font-extrabold tabular-nums text-black"
                          placeholder="min"
                        />
                        <span className="text-[12px] font-bold text-black/40">min</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1 rounded-2xl bg-black/[0.04] ring-1 ring-black/5 px-3 py-2.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={tempoSec}
                          onChange={(e) => setTempoSec(e.target.value)}
                          className="w-full bg-transparent outline-none text-[16px] font-extrabold tabular-nums text-black"
                          placeholder="seg"
                        />
                        <span className="text-[12px] font-bold text-black/40">seg</span>
                      </div>
                    </div>
                  </div>

                  {/* Distância */}
                  <div className="mt-3">
                    <label className="text-[11px] font-extrabold tracking-[0.14em] text-black/60">
                      DISTÂNCIA
                    </label>
                    <div className="mt-1.5 flex items-center gap-1 rounded-2xl bg-black/[0.04] ring-1 ring-black/5 px-3 py-2.5">
                      <MapPin className="h-4 w-4 text-black/40" />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={distancia}
                        onChange={(e) => setDistancia(e.target.value)}
                        className="w-full bg-transparent outline-none text-[16px] font-extrabold tabular-nums text-black"
                        placeholder="km"
                      />
                      <span className="text-[12px] font-bold text-black/40">km</span>
                    </div>
                  </div>

                  {/* Observação */}
                  <div className="mt-3">
                    <label className="text-[11px] font-extrabold tracking-[0.14em] text-black/60">
                      OBSERVAÇÕES (OPCIONAL)
                    </label>
                    <textarea
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      rows={2}
                      placeholder="Como você se sentiu, clima, sensações..."
                      className="mt-1.5 w-full rounded-2xl bg-black/[0.04] ring-1 ring-black/5 px-3 py-2.5 text-[13px] text-black placeholder:text-black/30 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={salvarTempo}
                    disabled={!tempoMin}
                    className="mt-4 w-full rounded-2xl bg-[#0033FF] text-white py-3.5 text-[14px] font-extrabold active:scale-[0.99] transition disabled:opacity-50"
                  >
                    Salvar treino
                  </button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-[20px] font-extrabold text-black leading-tight">
                    Qual sua percepção de esforço?
                  </h3>
                  <p className="text-[12px] text-black/55 mt-1">
                    Escala PSE de 1 a 10. Escolha o que mais representa.
                  </p>

                  <ul className="mt-4 space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                    {pseEscala.map((p) => {
                      const active = pse === p.v;
                      return (
                        <li key={p.v}>
                          <button
                            type="button"
                            onClick={() => setPse(p.v)}
                            className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition active:scale-[0.99] ${
                              active
                                ? "bg-[#0033FF]/10 ring-[#0033FF]"
                                : "bg-white ring-black/10 hover:bg-black/[0.02]"
                            }`}
                          >
                            <span className="text-[22px]">{p.emoji}</span>
                            <span
                              className={`text-[12px] font-extrabold tabular-nums w-6 text-center rounded-md py-0.5 ${
                                active
                                  ? "bg-[#0033FF] text-white"
                                  : "bg-black/[0.06] text-black/70"
                              }`}
                            >
                              {p.v}
                            </span>
                            <span className="text-[13px] font-semibold text-black text-left flex-1">
                              {p.label}
                            </span>
                            {active && (
                              <Check className="h-4 w-4 text-[#0033FF]" strokeWidth={3} />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={salvarPse}
                    disabled={pse === null}
                    className="mt-4 w-full rounded-2xl bg-[#22C55E] text-white py-3.5 text-[14px] font-extrabold active:scale-[0.99] transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Concluir treino
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

