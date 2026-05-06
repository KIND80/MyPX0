import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Image,
  Loader2,
  Mail,
  MessageCircle,
  MousePointerClick,
  Palette,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
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
  "Bonjour {{first_name}},\n\nRavi de vous compter désormais dans mon portefeuille client.\n\nMon objectif est simple : vous accompagner dans la durée avec des conseils clairs, utiles et adaptés à votre situation.\n\nJe peux vous aider notamment sur les assurances, la prévoyance, la fiscalité, ainsi que sur toute autre question importante pour votre situation.\n\nN’hésitez pas à me solliciter à tout moment si vous avez une question ou un besoin particulier.\n\nÀ très bientôt,\n{{advisor_name}}";

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

  return { safeSubject, safeContent };
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

function normalizeWhatsappNumber(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function buildWhatsappLink(value: string) {
  const clean = normalizeWhatsappNumber(value);
  if (!clean) return "";

  const international = clean.startsWith("+")
    ? clean.replace("+", "")
    : clean.startsWith("00")
    ? clean.slice(2)
    : clean;

  return `https://wa.me/${international}`;
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
    "Bienvenue dans mon portefeuille client"
  );
  const [introText, setIntroText] = useState(defaultIntroText);

  const [whyText, setWhyText] = useState(
    "Vous recevez ce message car vous avez été ajouté à mon portefeuille client à la suite d’un échange, d’une demande d’information ou d’une opportunité identifiée."
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
    if (onboarding.company_website) setCompanyWebsite(onboarding.company_website);
    if (onboarding.company_address) setCompanyAddress(onboarding.company_address);
    if (onboarding.logo_url) setLogoUrl(onboarding.logo_url);
    if (onboarding.main_color) setMainColor(normalizeColor(onboarding.main_color));
    if (onboarding.advisor_name) setAdvisorName(onboarding.advisor_name);
    if (onboarding.advisor_role) setAdvisorRole(onboarding.advisor_role);
    if (onboarding.advisor_photo_url) setAdvisorPhotoUrl(onboarding.advisor_photo_url);
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
    const mediumBrandBg = hexToRgba(brandColor, 0.16);
    const shadowBrand = hexToRgba(brandColor, 0.22);
    const whatsappLink = buildWhatsappLink(whatsappUrl);

    return `
<div style="margin:0;padding:0;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:760px;margin:0 auto;padding:30px 14px;">
    <div style="background:#ffffff;border-radius:34px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 28px 80px rgba(15,23,42,0.18);">

      <div style="background:${brandColor};background-image:linear-gradient(135deg,${brandColor} 0%,rgba(15,23,42,0.92) 100%),url('${safeCover}');background-size:cover;background-position:center;padding:34px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <img src="${safeLogo}" alt="${companyName}" style="width:78px;height:78px;object-fit:cover;border-radius:26px;border:2px solid rgba(255,255,255,0.9);background:#ffffff;box-shadow:0 14px 32px rgba(0,0,0,0.24);" />
            </td>
            <td align="right" style="vertical-align:top;">
              <span style="display:inline-block;border:1px solid rgba(255,255,255,0.28);background:rgba(255,255,255,0.14);color:#ffffff;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:800;">
                Message personnel
              </span>
            </td>
          </tr>
        </table>

        <h1 style="margin:28px 0 0;font-size:34px;line-height:1.15;color:#ffffff;font-weight:900;letter-spacing:-0.04em;">
          ${introTitle}
        </h1>

        <p style="margin:12px 0 0;color:rgba(255,255,255,0.86);font-size:15px;line-height:1.7;max-width:540px;">
          ${companyTagline}
        </p>
      </div>

      <div style="padding:36px;">
        <div style="font-size:15px;line-height:1.9;color:#334155;white-space:pre-line;">
${customIntroText}
        </div>

        <div style="margin:30px 0;padding:22px;border-radius:26px;background:${softBrandBg};border:1px solid ${mediumBrandBg};">
          <p style="margin:0 0 9px;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:${brandColor};font-weight:900;">
            Pourquoi vous recevez ce mail
          </p>
          <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
            ${whyText}
          </p>
        </div>

        <div style="margin:30px 0;padding:24px;border-radius:28px;background:#ffffff;border:1px solid ${mediumBrandBg};box-shadow:0 16px 35px ${shadowBrand};">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;width:84px;">
                <img src="${safeAdvisorPhoto}" alt="${advisorName}" style="width:70px;height:70px;object-fit:cover;border-radius:24px;background:#fff;border:2px solid ${mediumBrandBg};" />
              </td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:19px;font-weight:900;color:#0f172a;">${
                  advisorName || companyName
                }</p>
                <p style="margin:6px 0 0;font-size:13px;color:#64748b;">${advisorRole}</p>
              </td>
            </tr>
          </table>

          <div style="margin-top:20px;font-size:14px;line-height:1.8;color:#334155;">
            ${companyEmail ? `<div><strong>Email :</strong> ${companyEmail}</div>` : ""}
            ${companyPhone ? `<div><strong>Téléphone :</strong> ${companyPhone}</div>` : ""}
            ${companyWebsite ? `<div><strong>Site :</strong> ${companyWebsite}</div>` : ""}
            ${companyAddress ? `<div><strong>Adresse :</strong> ${companyAddress}</div>` : ""}
          </div>
        </div>

        <div style="margin:28px 0;padding:22px;border-radius:26px;background:#f8fafc;border:1px solid #e2e8f0;">
          <p style="margin:0;font-size:15px;line-height:1.8;color:#334155;">
            ${questionText}
          </p>
        </div>

        <div style="margin-top:28px;">
          <a href="mailto:${companyEmail}" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:999px;font-weight:900;font-size:14px;margin:0 8px 10px 0;box-shadow:0 14px 26px ${shadowBrand};">
            ${ctaText}
          </a>

          ${
            whatsappLink
              ? `<a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:999px;font-weight:900;font-size:14px;margin:0 8px 10px 0;">WhatsApp</a>`
              : ""
          }

          ${
            bookingUrl
              ? `<a href="${bookingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:999px;font-weight:900;font-size:14px;margin:0 8px 10px 0;">Prendre RDV</a>`
              : ""
          }
        </div>

        <p style="margin:36px 0 0;font-size:14px;line-height:1.7;color:#475569;">
          À bientôt,<br />
          <strong style="color:${brandColor};">${advisorName || companyName}</strong><br />
          ${companyName}
        </p>
      </div>

      <div style="padding:24px 36px;background:#0f172a;color:rgba(255,255,255,0.72);font-size:12px;line-height:1.7;">
        <strong style="color:#ffffff;">${companyName}</strong><br />
        ${footerText}<br />
        ${companyEmail ? `${companyEmail}` : ""}${companyPhone ? ` · ${companyPhone}` : ""}
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
    const { safeSubject, safeContent } = ensureRequiredWelcomeVars(subject, introText);

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

    const safeWhatsappNumber = normalizeWhatsappNumber(whatsappUrl);
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
      whatsapp_url: safeWhatsappNumber,
      booking_url: bookingUrl,
      welcome_subject: safeSubject,
      welcome_content: safeContent,
      updated_at: new Date().toISOString(),
    };

    const { error: onboardingError } = await supabase
      .from("user_onboarding")
      .upsert(onboardingPayload, { onConflict: "user_id" });

    if (onboardingError) {
      setLoading(false);
      alert(onboardingError.message);
      return;
    }

    setWhatsappUrl(safeWhatsappNumber);

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
      .upsert(templatePayload, { onConflict: "user_id,type" });

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
      <div className="flex min-h-[340px] items-center justify-center rounded-[2rem] border border-white/70 bg-white/75 p-8 text-center shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div>
          <Loader2 className="mx-auto animate-spin text-violet-600" size={26} />
          <p className="mt-4 text-sm font-black text-slate-600">
            Chargement du Welcome Builder...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-10">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-72 rounded-[3rem] opacity-20 blur-3xl"
        style={{ backgroundColor: brandColor }}
      />

      <div className="overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-violet-100/70 backdrop-blur-2xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
              style={{
                backgroundColor: hexToRgba(brandColor, 0.1),
                color: brandColor,
              }}
            >
              <Wand2 size={14} />
              Email Welcome Premium
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Welcome Builder
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Crée un email de bienvenue professionnel, chaleureux et vendeur,
              avec identité visuelle, signature conseiller, WhatsApp, RDV et
              aperçu en direct.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <BuilderCard icon={<Mail size={17} />} title="1. Message principal" brandColor={brandColor}>
            <Input value={subject} onChange={setSubject} placeholder="Sujet de l’email" />

            <div
              className="mt-4 rounded-3xl border border-dashed p-4"
              style={{
                borderColor: hexToRgba(brandColor, 0.24),
                backgroundColor: hexToRgba(brandColor, 0.07),
              }}
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Variables protégées
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {["{{first_name}}", "{{advisor_name}}"].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="rounded-full border bg-white px-3 py-2 text-xs font-black transition hover:-translate-y-0.5"
                    style={{
                      color: brandColor,
                      borderColor: hexToRgba(brandColor, 0.2),
                    }}
                  >
                    {variable}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <StatusPill valid={hasFirstNameInSubject} label="Sujet prénom" />
                <StatusPill valid={hasFirstNameInContent} label="Message prénom" />
                <StatusPill valid={hasAdvisorNameInContent} label="Signature" />
              </div>
            </div>

            <Input
              value={introTitle}
              onChange={setIntroTitle}
              placeholder="Titre principal"
              className="mt-4"
            />

            <Textarea
              value={introText}
              onChange={setIntroText}
              placeholder="Message principal"
              className="min-h-[260px]"
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
              placeholder="Phrase d’engagement"
              className="min-h-[100px]"
            />
          </BuilderCard>

          <BuilderCard icon={<UserRound size={17} />} title="2. Signature conseiller" brandColor={brandColor}>
            <Input value={advisorName} onChange={setAdvisorName} placeholder="Nom du conseiller" />
            <Input
              value={advisorRole}
              onChange={setAdvisorRole}
              placeholder="Rôle / expertise"
              className="mt-3"
            />

            <div className="mt-4">
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

          <BuilderCard icon={<Building2 size={17} />} title="3. Entreprise" brandColor={brandColor}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input value={companyName} onChange={setCompanyName} placeholder="Nom entreprise" />
              <Input value={companyTagline} onChange={setCompanyTagline} placeholder="Phrase courte" />
              <Input value={companyEmail} onChange={setCompanyEmail} placeholder="Email" />
              <Input value={companyPhone} onChange={setCompanyPhone} placeholder="Téléphone" />
              <Input value={companyWebsite} onChange={setCompanyWebsite} placeholder="Site web" />
              <Input value={companyAddress} onChange={setCompanyAddress} placeholder="Adresse" />
            </div>
          </BuilderCard>

          <BuilderCard icon={<MousePointerClick size={17} />} title="4. Actions" brandColor={brandColor}>
            <Input value={ctaText} onChange={setCtaText} placeholder="Texte du bouton email" />

            <div className="mt-3 grid grid-cols-1 gap-3">
              <IconInput
                icon={<MessageCircle size={16} />}
                value={whatsappUrl}
                onChange={setWhatsappUrl}
                placeholder="Numéro WhatsApp, ex: +41797896193"
              />

              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-700">
                Lien généré : {whatsappUrl ? buildWhatsappLink(whatsappUrl) : "aucun numéro"}
              </div>

              <IconInput
                icon={<Calendar size={16} />}
                value={bookingUrl}
                onChange={setBookingUrl}
                placeholder="Lien RDV / Calendly / agenda"
              />
            </div>
          </BuilderCard>

          <BuilderCard icon={<Image size={17} />} title="5. Design & visuels" brandColor={brandColor}>
            <p className="mb-2 text-sm font-black text-slate-600">Logo entreprise</p>
            <LogoUpload userId={session.user.id} value={logoUrl} onChange={setLogoUrl} />

            <Input
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="URL image de couverture"
              className="mt-3"
            />

            <div className="mt-4 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <Palette size={17} className="text-slate-400" />
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setMainColor(e.target.value)}
                className="h-11 w-16 cursor-pointer rounded-2xl border border-slate-200 bg-transparent"
              />
              <div>
                <span className="block text-sm font-black text-slate-600">
                  Couleur principale
                </span>
                <span className="text-xs font-black" style={{ color: brandColor }}>
                  {brandColor}
                </span>
              </div>
            </div>
          </BuilderCard>

          <BuilderCard icon={<Sparkles size={17} />} title="6. Pied de page" brandColor={brandColor}>
            <Textarea
              value={footerText}
              onChange={setFooterText}
              placeholder="Texte pied de page"
              className="min-h-[90px]"
            />
          </BuilderCard>
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:h-fit">
          <div className="rounded-[2.5rem] border border-white/70 bg-white/80 p-4 shadow-2xl shadow-violet-100/70 backdrop-blur-2xl sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={17} style={{ color: brandColor }} />
                <p className="text-sm font-black text-slate-950">Aperçu en direct</p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                Desktop / mobile friendly
              </span>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Sujet
              </p>
              <p className="mt-2 text-base font-black text-slate-950">
                {previewSubject}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-inner">
              <iframe
                title="Aperçu email"
                srcDoc={previewHtml}
                className="h-[760px] w-full bg-white"
              />
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} style={{ color: brandColor }} />
              <p className="text-sm font-black text-slate-950">
                Ce template contient
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {[
                "Prénom client automatique",
                "Signature conseiller obligatoire",
                "Carte de contact premium",
                "Boutons email, WhatsApp et RDV",
                "Design email compatible et responsive",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm"
                >
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
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
      <span className={`h-2 w-2 rounded-full ${valid ? "bg-emerald-500" : "bg-rose-500"}`} />
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

function IconInput({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
      <span className="text-slate-400">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
      />
    </div>
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