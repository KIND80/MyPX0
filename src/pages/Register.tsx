import { FormEvent, useMemo, useState } from "react";
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
  User,
  Wand2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const passwordLabel = useMemo(() => {
    if (passwordScore <= 1) return "faible";
    if (passwordScore === 2) return "correcte";
    if (passwordScore === 3) return "bonne";
    return "excellente";
  }, [passwordScore]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setErrorMessage("");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1020] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.32),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.28),transparent_32%),linear-gradient(135deg,#0B1020_0%,#111827_45%,#1e1b4b_100%)]" />
      <div className="absolute right-[-90px] top-[-90px] h-72 w-72 animate-pulse rounded-full bg-violet-500/30 blur-3xl" />
      <div className="absolute bottom-[-110px] left-[-110px] h-80 w-80 animate-pulse rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:p-10">
        <div className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl shadow-violet-950/50 backdrop-blur-2xl lg:grid-cols-2">
          <div className="relative overflow-hidden border-b border-white/10 bg-slate-950/40 p-6 text-white sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
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
                Activation PX Sentinel
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Active ton centre de commandement relationnel.
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-7 text-white/60 sm:text-base">
                MyPX transforme ton portefeuille en système vivant : dossiers,
                signaux, opérations, relances et recommandations IA.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Onboarding guidé dès la première connexion",
                  "PX Sentinel pour détecter les signaux utiles",
                  "Dossiers, opérations et transmissions centralisés",
                  "Expérience premium pensée mobile-first",
                ].map((line) => (
                  <div
                    key={line}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white/75 shadow-sm backdrop-blur-xl"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    {line}
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[1.6rem] border border-cyan-300/20 bg-cyan-300/10 p-4">
                <div className="flex items-start gap-3">
                  <Brain className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  <p className="text-xs font-bold leading-6 text-white/60">
                    Après l’inscription, MyPX prépare ton espace : identité,
                    signature, groupes, premier dossier et séquence d’accueil.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 p-6 sm:p-8 lg:p-10">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600">
                  Inscription
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  Créer mon espace
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Renseignez vos accès. PX Sentinel préparera ensuite votre
                  environnement de travail.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-300">
                <ShieldCheck size={21} />
              </div>
            </div>

            {success ? (
              <Notice
                type="success"
                title="Compte créé avec succès"
                text="Vous pouvez maintenant vous connecter et lancer votre onboarding MyPX."
              />
            ) : null}

            {errorMessage ? (
              <Notice
                type="error"
                title="Inscription impossible"
                text={errorMessage}
              />
            ) : null}

            <div className="mb-5 rounded-[1.4rem] border border-violet-100 bg-violet-50/70 p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Configuration intelligente
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    MyPX vous aide à créer un espace prêt à vendre : groupes,
                    relances, premier dossier et opération d’accueil.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <FieldWrapper icon={User} label="Nom complet">
                <input
                  type="text"
                  placeholder="Votre nom"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                  required
                />
              </FieldWrapper>

              <FieldWrapper icon={Mail} label="Email">
                <input
                  type="email"
                  placeholder="vous@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {password.length > 0 ? (
                  <div className="mt-3">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className={`h-1.5 flex-1 rounded-full ${
                            item < passwordScore
                              ? "bg-gradient-to-r from-violet-600 to-cyan-400"
                              : "bg-slate-100"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-400">
                      Sécurité :{" "}
                      <span className="font-black text-slate-600">
                        {passwordLabel}
                      </span>
                    </p>
                  </div>
                ) : null}
              </FieldWrapper>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Création de l’espace...
                  </>
                ) : (
                  <>
                    Activer mon espace MyPX
                    <ArrowRight
                      size={17}
                      className="transition group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-medium text-slate-500">
              Déjà inscrit ?{" "}
              <Link
                to="/login"
                className="font-black text-violet-700 underline underline-offset-4"
              >
                Se connecter
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

function Notice({
  type,
  title,
  text,
}: {
  type: "success" | "error";
  title: string;
  text: string;
}) {
  const isSuccess = type === "success";

  return (
    <div
      className={`mb-5 rounded-[1.4rem] border p-4 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50"
          : "border-rose-200 bg-rose-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
        )}

        <div>
          <p
            className={`text-sm font-black ${
              isSuccess ? "text-emerald-950" : "text-rose-950"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1 text-xs leading-5 ${
              isSuccess ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}