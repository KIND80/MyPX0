import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Bot,
  Brain,
  Cake,
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  MailWarning,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type RadarAIProps = {
  session: Session;
};

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  status: string | null;
  birthday: string | null;
  group_name: string | null;
  potential_amount: number | null;
  created_at: string;
  last_contact_at: string | null;
};

type FollowUpRow = {
  id: string;
  client_id: string | null;
  title: string;
  note: string | null;
  due_date: string | null;
  status: string | null;
  priority: string | null;
};

type EmailLogRow = {
  id: string;
  client_id: string | null;
  type: string | null;
  status: string | null;
  created_at: string;
};

type RadarInsight = {
  id: string;
  type:
    | "inactive"
    | "birthday"
    | "follow_up"
    | "high_potential"
    | "welcome_missing"
    | "urgent";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  clientName?: string;
  clientMeta?: string;
  potential?: number;
  action: string;
  reason: string;
};

function clientName(client: ClientRow) {
  return (
    [client.first_name, client.last_name].filter(Boolean).join(" ") ||
    client.company ||
    "Client"
  );
}

function daysBetween(dateString: string | null) {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();

  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilBirthday(dateString: string | null) {
  if (!dateString) return null;

  const birthday = new Date(dateString);
  const now = new Date();

  const nextBirthday = new Date(
    now.getFullYear(),
    birthday.getMonth(),
    birthday.getDate()
  );

  if (nextBirthday < now) {
    nextBirthday.setFullYear(now.getFullYear() + 1);
  }

  return Math.ceil(
    (nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function priorityWeight(priority: RadarInsight["priority"]) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

export default function RadarAI({ session }: RadarAIProps) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all"
  );
  const [search, setSearch] = useState("");

  const fetchRadarData = async () => {
    setLoading(true);

    const [clientsRes, followUpsRes, emailLogsRes] = await Promise.all([
      supabase
        .from("clients")
        .select(
          "id, first_name, last_name, email, phone, company, city, status, birthday, group_name, potential_amount, created_at, last_contact_at"
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("follow_ups")
        .select("id, client_id, title, note, due_date, status, priority")
        .eq("user_id", session.user.id)
        .order("due_date", { ascending: true, nullsFirst: false }),

      supabase
        .from("email_logs")
        .select("id, client_id, type, status, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (!clientsRes.error) {
      setClients((clientsRes.data as ClientRow[]) || []);
    }

    if (!followUpsRes.error) {
      setFollowUps((followUpsRes.data as FollowUpRow[]) || []);
    }

    if (!emailLogsRes.error) {
      setEmailLogs((emailLogsRes.data as EmailLogRow[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRadarData();
  }, [session.user.id]);

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const insights = useMemo<RadarInsight[]>(() => {
    const now = new Date();
    const results: RadarInsight[] = [];

    clients.forEach((client) => {
      const name = clientName(client);
      const lastContactDays = daysBetween(
        client.last_contact_at || client.created_at
      );
      const potential = Number(client.potential_amount || 0);
      const birthdayDays = daysUntilBirthday(client.birthday);

      if (lastContactDays !== null && lastContactDays >= 90) {
        results.push({
          id: `inactive-${client.id}`,
          type: "inactive",
          priority: potential >= 5000 ? "high" : "medium",
          title: "Client dormant à réveiller",
          message: `${name} n’a pas eu d’activité récente depuis ${lastContactDays} jours.`,
          clientName: name,
          clientMeta: client.group_name || client.status || "Sans segment",
          potential,
          action: "Créer une conversation douce de reprise de contact.",
          reason:
            "Un client inactif peut devenir une opportunité si le timing est humain et non agressif.",
        });
      }

      if (potential >= 5000 && (!lastContactDays || lastContactDays >= 30)) {
        results.push({
          id: `high-potential-${client.id}`,
          type: "high_potential",
          priority: "high",
          title: "Gros potentiel sans contact récent",
          message: `${name} représente un potentiel estimé à ${potential.toLocaleString(
            "fr-FR"
          )}€, mais aucun contact récent n’est détecté.`,
          clientName: name,
          clientMeta: client.company || client.city || "Potentiel élevé",
          potential,
          action: "Préparer une relance personnalisée avec contexte.",
          reason:
            "Les gros potentiels doivent être suivis avant qu’ils refroidissent.",
        });
      }

      if (birthdayDays !== null && birthdayDays <= 7) {
        results.push({
          id: `birthday-${client.id}`,
          type: "birthday",
          priority: birthdayDays === 0 ? "high" : "medium",
          title:
            birthdayDays === 0
              ? "Anniversaire aujourd’hui"
              : "Anniversaire proche",
          message:
            birthdayDays === 0
              ? `C’est l’anniversaire de ${name} aujourd’hui.`
              : `Anniversaire de ${name} dans ${birthdayDays} jour(s).`,
          clientName: name,
          clientMeta: client.email || client.phone || "Contact disponible",
          action: "Envoyer un message court, humain et personnalisé.",
          reason:
            "Un anniversaire est une opportunité naturelle de conversation.",
        });
      }

      const hasWelcomeEmail = emailLogs.some(
        (log) =>
          log.client_id === client.id &&
          (log.type === "welcome" ||
            log.type === "bienvenue" ||
            log.status === "sent")
      );

      if (client.email && !hasWelcomeEmail) {
        results.push({
          id: `welcome-${client.id}`,
          type: "welcome_missing",
          priority: "low",
          title: "Email de bienvenue manquant",
          message: `${name} a une adresse email, mais aucun email de bienvenue détecté.`,
          clientName: name,
          clientMeta: client.email,
          action: "Envoyer ou programmer un message d’accueil.",
          reason:
            "Le premier message structure la relation et augmente la confiance.",
        });
      }
    });

    followUps.forEach((followUp) => {
      if (followUp.status === "done" || !followUp.due_date) return;

      const dueDate = new Date(followUp.due_date);
      const linkedClient = followUp.client_id
        ? clientMap.get(followUp.client_id)
        : null;

      const name = linkedClient ? clientName(linkedClient) : "Client non lié";

      if (dueDate <= now) {
        results.push({
          id: `follow-up-${followUp.id}`,
          type: "follow_up",
          priority: followUp.priority === "urgent" ? "high" : "medium",
          title: "Relance due ou en retard",
          message: `${followUp.title} — ${name}`,
          clientName: name,
          clientMeta: followUp.priority || "Priorité normale",
          action: "Traiter cette relance maintenant.",
          reason:
            "Une relance oubliée peut casser le rythme de confiance avec le client.",
        });
      }

      if (followUp.priority === "urgent") {
        results.push({
          id: `urgent-${followUp.id}`,
          type: "urgent",
          priority: "high",
          title: "Relance urgente",
          message: `${followUp.title} — ${name}`,
          clientName: name,
          clientMeta: followUp.note || "Action prioritaire",
          action: "Contacter ou replanifier rapidement.",
          reason:
            "Une priorité urgente doit rester visible jusqu’à traitement.",
        });
      }
    });

    return results.sort(
      (a, b) =>
        priorityWeight(b.priority) - priorityWeight(a.priority) ||
        Number(b.potential || 0) - Number(a.potential || 0)
    );
  }, [clients, followUps, emailLogs, clientMap]);

  const filteredInsights = useMemo(() => {
    return insights.filter((insight) => {
      const matchPriority = filter === "all" || insight.priority === filter;

      const searchValue = search.trim().toLowerCase();
      const matchSearch =
        !searchValue ||
        insight.title.toLowerCase().includes(searchValue) ||
        insight.message.toLowerCase().includes(searchValue) ||
        insight.clientName?.toLowerCase().includes(searchValue) ||
        insight.clientMeta?.toLowerCase().includes(searchValue);

      return matchPriority && matchSearch;
    });
  }, [insights, filter, search]);

  const stats = useMemo(() => {
    return {
      total: insights.length,
      high: insights.filter((i) => i.priority === "high").length,
      medium: insights.filter((i) => i.priority === "medium").length,
      low: insights.filter((i) => i.priority === "low").length,
    };
  }, [insights]);

  return (
    <div>
      <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700 shadow-sm backdrop-blur-xl">
            <Brain size={14} />
            Radar IA
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Cerveau du portefeuille
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            Le Radar IA analyse tes clients, relances, emails et signaux faibles
            pour créer des opportunités de conversation au bon moment.
          </p>
        </div>

        <button
          onClick={fetchRadarData}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black"
        >
          {loading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <RefreshCw size={17} />
          )}
          Actualiser le radar
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <RadarStat
          label="Signaux détectés"
          value={loading ? "..." : String(stats.total)}
          icon={Sparkles}
          tone="slate"
        />

        <RadarStat
          label="Priorité haute"
          value={loading ? "..." : String(stats.high)}
          icon={Flame}
          tone="rose"
        />

        <RadarStat
          label="Priorité moyenne"
          value={loading ? "..." : String(stats.medium)}
          icon={Clock3}
          tone="amber"
        />

        <RadarStat
          label="Opportunités douces"
          value={loading ? "..." : String(stats.low)}
          icon={CheckCircle2}
          tone="cyan"
        />
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client, une alerte, un groupe..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Tout" },
              { key: "high", label: "Haute" },
              { key: "medium", label: "Moyenne" },
              { key: "low", label: "Douce" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  setFilter(item.key as "all" | "high" | "medium" | "low")
                }
                className={`rounded-2xl px-4 py-3 text-xs font-black transition ${
                  filter === item.key
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-300"
                    : "bg-white text-slate-500 hover:text-slate-950"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {loading ? (
          <div className="col-span-full rounded-[2rem] border border-white/75 bg-white/70 p-8 text-center shadow-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-600" />
            <p className="mt-4 text-sm font-black text-slate-700">
              Analyse du portefeuille en cours...
            </p>
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="col-span-full rounded-[2rem] border border-white/75 bg-white/70 p-8 text-center shadow-xl">
            <Bot className="mx-auto h-9 w-9 text-violet-600" />
            <p className="mt-4 text-lg font-black text-slate-950">
              Aucun signal détecté
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ton portefeuille semble calme pour le moment.
            </p>
          </div>
        ) : (
          filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </section>
    </div>
  );
}

function RadarStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: "slate" | "rose" | "amber" | "cyan";
}) {
  const classes = {
    slate: "bg-slate-950 text-white",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    cyan: "bg-cyan-50 text-cyan-700",
  };

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        </div>

        <div className={`rounded-2xl p-3 ${classes[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: RadarInsight }) {
  const iconMap = {
    inactive: Clock3,
    birthday: Cake,
    follow_up: AlertTriangle,
    high_potential: TrendingUp,
    welcome_missing: MailWarning,
    urgent: Zap,
  };

  const Icon = iconMap[insight.type];

  const priorityClasses = {
    high: "bg-rose-50 text-rose-700 border-rose-100",
    medium: "bg-amber-50 text-amber-700 border-amber-100",
    low: "bg-cyan-50 text-cyan-700 border-cyan-100",
  };

  const priorityLabel = {
    high: "Priorité haute",
    medium: "Priorité moyenne",
    low: "Opportunité douce",
  };

  return (
    <article className="rounded-[2rem] border border-white/75 bg-white/75 p-5 shadow-xl shadow-violet-100/60 backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-2xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
            <Icon size={20} />
          </div>

          <div>
            <div
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                priorityClasses[insight.priority]
              }`}
            >
              {priorityLabel[insight.priority]}
            </div>

            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">
              {insight.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {insight.message}
            </p>
          </div>
        </div>

        {insight.potential ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
              Potentiel
            </p>
            <p className="text-lg font-black text-emerald-800">
              {insight.potential.toLocaleString("fr-FR")}€
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            <UserRound size={14} />
            Client
          </div>

          <p className="mt-2 text-sm font-black text-slate-800">
            {insight.clientName || "Non défini"}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {insight.clientMeta || "Aucune information complémentaire"}
          </p>
        </div>

        <div className="rounded-3xl border border-violet-100 bg-violet-50 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-500">
            <Target size={14} />
            Action conseillée
          </div>

          <p className="mt-2 text-sm font-black text-violet-900">
            {insight.action}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-600">
          <Brain size={14} />
          Pourquoi le radar le remonte
        </div>

        <p className="mt-2 text-sm leading-6 font-bold text-cyan-900">
          {insight.reason}
        </p>
      </div>
    </article>
  );
}
