import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Radar,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(
        "Connexion impossible. Vérifiez votre email et votre mot de passe."
      );
      return;
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage(
        "Entrez votre email avant de demander la réinitialisation du mot de passe."
      );
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });

    setResetLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      "Un email de réinitialisation vient d’être envoyé si cette adresse existe."
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1020] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.32),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.28),transparent_32%),linear-gradient(135deg,#0B1020_0%,#111827_45%,#1e1b4b_100%)]" />
      <div className="absolute left-[-90px] top-[-90px] h-72 w-72 animate-pulse rounded-full bg-violet-500/30 blur-3xl" />
      <div className="absolute bottom-[-110px] right-[-110px] h-80 w-80 animate-pulse rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="hidden flex-col justify-between p-10 text-white lg:flex">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-violet-950/40">
                <Sparkles size={22} />
              </div>

              <div>
                <p className="text-xl font-black tracking-tight">MyPX</p>
                <p className="text-xs font-bold text-white/50">
                  Portfolio Intelligence
                </p>
              </div>
            </Link>

            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white/75 shadow-sm backdrop-blur-xl">
              <Radar size={16} className="text-cyan-300" />
              Accès au centre de commandement
            </div>

            <h1 className="mt-8 max-w-xl text-5xl font-black leading-tight tracking-tight text-white">
              Reprenez le contrôle de votre portefeuille relationnel.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-white/60">
              Connectez-vous à MyPX pour retrouver vos dossiers, vos signaux,
              vos opérations et vos actions prioritaires dans une interface
              claire, stratégique et orientée résultats.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              "Centre de commandement",
              "PX Sentinel actif",
              "Opérations ciblées",
              "Données protégées",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-white/70 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:p-10">
          <div className="w-full max-w-md rounded-[2rem] border border-white/75 bg-white/95 p-5 shadow-2xl shadow-violet-950/40 backdrop-blur-2xl sm:p-8">
            <Link to="/" className="mb-7 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-violet-200">
                <Sparkles size={20} />
              </div>

              <div>
                <p className="text-lg font-black tracking-tight">MyPX</p>
                <p className="text-xs font-bold text-slate-500">
                  Portfolio Intelligence
                </p>
              </div>
            </Link>

            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600">
                  Connexion
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  Accès opérateur
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Entrez dans votre centre de commandement MyPX.
                </p>
              </div>

              <div className="hidden rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-300 sm:block">
                <ShieldCheck size={21} />
              </div>
            </div>

            <div className="mb-5 rounded-[1.4rem] border border-violet-100 bg-violet-50/70 p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />

                <div>
                  <p className="text-sm font-black text-slate-900">
                    PX Sentinel prêt à analyser
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Une fois connecté, MyPX vous aide à prioriser les bons
                    dossiers, les bons signaux et les bonnes actions.
                  </p>
                </div>
              </div>
            </div>

            {errorMessage ? (
              <Notice type="error" text={errorMessage} />
            ) : null}

            {successMessage ? (
              <Notice type="success" text={successMessage} />
            ) : null}

            <form onSubmit={handleLogin} className="space-y-4">
              <FieldWrapper icon={Mail} label="Email">
                <input
                  type="email"
                  placeholder="vous@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                  required
                />
              </FieldWrapper>

              <FieldWrapper icon={Lock} label="Mot de passe">
                <div className="flex items-center gap-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </FieldWrapper>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="text-xs font-black text-violet-700 underline underline-offset-4 transition hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? "Envoi en cours..." : "Mot de passe oublié ?"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Ouverture du centre...
                  </>
                ) : (
                  <>
                    Entrer dans MyPX
                    <ArrowRight
                      size={17}
                      className="transition group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-medium text-slate-500">
              Pas encore de compte ?{" "}
              <Link
                to="/register"
                className="font-black text-violet-700 underline underline-offset-4"
              >
                Créer un espace
              </Link>
            </p>

            <Link
              to="/"
              className="mt-4 block text-center text-xs font-bold text-slate-400 transition hover:text-slate-700"
            >
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldWrapper({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
      <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        <Icon size={14} />
        {label}
      </label>

      {children}
    </div>
  );
}

function Notice({ type, text }: { type: "success" | "error"; text: string }) {
  const isSuccess = type === "success";

  return (
    <div
      className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
        isSuccess
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-rose-100 bg-rose-50 text-rose-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {isSuccess ? (
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
        ) : (
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
        )}

        <span>{text}</span>
      </div>
    </div>
  );
}