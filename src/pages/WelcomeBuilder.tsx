import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  Building2,
  Calendar,
  Loader2,
  Mail,
  MessageCircle,
  MousePointerClick,
  Palette,
  Save,
  Sparkles,
  UserRound,
  Image,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import LogoUpload from "../components/LogoUpload";

type WelcomeBuilderProps = {
  session: Session;
};

type UserOnboarding = {
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  company_address: string | null;
  logo_url: string | null;
  main_color: string | null;
  advisor_name: string | null;
  advisor_role: string | null;
  advisor_photo_url: string | null;
  whatsapp_url: string | null;
  booking_url: string | null;
  welcome_subject: string | null;
  welcome_content: string | null;
};

const defaultSubject = "Bienvenue {{first_name}}";

const defaultIntroText =
  "Bonjour {{first_name}},\n\nRavi de vous compter parmi mes contacts.\n\nJe reste à votre disposition pour échanger selon vos besoins.\n\nÀ bientôt,\n{{advisor_name}}";

function replaceVars(value: string) {
  return value
    .split("{{first_name}}")
    .join("Christian")
    .split("{{company_name}}")
    .join("MyPX")
    .split("{{advisor_name}}")
    .join("Christian");
}

function ensureRequiredWelcomeVars(subjectValue: string, contentValue: string) {
  let safeSubject = subjectValue.trim();
  let safeContent = contentValue.trim();

  if (!safeSubject.includes("{{first_name}}")) {
    safeSubject = "Bienvenue {{first_name}}";
  }

  if (!safeContent.includes("{{first_name}}")) {
    safeContent = `Bonjour {{first_name}},\n\n${safeContent}`;
  }

  if (!safeContent.includes("{{advisor_name}}")) {
    safeContent = `${safeContent}\n\nÀ bientôt,\n{{advisor_name}}`;
  }

  return {
    safeSubject,
    safeContent,
  };
}

