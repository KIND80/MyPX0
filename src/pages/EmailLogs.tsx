import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MousePointerClick,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type EmailLogsProps = {
  session: Session;
};

type EmailLog = {
  id: string;
  user_id: string;
  client_id: string | null;
  campaign_id?: string | null;
  template_type: string | null;
  subject: string | null;
  content: string | null;
  recipient_email: string | null;
  status: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  created_at: string;
};

export default function EmailLogs({ session }: EmailLogsProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setLogs((data as EmailLog[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [session.user.id]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const full = [
        log.template_type,
        log.subject,
        log.recipient_email,
        log.status,
        log.content,
      ]
        .join(" ")
        .toLowerCase();

      return full.includes(search.toLowerCase());
    });
  }, [logs, search]);

  const sentCount = logs.filter((log) => log.status === "sent").length;
  const failedCount = logs.filter((log) => log.status === "failed").length;
  const openedCount = logs.filter((log) => log.opened_at).length;
  const clickedCount = logs.filter((log) => log.clicked_at).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
          <Mail size={14} />
          Historique email
        </div>

        <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
          Email Logs
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Suis tous les emails envoyés, leur statut et les interactions :
          ouverture, clic, campagne ou message manuel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard label="Envoyés" value={sentCount} icon={<CheckCircle2 />} />
        <StatCard label="Échecs" value={failedCount} icon={<XCircle />} tone="rose" />
        <StatCard label="Ouverts" value={openedCount} icon={<Mail />} tone="violet" />
        <StatCard label="Cliqués" value={clickedCount} icon={<MousePointerClick />} tone="cyan" />
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un email, un destinataire, un statut..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Chargement des logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-300">
              <Mail size={26} />
            </div>

            <h3 className="text-lg font-black text-slate-950">
              Aucun log email pour le moment
            </h3>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Les emails envoyés apparaîtront ici avec leur statut et leurs
              performances.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredLogs.map((log) => (
                <LogMobileCard key={log.id} log={log} />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Destinataire</th>
                    <th className="px-4 py-4">Sujet</th>
                    <th className="px-4 py-4">Statut</th>
                    <th className="px-4 py-4">Ouvert</th>
                    <th className="px-4 py-4">Cliqué</th>
                    <th className="px-4 py-4">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t border-slate-100 align-top transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-4 font-bold">
                        {log.template_type || "—"}
                      </td>

                      <td className="px-4 py-4">{log.recipient_email || "—"}</td>

                      <td className="px-4 py-4">
                        <div className="max-w-sm">
                          <p className="font-black text-slate-950">
                            {log.subject || "—"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {stripHtml(log.content || "")}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={log.status || "pending"} />
                      </td>

                      <td className="px-4 py-4">
                        {log.opened_at ? (
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        ) : (
                          <Clock3 size={18} className="text-slate-300" />
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {log.clicked_at ? (
                          <MousePointerClick
                            size={18}
                            className="text-cyan-600"
                          />
                        ) : (
                          <Clock3 size={18} className="text-slate-300" />
                        )}
                      </td>

                      <td className="px-4 py-4 font-medium">
                        {new Date(log.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "emerald",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "emerald" | "rose" | "violet" | "cyan";
}) {
  const classes = {
    emerald: "bg-emerald-100 text-emerald-700 shadow-emerald-100",
    rose: "bg-rose-100 text-rose-700 shadow-rose-100",
    violet: "bg-violet-100 text-violet-700 shadow-violet-100",
    cyan: "bg-cyan-100 text-cyan-700 shadow-cyan-100",
  };

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        </div>

        <div className={`rounded-2xl p-3 shadow-lg ${classes[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "sent"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "failed"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${classes}`}>
      {status}
    </span>
  );
}

function LogMobileCard({ log }: { log: EmailLog }) {
  return (
    <div className="rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">
            {log.subject || "Sans sujet"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {log.recipient_email || "—"}
          </p>
        </div>

        <StatusBadge status={log.status || "pending"} />
      </div>

      <p className="mt-3 line-clamp-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-500">
        {stripHtml(log.content || "") || "Aucun contenu"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallMetric label="Type" value={log.template_type || "—"} />
        <SmallMetric label="Ouvert" value={log.opened_at ? "Oui" : "Non"} />
        <SmallMetric label="Cliqué" value={log.clicked_at ? "Oui" : "Non"} />
      </div>

      <p className="mt-4 text-xs font-bold text-slate-400">
        {new Date(log.created_at).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-black text-slate-950">{value}</p>
    </div>
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}