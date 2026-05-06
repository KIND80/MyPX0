import { useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import LogoUpload from "../components/LogoUpload";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  Palette,
  Phone,
  Save,
  Send,
  Sparkles,
  UserRound,
  Wand2,
  X,
  ShieldCheck,
  Radar,
  MessageCircle,
  Eye,
  Globe,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Props = {
  session: Session;
};

type OnboardingData = {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_address: string;
  logo_url: string;
  main_color: string;
  advisor_name: string;
  advisor_role: string;
  advisor_photo_url: string;
  whatsapp_url: string;
  booking_url: string;
  welcome_subject: string;
  welcome_content: string;
};

const totalSteps = 6;

export default function OnboardingFlow({ session }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCoach, setShowCoach] = useState(true);

  const [data, setData] = useState<OnboardingData>({
    company_name: "",
    company_email: session.user.email ?? "",
    company_phone: "",
    company_website: "",
    company_address: "",
    logo_url: "",
    main_color: "#7c3aed",
    advisor_name: "",
    advisor_role: "",
    advisor_photo_url: "",
    whatsapp_url: "",
    booking_url: "",
    welcome_subject: "Bienvenue {{first_name}}",
    welcome_content:
      "Bonjour {{first_name}},\n\nJe suis ravi de vous compter désormais dans mon portefeuille clients.\n\nMon objectif est simple : vous accompagner dans la durée avec des conseils clairs, utiles et adaptés à votre situation.\n\nJe peux également vous accompagner sur vos questions d’assurances, de prévoyance, de fiscalité ou tout autre sujet important pour vous.\n\nN’hésitez pas à me solliciter à tout moment si vous avez une question ou un besoin particulier.\n\nÀ très bientôt,\n{{advisor_name}}",
  });

  const checklist = useMemo(
    () => [
      {
        label: "Entreprise renseignée",
        done: Boolean(data.company_name.trim()),
      },
      {
        label: "Email professionnel",
        done: Boolean(data.company_email.trim()),
      },
      {
        label: "Identité visuelle",
        done: Boolean(data.logo_url.trim()),
      },
      {
        label: "Conseiller identifié",
        done: Boolean(data.advisor_name.trim()),
      },
      {
        label: "Message d’accueil prêt",
        done:
          Boolean(data.welcome_subject.trim()) &&
          Boolean(data.welcome_content.trim()),
      },
      {
        label: "Canal de contact rapide",
        done: Boolean(data.booking_url.trim() || data.whatsapp_url.trim()),
      },
    ],
    [data]
  );

  const completedCount = checklist.filter((item) => item.done).length;
  const profileProgress = Math.round((completedCount / checklist.length) * 100);
  const stepProgress = Math.round((step / totalSteps) * 100);

  const update = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const canGoNext = () => {
    if (step === 2 && !data.company_name.trim()) {
      setError("Ajoute au minimum le nom de ton entreprise.");
      return false;
    }

    if (step === 4 && !data.advisor_name.trim()) {
      setError("Ajoute ton nom pour personnaliser la signature.");
      return false;
    }

    if (
      step === 5 &&
      (!data.welcome_subject.trim() || !data.welcome_content.trim())
    ) {
      setError("Complète l’objet et le contenu de ton email de bienvenue.");
      return false;
    }

    return true;
  };

  const next = () => {
    if (!canGoNext()) return;
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prev = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const finish = async () => {
    try {
      if (!canGoNext()) return;

      setLoading(true);
      setError("");

      const payload = {
        user_id: session.user.id,
        company_name: data.company_name.trim(),
        company_email: data.company_email.trim(),
        company_phone: data.company_phone.trim(),
        company_website: data.company_website.trim(),
        company_address: data.company_address.trim(),
        logo_url: data.logo_url.trim(),
        main_color: data.main_color || "#7c3aed",
        advisor_name: data.advisor_name.trim(),
        advisor_role: data.advisor_role.trim(),
        advisor_photo_url: data.advisor_photo_url.trim(),
        whatsapp_url: data.whatsapp_url.trim(),
        booking_url: data.booking_url.trim(),
        welcome_subject: data.welcome_subject.trim(),
        welcome_content: data.welcome_content.trim(),
        completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("user_onboarding").upsert(payload, {
        onConflict: "user_id",
      });

      if (error) {
        setError(error.message);
        return;
      }

      const { error: emailError } = await supabase.rpc("generate_mypx_email", {
        p_user_id: session.user.id,
        p_advisor_name:
          data.advisor_name.trim() ||
          data.company_name.trim() ||
          session.user.email ||
          "user",
      });

      if (emailError) {
        setError(
          `Profil enregistré, mais erreur email MyPX : ${emailError.message}`
        );
        return;
      }

      window.location.href = "/dashboard?view=home";
    } catch {
      setError("Une erreur est survenue pendant la configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-6 text-slate-950 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.2),transparent_30%),linear-gradient(135deg,#fff7ed_0%,#f5f3ff_50%,#ecfeff_100%)]" />
      <div className="absolute left-[-100px] top-[-100px] h-72 w-72 animate-pulse rounded-full bg-violet-300/35 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-120px] h-80 w-80 animate-pulse rounded-full bg-cyan-300/35 blur-3xl" />

      {showCoach && (
        <div className="fixed right-5 top-5 z-50 hidden w-96 rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-violet-200/60 backdrop-blur-2xl xl:block">
          <button
            onClick={() => setShowCoach(false)}
            className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:text-slate-950"
            type="button"
          >
            <X size={15} />
          </button>

          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            <Sparkles size={14} />
            PX Sentinel
          </div>

          <h3 className="mt-4 text-xl font-black text-slate-950">
            Configure ta base relationnelle
          </h3>

          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            Ces informations alimentent tes emails, ta signature, tes campagnes
            et les futures recommandations de MyPX.
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-black text-slate-500">
              <span>Profil complété</span>
              <span>{profileProgress}%</span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 transition-all"
                style={{ width: `${profileProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="relative mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center justify-center">
        <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.35fr]">
          <aside className="rounded-[2rem] border border-white/75 bg-white/65 p-6 shadow-2xl shadow-violet-200/40 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-violet-200">
                <Sparkles size={22} />
              </div>

              <div>
                <p className="text-xl font-black tracking-tight">MyPX</p>
                <p className="text-xs font-bold text-slate-500">
                  Portfolio Intelligence
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.7rem] bg-slate-950 p-5 text-white">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                <Bot size={14} />
                Initialisation PX Sentinel
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight">
                Crée ton identité commerciale intelligente.
              </h1>

              <p className="mt-4 text-sm leading-7 text-white/60">
                Avant d’utiliser ton centre de commandement, MyPX doit connaître
                ton entreprise, ton profil, ta signature et ton message
                d’accueil.
              </p>
            </div>

            <div className="mt-5 rounded-[1.7rem] border border-violet-100 bg-white/80 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-950">
                  Profil complété
                </p>

                <p className="text-sm font-black text-violet-700">
                  {profileProgress}%
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${profileProgress}%` }}
                />
              </div>

              <div className="mt-4 space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-xs font-black ${
                      item.done
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <Circle size={15} />
                    )}
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="rounded-[2rem] border border-white/75 bg-white/75 p-5 shadow-2xl shadow-violet-200/60 backdrop-blur-2xl sm:p-7">
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600">
                    Configuration initiale
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Étape {step} / {totalSteps}
                  </p>
                </div>

                <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  {stepProgress}%
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <StepShell
                icon={<Wand2 size={23} />}
                title="Bienvenue dans MyPX"
                subtitle="On configure ton identité avant d’entrer dans ton centre de commandement."
              >
                <div className="rounded-[1.6rem] border border-violet-100 bg-violet-50/70 p-5">
                  <p className="text-sm leading-7 text-slate-600">
                    Cette configuration permet à MyPX de personnaliser tes
                    emails, tes signatures, tes campagnes, tes relances et ton
                    expérience IA. Plus ton profil est complet, plus ton
                    portefeuille devient clair et exploitable.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Identité", "Entreprise et logo"],
                    ["Signature", "Conseiller et contact"],
                    ["Accueil", "Email de bienvenue"],
                  ].map(([title, subtitle]) => (
                    <div
                      key={title}
                      className="rounded-2xl bg-white p-4 text-center shadow-sm"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {title}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {subtitle}
                      </p>
                    </div>
                  ))}
                </div>

                <ButtonRow>
                  <PrimaryButton onClick={next}>
                    Commencer <ArrowRight size={16} />
                  </PrimaryButton>
                </ButtonRow>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell
                icon={<Building2 size={23} />}
                title="Entreprise"
                subtitle="Ces informations apparaîtront dans tes emails, ta signature et tes communications."
              >
                <InputField
                  icon={<Building2 size={15} />}
                  placeholder="Nom de l’entreprise"
                  value={data.company_name}
                  onChange={(value) => update("company_name", value)}
                  required
                />

                <InputField
                  icon={<Mail size={15} />}
                  placeholder="Email entreprise"
                  value={data.company_email}
                  onChange={(value) => update("company_email", value)}
                />

                <InputField
                  icon={<Phone size={15} />}
                  placeholder="Téléphone"
                  value={data.company_phone}
                  onChange={(value) => update("company_phone", value)}
                />

                <InputField
                  icon={<Globe size={15} />}
                  placeholder="Site internet"
                  value={data.company_website}
                  onChange={(value) => update("company_website", value)}
                />

                <InputField
                  icon={<MapPin size={15} />}
                  placeholder="Adresse entreprise"
                  value={data.company_address}
                  onChange={(value) => update("company_address", value)}
                />

                <ButtonRow>
                  <SecondaryButton onClick={prev}>
                    <ArrowLeft size={16} /> Retour
                  </SecondaryButton>
                  <PrimaryButton onClick={next}>
                    Suivant <ArrowRight size={16} />
                  </PrimaryButton>
                </ButtonRow>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell
                icon={<Palette size={23} />}
                title="Image de marque"
                subtitle="Ajoute ton logo et choisis la couleur principale utilisée dans tes emails."
              >
                <LogoUpload
                  userId={session.user.id}
                  value={data.logo_url}
                  onChange={(url) => update("logo_url", url)}
                />

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    <Palette size={14} />
                    Couleur principale
                  </label>

                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={data.main_color}
                      onChange={(e) => update("main_color", e.target.value)}
                      className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200 bg-transparent"
                    />

                    <input
                      value={data.main_color}
                      onChange={(e) => update("main_color", e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none"
                    />
                  </div>
                </div>

                <div
                  className="rounded-[1.5rem] p-5 text-white shadow-xl"
                  style={{ backgroundColor: data.main_color || "#7c3aed" }}
                >
                  <p className="text-sm font-bold opacity-80">Aperçu marque</p>
                  <p className="mt-2 text-2xl font-black">
                    {data.company_name || "Votre entreprise"}
                  </p>
                  <p className="mt-1 text-sm font-medium opacity-80">
                    Cette couleur sera utilisée dans ta signature et tes emails.
                  </p>
                </div>

                <ButtonRow>
                  <SecondaryButton onClick={prev}>
                    <ArrowLeft size={16} /> Retour
                  </SecondaryButton>
                  <PrimaryButton onClick={next}>
                    Suivant <ArrowRight size={16} />
                  </PrimaryButton>
                </ButtonRow>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell
                icon={<UserRound size={23} />}
                title="Profil conseiller"
                subtitle="Cette partie personnalise ta signature et humanise tes communications."
              >
                <InputField
                  icon={<UserRound size={15} />}
                  placeholder="Nom du conseiller"
                  value={data.advisor_name}
                  onChange={(value) => update("advisor_name", value)}
                  required
                />

                <InputField
                  icon={<ShieldCheck size={15} />}
                  placeholder="Rôle / fonction"
                  value={data.advisor_role}
                  onChange={(value) => update("advisor_role", value)}
                />

                <LogoUpload
                  userId={session.user.id}
                  value={data.advisor_photo_url}
                  onChange={(url) => update("advisor_photo_url", url)}
                />

                <InputField
                  icon={<Phone size={15} />}
                  placeholder="Lien WhatsApp"
                  value={data.whatsapp_url}
                  onChange={(value) => update("whatsapp_url", value)}
                />

                <InputField
                  icon={<CalendarDays size={15} />}
                  placeholder="Lien de prise de RDV"
                  value={data.booking_url}
                  onChange={(value) => update("booking_url", value)}
                />

                <ButtonRow>
                  <SecondaryButton onClick={prev}>
                    <ArrowLeft size={16} /> Retour
                  </SecondaryButton>
                  <PrimaryButton onClick={next}>
                    Suivant <ArrowRight size={16} />
                  </PrimaryButton>
                </ButtonRow>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell
                icon={<Send size={23} />}
                title="Email de bienvenue"
                subtitle="Ce message peut être envoyé aux nouveaux contacts pour ouvrir une relation professionnelle propre."
              >
                <div className="rounded-[1.6rem] border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                  Utilise un message simple, humain et professionnel. Il doit
                  rassurer le client et lui rappeler qu’il peut te solliciter
                  facilement.
                </div>

                <InputField
                  icon={<Mail size={15} />}
                  placeholder="Objet de l’email"
                  value={data.welcome_subject}
                  onChange={(value) => update("welcome_subject", value)}
                  required
                />

                <textarea
                  placeholder="Contenu de l’email"
                  value={data.welcome_content}
                  onChange={(e) => update("welcome_content", e.target.value)}
                  className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-950 shadow-sm outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />

                <div className="rounded-2xl bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-500">
                  Variables disponibles : {"{{first_name}}"}, {"{{last_name}}"},{" "}
                  {"{{advisor_name}}"}, {"{{company_name}}"}
                </div>

                <EmailPreview data={data} />

                <ButtonRow>
                  <SecondaryButton onClick={prev}>
                    <ArrowLeft size={16} /> Retour
                  </SecondaryButton>
                  <PrimaryButton onClick={next}>
                    Suivant <ArrowRight size={16} />
                  </PrimaryButton>
                </ButtonRow>
              </StepShell>
            )}

            {step === 6 && (
              <StepShell
                icon={<CheckCircle2 size={23} />}
                title="Ton espace est prêt"
                subtitle="MyPX va maintenant utiliser ces informations dans ton application."
              >
                <div className="rounded-[1.7rem] bg-slate-950 p-5 text-white">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-16 w-16 shrink-0 rounded-2xl shadow-xl"
                      style={{ backgroundColor: data.main_color }}
                    />

                    <div>
                      <p className="text-2xl font-black">
                        {data.company_name || "Votre entreprise"}
                      </p>

                      <p className="mt-2 text-sm leading-7 text-white/60">
                        Ton identité est prête pour les emails, signatures,
                        campagnes, relances et futures opportunités IA.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniReady icon={<Radar size={16} />} label="PX Sentinel" />
                    <MiniReady icon={<Mail size={16} />} label="Emails" />
                    <MiniReady icon={<Wand2 size={16} />} label="Relances IA" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                  <SummaryLine label="Entreprise" value={data.company_name} />
                  <SummaryLine label="Conseiller" value={data.advisor_name} />
                  <SummaryLine label="Email" value={data.company_email} />
                  <SummaryLine
                    label="Profil complété"
                    value={`${profileProgress}%`}
                  />
                </div>

                <PrimaryButton onClick={finish} disabled={loading} full>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Initialisation...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Entrer dans MyPX
                    </>
                  )}
                </PrimaryButton>

                <SecondaryButton onClick={prev} full>
                  <ArrowLeft size={16} /> Retour
                </SecondaryButton>
              </StepShell>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function StepShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
          {icon}
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
      <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {placeholder}
        {required && <span className="text-rose-500">*</span>}
      </label>

      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
      />
    </div>
  );
}

function EmailPreview({ data }: { data: OnboardingData }) {
  const previewSubject = replaceVariables(data.welcome_subject, data);
  const previewContent = replaceVariables(data.welcome_content, data);

  return (
    <div className="rounded-[1.6rem] border border-violet-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
        <Eye size={14} />
        Aperçu email
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Objet
        </p>
        <p className="mt-1 text-sm font-black text-slate-950">
          {previewSubject || "Sans objet"}
        </p>

        <div className="my-4 h-px bg-slate-200" />

        <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
          {previewContent || "Aucun contenu"}
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-black text-slate-950">
            {data.advisor_name || "Votre nom"}
          </p>
          <p className="text-xs font-bold text-slate-500">
            {data.advisor_role || "Votre fonction"} ·{" "}
            {data.company_name || "Votre entreprise"}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            {data.company_email || "email@entreprise.com"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ButtonRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  full,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 ${
        full ? "w-full" : "w-full"
      }`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  full,
}: {
  children: React.ReactNode;
  onClick: () => void;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 ${
        full ? "w-full" : "w-full"
      }`}
    >
      {children}
    </button>
  );
}

function MiniReady({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-xs font-black text-white">
      {icon}
      {label}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="font-black text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-950">
        {value || "Non renseigné"}
      </span>
    </p>
  );
}

function replaceVariables(value: string, data: OnboardingData) {
  return value
    .replace(/{{first_name}}/g, "Alexandre")
    .replace(/{{last_name}}/g, "Martin")
    .replace(/{{advisor_name}}/g, data.advisor_name || "Votre nom")
    .replace(/{{company_name}}/g, data.company_name || "Votre entreprise");
}
