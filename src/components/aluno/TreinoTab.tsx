import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { gerarMensagemTreino } from "@/server/treino.functions";
import { gerarCheckShapeLivre } from "@/server/check-shape-livre.functions";
import { useAuth } from "@/lib/auth";
import { fmtDateTime } from "@/lib/crm";
import { Copy, Loader2, Sparkles, X, Upload, FileText, Image as ImageIcon, Camera } from "lucide-react";
import { MessageCircle } from "lucide-react";
import { uploadAnamneseAsset } from "@/lib/anamnese-upload";
import { pdfToImageFiles } from "@/lib/pdf-to-images";
import { toast } from "sonner";

type Registro = {
  id: string;
  ajustes_realizados: string;
  dificuldades: string | null;
  medidas_otimizacao: string;
  mensagem_gerada: string | null;
  criado_por: string | null;
  criado_em: string;
};

export function TreinoTab({ alunoId, nomeAluno, whatsapp }: { alunoId: string; nomeAluno: string; whatsapp?: string | null }) {
  const { crmUser, canEdit } = useAuth();
  const gerar = useServerFn(gerarMensagemTreino);

  const [resumo, setResumo] = useState("");
  const [errResumo, setErrResumo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [openModal, setOpenModal] = useState<Registro | null>(null);

  useEffect(() => { void load(); }, [alunoId]);
  async function load() {
    const { data } = await supabase
      .from("mensagens_treino")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("criado_em", { ascending: false });
    setRegistros((data ?? []) as Registro[]);
  }

  async function handleGerar() {
    setErrResumo(null); setErroGeral(null);
    if (!resumo.trim()) { setErrResumo("Campo obrigatório"); return; }

    setBusy(true);
    setResultado(null);
    try {
      const res = await gerar({
        data: {
          nomeAluno,
          resumoAjusteTreino: resumo.trim(),
        },
      });
      if (!res?.mensagem) {
        setErroGeral("Não foi possível gerar a mensagem. Tente novamente.");
        return;
      }
      setResultado(res.mensagem);
      const ex = res.extraidos;
      const { error: insErr } = await supabase.from("mensagens_treino").insert({
        aluno_id: alunoId,
        ajustes_realizados: ex?.ajustes_realizados ?? "Não informado.",
        dificuldades: ex?.dificuldades ?? null,
        medidas_otimizacao: ex?.medidas_otimizacao ?? "Não informado.",
        mensagem_gerada: res.mensagem,
        criado_por: crmUser?.nome ?? crmUser?.email ?? "usuario",
      });
      if (insErr) console.error("Falha ao salvar registro:", insErr);
      setToast("Mensagem gerada com sucesso");
      setTimeout(() => setToast(null), 3000);
      await load();
    } catch (e) {
      console.error(e);
      setErroGeral("Não foi possível gerar a mensagem. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function abrirWhatsApp(text: string) {
    const numero = (whatsapp || "").replace(/\D/g, "");
    const url = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      {/* Gerador */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Gerar mensagem de ajuste de treino</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground -mt-2">
            Preencha as informações abaixo em uma única resposta. A IA vai organizar isso em uma mensagem pronta para o aluno.
          </p>

          <Field label="Resumo do ajuste de treino" required error={errResumo}>
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder={`Nome do aluno: ${nomeAluno}\n\nPrincipais ajustes realizados:\nEx: Aumentei a carga no supino, troquei o leg press pelo hack squat, reduzi o volume do treino C e adicionei mais exercícios para glúteo.\n\nDificuldades relatadas:\nEx: Relatou fadiga nas pernas, dificuldade para manter intensidade no treino de inferiores e cansaço após o cardio.\n\nMedidas adotadas para otimização:\nEx: Ajustei o volume do treino B, reduzi a intensidade do cardio em dias de perna e incluí orientação para melhorar recuperação entre os treinos.`}
              className="w-full bg-background border border-input rounded-md p-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-y leading-relaxed"
              style={{ minHeight: 260 }}
              disabled={busy || !canEdit}
            />
          </Field>

          <button
            onClick={handleGerar}
            disabled={busy || !canEdit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>) : "Gerar mensagem"}
          </button>
          {erroGeral && <p className="text-xs text-primary text-center">{erroGeral}</p>}
        </div>

        {resultado && (
          <div className="mt-5 rounded-md p-4 relative" style={{ background: "#1C1C1C", borderLeft: "3px solid #f50000" }}>
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <button
                onClick={() => copyText(resultado)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20"
              >
                <Copy className="h-3 w-3" /> {copied ? "Copiado!" : "Copiar"}
              </button>
              <button
                onClick={() => abrirWhatsApp(resultado)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[#25D366] text-white hover:bg-[#1ebe57]"
                title={whatsapp ? `Enviar para ${whatsapp}` : "Enviar por WhatsApp"}
              >
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </button>
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#f50000" }}>
              Mensagem gerada
            </p>
            <p className="text-white whitespace-pre-wrap pr-32" style={{ fontSize: 14, lineHeight: 1.7 }}>
              {resultado}
            </p>
          </div>
        )}
      </div>

      <CheckShapeBox alunoId={alunoId} nomeAluno={nomeAluno} whatsapp={whatsapp} canEdit={canEdit} />

      {/* Histórico */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold mb-4">Histórico de mensagens de treino</h2>
        {registros.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem gerada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 font-medium">Data</th>
                  <th className="text-left font-medium">Ajustes realizados</th>
                  <th className="text-left font-medium">Gerado por</th>
                  <th className="text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(r.criado_em)}</td>
                    <td className="py-2 pr-4">
                      {r.ajustes_realizados.length > 70
                        ? r.ajustes_realizados.slice(0, 70) + "..."
                        : r.ajustes_realizados}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{r.criado_por ?? "—"}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => setOpenModal(r)} className="text-xs text-primary hover:underline">
                        Ver completo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openModal && <DetalheModal r={openModal} onClose={() => setOpenModal(null)} whatsapp={whatsapp} />}

      {toast && (
        <div className="fixed right-4 z-50 fab-bottom-safe rounded-md bg-foreground text-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
      {error && <span className="text-[11px] text-primary">{error}</span>}
    </label>
  );
}

function DetalheModal({ r, onClose, whatsapp }: { r: Registro; onClose: () => void; whatsapp?: string | null }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (!r.mensagem_gerada) return;
    void navigator.clipboard.writeText(r.mensagem_gerada);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  function enviarWhats() {
    if (!r.mensagem_gerada) return;
    const numero = (whatsapp || "").replace(/\D/g, "");
    const url = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(r.mensagem_gerada)}`
      : `https://wa.me/?text=${encodeURIComponent(r.mensagem_gerada)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 px-safe" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">Mensagem de treino — {fmtDateTime(r.criado_em)}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Block title="Ajustes realizados" text={r.ajustes_realizados} />
          <Block title="Dificuldades relatadas" text={r.dificuldades} placeholder="Nenhuma dificuldade relatada" />
          <Block title="Medidas de otimização" text={r.medidas_otimizacao} />
          <hr className="border-border" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Mensagem gerada</p>
            <div className="rounded-md p-4 relative" style={{ background: "#1C1C1C", borderLeft: "3px solid #f50000" }}>
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button onClick={copy} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20">
                  <Copy className="h-3 w-3" /> {copied ? "Copiado!" : "Copiar"}
                </button>
                <button onClick={enviarWhats} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[#25D366] text-white hover:bg-[#1ebe57]">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </button>
              </div>
              <p className="text-white whitespace-pre-wrap pr-32" style={{ fontSize: 14, lineHeight: 1.7 }}>
                {r.mensagem_gerada ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, text, placeholder }: { title: string; text: string | null; placeholder?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      {text ? (
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">{placeholder ?? "—"}</p>
      )}
    </div>
  );
}

type Anexo = {
  id: string;
  file: File;
  kind: "image" | "pdf";
  preview: string;
};

const MAX_FILE_MB = 15;
const MAX_ANEXOS = 6;

function CheckShapeBox({
  alunoId,
  nomeAluno,
  whatsapp,
  canEdit,
}: {
  alunoId: string;
  nomeAluno: string;
  whatsapp?: string | null;
  canEdit: boolean;
}) {
  const gerar = useServerFn(gerarCheckShapeLivre);
  const inputRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState<string>("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resultadoOpen, setResultadoOpen] = useState(false);

  function adicionarFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (anexos.length + arr.length > MAX_ANEXOS) {
      toast.error(`Máximo ${MAX_ANEXOS} arquivos`);
      return;
    }
    const novos: Anexo[] = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name}: máximo ${MAX_FILE_MB}MB`);
        continue;
      }
      const isImage = f.type.startsWith("image/");
      const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      if (!isImage && !isPdf) {
        toast.error(`${f.name}: envie apenas imagens ou PDF`);
        continue;
      }
      novos.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        kind: isPdf ? "pdf" : "image",
        preview: isImage ? URL.createObjectURL(f) : "",
      });
    }
    setAnexos((prev) => [...prev, ...novos]);
  }

  function removerAnexo(id: string) {
    setAnexos((prev) => {
      const alvo = prev.find((a) => a.id === id);
      if (alvo?.preview) URL.revokeObjectURL(alvo.preview);
      return prev.filter((a) => a.id !== id);
    });
  }

  useEffect(() => {
    return () => {
      anexos.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files?.length) adicionarFiles(e.dataTransfer.files);
  }

  async function handleGerar() {
    setErro(null);
    setResultado(null);
    if (anexos.length === 0) {
      toast.error("Anexe ao menos uma imagem ou PDF");
      return;
    }
    setBusy(true);
    try {
      // 1) Expandir PDFs em imagens
      setBusyMsg("Preparando arquivos…");
      const imageFiles: File[] = [];
      for (const anexo of anexos) {
        if (anexo.kind === "image") {
          imageFiles.push(anexo.file);
        } else {
          setBusyMsg(`Convertendo PDF em imagens (${anexo.file.name})…`);
          try {
            const pages = await pdfToImageFiles(anexo.file, { maxPages: 10 });
            imageFiles.push(...pages);
          } catch (e: any) {
            console.error("pdf->img erro", e);
            toast.error(`Falha ao ler PDF: ${anexo.file.name}`);
          }
        }
      }
      if (imageFiles.length === 0) throw new Error("Nenhuma imagem para enviar");

      // 2) Upload
      setBusyMsg(`Enviando ${imageFiles.length} imagem(ns)…`);
      const ts = Date.now();
      const urls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const named = new File([file], `cs_${ts}_${i + 1}.${ext}`, {
          type: file.type || "image/png",
        });
        const { url, error } = await uploadAnamneseAsset({
          pathPrefix: `avaliacoes/check-shape-livre/${alunoId}/`,
          file: named,
        });
        if (error || !url) {
          console.error("upload erro", error);
          continue;
        }
        urls.push(url);
      }
      if (urls.length === 0) throw new Error("Falha ao enviar arquivos para o servidor");

      // 3) Análise IA
      setBusyMsg("Analisando com IA…");
      const res = await gerar({
        data: {
          alunoId,
          imagensUrls: urls,
          observacoes: observacoes.trim() || undefined,
        },
      });
      if (res?.error || !res?.mensagem) {
        setErro(res?.error || "Não foi possível gerar a análise.");
        return;
      }
      setResultado(res.mensagem);
      setResultadoOpen(true);
      toast.success("Análise gerada");
    } catch (e: any) {
      console.error(e);
      setErro(e?.message || "Erro ao gerar análise");
    } finally {
      setBusy(false);
      setBusyMsg("");
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function abrirWhatsApp(text: string) {
    const numero = (whatsapp || "").replace(/\D/g, "");
    const url = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Gerar mensagem de Check Shape</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Anexe fotos do aluno e/ou PDFs de avaliação. A IA fará uma análise no padrão Check Shape Mensal usando o prompt configurado.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/30"
        }`}
      >
        <Upload className="mx-auto h-7 w-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          {dragOver ? "Solte os arquivos aqui" : "Arraste arquivos aqui ou clique para selecionar"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Imagens (JPG/PNG/WEBP) ou PDF · até {MAX_FILE_MB}MB cada · máx. {MAX_ANEXOS} arquivos
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) adicionarFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {anexos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {anexos.map((a) => (
            <div key={a.id} className="relative group rounded-md border border-border overflow-hidden bg-muted/40">
              <div className="aspect-square w-full flex items-center justify-center">
                {a.kind === "image" ? (
                  <img src={a.preview} alt={a.file.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                    <FileText className="h-7 w-7 text-primary" />
                    <span className="text-[10px] text-muted-foreground line-clamp-2">{a.file.name}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removerAnexo(a.id); }}
                className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-background/90 backdrop-blur p-1 text-foreground shadow hover:bg-background"
                title="Remover"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-foreground">
                {a.kind === "image" ? <ImageIcon className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                {a.kind === "image" ? "imagem" : "PDF"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="block text-xs font-medium mb-1.5">Observações (opcional)</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Contexto adicional para a análise (ex.: período, objetivo do aluno, pontos de atenção…)"
          className="w-full bg-background border border-input rounded-md p-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-y"
          style={{ minHeight: 80 }}
          disabled={busy || !canEdit}
        />
      </div>

      <button
        onClick={handleGerar}
        disabled={busy || !canEdit || anexos.length === 0}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> {busyMsg || "Gerando…"}</>) : "Gerar análise"}
      </button>
      {erro && <p className="mt-2 text-xs text-primary text-center">{erro}</p>}

      {resultadoOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setResultadoOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-tight">Análise — Check Shape Mensal</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{nomeAluno}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResultadoOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {resultado ? (
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {resultado}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma resposta gerada.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              {resultado && (
                <>
                  <button
                    type="button"
                    onClick={() => { copyText(resultado); toast.success("Resposta copiada"); }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado!" : "Copiar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirWhatsApp(resultado)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1ebe57]"
                    title={whatsapp ? `Enviar para ${whatsapp}` : "Enviar por WhatsApp"}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setResultadoOpen(false)}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}