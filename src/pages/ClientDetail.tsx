import { useEffect, useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  Copy,
  Euro,
  Inbox,
  Lightbulb,
  Loader2,
  Mail,
  MailOpen,
  MapPin,
  Phone,
  Plus,
  Save,
  Send,
  Sparkles,
  StickyNote,
  User,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type ClientDetailProps = {
  session: Session;
  clientId: string;
  onBack: () => void;
};

type Client = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  birthday: string | null;
  group_name: string | null;
  status: string | null;
  score: number | null;
  potential_amount: number | null;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
  ai_score?: number | null;
  ai_status?: string | null;
  ai_summary?: string | null;
  next_best_action?: string | null;
  suggested_message?: string | null;
  public_enrichment_status?: string | null;
  last_ai_update?: string | null;
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
};

type TimelineItem = {
  id: string;
  type: "email" | "email_received" | "note" | "follow_up";
  title: string;
  content: string;
  created_at: string;
  status?: string | null;
  from_email?: string | null;
  from_name?: string | null;
};

type ConversationOpportunity = {
  angle: string;
  reason: string;
  message: string;
};

const calculateScore = (client: Client) => {
  let score = 0;

  if (client.email) score += 10;
  if (client.phone) score += 10;
  if (client.company) score += 10;
  if (client.city) score += 5;
  if (client.group_name) score += 10;

  const potential = Number(client.potential_amount || 0);
  if (potential > 1000) score += 20;
  if (potential > 5000) score += 40;
  if (potential > 10000) score += 60;

  if (client.status === "chaud") score += 40;
  if (client.status === "client") score += 60;
  if (client.status === "a_relancer") score += 20;

  if (client.last_contact_at) {
    const diffDays =
      (Date.now() - new Date(client.last_contact_at).getTime()) /
      (1000 * 60 * 60 * 24);

    if (diffDays < 3) score += 20;
    if (diffDays >= 7 && diffDays < 30) score += 10;
    if (diffDays >= 30) score -= 10;
  }

  return Math.max(score, 0);
};

const sendEmail = async ({
  to,
  subject,
  html,
  user_id,
  user_name,
  user_email,
}: {
  to: string;
  subject: string;
  html: string;
  user_id: string;
  user_name: string;
  user_email: string;
}) => {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      to,
      subject,
      html,
      user_id,
      sender_name: user_name,
      user_email,
    },
  });

  if (error) {
    console.error("Erreur send-email:", error);
    return { success: false, error };
  }

  return { success: true, data };
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getRelationLabel = (client: Client) => {
  const score = client.ai_score || client.score || 0;

  if (client.status === "chaud" || score >= 80) return "Signal chaud";
  if (client.status === "a_relancer") return "Attention requise";
  if (client.status === "client") return "Relation active";
  if (score >= 50) return "Potentiel latent";

  return "Relation à observer";
};

