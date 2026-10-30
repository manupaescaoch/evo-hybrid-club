import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPace, formatTempo } from "@/lib/ranking-pontos";

type Corrida = {
  id: string;
  data: string;
  distancia_km: number;
  tempo_segundos: number;
  pace_segundos_km: number;
  print_url: string;
  observacao: string | null;
  status: string;
};

/** Corridas registradas pelo aluno, com print e opção de recusar (deixa de pontuar). */
export function CorridasRevisao({ alunoId }: { alunoId: string }) {
  const [rows, setRows] = useState<Corrida[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("corridas_registradas")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    carregar();
  }, [alunoId]);

  const mudar = async (id: string, status: "aprovada" | "recusada") => {
    const { data, error } = await (supabase as any).from("corridas_registradas").update({ status }).eq("id", id).select("id");
    if (error || !data?.length) return toast.error("Não foi possível atualizar a corrida.");
    toast.success(status === "recusada" ? "Corrida recusada — não pontua mais." : "Corrida aprovada.");
    carregar();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Corridas registradas</h3>
      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma corrida registrada.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
              <a href={c.print_url} target="_blank" rel="noreferrer" className="shrink-0">
                <img src={c.print_url} alt="Print da corrida" className="h-16 w-16 rounded-md object-cover" />
              </a>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-foreground">
                  {Number(c.distancia_km).toLocaleString("pt-BR")} km · {formatTempo(c.tempo_segundos)} · {formatPace(c.pace_segundos_km)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")}
                  {c.observacao ? ` · ${c.observacao}` : ""}
                </p>
                <span className={`text-xs font-semibold ${c.status === "recusada" ? "text-destructive" : "text-primary"}`}>
                  {c.status === "recusada" ? "Recusada" : "Aprovada"}
                </span>
              </div>
              {c.status === "aprovada" ? (
                <button onClick={() => mudar(c.id, "recusada")} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
                  Recusar
                </button>
              ) : (
                <button onClick={() => mudar(c.id, "aprovada")} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
                  Aprovar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
