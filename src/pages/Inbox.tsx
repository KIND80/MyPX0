import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  Inbox as InboxIcon,
  MailOpen,
  Loader2,
  ExternalLink,
  UserRound,
  Reply,
  RefreshCw,
  Send,
  X,
  Search,
  Mail,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Props = {
  session: Session;
};

type ClientLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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

type InboundEmail = {
  id: string;
  user_id: string;
  client_id: string | null;
  resend_email_id?: string | null;
  from_email: string | null;
  from_name: string | null;
  to_email?: string | null;
  subject: string | null;
  text_content: string | null;
  html_content: string | null;
  status: string | null;
  created_at: string;
  client?: ClientLite | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const stripHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");

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
      <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">
        ${
          advisorPhotoUrl
            ? `<img src="${escapeHtml(advisorPhotoUrl)}" alt="Photo conseiller" style="width:54px;height:54px;border-radius:14px;object-fit:cover;" />`
            : ""
        }
        <div style="min-width:180px;">
          ${
            advisorName
              ? `<div style="font-size:15px;font-weight:700;">${escapeHtml(advisorName)}</div>`
              : ""
          }
          ${
            advisorRole
              ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">${escapeHtml(advisorRole)}</div>`
              : ""
          }
          ${
            companyName
              ? `<div style="font-size:13px;font-weight:600;margin-top:6px;">${escapeHtml(companyName)}</div>`
              : ""
          }
          ${
            companyAddress
              ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(companyAddress)}</div>`
              : ""
          }
          <div style="font-size:12px;color:#6b7280;margin-top:8px;line-height:1.6;">
            ${companyPhone ? `📞 ${escapeHtml(companyPhone)}<br />` : ""}
            ${companyEmail ? `✉️ ${escapeHtml(companyEmail)}<br />` : ""}
            ${
              companyWebsite
                ? `🌐 <a href="${escapeHtml(companyWebsite)}" style="color:${escapeHtml(mainColor)};">${escapeHtml(companyWebsite)}</a><br />`
                : ""
            }
          </div>
          <div style="margin-top:10px;">
            ${
              whatsappUrl
                ? `<a href="${escapeHtml(whatsappUrl)}" style="display:inline-block;margin-right:8px;background:#22c55e;color:#fff;text-decoration:none;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;">WhatsApp</a>`
                : ""
            }
            ${
              bookingUrl
                ? `<a href="${escapeHtml(bookingUrl)}" style="display:inline-block;background:${escapeHtml(mainColor)};color:#fff;text-decoration:none;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;">Prendre RDV</a>`
                : ""
            }
          </div>
        </div>
        ${
          logoUrl
            ? `<div style="margin-left:auto;"><img src="${escapeHtml(logoUrl)}" alt="Logo" style="max-width:90px;max-height:50px;object-fit:contain;" /></div>`
            : ""
        }
      </div>
    </div>
  `;
};

