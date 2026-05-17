import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getAlunoSession } from "@/lib/aluno-session";
import mpTeamLogo from "@/assets/mp-team-logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Bem-vindo — IRON CLUB RUN" },
      { name: "description", content: "IRON CLUB RUN — Todo treino começa antes do primeiro passo." },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && session) nav({ to: "/visao-geral" });
    else if (!loading && getAlunoSession()) nav({ to: "/aluno" });
  }, [loading, session, nav]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col items-center justify-between px-6 pt-16 pb-12 relative overflow-hidden">
      {/* Decorative diagonal stripes — top-right */}
      <DiagonalStripes className="absolute -top-10 -right-10 w-[70%] opacity-60 rotate-[8deg]" />
      {/* Decorative diagonal stripes — bottom-left */}
      <DiagonalStripes className="absolute -bottom-16 -left-10 w-[75%] opacity-50 -rotate-[8deg]" />

      <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center relative z-10">
        {/* Logo block */}
        <div
          className="h-[140px] w-[140px] rounded-[32px] bg-[#0033FF] flex items-center justify-center shadow-[0_30px_60px_-20px_rgba(0,51,255,0.55)]"
        >
          <img
            src={mpTeamLogo}
            alt="IRON CLUB RUN"
            className="h-[110px] w-[110px] object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Brand title */}
        <h1 className="mt-7 text-[34px] leading-none font-black tracking-tight text-center">
          <span className="text-black">Bem-vindo ao </span>
          <span className="text-[#0033FF]">IRON</span>
          <span className="text-black"> CLUB RUN</span>
        </h1>
        <p className="mt-3 text-[15px] text-black/55 text-center max-w-[280px]">
          Todo treino começa antes do primeiro passo.
        </p>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-sm flex flex-col gap-3 relative z-10">
        <Link
          to="/aluno/login"
          className="w-full h-[60px] rounded-2xl bg-[#0033FF] text-white text-[17px] font-bold flex items-center justify-center shadow-[0_18px_40px_-12px_rgba(0,51,255,0.55)] hover:bg-[#0033FF]/95 active:scale-[0.99] transition-all"
        >
          Sou aluno
        </Link>
        <Link
          to="/equipe-login"
          className="w-full h-[60px] rounded-2xl bg-[#1A1B23] text-white text-[17px] font-bold flex items-center justify-center hover:bg-[#1A1B23]/95 active:scale-[0.99] transition-all"
        >
          Sou profissional Iron
        </Link>
      </div>
    </div>
  );
}

function DiagonalStripes({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="stripes" patternUnits="userSpaceOnUse" width="22" height="22" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="22" stroke="#0033FF" strokeOpacity="0.18" strokeWidth="2" />
        </pattern>
      </defs>
      <polygon points="0,0 400,0 400,400" fill="url(#stripes)" />
    </svg>
  );
}
