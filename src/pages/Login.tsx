import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ef] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.22),transparent_30%),linear-gradient(135deg,#fff7ed_0%,#f5f3ff_50%,#ecfeff_100%)]" />
      <div className="absolute left-[-90px] top-[-90px] h-72 w-72 animate-pulse rounded-full bg-violet-300/35 blur-3xl" />
      <div className="absolute bottom-[-110px] right-[-110px] h-80 w-80 animate-pulse rounded-full bg-cyan-300/35 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* LEFT */}
        <div className="hidden flex-col justify-between p-10 lg:flex">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-violet-200">
                <Sparkles size={22} />
              </div>

              <div>
                <p className="text-xl font-black tracking-tight">MyPX</p>
                <p className="text-xs font-bold text-slate-500">
                  Portfolio Intelligence
                </p>
              </div>
            </Link>

            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-xl">
              <Brain size={16} className="text-violet-600" />
              Cockpit commercial intelligent
            </div>

            <h1 className="mt-8 max-w-xl text-5xl font-black leading-tight tracking-tight text-slate-950">
              Reprends le contrôle de ton portefeuille client.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
              Connecte-toi à ton espace MyPX pour suivre tes clients, tes
              relances, tes campagnes et tes opportunités avec une interface
              simple, rapide et orientée action.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              "Dashboard orienté action",
              "Relances intelligentes",
              "Campagnes ciblées",
              "Données protégées",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/70 bg-white/65 p-4 text-sm font-bold text-slate-650 shadow-sm backdrop-blur-xl"
              >
                <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:p-10">
          <div className="w-full max-w-md rounded-[2rem] border border-white/75 bg-white/75 p-5 shadow-2xl shadow-violet-200/60 backdrop-blur-2xl sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600">
                  Connexion
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">
                  Bienvenue sur MyPX
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Accède à ton dashboard, tes clients, tes campagnes et tes
                  relances intelligentes.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-300">
                <ShieldCheck size={21} />
              </div>
            </div>

            <div className="mb-5 rounded-[1.4rem] border border-violet-100 bg-violet-50/70 p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 text-violet-700" />
                <div>
                  <p className="text-sm font-black text-slate-900">
                    IA prête à travailler
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Une fois connecté, MyPX analyse ton portefeuille pour
                    prioriser les meilleures actions.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
                <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  <Mail size={14} />
                  Email
                </label>

                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                  required
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
                <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  <Lock size={14} />
                  Mot de passe
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
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
                Créer un compte
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