function isValidHexColor(value: string) {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function normalizeColor(value: string) {
  return isValidHexColor(value) ? value : "#7c3aed";
}

function hexToRgba(hex: string, opacity: number) {
  const cleanHex = normalizeColor(hex).replace("#", "");

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${opacity})`;
}

function hexToDummyImageColor(hex: string) {
  return normalizeColor(hex).replace("#", "");
}

export default function WelcomeBuilder({ session }: WelcomeBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  const [subject, setSubject] = useState(defaultSubject);

  const [companyName, setCompanyName] = useState("MyPX");
  const [companyTagline, setCompanyTagline] = useState(
    "Votre assistant intelligent de suivi client"
  );
  const [companyEmail, setCompanyEmail] = useState(session.user.email ?? "");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [mainColor, setMainColor] = useState("#7c3aed");

  const [advisorName, setAdvisorName] = useState("");
  const [advisorRole, setAdvisorRole] = useState(
    "Conseiller & créateur d’opportunités"
  );
  const [advisorPhotoUrl, setAdvisorPhotoUrl] = useState("");

  const [introTitle, setIntroTitle] = useState(
    "Bienvenue dans notre portefeuille client"
  );

  const [introText, setIntroText] = useState(defaultIntroText);

  const [whyText, setWhyText] = useState(
    "Vous recevez ce message car vous avez été ajouté à notre portefeuille client à la suite d’un échange, d’une demande d’information ou d’une opportunité identifiée."
  );

  const [questionText, setQuestionText] = useState(
    "Pour mieux vous accompagner, vous pouvez simplement répondre à cet email avec votre priorité du moment."
  );

  const [ctaText, setCtaText] = useState("Répondre à cet email");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  const [footerText, setFooterText] = useState(
    "Vous recevez ce message car vous avez été ajouté à notre portefeuille client."
  );

  const brandColor = useMemo(() => normalizeColor(mainColor), [mainColor]);

  const hasFirstNameInSubject = subject.includes("{{first_name}}");
  const hasFirstNameInContent = introText.includes("{{first_name}}");
  const hasAdvisorNameInContent = introText.includes("{{advisor_name}}");

  const insertVariable = (variable: string) => {
    setIntroText((prev) => {
      if (prev.includes(variable)) return prev;
      return `${prev}\n${variable}`;
    });
  };

  const applyOnboardingData = (onboarding: UserOnboarding | null) => {
    if (!onboarding) return;

    if (onboarding.company_name) setCompanyName(onboarding.company_name);
    if (onboarding.company_email) setCompanyEmail(onboarding.company_email);
    if (onboarding.company_phone) setCompanyPhone(onboarding.company_phone);
    if (onboarding.company_website)
      setCompanyWebsite(onboarding.company_website);
    if (onboarding.company_address)
      setCompanyAddress(onboarding.company_address);
    if (onboarding.logo_url) setLogoUrl(onboarding.logo_url);
    if (onboarding.main_color)
      setMainColor(normalizeColor(onboarding.main_color));

    if (onboarding.advisor_name) setAdvisorName(onboarding.advisor_name);
    if (onboarding.advisor_role) setAdvisorRole(onboarding.advisor_role);
    if (onboarding.advisor_photo_url)
      setAdvisorPhotoUrl(onboarding.advisor_photo_url);

    if (onboarding.whatsapp_url) setWhatsappUrl(onboarding.whatsapp_url);
    if (onboarding.booking_url) setBookingUrl(onboarding.booking_url);

    if (onboarding.welcome_subject) setSubject(onboarding.welcome_subject);
    if (onboarding.welcome_content) setIntroText(onboarding.welcome_content);
  };

  const fetchData = async () => {
    setLoadingTemplate(true);

    const { data: onboarding, error: onboardingError } = await supabase
      .from("user_onboarding")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (onboardingError) {
      console.error("Erreur chargement onboarding:", onboardingError.message);
    }

    applyOnboardingData((onboarding as UserOnboarding) || null);

    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("type", "welcome_email")
      .maybeSingle();

    if (templateError) {
      alert(templateError.message);
      setLoadingTemplate(false);
      return;
    }

    if (templateData) {
      setSubject(templateData.subject || defaultSubject);
    }

    setLoadingTemplate(false);
  };

  useEffect(() => {
    fetchData();
  }, [session.user.id]);

  const generateHtml = (customIntroText = introText) => {
    const safeLogo =
      logoUrl.trim() ||
      `https://dummyimage.com/160x160/${hexToDummyImageColor(
        brandColor
      )}/ffffff.png&text=LOGO`;

    const safeCover =
      coverUrl.trim() ||
      `https://dummyimage.com/1200x420/${hexToDummyImageColor(
        brandColor
      )}/ffffff.png&text=Bienvenue`;

    const safeAdvisorPhoto =
      advisorPhotoUrl.trim() ||
      `https://dummyimage.com/200x200/${hexToDummyImageColor(
        brandColor
      )}/ffffff.png&text=Photo`;

    const softBrandBg = hexToRgba(brandColor, 0.08);
    const mediumBrandBg = hexToRgba(brandColor, 0.14);
    const shadowBrand = hexToRgba(brandColor, 0.24);

    return `
<div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:700px;margin:0 auto;padding:28px 14px;">
    <div style="background:#ffffff;border-radius:30px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 18px 45px rgba(15,23,42,0.14);">
      
      <div style="height:230px;background:${brandColor};background-image:linear-gradient(135deg,${brandColor} 0%,${hexToRgba(
      brandColor,
      0.82
    )} 45%,rgba(15,23,42,0.88) 100%),url('${safeCover}');background-position:center;background-size:cover;">
        <div style="height:100%;padding:30px;box-sizing:border-box;">
          <img src="${safeLogo}" alt="${companyName}" style="width:74px;height:74px;object-fit:cover;border-radius:24px;border:2px solid rgba(255,255,255,0.9);background:#ffffff;box-shadow:0 14px 30px rgba(0,0,0,0.18);" />
          
          <h1 style="margin:20px 0 0;font-size:30px;line-height:1.2;color:#ffffff;font-weight:800;">
            ${introTitle}
          </h1>
          
          <p style="margin:9px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">
            ${companyTagline}
          </p>
        </div>
      </div>

      <div style="padding:34px;">
        <div style="font-size:15px;line-height:1.85;color:#334155;white-space:pre-line;">
