import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Mail,
  MousePointerClick,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
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

type StatusFilter = "all" | "sent" | "failed" | "opened" | "clicked";

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: "Toutes", value: "all" },
  { label: "Envoyées", value: "sent" },
  { label: "Échecs", value: "failed" },
  { label: "Ouvertes", value: "opened" },
  { label: "Cliquées", value: "clicked" },
];

export default function EmailLogs({ session }: EmailLogsProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLogs([]);
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

      const matchesSearch = full.includes(search.toLowerCase().trim());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "sent" && log.status === "sent") ||
        (statusFilter === "failed" && log.status === "failed") ||
        (statusFilter === "opened" && Boolean(log.opened_at)) ||
        (statusFilter === "clicked" && Boolean(log.clicked_at));

      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const sentCount = logs.filter((log) => log.status === "sent").length;
  const failedCount = logs.filter((log) => log.status === "failed").length;
  const openedCount = logs.filter((log) => log.opened_at).length;
  const clickedCount = logs.filter((log) => log.clicked_at).length;

  const openRate = sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0;
  const clickRate = sentCount > 0 ? Math.round((clickedCount / sentCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-7">
        <div className="absolute right-[-80px] top-[-90px] h-56 w-56 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute bottom-[-90px] left-[-90px] h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
              <ShieldCheck size={14} />
              Historique des transmissions
            </div>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              Suivi des emails
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Consulte les emails envoyés depuis MyPX : campagnes, messages
              manuels, statuts, ouvertures et clics. Ici, tu vois si tes
              transmissions arrivent, sont lues et créent de l’engagement.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Actualiser
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Transmissions envoyées"
          value={sentCount}
          sublabel="Emails délivrés par MyPX"
          icon={<Send size={22} />}
        />

        <StatCard
          label="Échecs"
          value={failedCount}
          sublabel="À surveiller côté configuration"
          icon={<XCircle size={22} />}
          tone="rose"
        />

        <StatCard
          label="Ouvertures"
          value={openedCount}
          sublabel={`${openRate}% des emails envoyés`}
          icon={<Eye size={22} />}
          tone="violet"
        />

        <StatCard
          label="Clics"
          value={clickedCount}
          sublabel={`${clickRate}% des emails envoyés`}
          icon={<MousePointerClick size={22} />}
          tone="cyan"
        />
      </div>

      {/* SEARCH / FILTERS */}
      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un sujet, destinataire, statut, contenu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
                  statusFilter === filter.value
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-300"
                    : "border border-slate-200 bg-white text-slate-500 hover:text-slate-950"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          <Sparkles size={14} className="text-violet-500" />
          <span>
            {filteredLogs.length} transmission
            {filteredLogs.length > 1 ? "s" : ""} affichée
            {filteredLogs.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ERROR */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-[1.7rem] border border-rose-100 bg-rose-50 p-4 text-rose-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-black">Impossible de charger les transmissions</p>
            <p className="mt-1 text-sm leading-6">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* LOGS */}
      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Analyse des transmissions en cours...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-300">
              <Mail size={26} />
            </div>

            <h3 className="text-lg font-black text-slate-950">
              Aucune transmission trouvée
            </h3>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Les emails envoyés depuis MyPX apparaîtront ici avec leur statut,
              leur date, leurs ouvertures et leurs clics.
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredLogs.map((log) => (
                <LogMobileCard key={log.id} log={log} />
              ))}
            </div>

            {/* DESKTOP */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Transmission</th>
                    <th className="px-4 py-4">Destinataire</th>
                    <th className="px-4 py-4">Contenu</th>
                    <th className="px-4 py-4">Statut</th>
                    <th className="px-4 py-4">Lecture</th>
                    <th className="px-4 py-4">Clic</th>
                    <th className="px-4 py-4">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t border-slate-100 align-top transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-4">
                        <TypeBadge type={log.template_type} />
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">
                          {log.recipient_email || "Destinataire inconnu"}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-400">
                          {log.campaign_id ? "Opération email" : "Message direct"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="max-w-sm">
                          <p className="font-black text-slate-950">
                            {log.subject || "Sans sujet"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {stripHtml(log.content || "") || "Aucun aperçu"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={log.status || "pending"} />
                      </td>

                      <td className="px-4 py-4">
                        <ActivityBadge
                          active={Boolean(log.opened_at)}
                          activeLabel="Ouvert"
                          inactiveLabel="Non ouvert"
                          activeIcon={<Eye size={15} />}
                        />
                      </td>

                      <td className="px-4 py-4">
                        <ActivityBadge
                          active={Boolean(log.clicked_at)}
                          activeLabel="Cliqué"
                          inactiveLabel="Aucun clic"
                          activeIcon={<MousePointerClick size={15} />}
                          tone="cyan"
                        />
                      </td>

                      <td className="px-4 py-4 font-medium">
                        <p className="text-slate-950">
                          {formatDate(log.created_at)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatTime(log.created_at)}
                        </p>
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
  sublabel,
  icon,
  tone = "emerald",
}: {
  label: string;
  value: number;
  sublabel: string;
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
    <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {sublabel}
          </p>
        </div>

        <div className={`rounded-2xl p-3 shadow-lg ${classes[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const config =
    normalized === "sent"
      ? {
          label: "Envoyé",
          className: "bg-emerald-50 text-emerald-700 border-emerald-100",
          icon: <CheckCircle2 size={14} />,
        }
      : normalized === "failed"
      ? {
          label: "Échec",
          className: "bg-rose-50 text-rose-700 border-rose-100",
          icon: <XCircle size={14} />,
        }
      : {
          label: "En attente",
          className: "bg-slate-50 text-slate-600 border-slate-100",
          icon: <Clock3 size={14} />,
        };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  const normalized = String(type || "").toLowerCase();

  const label =
    normalized.includes("campaign") || normalized.includes("campagne")
      ? "Opération"
      : normalized.includes("welcome")
      ? "Accueil"
      : normalized.includes("manual") || normalized.includes("direct")
      ? "Direct"
      : type || "Email";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
      <Mail size={13} />
      {label}
    </span>
  );
}

function ActivityBadge({
  active,
  activeLabel,
  inactiveLabel,
  activeIcon,
  tone = "emerald",
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeIcon: React.ReactNode;
  tone?: "emerald" | "cyan";
}) {
  const activeClasses =
    tone === "cyan"
      ? "border-cyan-100 bg-cyan-50 text-cyan-700"
      : "border-emerald-100 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
        active
          ? activeClasses
          : "border-slate-100 bg-slate-50 text-slate-400"
      }`}
    >
      {active ? activeIcon : <Clock3 size={14} />}
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function LogMobileCard({ log }: { log: EmailLog }) {
  return (
    <div className="rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <TypeBadge type={log.template_type} />
          <p className="mt-3 line-clamp-2 text-lg font-black text-slate-950">
            {log.subject || "Sans sujet"}
          </p>
          <p className="mt-1 break-all text-sm font-medium text-slate-500">
            {log.recipient_email || "Destinataire inconnu"}
          </p>
        </div>

        <StatusBadge status={log.status || "pending"} />
      </div>

      <p className="mt-3 line-clamp-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-500">
        {stripHtml(log.content || "") || "Aucun contenu"}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <SmallMetric
          label="Lecture"
          value={log.opened_at ? "Ouvert" : "Non ouvert"}
        />
        <SmallMetric label="Clic" value={log.clicked_at ? "Cliqué" : "Aucun"} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
        <p className="text-xs font-bold text-slate-400">Date d’envoi</p>
        <p className="text-xs font-black text-slate-700">
          {formatDate(log.created_at)} · {formatTime(log.created_at)}
        </p>
      </div>
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
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}