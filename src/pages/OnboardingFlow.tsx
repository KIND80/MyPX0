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
  Image,
  Loader2,
  Mail,
  Palette,
  Phone,
  Save,
  Send,
  Sparkles,
  UserRound,
  Wand2,
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
      "Bonjour {{first_name}},\n\nRavi de vous compter parmi mes contacts.\n\nÀ bientôt,\n{{advisor_name}}",
  });

  const progress = useMemo(() => Math.round((step / totalSteps) * 100), [step]);

  const update = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const next = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const finish = async () => {
    try {
      setLoading(true);

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
        console.error("Erreur onboarding:", error);
        alert(error.message);
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error("Erreur inattendue onboarding:", err);
      alert("Une erreur est survenue pendant la configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-6 text-slate-950 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.2),transparent_30%),linear-gradient(135deg,#fff7ed_0%,#f5f3ff_50%,#ecfeff_100%)]" />
      <div className="absolute left-[-100px] top-[-100px] h-72 w-72 animate-pulse rounded-full bg-violet-300/35 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-120px] h-80 w-80 animate-pulse rounded-full bg-cyan-300/35 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center justify-center">
        <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.35fr]">
          {/* PANEL IA */}
          <aside className="rounded-[2rem] border border-white/75 bg-white/65 p-6 shadow-2xl shadow-violet-200/40 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-violet-200">
                <Sparkles size={22} />
              </div>

              <div>
                <p className="text-xl font-black tracking-tight">MyPX</p>
                <p className="text-xs font-bold text-slate-500">
                  Setup intelligent
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.7rem] bg-slate-950 p-5 text-white">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                <Bot size={14} />
                Assistant IA
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight">
                Configurons ton cockpit commercial.
              </h1>

              <p className="mt-4 text-sm leading-7 text-white/60">
                Ces informations permettront à MyPX de personnaliser les emails,
                signatures, relances, campagnes et recommandations IA.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {[
                "Identité entreprise",
                "Image de marque",
                "Profil conseiller",
                "Email de bienvenue",
                "Activation du dashboard",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    step > index + 1
                      ? "bg-emerald-50 text-emerald-800"
                      : step === index + 1
                      ? "bg-violet-50 text-violet-800"
                      : "bg-white/70 text-slate-500"
                  }`}
                >
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      step > index + 1
                        ? "text-emerald-600"
                        : step === index + 1
                        ? "text-violet-600"
                        : "text-slate-300"
                    }`}
                  />
                  {item}
                </div>
              ))}
            </div>
          </aside>

          {/* MAIN CARD */}
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
                  {progress}%
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {step === 1 && (
              <StepShell
                icon={<Wand2 size={23} />}
                title="Bienvenue dans MyPX"
                subtitle="Ton CRM devient un assistant commercial intelligent."
              >
                <div className="rounded-[1.6rem] border border-violet-100 bg-violet-50/70 p-5">
                  <p className="text-sm leading-7 text-slate-600">
                    MyPX t’aide à transformer ton portefeuille en opportunités
                    de conversation grâce aux relances, aux emails intelligents,
                    au suivi client et à l’analyse IA.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {["Simple", "Automatisé", "Mobile-first"].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-white p-4 text-center text-sm font-black shadow-sm"
                    >
                      {item}
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
                subtitle="Ces infos seront utilisées dans tes emails et ton espace."
              >
                <InputField
                  icon={<Building2 size={15} />}
                  placeholder="Nom de l’entreprise"
                  value={data.company_name}
                  onChange={(value) => update("company_name", value)}
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
                  icon={<Sparkles size={15} />}
                  placeholder="Site internet"
                  value={data.company_website}
                  onChange={(value) => update("company_website", value)}
                />

                <InputField
                  icon={<Building2 size={15} />}
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
                subtitle="Donne à MyPX une identité visuelle alignée avec ton activité."
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
                      className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
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
                subtitle="Personnalise la relation client et les signatures."
              >
                <InputField
                  icon={<UserRound size={15} />}
                  placeholder="Nom du conseiller"
                  value={data.advisor_name}
                  onChange={(value) => update("advisor_name", value)}
                />

                <InputField
                  icon={<Sparkles size={15} />}
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
                subtitle="Prépare le message envoyé aux nouveaux contacts."
              >
                <InputField
                  icon={<Mail size={15} />}
                  placeholder="Objet de l’email"
                  value={data.welcome_subject}
                  onChange={(value) => update("welcome_subject", value)}
                />

                <textarea
                  placeholder="Contenu de l’email"
                  value={data.welcome_content}
                  onChange={(e) => update("welcome_content", e.target.value)}
                  className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-950 shadow-sm outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />

                <div className="rounded-2xl bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-500">
                  Variables disponibles : {"{{first_name}}"}, {"{{last_name}}"},{" "}
                  {"{{advisor_name}}"}, {"{{company_name}}"}
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

            {step === 6 && (
              <StepShell
                icon={<CheckCircle2 size={23} />}
                title="Votre espace est prêt"
                subtitle="MyPX va maintenant utiliser ces informations partout dans l’application."
              >
                <div className="rounded-[1.7rem] bg-slate-950 p-5 text-white">
                  <div
                    className="mb-4 h-16 w-16 rounded-2xl shadow-xl"
                    style={{ backgroundColor: data.main_color }}
                  />

                  <p className="text-2xl font-black">
                    {data.company_name || "Votre entreprise"}
                  </p>

                  <p className="mt-2 text-sm leading-7 text-white/60">
                    Votre configuration servira aux emails, signatures, relances
                    et futures opportunités IA.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                  <SummaryLine label="Entreprise" value={data.company_name} />
                  <SummaryLine label="Conseiller" value={data.advisor_name} />
                  <SummaryLine label="Email" value={data.company_email} />
                </div>

                <PrimaryButton onClick={finish} disabled={loading} full>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enregistrement...
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
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
      <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {placeholder}
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