${customIntroText}
        </div>

        <div style="margin:28px 0;padding:20px;border-radius:22px;background:${softBrandBg};border:1px solid ${mediumBrandBg};">
          <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:${brandColor};font-weight:800;">
            Pourquoi vous recevez ce mail
          </p>
          <p style="margin:0;font-size:14px;line-height:1.75;color:#334155;">
            ${whyText}
          </p>
        </div>

        <div style="margin:28px 0;padding:22px;border-radius:24px;background:#ffffff;border:1px solid ${mediumBrandBg};box-shadow:0 10px 25px ${shadowBrand};">
          <p style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:${brandColor};font-weight:800;">
            Votre contact
          </p>

          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;width:76px;">
                <img src="${safeAdvisorPhoto}" alt="${advisorName}" style="width:64px;height:64px;object-fit:cover;border-radius:20px;background:#fff;border:2px solid ${mediumBrandBg};" />
              </td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">${
                  advisorName || companyName
                }</p>
                <p style="margin:5px 0 0;font-size:13px;color:#64748b;">${advisorRole}</p>
              </td>
            </tr>
          </table>

          <div style="margin-top:18px;font-size:14px;line-height:1.7;color:#334155;">
            ${
              companyEmail
                ? `<div><strong>Email :</strong> ${companyEmail}</div>`
                : ""
            }
            ${
              companyPhone
                ? `<div><strong>Téléphone :</strong> ${companyPhone}</div>`
                : ""
            }
            ${
              companyWebsite
                ? `<div><strong>Site :</strong> ${companyWebsite}</div>`
                : ""
            }
            ${
              companyAddress
                ? `<div><strong>Adresse :</strong> ${companyAddress}</div>`
                : ""
            }
          </div>
        </div>

        <div style="margin:28px 0;padding:20px;border-radius:22px;background:${softBrandBg};border:1px solid ${mediumBrandBg};">
          <p style="margin:0;font-size:14px;line-height:1.75;color:#334155;">
            ${questionText}
          </p>
        </div>

        <div style="margin-top:26px;">
          <a href="mailto:${companyEmail}" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;font-size:14px;margin:0 8px 10px 0;box-shadow:0 12px 24px ${shadowBrand};">
            ${ctaText}
          </a>

          ${
            whatsappUrl
              ? `<a href="${whatsappUrl}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;font-size:14px;margin:0 8px 10px 0;">WhatsApp</a>`
              : ""
          }

          ${
            bookingUrl
              ? `<a href="${bookingUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;font-size:14px;margin:0 8px 10px 0;">Prendre RDV</a>`
              : ""
          }
        </div>

        <p style="margin:34px 0 0;font-size:14px;line-height:1.7;color:#475569;">
          À bientôt,<br />
          <strong style="color:${brandColor};">${
      advisorName || companyName
    }</strong><br />
          ${companyName}
        </p>
      </div>

      <div style="padding:22px 34px;background:${brandColor};color:rgba(255,255,255,0.78);font-size:12px;line-height:1.6;">
        <strong style="color:#ffffff;">${companyName}</strong><br />
        ${footerText}<br />
        ${companyEmail ? `${companyEmail}` : ""} ${
      companyPhone ? ` · ${companyPhone}` : ""
    }
        ${companyWebsite ? `<br />${companyWebsite}` : ""}
      </div>
    </div>
  </div>
