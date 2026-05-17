import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { setAlunoSession, getAlunoSession } from "@/lib/aluno-session";
import { useServerFn } from "@tanstack/react-start";
import { loginAlunoPorEmail, resolveRedirectAposLogin } from "@/server/aluno-auth.functions";
import { lovable } from "@/integrations/lovable";
import mpTeamLogo from "@/assets/mp-team-logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — IRON CLUB RUN" },
      { name: "description", content: "Acesse sua conta IRON CLUB RUN." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const loginAlunoFn = useServerFn(loginAlunoPorEmail);

  useEffect(() => {
    if (!loading && session) nav({ to: "/visao-geral" });
    else if (!loading && getAlunoSession()) nav({ to: "/aluno" });
  }, [loading, session, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const equipe = await signIn(email.trim(), password);
    if (!equipe.error) {
      setBusy(false);
      nav({ to: "/visao-geral" });
      return;
    }

    try {
      const res = await loginAlunoFn({ data: { identificador: email.trim(), senha: password } });
      if (res.ok) {
        setAlunoSession({
          id: res.aluno.id,
          nome: res.aluno.nome,
          email: res.aluno.email,
          whatsapp: res.aluno.whatsapp,
          avatarUrl: (res.aluno as any).foto_url ?? null,
          deveTrocarSenha: res.deve_trocar_senha,
        });
        setBusy(false);
        nav({ to: res.deve_trocar_senha ? "/aluno/trocar-senha" : "/aluno" });
        return;
      }
    } catch {
      /* ignora */
    }

    setBusy(false);
    setErr("Credenciais inválidas");
  };

  const onGoogle = async () => {
    setErr(null);
    setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.redirected) return;
    if (result.error) {
      setGoogleBusy(false);
      setErr("Falha ao entrar com Google");
      return;
    }
    nav({ to: "/visao-geral" });
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col items-center px-6 pt-12 pb-10">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="h-[110px] w-[110px] rounded-[26px] bg-[#0033FF] flex items-center justify-center shadow-[0_22px_50px_-18px_rgba(0,51,255,0.55)]">
          <img
            src={mpTeamLogo}
            alt="IRON CLUB RUN"
            className="h-[86px] w-[86px] object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Título */}
        <h1 className="mt-6 text-[32px] leading-none font-extrabold tracking-tight text-black text-center">
          <span className="text-[#0033FF]">IRON</span> CLUB RUN
        </h1>
        <p className="mt-3 text-[14px] text-black/55 text-center">
          Todo treino começa antes do primeiro passo.
        </p>

        {/* Formulário */}
        <form onSubmit={onSubmit} className="w-full mt-8 space-y-4">
          <div className="relative">
            <Mail className="h-5 w-5 text-[#0033FF] absolute left-5 top-1/2 -translate-y-1/2" strokeWidth={2.2} />
            <input
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="E-mail ou WhatsApp"
              className="w-full h-[60px] rounded-2xl bg-white border-0 pl-14 pr-5 text-[16px] placeholder:text-black/40 text-black shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-[#0033FF]/30 transition"
            />
          </div>

          <div className="relative">
            <Lock className="h-5 w-5 text-[#0033FF] absolute left-5 top-1/2 -translate-y-1/2" strokeWidth={2.2} />
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              autoComplete="current-password"
              placeholder="Senha"
              className="w-full h-[60px] rounded-2xl bg-white border-0 pl-14 pr-14 text-[16px] placeholder:text-black/40 text-black shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-[#0033FF]/30 transition"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 transition"
              aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <Link
              to="/aluno/esqueci-senha"
              className="text-[14px] font-semibold text-[#0033FF] hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>

          {err && (
            <div className="text-[13px] text-[#0033FF] bg-[#0033FF]/5 border border-[#0033FF]/20 rounded-xl px-4 py-3">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || googleBusy}
            className="w-full h-[60px] mt-2 rounded-2xl bg-[#0033FF] text-white text-[17px] font-bold shadow-[0_18px_40px_-12px_rgba(0,51,255,0.55)] hover:bg-[#0033FF]/95 active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-black/10" />
            <span className="text-[12px] text-black/40 font-medium">ou</span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <button
            type="button"
            onClick={onGoogle}
            disabled={busy || googleBusy}
            className="w-full h-[60px] rounded-2xl bg-white border border-black/10 text-black text-[16px] font-semibold flex items-center justify-center gap-3 hover:bg-black/[0.02] active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            <GoogleIcon />
            {googleBusy ? "Conectando..." : "Continuar com Google"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
