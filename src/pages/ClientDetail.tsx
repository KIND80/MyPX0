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
    body: { to, subject, html, user_id, user_name, user_email },
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

    const [{ data: emailLogs }, { data: inboundEmails }, { data: notes }, { data: followUps }] =
      await Promise.all([
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
        title: item.subject || "Email envoyé",
        content: item.content || "",
        created_at: item.created_at,
      })) || [];

    const inboundItems: TimelineItem[] =
      inboundEmails?.map((item) => ({
        id: item.id,
        type: "email_received",
        title: item.subject || "Email reçu",
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
        title: "Note",
        content: item.note,
        created_at: item.created_at,
      })) || [];

    const followUpItems: TimelineItem[] =
      followUps?.map((item) => ({
        id: item.id,
        type: "follow_up",
        title: item.title || "Relance",
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
      title: "Relance client",
      note: "Relance créée depuis la fiche client.",
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
      alert("Choisis une date de relance.");
      return;
    }

    if (!followUpTitle.trim()) {
      alert("Ajoute un titre de relance.");
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

      alert("Erreur pendant l’analyse IA.");
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
          "Reprendre contact avec une approche personnalisée",
        reason:
          data?.reason ||
          client.ai_summary ||
          "L’IA utilise les informations disponibles dans la fiche client pour proposer un angle de conversation.",
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
        angle: "Relance personnalisée basée sur la fiche client",
        reason:
          "La fonction IA externe n’est pas encore disponible, donc MyPX propose une opportunité locale à partir des données déjà présentes.",
        message: `Bonjour ${
          client.first_name || ""
        },\n\nJe me permets de revenir vers vous car votre profil semble présenter une opportunité intéressante à explorer.\n\nL’idée serait simplement d’échanger quelques minutes pour voir si je peux vous apporter une solution utile selon votre situation actuelle.\n\nSeriez-vous disponible cette semaine ?`,
      });
    }

    setFindingOpportunity(false);
  };

  const sendManualEmail = async () => {
    if (!client?.email) {
      alert("Ce client n’a pas d’adresse email.");
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
      alert("Email non envoyé. Vérifie la Edge Function send-email.");
    }

    setSendingEmail(false);
    fetchClientDetail();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-[2rem] border border-white/75 bg-white/70 p-6 text-sm font-bold text-slate-500 shadow-xl backdrop-blur-2xl">
        <Loader2 size={18} className="animate-spin" />
        Chargement de la fiche client...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-6 text-sm font-bold text-slate-500 shadow-xl backdrop-blur-2xl">
        Client introuvable.
      </div>
    );
  }

  const fullName =
    [client.first_name, client.last_name].filter(Boolean).join(" ") || "Client";

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
      >
        <ArrowLeft size={16} />
        Retour clients
      </button>

      {/* GARDE TOUT TON JSX EXISTANT ICI JUSQU’À LA TIMELINE */}

      <section className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-violet-700" />
          <h3 className="text-lg font-black text-slate-950">Timeline client</h3>
        </div>

        <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {timeline.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
              Aucun historique pour ce client.
            </div>
          ) : (
            timeline.map((item) => {
              const isReceived = item.type === "email_received";
              const isUnread = isReceived && item.status !== "read";

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`rounded-3xl border p-4 shadow-sm ${
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

                          {item.type === "email" && "Email envoyé"}
                          {item.type === "email_received" && "Email reçu"}
                          {item.type === "note" && "Note"}
                          {item.type === "follow_up" && "Relance"}
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
                          De : {item.from_name || item.from_email || "Client"}
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
                          Marquer comme lu
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

/* GARDE TES COMPOSANTS EXISTANTS EN DESSOUS :
ScoreCard, FieldInput, SectionHeader, InfoCard, ActionPanel
*/
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
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
  };

  return (
    <div className={`rounded-3xl px-5 py-4 ${classes[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-black">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold opacity-70">{sub}</p>
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
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          {icon}
          {eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
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
    <div className="rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      <div className="mt-3 whitespace-pre-line text-sm font-medium leading-6 text-slate-600">
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
      <div className="flex items-center gap-2">
        <span className="text-violet-700">{icon}</span>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
      {children}
    </div>
  );
}