</div>
`.trim();
  };

  const finalHtml = useMemo(
    () => generateHtml(),
    [
      companyName,
      companyTagline,
      companyEmail,
      companyPhone,
      companyWebsite,
      companyAddress,
      logoUrl,
      coverUrl,
      brandColor,
      advisorName,
      advisorRole,
      advisorPhotoUrl,
      introTitle,
      introText,
      whyText,
      questionText,
      ctaText,
      whatsappUrl,
      bookingUrl,
      footerText,
    ]
  );

  const handleSave = async () => {
    const { safeSubject, safeContent } = ensureRequiredWelcomeVars(
      subject,
      introText
    );

    setSubject(safeSubject);
    setIntroText(safeContent);

    if (!advisorName.trim()) {
      alert("Ajoute le nom du conseiller avant d’enregistrer.");
      return;
    }

    if (!companyEmail.trim()) {
      alert("Ajoute un email d’entreprise avant d’enregistrer.");
      return;
    }

    setLoading(true);

    const htmlContent = generateHtml(safeContent);

    const onboardingPayload = {
      user_id: session.user.id,
      company_name: companyName,
      company_email: companyEmail,
      company_phone: companyPhone,
      company_website: companyWebsite,
      company_address: companyAddress,
      logo_url: logoUrl,
      main_color: brandColor,
      advisor_name: advisorName,
      advisor_role: advisorRole,
      advisor_photo_url: advisorPhotoUrl,
      whatsapp_url: whatsappUrl,
      booking_url: bookingUrl,
      welcome_subject: safeSubject,
      welcome_content: safeContent,
      updated_at: new Date().toISOString(),
    };

    const { error: onboardingError } = await supabase
      .from("user_onboarding")
      .upsert(onboardingPayload, {
        onConflict: "user_id",
      });

    if (onboardingError) {
      setLoading(false);
      alert(onboardingError.message);
      return;
    }

    const templatePayload = {
      user_id: session.user.id,
      name: "Template bienvenue premium",
      type: "welcome_email",
      subject: safeSubject,
      content: htmlContent,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error: templateError } = await supabase
      .from("email_templates")
      .upsert(templatePayload, {
        onConflict: "user_id,type",
      });

    setLoading(false);

    if (templateError) {
      alert(templateError.message);
      return;
    }

    await fetchData();
    alert("Template de bienvenue enregistré ✅");
  };

  const previewSubject = replaceVars(subject);
  const previewHtml = replaceVars(finalHtml);

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-white/75 bg-white/70 p-8 text-center text-sm font-bold text-slate-500 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <Loader2 size={18} className="animate-spin" />
        Chargement du template...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.22em]"
          style={{
            backgroundColor: hexToRgba(brandColor, 0.1),
            color: brandColor,
          }}
        >
          <Mail size={14} />
          Email Welcome
        </div>

        <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
          Welcome Builder
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Crée un email de bienvenue simple, professionnel et personnalisé avec
          prénom client, signature conseiller, carte de visite et boutons
          d’action.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <BuilderCard
            icon={<Mail size={17} />}
            title="Sujet & message"
            brandColor={brandColor}
          >
            <Input
              placeholder="Sujet de l’email"
              value={subject}
              onChange={setSubject}
            />

            <div
              className="mt-4 rounded-2xl border border-dashed px-4 py-3 text-xs font-bold text-slate-500"
              style={{
                borderColor: hexToRgba(brandColor, 0.24),
                backgroundColor: hexToRgba(brandColor, 0.08),
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span>Variables obligatoires :</span>

                {["{{first_name}}", "{{advisor_name}}"].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="rounded-full border bg-white px-3 py-1 font-black transition hover:opacity-80"
                    style={{
                      color: brandColor,
                      borderColor: hexToRgba(brandColor, 0.18),
                    }}
                  >
                    {variable}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <StatusPill
                  valid={hasFirstNameInSubject}
                  label="Prénom dans le sujet"
                />
                <StatusPill
                  valid={hasFirstNameInContent}
                  label="Prénom dans le message"
                />
                <StatusPill
                  valid={hasAdvisorNameInContent}
                  label="Signature conseiller"
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Ces variables sont protégées : MyPX les remettra automatiquement
                si elles sont supprimées avant l’enregistrement.
              </p>
            </div>

            <Input
              placeholder="Titre principal"
              value={introTitle}
              onChange={setIntroTitle}
              className="mt-4"
            />

            <Textarea
              value={introText}
              onChange={setIntroText}
              placeholder="Texte principal"
              className="min-h-[220px]"
            />

            <Textarea
              value={whyText}
              onChange={setWhyText}
              placeholder="Pourquoi le client reçoit ce mail"
              className="min-h-[110px]"
            />

            <Textarea
              value={questionText}
              onChange={setQuestionText}
              placeholder="Question ou phrase d’engagement"
              className="min-h-[100px]"
            />
          </BuilderCard>

          <BuilderCard
            icon={<UserRound size={17} />}
            title="Signature humaine"
            brandColor={brandColor}
          >
            <Input
              placeholder="Nom du conseiller"
              value={advisorName}
              onChange={setAdvisorName}
            />

            <Input
              placeholder="Rôle / expertise"
              value={advisorRole}
              onChange={setAdvisorRole}
              className="mt-3"
            />

            <div className="mt-3">
              <p className="mb-2 text-sm font-black text-slate-600">
                Photo du conseiller
              </p>
              <LogoUpload
                userId={session.user.id}
                value={advisorPhotoUrl}
                onChange={setAdvisorPhotoUrl}
              />
            </div>
          </BuilderCard>

          <BuilderCard
            icon={<Building2 size={17} />}
            title="Carte entreprise"
            brandColor={brandColor}
          >
            <div className="grid grid-cols-1 gap-3">
              <Input
                value={companyName}
                onChange={setCompanyName}
                placeholder="Nom entreprise"
              />
              <Input
                value={companyTagline}
                onChange={setCompanyTagline}
                placeholder="Phrase de présentation"
              />
              <Input
                value={companyEmail}
                onChange={setCompanyEmail}
                placeholder="Email"
              />
              <Input
                value={companyPhone}
                onChange={setCompanyPhone}
                placeholder="Téléphone"
              />
              <Input
                value={companyWebsite}
                onChange={setCompanyWebsite}
                placeholder="Site web"
              />
              <Input
                value={companyAddress}
                onChange={setCompanyAddress}
                placeholder="Adresse"
              />
            </div>
          </BuilderCard>

          <BuilderCard
            icon={<MousePointerClick size={17} />}
            title="Boutons d’action"
            brandColor={brandColor}
          >
            <Input
              value={ctaText}
              onChange={setCtaText}
              placeholder="Texte du bouton email"
            />

            <div className="mt-3 flex items-center gap-2">
              <MessageCircle size={16} className="text-slate-400" />
              <Input
                value={whatsappUrl}
                onChange={setWhatsappUrl}
                placeholder="Lien WhatsApp, ex: +41797896193"
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <Input
                value={bookingUrl}
                onChange={setBookingUrl}
                placeholder="Lien RDV / Calendly / agenda"
              />
            </div>
          </BuilderCard>

          <BuilderCard
            icon={<Image size={17} />}
            title="Visuels"
            brandColor={brandColor}
          >
            <p className="mb-2 text-sm font-black text-slate-600">
              Logo / photo entreprise
            </p>
            <LogoUpload
              userId={session.user.id}
              value={logoUrl}
              onChange={setLogoUrl}
            />

            <Input
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="URL image de couverture"
              className="mt-3"
            />

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Palette size={16} className="text-slate-400" />
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setMainColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-xl border border-slate-200 bg-transparent"
              />
              <div>
                <span className="block text-sm font-bold text-slate-500">
                  Couleur principale
                </span>
                <span
                  className="text-xs font-black"
                  style={{ color: brandColor }}
                >
                  {brandColor}
                </span>
              </div>
            </div>
          </BuilderCard>

          <BuilderCard
            icon={<Sparkles size={17} />}
            title="Pied de page"
            brandColor={brandColor}
          >
            <Textarea
              value={footerText}
              onChange={setFooterText}
              placeholder="Texte pied de page"
              className="min-h-[90px]"
            />

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 18px 35px ${hexToRgba(brandColor, 0.25)}`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Enregistrer le template Welcome
                </>
              )}
            </button>
          </BuilderCard>
        </div>

        <div className="sticky top-6 h-fit space-y-4">
          <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: brandColor }} />
              <p className="text-sm font-black text-slate-950">Aperçu email</p>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Sujet
              </p>
              <p className="mt-2 text-base font-black text-slate-950">
                {previewSubject}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-inner">
              <iframe
                title="Aperçu email"
                srcDoc={previewHtml}
                className="h-[720px] w-full bg-white"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} style={{ color: brandColor }} />
              <p className="text-sm font-black text-slate-950">
                Configuration simplifiée
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {[
                "Email simple et personnalisé avec prénom client",
                "Signature conseiller obligatoire",
                "Carte de visite professionnelle intégrée",
                "Boutons email, WhatsApp et RDV",
                "Identité visuelle cohérente avec ton activité",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuilderCard({
  icon,
  title,
  children,
  brandColor,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  brandColor: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
      <div className="flex items-center gap-2">
        <span style={{ color: brandColor }}>{icon}</span>
        <h3 className="font-black text-slate-950">{title}</h3>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ valid, label }: { valid: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
        valid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          valid ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      {label}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 ${className}`}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 ${className}`}
    />
  );
}
