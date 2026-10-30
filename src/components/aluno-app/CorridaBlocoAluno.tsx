import { Link } from "@tanstack/react-router";
import { linhasEstrutura, totaisEstrutura, PACES_REFERENCIA, type EstruturaCorrida, type Paces } from "@/lib/corrida-vdot";

export function CorridaBlocoAluno({ estrutura, paces }: { estrutura: EstruturaCorrida; paces: Paces | null }) {
  const t = totaisEstrutura(estrutura, paces ?? PACES_REFERENCIA);
  return (
    <div className="mt-1.5 space-y-1">
      {linhasEstrutura(estrutura, paces).map((l, i) => (
        <p key={i} className="text-[13px] text-black/80 leading-relaxed">{l}</p>
      ))}
      <p className="text-[12px] font-bold text-black/70 pt-1">
        Total: {t.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · cerca de {Math.round(t.seg / 60)} min
        {!paces && " (estimativa)"}
      </p>
      {!paces && (
        <Link to="/aluno/perfil" hash="p-paces" className="block rounded-xl bg-[#0033FF]/10 px-3 py-2 text-[12px] font-semibold text-[#0033FF]">
          Cadastre seu teste de 5 km pra ver seus paces
        </Link>
      )}
    </div>
  );
}