export default function Inbox({ session }: Props) {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [onboarding, setOnboarding] = useState<UserOnboarding | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const loadOnboarding = async () => {
    const { data } = await supabase
      .from("user_onboarding")
      .select(
        "company_name, company_email, company_phone, company_website, company_address, logo_url, main_color, advisor_name, advisor_role, advisor_photo_url, whatsapp_url, booking_url"
      )
      .eq("user_id", session.user.id)
      .maybeSingle();

    setOnboarding((data as UserOnboarding) || null);
  };

  const loadEmails = async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: inboundData, error: inboundError } = await supabase
      .from("inbound_emails")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (inboundError) {
      setErrorMessage(inboundError.message);
      setEmails([]);
      setSelectedEmail(null);
      setLoading(false);
      return;
    }

    const rawEmails = (inboundData || []) as InboundEmail[];

    const clientIds = Array.from(
      new Set(rawEmails.map((email) => email.client_id).filter(Boolean))
    ) as string[];

    let clientsById: Record<string, ClientLite> = {};

    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email")
        .eq("user_id", session.user.id)
        .in("id", clientIds);

      if (clientsData) {
        clientsById = clientsData.reduce((acc, client) => {
          acc[client.id] = client as ClientLite;
          return acc;
        }, {} as Record<string, ClientLite>);
      }
    }

    const formattedEmails = rawEmails.map((email) => ({
      ...email,
      client: email.client_id ? clientsById[email.client_id] || null : null,
    }));

    setEmails(formattedEmails);

    setSelectedEmail((current) => {
      if (current) {
        return (
          formattedEmails.find((email) => email.id === current.id) ||
          formattedEmails[0] ||
          null
        );
      }

      return formattedEmails[0] || null;
    });

    setLoading(false);
  };

  const markAsRead = async (emailId: string) => {
    const { error } = await supabase
      .from("inbound_emails")
      .update({ status: "read" })
      .eq("id", emailId)
      .eq("user_id", session.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEmails((prev) =>
      prev.map((email) =>
        email.id === emailId ? { ...email, status: "read" } : email
      )
    );

    setSelectedEmail((prev) =>
      prev?.id === emailId ? { ...prev, status: "read" } : prev
    );
  };

  const sendReply = async () => {
    if (!selectedEmail?.from_email) {
      alert("Adresse email expéditeur introuvable.");
      return;
    }

    if (!replyContent.trim()) {
      alert("Écris une réponse avant d’envoyer.");
      return;
    }

    setSendingReply(true);

    const subject = selectedEmail.subject?.toLowerCase().startsWith("re:")
      ? selectedEmail.subject
      : `Re: ${selectedEmail.subject || "Votre message"}`;

    const signatureHtml = buildEmailSignature(onboarding);

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111827;">
        ${escapeHtml(replyContent).replace(/\n/g, "<br />")}
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

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: selectedEmail.from_email,
        subject,
        html,
        user_id: session.user.id,
        user_name: userName,
        user_email: userEmail,
      },
    });

    await supabase.from("email_logs").insert({
      user_id: session.user.id,
      client_id: selectedEmail.client_id,
      template_type: "reply_email",
      subject,
      content: replyContent,
      recipient_email: selectedEmail.from_email,
      status: error || data?.success === false ? "failed" : "sent",
    });

    if (error || data?.success === false) {
      alert("Réponse non envoyée. Vérifie la fonction send-email.");
      setSendingReply(false);
      return;
    }

    if (selectedEmail.status !== "read") {
      await markAsRead(selectedEmail.id);
    }

    setReplyContent("");
    setReplyOpen(false);
    setSendingReply(false);
    await loadEmails();
  };

  useEffect(() => {
    loadOnboarding();
    loadEmails();
  }, [session.user.id]);

  const unreadCount = useMemo(
    () => emails.filter((email) => email.status !== "read").length,
    [emails]
  );

  const getClientName = (email: InboundEmail) => {
    const clientName = `${email.client?.first_name || ""} ${
      email.client?.last_name || ""
    }`.trim();

    return (
      clientName || email.from_name || email.from_email || "Expéditeur inconnu"
    );
  };

  const getEmailPreview = (email: InboundEmail) => {
    if (email.text_content?.trim()) return email.text_content;
    if (email.html_content?.trim()) return stripHtml(email.html_content);
    return "Email sans contenu texte.";
  };

  const filteredEmails = useMemo(() => {
    const value = searchTerm.toLowerCase().trim();

    if (!value) return emails;

    return emails.filter((email) => {
      const content = [
        getClientName(email),
        email.from_email,
        email.subject,
        getEmailPreview(email),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(value);
    });
  }, [emails, searchTerm]);

  const selectedPreview = selectedEmail ? getEmailPreview(selectedEmail) : "";

  return (
    <div className="min-h-screen text-slate-950">
      <div className="mb-5 overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-xl sm:p-6 lg:rounded-[2rem]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200 sm:text-xs">
              <InboxIcon size={14} />
              Boîte mail MyPX
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Réponses clients reçues
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/60">
              Centralise les réponses clients, lis les messages entrants et
              réponds directement avec ta signature MyPX.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <button
              onClick={loadEmails}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white transition hover:bg-white/15 active:scale-[0.98]"
            >
              <RefreshCw size={15} />
              Actualiser
            </button>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center sm:px-5">
              <p className="text-2xl font-black sm:text-3xl">{unreadCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50 sm:text-xs">
                non lus
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-[1.75rem] bg-white shadow-sm">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : errorMessage ? (
        <div className="rounded-[1.75rem] border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Erreur Inbox : {errorMessage}
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <InboxIcon className="mx-auto text-slate-300" size={42} />
          <h2 className="mt-4 text-xl font-black">Aucun email reçu</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
            Dès qu’un client répondra à une adresse MyPX, son message apparaîtra
            ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <aside className="rounded-[1.75rem] bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un email..."
                className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-270px)]">
              {filteredEmails.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                  <Mail className="mx-auto text-slate-300" size={30} />
                  <p className="mt-3 text-sm font-black text-slate-700">
                    Aucun résultat
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Essaie avec un nom, un email ou un objet.
                  </p>
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  const isUnread = email.status !== "read";

                  return (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        setReplyOpen(false);
                        setReplyContent("");
                      }}
                      className={`w-full rounded-[1.35rem] border p-4 text-left transition active:scale-[0.99] ${
                        isSelected
                          ? "border-slate-950 bg-slate-950 text-white shadow-xl"
                          : "border-slate-100 bg-white text-slate-950 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {getClientName(email)}
                          </p>
                          <p
                            className={`mt-1 truncate text-xs font-semibold ${
                              isSelected ? "text-white/50" : "text-slate-400"
                            }`}
                          >
                            {email.from_email}
                          </p>
                        </div>

                        {isUnread && (
                          <span className="shrink-0 rounded-full bg-rose-500 px-2 py-1 text-[9px] font-black uppercase text-white">
                            Nouveau
                          </span>
                        )}
                      </div>

                      <p className="mt-3 line-clamp-1 text-sm font-black">
                        {email.subject || "Sans objet"}
                      </p>

                      <p
                        className={`mt-2 line-clamp-2 text-xs font-semibold leading-5 ${
                          isSelected ? "text-white/60" : "text-slate-500"
                        }`}
                      >
                        {getEmailPreview(email)}
                      </p>

                      <p
                        className={`mt-3 text-[11px] font-bold ${
                          isSelected ? "text-white/40" : "text-slate-400"
                        }`}
                      >
                        {new Date(email.created_at).toLocaleString("fr-FR")}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="rounded-[1.75rem] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
            {selectedEmail ? (
              <>
                <div className="flex flex-col gap-5 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-black leading-tight sm:text-2xl">
                      {selectedEmail.subject || "Sans objet"}
                    </h2>

                    <div className="mt-4 flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <UserRound size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {getClientName(selectedEmail)}
                        </p>
                        <p className="break-all text-xs font-semibold text-slate-400">
                          {selectedEmail.from_email}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          Reçu le{" "}
                          {new Date(selectedEmail.created_at).toLocaleString(
                            "fr-FR"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end">
                    {selectedEmail.status !== "read" && (
                      <button
                        onClick={() => markAsRead(selectedEmail.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 active:scale-[0.98]"
                      >
                        <MailOpen size={15} />
                        Marquer lu
                      </button>
                    )}

                    <button
                      onClick={() => setReplyOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-800 active:scale-[0.98]"
                    >
                      <Reply size={15} />
                      Répondre
                    </button>

                    {selectedEmail.client_id && (
                      <a
                        href={`/dashboard?client=${selectedEmail.client_id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                      >
                        <ExternalLink size={15} />
                        Ouvrir fiche
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-slate-50 p-4 sm:p-5">
                  {selectedEmail.html_content ? (
                    <div
                      className="prose prose-sm max-w-none overflow-x-auto text-slate-700 prose-img:max-w-full prose-a:break-all"
                      dangerouslySetInnerHTML={{
                        __html: cleanHtml(selectedEmail.html_content),
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-8 text-slate-700">
                      {selectedPreview || "Aucun contenu texte disponible."}
                    </p>
                  )}
                </div>

                {replyOpen && (
                  <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-violet-50 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">
                          Répondre depuis MyPX
                        </p>
                        <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                          À : {selectedEmail.from_email}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setReplyOpen(false);
                          setReplyContent("");
                        }}
                        className="shrink-0 rounded-xl bg-white p-2 text-slate-500 transition hover:text-slate-950"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={8}
                      className="mt-4 w-full resize-none rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      placeholder="Écris ta réponse ici..."
                    />

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold leading-5 text-slate-500">
                        Ta signature MyPX sera ajoutée automatiquement.
                      </p>

                      <button
                        onClick={sendReply}
                        disabled={sendingReply}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
                      >
                        {sendingReply ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                        Envoyer la réponse
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] bg-slate-50 text-sm font-bold text-slate-400">
                Sélectionne un email.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}