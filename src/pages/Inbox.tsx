import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  Inbox as InboxIcon,
  MailOpen,
  Loader2,
  ExternalLink,
  UserRound,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Props = {
  session: Session;
};

type InboundEmail = {
  id: string;
  user_id: string;
  client_id: string | null;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  text_content: string | null;
  html_content: string | null;
  status: string | null;
  created_at: string;
  clients?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export default function Inbox({ session }: Props) {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);

  const loadEmails = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("inbound_emails")
      .select(
        `
        *,
        clients (
          first_name,
          last_name,
          email
        )
      `
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEmails(data as InboundEmail[]);
      if (!selectedEmail && data.length > 0) {
        setSelectedEmail(data[0] as InboundEmail);
      }
    }

    setLoading(false);
  };

  const markAsRead = async (emailId: string) => {
    await supabase
      .from("inbound_emails")
      .update({ status: "read" })
      .eq("id", emailId)
      .eq("user_id", session.user.id);

    setEmails((prev) =>
      prev.map((email) =>
        email.id === emailId ? { ...email, status: "read" } : email
      )
    );

    setSelectedEmail((prev) =>
      prev?.id === emailId ? { ...prev, status: "read" } : prev
    );
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const unreadCount = emails.filter((email) => email.status !== "read").length;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                <InboxIcon size={14} />
                Boîte mail MyPX
              </div>

              <h1 className="mt-4 text-3xl font-black">
                Réponses clients reçues
              </h1>

              <p className="mt-2 text-sm font-semibold text-white/60">
                Les réponses envoyées vers ton adresse MyPX apparaissent ici.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center">
              <p className="text-3xl font-black">{unreadCount}</p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
                non lus
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center rounded-[2rem] bg-white shadow-sm">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : emails.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
            <InboxIcon className="mx-auto text-slate-300" size={42} />
            <h2 className="mt-4 text-xl font-black">Aucun email reçu</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Dès qu’un client répondra à une adresse MyPX, son message
              apparaîtra ici.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-3">
              {emails.map((email) => {
                const clientName = `${email.clients?.first_name || ""} ${
                  email.clients?.last_name || ""
                }`.trim();

                const isSelected = selectedEmail?.id === email.id;
                const isUnread = email.status !== "read";

                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white shadow-xl"
                        : "border-slate-100 bg-white text-slate-950 shadow-sm hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">
                          {clientName || email.from_name || email.from_email}
                        </p>

                        <p
                          className={`mt-1 text-xs font-semibold ${
                            isSelected ? "text-white/50" : "text-slate-400"
                          }`}
                        >
                          {email.from_email}
                        </p>
                      </div>

                      {isUnread && (
                        <span className="rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase text-emerald-950">
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
                      {email.text_content || "Email sans contenu texte."}
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
              })}
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-sm">
              {selectedEmail ? (
                <>
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="text-2xl font-black">
                        {selectedEmail.subject || "Sans objet"}
                      </h2>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <UserRound size={20} />
                        </div>

                        <div>
                          <p className="text-sm font-black">
                            {selectedEmail.from_name ||
                              selectedEmail.from_email ||
                              "Expéditeur inconnu"}
                          </p>
                          <p className="text-xs font-semibold text-slate-400">
                            {selectedEmail.from_email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.status !== "read" && (
                        <button
                          onClick={() => markAsRead(selectedEmail.id)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white"
                        >
                          <MailOpen size={15} />
                          Marquer lu
                        </button>
                      )}

                      {selectedEmail.client_id && (
                        <a
                          href={`/dashboard/client/${selectedEmail.client_id}`}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink size={15} />
                          Ouvrir fiche
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-5">
                    <p className="whitespace-pre-wrap text-sm font-semibold leading-8 text-slate-700">
                      {selectedEmail.text_content ||
                        "Aucun contenu texte disponible."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center text-sm font-bold text-slate-400">
                  Sélectionne un email.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}