const buildEmailSignature = (onboarding: UserOnboarding | null) => {
  if (!onboarding) return "";

  const advisorName = onboarding.advisor_name?.trim();
  const advisorRole = onboarding.advisor_role?.trim();
  const companyName = onboarding.company_name?.trim();
  const companyPhone = onboarding.company_phone?.trim();
  const companyEmail = onboarding.company_email?.trim();
  const companyWebsite = onboarding.company_website?.trim();
  const companyAddress = onboarding.company_address?.trim();
  const whatsappUrl = onboarding.whatsapp_url?.trim();
  const bookingUrl = onboarding.booking_url?.trim();
  const logoUrl = onboarding.logo_url?.trim();
  const advisorPhotoUrl = onboarding.advisor_photo_url?.trim();
  const mainColor = onboarding.main_color?.trim() || "#7c3aed";

  if (
    !advisorName &&
    !companyName &&
    !companyPhone &&
    !companyEmail &&
    !companyWebsite &&
    !whatsappUrl &&
    !bookingUrl
  ) {
    return "";
  }

  return `
    <br /><br />
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:20px;font-family:Arial,sans-serif;color:#111827;">
      <div style="display:flex;gap:14px;align-items:flex-start;">
        ${
          advisorPhotoUrl
            ? `<img src="${escapeHtml(
                advisorPhotoUrl
              )}" alt="Photo conseiller" style="width:54px;height:54px;border-radius:14px;object-fit:cover;" />`
            : ""
        }
        <div>
          ${
            advisorName
              ? `<div style="font-size:15px;font-weight:700;">${escapeHtml(
                  advisorName
                )}</div>`
              : ""
          }
          ${
            advisorRole
              ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">${escapeHtml(
                  advisorRole
                )}</div>`
              : ""
          }
          ${
            companyName
              ? `<div style="font-size:13px;font-weight:600;margin-top:6px;">${escapeHtml(
                  companyName
                )}</div>`
              : ""
          }
          ${
            companyAddress
              ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(
                  companyAddress
                )}</div>`
              : ""
          }
          <div style="font-size:12px;color:#6b7280;margin-top:8px;line-height:1.6;">
            ${companyPhone ? `📞 ${escapeHtml(companyPhone)}<br />` : ""}
            ${companyEmail ? `✉️ ${escapeHtml(companyEmail)}<br />` : ""}
            ${
              companyWebsite
                ? `🌐 <a href="${escapeHtml(
                    companyWebsite
                  )}" style="color:${escapeHtml(mainColor)};">${escapeHtml(
                    companyWebsite
                  )}</a><br />`
                : ""
            }
          </div>
          <div style="margin-top:10px;">
            ${
              whatsappUrl
                ? `<a href="${escapeHtml(
                    whatsappUrl
                  )}" style="display:inline-block;margin-right:8px;background:#22c55e;color:#fff;text-decoration:none;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;">WhatsApp</a>`
                : ""
            }
            ${
              bookingUrl
                ? `<a href="${escapeHtml(
                    bookingUrl
                  )}" style="display:inline-block;background:${escapeHtml(
                    mainColor
                  )};color:#fff;text-decoration:none;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;">Prendre RDV</a>`
                : ""
            }
          </div>
        </div>
        ${
          logoUrl
            ? `<div style="margin-left:auto;"><img src="${escapeHtml(
                logoUrl
              )}" alt="Logo" style="max-width:90px;max-height:50px;object-fit:contain;" /></div>`
            : ""
        }
      </div>
    </div>
  `;
};

export default function ClientDetail({
  session,
  clientId,
  onBack,
}: ClientDetailProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [onboarding, setOnboarding] = useState<UserOnboarding | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingClient, setSavingClient] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [enrichingAI, setEnrichingAI] = useState(false);
  const [findingOpportunity, setFindingOpportunity] = useState(false);
  const [conversationOpportunity, setConversationOpportunity] =
    useState<ConversationOpportunity | null>(null);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const fetchClientDetail = async () => {
    setLoading(true);

    const { data: onboardingData } = await supabase
      .from("user_onboarding")
      .select(
        "company_name, company_email, company_phone, company_website, company_address, logo_url, main_color, advisor_name, advisor_role, advisor_photo_url, whatsapp_url, booking_url"
      )
      .eq("user_id", session.user.id)
      .maybeSingle();

    setOnboarding((onboardingData as UserOnboarding) || null);

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("user_id", session.user.id)
      .single();

    if (clientError) {
      alert(clientError.message);
      setLoading(false);
      return;
    }

    const enrichedClient = {
      ...(clientData as Client),
      score: calculateScore(clientData as Client),
    };

    const [
      { data: emailLogs },
      { data: inboundEmails },
      { data: notes },
      { data: followUps },
    ] = await Promise.all([
      supabase
        .from("email_logs")
        .select("*")
        .eq("client_id", clientId)
        .eq("user_id", session.user.id),

      supabase
        .from("inbound_emails")
        .select("*")
        .eq("client_id", clientId)
        .eq("user_id", session.user.id),

      supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .eq("user_id", session.user.id),

      supabase
        .from("follow_ups")
        .select("*")
        .eq("client_id", clientId)
        .eq("user_id", session.user.id),
    ]);

    const emailItems: TimelineItem[] =
      emailLogs?.map((item) => ({
        id: item.id,
        type: "email",
        title: item.subject || "Transmission envoyée",
        content: item.content || "",
        created_at: item.created_at,
      })) || [];

    const inboundItems: TimelineItem[] =
      inboundEmails?.map((item) => ({
        id: item.id,
        type: "email_received",
        title: item.subject || "Transmission reçue",
        content: item.text_content || item.html_content || "",
        created_at: item.created_at,
        status: item.status,
        from_email: item.from_email,
        from_name: item.from_name,
      })) || [];

    const noteItems: TimelineItem[] =
      notes?.map((item) => ({
        id: item.id,
        type: "note",
        title: "Renseignement ajouté",
        content: item.note,
        created_at: item.created_at,
      })) || [];

    const followUpItems: TimelineItem[] =
      followUps?.map((item) => ({
        id: item.id,
        type: "follow_up",
        title: item.title || "Action prioritaire",
        content: item.note || item.status || "",
        created_at: item.created_at,
      })) || [];

    setClient(enrichedClient);

    setTimeline(
      [...emailItems, ...inboundItems, ...noteItems, ...followUpItems].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchClientDetail();
  }, [clientId]);

  const markInboundEmailAsRead = async (emailId: string) => {
    const { error } = await supabase
      .from("inbound_emails")
      .update({ status: "read" })
      .eq("id", emailId)
      .eq("user_id", session.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setTimeline((prev) =>
      prev.map((item) =>
        item.id === emailId && item.type === "email_received"
          ? { ...item, status: "read" }
          : item
      )
    );
  };

  const updateClientField = (field: keyof Client, value: string) => {
    if (!client) return;

    const updatedClient = {
      ...client,
      [field]:
        field === "potential_amount"
          ? value === ""
            ? null
            : Number(value)
          : value,
    };

    setClient({
      ...updatedClient,
      score: calculateScore(updatedClient),
    });
  };

  const saveClient = async () => {
    if (!client) return;

    setSavingClient(true);

    const newScore = calculateScore(client);

    const { error } = await supabase
      .from("clients")
      .update({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        city: client.city,
        birthday: client.birthday,
        group_name: client.group_name,
        status: client.status,
        potential_amount: client.potential_amount,
        notes: client.notes,
        score: newScore,
        last_contact_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .eq("user_id", session.user.id);

    setSavingClient(false);

    if (error) {
      alert(error.message);
      return;
    }

    fetchClientDetail();
  };

  const addNote = async () => {
    if (!note.trim()) return;

    const nowIso = new Date().toISOString();

    const { error } = await supabase.from("client_notes").insert({
      user_id: session.user.id,
      client_id: clientId,
      note,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("clients")
      .update({ last_contact_at: nowIso })
      .eq("id", clientId)
      .eq("user_id", session.user.id);

    setNote("");
    fetchClientDetail();
  };

  const createQuickFollowUp = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { error } = await supabase.from("follow_ups").insert({
      user_id: session.user.id,
      client_id: clientId,
      title: "Action prioritaire",
      note: "Action créée depuis le dossier relationnel.",
      due_date: tomorrow.toISOString(),
      priority: "normal",
      status: "pending",
    });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("clients")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", clientId)
      .eq("user_id", session.user.id);

    fetchClientDetail();
  };

  const createCustomFollowUp = async () => {
    if (!followUpDate) {
      alert("Choisis une date d’action.");
      return;
    }

    if (!followUpTitle.trim()) {
      alert("Ajoute un titre d’action.");
      return;
    }

    setSavingFollowUp(true);

    const { error } = await supabase.from("follow_ups").insert({
      user_id: session.user.id,
      client_id: clientId,
      title: followUpTitle,
      note: followUpNote || null,
      due_date: followUpDate,
      priority: "normal",
      status: "pending",
    });

    setSavingFollowUp(false);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("clients")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", clientId)
      .eq("user_id", session.user.id);

    setFollowUpDate("");
    setFollowUpTitle("");
    setFollowUpNote("");

    fetchClientDetail();
  };

  const enrichClientWithAI = async () => {
    if (!client) return;

    setEnrichingAI(true);

    try {
      await supabase
        .from("clients")
        .update({
          public_enrichment_status: "processing",
        })
        .eq("id", client.id)
        .eq("user_id", session.user.id);

      const { data, error } = await supabase.functions.invoke("enrich-client", {
        body: {
          client_id: client.id,
          user_id: session.user.id,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          phone: client.phone,
          company: client.company,
          city: client.city,
          notes: client.notes,
        },
      });

      if (error) throw error;

      await supabase
        .from("clients")
        .update({
          ai_score: data?.ai_score ?? client.ai_score ?? 0,
          ai_status: data?.ai_status ?? "enrichi",
          ai_summary: data?.ai_summary ?? data?.summary ?? client.ai_summary,
          next_best_action: data?.next_best_action ?? client.next_best_action,
          suggested_message:
            data?.suggested_message ?? client.suggested_message,
          public_enrichment_status: "completed",
          last_ai_update: new Date().toISOString(),
        })
        .eq("id", client.id)
        .eq("user_id", session.user.id);

      await fetchClientDetail();
    } catch (error) {
      console.error("Erreur enrich-client:", error);

      await supabase
        .from("clients")
        .update({
          public_enrichment_status: "failed",
        })
        .eq("id", client.id)
        .eq("user_id", session.user.id);

      alert("PX Sentinel n’a pas pu terminer l’analyse.");
    } finally {
      setEnrichingAI(false);
    }
  };

  const findConversationOpportunity = async () => {
    if (!client) return;

    setFindingOpportunity(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "conversation-opportunity",
        {
          body: {
            client_id: client.id,
            user_id: session.user.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            city: client.city,
            group_name: client.group_name,
            status: client.status,
            notes: client.notes,
            ai_summary: client.ai_summary,
            next_best_action: client.next_best_action,
            timeline: timeline.slice(0, 8),
          },
        }
      );

      if (error) throw error;

      const opportunity: ConversationOpportunity = {
        angle:
          data?.angle ||
          client.next_best_action ||
          "Approche relationnelle personnalisée",
        reason:
          data?.reason ||
          client.ai_summary ||
          "PX Sentinel utilise les renseignements disponibles dans ce dossier pour proposer le meilleur angle d’approche.",
        message:
          data?.message ||
          client.suggested_message ||
          `Bonjour ${
            client.first_name || ""
          },\n\nJe me permets de revenir vers vous afin d’échanger sur votre situation actuelle et voir s’il existe une opportunité intéressante à construire ensemble.\n\nSeriez-vous disponible prochainement pour un court échange ?`,
      };

      setConversationOpportunity(opportunity);
    } catch (error) {
      console.error("Erreur conversation-opportunity:", error);

      setConversationOpportunity({
        angle: "Approche personnalisée basée sur le dossier",
        reason:
          "PX Sentinel utilise les données déjà présentes dans le dossier pour proposer une action locale.",
        message: `Bonjour ${
          client.first_name || ""
        },\n\nJe me permets de revenir vers vous car votre profil semble présenter une opportunité intéressante à explorer.\n\nL’idée serait simplement d’échanger quelques minutes pour voir si je peux vous apporter une solution utile selon votre situation actuelle.\n\nSeriez-vous disponible cette semaine ?`,
      });
    }

    setFindingOpportunity(false);
  };

  const sendManualEmail = async () => {
    if (!client?.email) {
      alert("Ce dossier n’a pas d’adresse email.");
      return;
    }

    if (!emailSubject.trim() || !emailContent.trim()) {
      alert("Ajoute un sujet et un message.");
      return;
    }

    setSendingEmail(true);

    const signatureHtml = buildEmailSignature(onboarding);
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111827;">
        ${escapeHtml(emailContent).replace(/\n/g, "<br />")}
        ${signatureHtml}
      </div>
    `;

    const userName =
      onboarding?.advisor_name ||
      session.user.user_metadata?.full_name ||
      session.user.email ||
      "Utilisateur MyPX";

    const userEmail =
      onboarding?.company_email || session.user.email || "contact@mypx.ch";

    const result = await sendEmail({
      to: client.email,
      subject: emailSubject,
      html,
      user_id: session.user.id,
      user_name: userName,
      user_email: userEmail,
    });

    await supabase.from("email_logs").insert({
      user_id: session.user.id,
      client_id: client.id,
      template_type: "manual_email",
      subject: emailSubject,
      content: `${emailContent}\n\n--- Signature automatique MyPX ---`,
      recipient_email: client.email,
      status: result.success ? "sent" : "failed",
    });

    if (result.success) {
      await supabase
        .from("clients")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", client.id)
        .eq("user_id", session.user.id);

      setEmailSubject("");
      setEmailContent("");
    } else {
      alert("Transmission non envoyée. Vérifie la Edge Function send-email.");
    }

    setSendingEmail(false);
    fetchClientDetail();
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.25),transparent_35%)]" />
        <div className="relative flex items-center gap-3 text-sm font-black">
          <Loader2 size={18} className="animate-spin text-violet-300" />
          PX Sentinel ouvre le dossier relationnel...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-6 text-sm font-bold text-slate-500 shadow-xl backdrop-blur-2xl">
        Dossier introuvable.
      </div>
    );
  }

  const fullName =
    [client.first_name, client.last_name].filter(Boolean).join(" ") || "Client";

  const relationLabel = getRelationLabel(client);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
      >
        <ArrowLeft size={16} />
        Retour aux dossiers
      </button>

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-950/30 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.40),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.25),transparent_34%)]" />
        <div className="absolute right-6 top-6 h-32 w-32 rounded-full border border-violet-400/20 bg-violet-500/10 blur-sm" />

        <div className="relative">
          <SectionHeader
            icon={<User size={16} />}
            eyebrow="Dossier relationnel"
            title={fullName}
            description={`PX Sentinel surveille ce dossier. Statut actuel : ${relationLabel}.`}
            action={
              <button
                onClick={saveClient}
                disabled={savingClient}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {savingClient ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Sauvegarder le dossier
              </button>
            }
            dark
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ScoreCard
              icon={<Sparkles size={16} />}
              label="Température relationnelle"
              value={client.score || 0}
              sub="Score commercial calculé"
              tone="emerald"
            />
            <ScoreCard
              icon={<Bot size={16} />}
              label="Indice PX Sentinel"
              value={client.ai_score || 0}
              sub={client.ai_status || "Non analysé"}
              tone="cyan"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
        <SectionHeader
          icon={<Building2 size={16} />}
          eyebrow="Identité du dossier"
          title="Informations stratégiques"
          description="Centralise les coordonnées, le potentiel, le statut et les renseignements de base."
          action={null}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FieldInput
            icon={<User size={14} />}
            value={client.first_name || ""}
            onChange={(v) => updateClientField("first_name", v)}
            placeholder="Prénom"
          />
          <FieldInput
            icon={<User size={14} />}
            value={client.last_name || ""}
            onChange={(v) => updateClientField("last_name", v)}
            placeholder="Nom"
          />
          <FieldInput
            icon={<Mail size={14} />}
            value={client.email || ""}
            onChange={(v) => updateClientField("email", v)}
            placeholder="Email"
          />
          <FieldInput
            icon={<Phone size={14} />}
            value={client.phone || ""}
            onChange={(v) => updateClientField("phone", v)}
            placeholder="Téléphone"
          />
          <FieldInput
            icon={<Building2 size={14} />}
            value={client.company || ""}
            onChange={(v) => updateClientField("company", v)}
            placeholder="Entreprise"
          />
          <FieldInput
            icon={<MapPin size={14} />}
            value={client.city || ""}
            onChange={(v) => updateClientField("city", v)}
            placeholder="Ville"
          />
          <FieldInput
            icon={<CalendarDays size={14} />}
            value={client.birthday || ""}
            onChange={(v) => updateClientField("birthday", v)}
            placeholder="Moment relationnel"
            type="date"
          />
          <FieldInput
            icon={<Euro size={14} />}
            value={client.potential_amount?.toString() || ""}
            onChange={(v) => updateClientField("potential_amount", v)}
            placeholder="Potentiel commercial"
            type="number"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Statut relationnel
            </label>
            <select
              value={client.status || ""}
              onChange={(e) => updateClientField("status", e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none"
            >
              <option value="">Non défini</option>
              <option value="prospect">Prospect</option>
              <option value="client">Client</option>
              <option value="chaud">Signal chaud</option>
              <option value="a_relancer">Action requise</option>
            </select>
          </div>

          <FieldInput
            icon={<Inbox size={14} />}
            value={client.group_name || ""}
            onChange={(v) => updateClientField("group_name", v)}
            placeholder="Réseau / groupe"
          />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Renseignements internes
          </label>
          <textarea
            value={client.notes || ""}
            onChange={(e) => updateClientField("notes", e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            placeholder="Informations importantes, contexte, besoins, objections, habitudes relationnelles..."
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActionPanel
          icon={<StickyNote size={18} />}
          title="Ajouter un renseignement"
          description="Ajoute une information utile dans la chronologie relationnelle."
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            placeholder="Ajoute un renseignement, un échange, une précision ou un signal faible..."
          />
          <button
            onClick={addNote}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5"
          >
            <Plus size={16} />
            Ajouter au dossier
          </button>
        </ActionPanel>

        <ActionPanel
          icon={<Bell size={18} />}
          title="Programmer une action"
          description="Crée une action prioritaire pour ne pas laisser la relation refroidir."
        >
          <div className="mt-4 space-y-3">
            <button
              onClick={createQuickFollowUp}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5"
            >
              <CalendarDays size={16} />
              Action demain
            </button>

            <FieldInput
              icon={<CalendarDays size={14} />}
              value={followUpDate}
              onChange={setFollowUpDate}
              placeholder="Date d’action"
              type="datetime-local"
            />
            <FieldInput
              icon={<Bell size={14} />}
              value={followUpTitle}
              onChange={setFollowUpTitle}
              placeholder="Titre de l’action"
            />

            <textarea
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              placeholder="Contexte de l’action..."
            />

            <button
              onClick={createCustomFollowUp}
              disabled={savingFollowUp}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingFollowUp ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Créer l’action
            </button>
          </div>
        </ActionPanel>
      </div>

      <ActionPanel
        icon={<Bot size={18} />}
        title="PX Sentinel"
        description="Analyse le dossier, détecte les signaux et prépare l’approche la plus pertinente."
        dark
      >
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <button
            onClick={enrichClientWithAI}
            disabled={enrichingAI}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {enrichingAI ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Lancer l’analyse Sentinel
          </button>

          <button
            onClick={findConversationOpportunity}
            disabled={findingOpportunity}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {findingOpportunity ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Lightbulb size={16} />
            )}
            Détecter une approche
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoCard title="Analyse Sentinel">
            {client.ai_summary ||
              "Aucune analyse Sentinel disponible pour ce dossier."}
          </InfoCard>
          <InfoCard title="Action recommandée">
            {client.next_best_action ||
              "Aucune action prioritaire détectée pour le moment."}
          </InfoCard>
        </div>

        {conversationOpportunity && (
          <div className="mt-4 rounded-3xl border border-cyan-300/30 bg-cyan-400/10 p-4">
            <p className="text-sm font-black text-white">
              {conversationOpportunity.angle}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {conversationOpportunity.reason}
            </p>
            <div className="mt-3 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
              {conversationOpportunity.message}
            </div>
            <button
              onClick={() => setEmailContent(conversationOpportunity.message)}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-xs font-black text-white"
            >
              <Copy size={14} />
              Utiliser cette approche
            </button>
          </div>
        )}
      </ActionPanel>

      <ActionPanel
        icon={<Send size={18} />}
        title="Déployer une approche"
        description="Envoie une transmission personnalisée avec ta signature automatique MyPX."
      >
        <div className="mt-4 space-y-3">
          <FieldInput
            icon={<Mail size={14} />}
            value={emailSubject}
            onChange={setEmailSubject}
            placeholder="Sujet de la transmission"
          />

          <textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            rows={7}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            placeholder="Message à transmettre..."
          />

          <button
            onClick={sendManualEmail}
            disabled={sendingEmail}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {sendingEmail ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Envoyer la transmission
          </button>
        </div>
      </ActionPanel>

      <section className="rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-violet-700" />
          <h3 className="text-lg font-black text-slate-950">
            Chronologie relationnelle
          </h3>
        </div>

        <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {timeline.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
              Aucun signal enregistré pour ce dossier.
            </div>
          ) : (
            timeline.map((item) => {
              const isReceived = item.type === "email_received";
              const isUnread = isReceived && item.status !== "read";

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 ${
                    isReceived
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                            isReceived
                              ? "bg-emerald-100 text-emerald-800"
                              : item.type === "email"
                              ? "bg-blue-50 text-blue-700"
                              : item.type === "note"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isReceived && <Inbox size={12} />}
                          {item.type === "email" && <Mail size={12} />}
                          {item.type === "note" && <StickyNote size={12} />}
                          {item.type === "follow_up" && <Bell size={12} />}

                          {item.type === "email" && "Transmission envoyée"}
                          {item.type === "email_received" &&
                            "Transmission reçue"}
                          {item.type === "note" && "Renseignement"}
                          {item.type === "follow_up" && "Action"}
                        </span>

                        {isUnread && (
                          <span className="rounded-full bg-rose-500 px-2 py-1 text-[10px] font-black uppercase text-white">
                            Non lu
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm font-black text-slate-950">
                        {item.title}
                      </p>

                      {isReceived && (
                        <p className="mt-1 text-xs font-bold text-emerald-700">
                          Source :{" "}
                          {item.from_name || item.from_email || "Client"}
                        </p>
                      )}

                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {item.content || "—"}
                      </p>

                      {isUnread && (
                        <button
                          onClick={() => markInboundEmailAsRead(item.id)}
                          className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-lg shadow-slate-300"
                        >
                          <MailOpen size={14} />
                          Marquer comme traité
                        </button>
                      )}
                    </div>

                    <p className="shrink-0 text-xs font-bold text-slate-400">
                      {new Date(item.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  tone: "emerald" | "cyan";
}) {
  const classes = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  };

  return (
    <div className={`rounded-3xl border px-5 py-4 ${classes[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-black">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{sub}</p>
    </div>
  );
}

function FieldInput({
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
      <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {placeholder}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
      />
    </div>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
  action,
  dark = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  action: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p
          className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${
            dark ? "text-violet-200" : "text-slate-500"
          }`}
        >
          {icon}
          {eyebrow}
        </p>
        <h3
          className={`mt-2 text-2xl font-black ${
            dark ? "text-white" : "text-slate-950"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-2 text-sm leading-6 ${
            dark ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
        {title}
      </p>
      <div className="mt-3 whitespace-pre-line text-sm font-medium leading-6 text-slate-200">
        {children}
      </div>
    </div>
  );
}

function ActionPanel({
  icon,
  title,
  description,
  children,
  dark = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  if (dark) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-950/30 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.30),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.20),transparent_34%)]" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="text-cyan-300">{icon}</span>
            <h3 className="text-lg font-black text-white">{title}</h3>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-300">
            {description}
          </p>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
      <div className="flex items-center gap-2">
        <span className="text-violet-700">{icon}</span>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
      {children}
    </div>
  );
}
