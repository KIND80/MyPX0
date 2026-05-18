import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import Campaigns from "./Campaigns";
import WelcomeBuilder from "./WelcomeBuilder";
import EmailLogs from "./EmailLogs";
import FollowUps from "./FollowUps";
import Clients from "./Clients";
import RadarAI from "./RadarAI";
import Settings from "./Settings";
import Inbox from "./Inbox";
import Missions from "./Missions";
import {
  Bell,
  Bot,
  Cake,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  Inbox as InboxIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Megaphone,
  Plus,
  Radar,
  RefreshCw,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  Users,
  WalletCards,
  Wand2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type DashboardProps = {
  session: Session;
};

type ActiveView =
  | "home"
  | "clients"
  | "email_hub"
  | "radar_ai"
  | "missions"
  | "settings";

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  status: string | null;
  score: number | null;
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

type CampaignRow = {
  id: string;
  status: string | null;
};

type EmailQueueRow = {
  id: string;
  client_id: string | null;
  recipient_email: string;
  subject: string | null;
  status: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

const onboardingSteps = [
  {
    title: "Active ton identité relationnelle",
    description:
      "Configure ton profil conseiller, ta signature et ton adresse email MyPX.",
  },
  {
    title: "Importe tes dossiers clients",
    description:
      "Centralise ton portefeuille avec statut, potentiel, groupe et historique.",
  },
  {
    title: "Prépare ta séquence d’accueil",
    description:
      "Chaque nouveau client reçoit un message professionnel avec ta signature.",
  },
  {
    title: "Laisse PX Sentinel surveiller les signaux",
    description:
      "Relances, anniversaires, réponses et opportunités sont transformés en actions.",
  },
];

const navItems: {
  view: ActiveView;
  label: string;
  icon: React.ElementType;
}[] = [
  { view: "home", label: "Commandement", icon: LayoutDashboard },
  { view: "email_hub", label: "Transmissions", icon: InboxIcon },
  { view: "radar_ai", label: "PX Sentinel", icon: Radar },
  { view: "missions", label: "Missions", icon: CheckCircle2 },
  { view: "clients", label: "Dossiers", icon: Users },
  { view: "settings", label: "Réglages", icon: SettingsIcon },
];

function getInitialView(): ActiveView {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (
    view === "inbox" ||
    view === "campaigns" ||
    view === "welcome" ||
    view === "email_logs" ||
    view === "email_queue"
  ) {
    return "email_hub";
  }

  if (view === "follow_ups") {
    return "clients";
  }

  const allowedViews: ActiveView[] = [
    "home",
    "clients",
    "email_hub",
    "radar_ai",
    "missions",
    "settings",
  ];

  return view && allowedViews.includes(view as ActiveView)
    ? (view as ActiveView)
    : "home";
}

const calculateScore = (client: ClientRow) => {
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

function isBirthdayToday(dateString: string | null) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
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

export default function Dashboard({ session }: DashboardProps) {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeView, setActiveViewState] = useState<ActiveView>(getInitialView);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [, setCampaigns] = useState<CampaignRow[]>([]);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [queuePendingCount, setQueuePendingCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const userName = useMemo(() => {
    const fullName = session.user.user_metadata?.full_name as
      | string
      | undefined;

    if (fullName && fullName.trim()) return fullName;
    return session.user.email ?? "Utilisateur";
  }, [session]);

  const setActiveView = (view: ActiveView) => {
    setActiveViewState(view);

    const url = new URL(window.location.href);
    url.searchParams.set("view", view);

    if (view !== "clients") {
      url.searchParams.delete("client_id");
    }

    window.history.replaceState({}, "", url.toString());
  };

  const openClientFromDashboard = (clientId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "clients");
    url.searchParams.set("client_id", clientId);
    window.history.replaceState({}, "", url.toString());
    setActiveViewState("clients");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchDashboardData = async () => {
    setLoadingStats(true);

    const [clientsRes, followUpsRes, campaignsRes, inboxRes, queueRes] =
      await Promise.all([
        supabase
          .from("clients")
          .select(
            "id, first_name, last_name, email, phone, company, city, status, score, birthday, group_name, potential_amount, created_at, last_contact_at"
          )
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("follow_ups")
          .select("id, client_id, title, note, due_date, status, priority")
          .eq("user_id", session.user.id)
          .order("due_date", { ascending: true, nullsFirst: false }),

        supabase
          .from("campaigns")
          .select("id, status")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("inbound_emails")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .neq("status", "read"),

        supabase
          .from("email_queue")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .in("status", ["pending", "processing"]),
      ]);

    if (!clientsRes.error) {
      const enriched = ((clientsRes.data as ClientRow[]) || []).map(
        (client) => ({
          ...client,
          score: client.score ?? calculateScore(client),
        })
      );

      setClients(enriched);
    }

    if (!followUpsRes.error) {
      setFollowUps((followUpsRes.data as FollowUpRow[]) || []);
    }

    if (!campaignsRes.error) {
      setCampaigns((campaignsRes.data as CampaignRow[]) || []);
    }

    if (!inboxRes.error) {
      setUnreadEmails(inboxRes.count || 0);
    }

    if (!queueRes.error) {
      setQueuePendingCount(queueRes.count || 0);
    }

    setLoadingStats(false);
  };

  useEffect(() => {
    if (session.user.id) {
      fetchDashboardData();
    }
  }, [activeView, session.user.id]);

  const clientMap = useMemo(() => {
    return new Map(
      clients.map((client) => [
        client.id,
        [client.first_name, client.last_name].filter(Boolean).join(" ") ||
          "Client",
      ])
    );
  }, [clients]);

  const dueFollowUps = useMemo(() => {
    const now = new Date();

    return followUps.filter((item) => {
      if (item.status === "done" || !item.due_date) return false;
      return new Date(item.due_date) <= now;
    });
  }, [followUps]);

  const urgentFollowUps = useMemo(() => {
    return followUps.filter(
      (item) => item.status !== "done" && item.priority === "urgent"
    );
  }, [followUps]);

  const todayFollowUps = useMemo(() => {
    const today = new Date();

    return followUps.filter((item) => {
      if (item.status === "done" || !item.due_date) return false;
      const due = new Date(item.due_date);
      return due.toDateString() === today.toDateString();
    });
  }, [followUps]);

  const birthdaysToday = useMemo(() => {
    return clients.filter((client) => isBirthdayToday(client.birthday));
  }, [clients]);

  const upcomingBirthdays = useMemo(() => {
    return clients
      .map((client) => ({
        ...client,
        daysLeft: daysUntilBirthday(client.birthday),
      }))
      .filter(
        (client) =>
          client.daysLeft !== null &&
          client.daysLeft > 0 &&
          client.daysLeft <= 7
      )
      .sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));
  }, [clients]);

  const inactiveClients90 = useMemo(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return clients.filter((client) => {
      const referenceDate = client.last_contact_at || client.created_at;
      return new Date(referenceDate) <= ninetyDaysAgo;
    });
  }, [clients]);

  const hotClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 5);
  }, [clients]);

  const pipelineAmount = useMemo(() => {
    return clients.reduce((sum, client) => {
      return sum + Number(client.potential_amount || 0);
    }, 0);
  }, [clients]);

  const activeSignals =
    todayFollowUps.length +
    unreadEmails +
    birthdaysToday.length +
    inactiveClients90.length +
    queuePendingCount;

  const stats = [
    {
      label: "Dossiers actifs",
      value: loadingStats ? "..." : String(clients.length),
      sub: "Portefeuille sous surveillance",
      icon: Users,
    },
    {
      label: "Transmissions",
      value: loadingStats ? "..." : String(unreadEmails),
      sub: "Réponses clients non lues",
      icon: InboxIcon,
    },
    {
      label: "File Sentinel",
      value: loadingStats ? "..." : String(queuePendingCount),
      sub: "Emails programmés",
      icon: Send,
    },
    {
      label: "Actions dues",
      value: loadingStats ? "..." : String(dueFollowUps.length),
      sub: "À traiter maintenant",
      icon: Clock3,
    },
    {
      label: "Potentiel détecté",
      value: loadingStats
        ? "..."
        : `${pipelineAmount.toLocaleString("fr-FR")}€`,
      sub: "Pipeline estimé",
      icon: WalletCards,
    },
  ];

  const viewComponents: Record<Exclude<ActiveView, "home">, React.ReactNode> = {
    radar_ai: <RadarAI session={session} />,
    email_hub: <EmailHub session={session} />,
    missions: <Missions session={session} />,
    clients: <ClientsHub session={session} />,
    settings: <Settings session={session} />,
  };

  if (activeView !== "home") {
    return (
      <AppShell
        activeView={activeView}
        setActiveView={setActiveView}
        handleLogout={handleLogout}
        unreadEmails={unreadEmails}
      >
        {viewComponents[activeView]}
      </AppShell>
    );
  }

  return (
    <AppShell
      activeView={activeView}
      setActiveView={setActiveView}
      handleLogout={handleLogout}
      unreadEmails={unreadEmails}
    >
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-200/40 sm:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.42),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.28),transparent_34%)]" />
            <div className="pointer-events-none absolute right-8 top-8 h-32 w-32 rounded-full border border-cyan-300/20" />
            <div className="pointer-events-none absolute right-12 top-12 h-24 w-24 animate-pulse rounded-full border border-violet-300/20" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-xl">
                <Radar size={14} />
                Centre de commandement MyPX
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-5xl xl:text-6xl">
                Bonjour, {userName}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                PX Sentinel observe ton portefeuille, priorise les signaux et
                transforme chaque interaction en action relationnelle.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  onClick={() => setActiveView("radar_ai")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 shadow-xl shadow-cyan-950/20 transition hover:-translate-y-0.5"
                >
                  <Radar size={17} />
                  Ouvrir PX Sentinel
                </button>

                <button
                  onClick={() => setActiveView("clients")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <Plus size={17} />
                  Accéder aux dossiers
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-violet-100 backdrop-blur-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                  <Bot size={14} />
                  Brief IA
                </div>

                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                  {activeSignals > 0
                    ? `${activeSignals} signal(s) à examiner`
                    : "Terrain calme"}
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {activeSignals > 0
                    ? "Des opportunités, réponses ou opérations Sentinel demandent ton attention."
                    : "Aucun signal critique. Profite-en pour enrichir ton portefeuille."}
                </p>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-300">
                <Sparkles size={22} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniSignal label="Aujourd’hui" value={todayFollowUps.length} />
              <MiniSignal label="Emails" value={unreadEmails} />
              <MiniSignal label="Queue" value={queuePendingCount} />
              <MiniSignal label="Dormants" value={inactiveClients90.length} />
            </div>
          </div>
        </header>

        {showOnboarding && (
          <section className="mb-6 overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-2xl shadow-violet-100 backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                  <Sparkles size={14} />
                  Protocole conseillé
                </div>

                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Transforme ton CRM en système d’intelligence relationnelle.
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  MyPX ne stocke pas seulement tes contacts : il t’aide à garder
                  le lien, détecter les bons moments et agir avec précision.
                </p>
              </div>

              <button
                onClick={() => setShowOnboarding(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 transition hover:text-slate-950"
              >
                <X size={16} />
                Fermer
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {onboardingSteps.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-100"
                >
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
                    Mission {index + 1}
                  </p>

                  <h3 className="mt-3 text-base font-black text-slate-950 sm:text-lg">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (
                    item.label === "Transmissions" ||
                    item.label === "File Sentinel"
                  )
                    setActiveView("email_hub");
                  if (item.label === "Dossiers actifs")
                    setActiveView("clients");
                  if (item.label === "Actions dues") setActiveView("clients");
                }}
                className="group rounded-[2rem] border border-white/80 bg-white/75 p-5 text-left shadow-xl shadow-violet-100/50 backdrop-blur-2xl transition hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-3 break-words text-3xl font-black text-slate-950">
                      {item.value}
                    </p>

                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {item.sub}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-300 transition group-hover:scale-105">
                    <Icon size={18} />
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <PriorityCard
            title="Signal chaud"
            value={loadingStats ? "..." : String(todayFollowUps.length)}
            subtitle="Actions à traiter aujourd’hui"
            tone="orange"
            emoji="🔥"
          />

          <PriorityCard
            title="Transmission reçue"
            value={loadingStats ? "..." : String(unreadEmails)}
            subtitle="Réponses client à ouvrir"
            tone="amber"
            emoji="📩"
          />

          <PriorityCard
            title="File Sentinel"
            value={loadingStats ? "..." : String(queuePendingCount)}
            subtitle="Emails en attente"
            tone="violet"
            emoji="📡"
          />

          <PriorityCard
            title="Relation froide"
            value={loadingStats ? "..." : String(inactiveClients90.length)}
            subtitle="90+ jours sans contact"
            tone="cyan"
            emoji="🧊"
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <DashboardCard
            icon={<Flame size={18} className="text-orange-500" />}
            title="Dossiers à fort potentiel"
          >
            {hotClients.length === 0 ? (
              <EmptyState text="Aucun dossier scoré pour le moment." />
            ) : (
              hotClients.map((client, index) => (
                <div
                  key={client.id}
                  className="rounded-3xl border border-orange-100 bg-orange-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        #{index + 1}{" "}
                        {[client.first_name, client.last_name]
                          .filter(Boolean)
                          .join(" ") || "Client"}
                      </p>

                      <p className="mt-1 truncate text-xs font-medium text-orange-700">
                        {client.group_name || "Sans réseau"} •{" "}
                        {client.status || "prospect"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-orange-200 px-3 py-1 text-xs font-black text-orange-900">
                      Score {client.score ?? 0}
                    </span>
                  </div>

                  <button
                    onClick={() => openClientFromDashboard(client.id)}
                    className="mt-3 text-xs font-black text-orange-700 hover:underline"
                  >
                    Ouvrir le dossier →
                  </button>
                </div>
              ))
            )}
          </DashboardCard>

          <DashboardCard
            icon={<CircleAlert size={18} className="text-violet-600" />}
            title="Alertes PX Sentinel"
          >
            {todayFollowUps.length === 0 &&
            dueFollowUps.length === 0 &&
            urgentFollowUps.length === 0 &&
            birthdaysToday.length === 0 &&
            upcomingBirthdays.length === 0 &&
            inactiveClients90.length === 0 ? (
              <EmptyState text="Aucun signal critique pour le moment." />
            ) : (
              <>
                {birthdaysToday.map((client) => (
                  <ReminderItem
                    key={`birthday-${client.id}`}
                    tone="pink"
                    onAction={() => openClientFromDashboard(client.id)}
                  >
                    🎂 Moment relationnel : anniversaire aujourd’hui —{" "}
                    {[client.first_name, client.last_name]
                      .filter(Boolean)
                      .join(" ") || "Client"}
                  </ReminderItem>
                ))}

                {upcomingBirthdays.slice(0, 3).map((client) => (
                  <ReminderItem
                    key={`upcoming-birthday-${client.id}`}
                    tone="fuchsia"
                    onAction={() => openClientFromDashboard(client.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Cake size={14} />
                      Anniversaire dans {client.daysLeft} jour(s) :{" "}
                      {[client.first_name, client.last_name]
                        .filter(Boolean)
                        .join(" ") || "Client"}
                    </div>
                  </ReminderItem>
                ))}

                {todayFollowUps.map((item) => (
                  <ReminderItem
                    key={`today-${item.id}`}
                    tone="slate"
                    onAction={() => setActiveView("clients")}
                  >
                    Action du jour : {item.title}
                  </ReminderItem>
                ))}

                {dueFollowUps.slice(0, 3).map((item) => (
                  <ReminderItem
                    key={`due-${item.id}`}
                    tone="amber"
                    onAction={() => setActiveView("clients")}
                  >
                    Signal en retard : {item.title}
                  </ReminderItem>
                ))}

                {urgentFollowUps.slice(0, 2).map((item) => (
                  <ReminderItem
                    key={`urgent-${item.id}`}
                    tone="rose"
                    onAction={() => setActiveView("clients")}
                  >
                    Priorité haute : {item.title}
                  </ReminderItem>
                ))}

                {inactiveClients90.slice(0, 3).map((client) => (
                  <ReminderItem
                    key={`inactive-${client.id}`}
                    tone="sky"
                    onAction={() => openClientFromDashboard(client.id)}
                  >
                    Relation froide :{" "}
                    {[client.first_name, client.last_name]
                      .filter(Boolean)
                      .join(" ") || "Client"}{" "}
                    — 90+ jours sans contact
                  </ReminderItem>
                ))}
              </>
            )}
          </DashboardCard>

          <DashboardCard
            icon={<Star size={18} className="text-cyan-600" />}
            title="Actions prioritaires"
          >
            {dueFollowUps.length === 0 ? (
              <EmptyState text="Aucune action prioritaire à traiter immédiatement." />
            ) : (
              dueFollowUps.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm font-black text-slate-950">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {item.client_id
                      ? clientMap.get(item.client_id) || "Client"
                      : "Sans dossier lié"}
                  </p>

                  <p className="mt-2 text-xs font-bold text-slate-400">
                    {item.due_date
                      ? new Date(item.due_date).toLocaleString("fr-FR")
                      : "Sans date"}
                  </p>

                  <button
                    onClick={() => setActiveView("clients")}
                    className="mt-3 text-xs font-black text-violet-600 hover:underline"
                  >
                    Traiter l’action →
                  </button>
                </div>
              ))
            )}
          </DashboardCard>
        </section>
      </div>
    </AppShell>
  );
}

function EmailHub({ session }: { session: Session }) {
  const [tab, setTab] = useState<
    "inbox" | "campaigns" | "welcome" | "queue" | "logs"
  >("inbox");

  const tabs = [
    { key: "inbox", label: "Boîte de réception", icon: InboxIcon },
    { key: "campaigns", label: "Opérations", icon: Megaphone },
    { key: "welcome", label: "Séquence d’accueil", icon: Mail },
    { key: "queue", label: "File Sentinel", icon: Send },
    { key: "logs", label: "Historique", icon: Clock3 },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <HubHeader
        icon={<InboxIcon size={14} />}
        badge="Centre des transmissions"
        title="Transmissions, opérations et séquences"
        description="Toutes tes communications client sont regroupées ici : réponses entrantes, campagnes, welcome, file Sentinel et historique."
      />

      <TabBar tabs={tabs} activeTab={tab} setTab={setTab} />

      {tab === "inbox" && <Inbox session={session} />}
      {tab === "campaigns" && <Campaigns session={session} />}
      {tab === "welcome" && <WelcomeBuilder session={session} />}
      {tab === "queue" && <EmailQueueSentinel session={session} />}
      {tab === "logs" && <EmailLogs session={session} />}
    </div>
  );
}

function EmailQueueSentinel({ session }: { session: Session }) {
  const [queue, setQueue] = useState<EmailQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingNow, setProcessingNow] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("email_queue")
      .select(
        "id, client_id, recipient_email, subject, status, scheduled_at, sent_at, error_message, created_at"
      )
      .eq("user_id", session.user.id)
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (!error) {
      setQueue((data as EmailQueueRow[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, [session.user.id]);

  const runProcessorNow = async () => {
    setProcessingNow(true);

    await supabase.functions.invoke("process-email-queue", {
      body: { source: "mypx-dashboard-manual" },
    });

    await fetchQueue();
    setProcessingNow(false);
  };

  const counts = {
    pending: queue.filter((item) => item.status === "pending").length,
    processing: queue.filter((item) => item.status === "processing").length,
    sent: queue.filter((item) => item.status === "sent").length,
    failed: queue.filter((item) => item.status === "failed").length,
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-violet-100 backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
              <Send size={14} />
              File d’attente PX Sentinel
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Envois progressifs automatisés
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Les emails préparés par l’import massif sont envoyés par le cron
              Sentinel selon leur heure de programmation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchQueue}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:text-slate-950 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>

            <button
              onClick={runProcessorNow}
              disabled={processingNow}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {processingNow ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wand2 size={16} />
              )}
              Lancer Sentinel maintenant
            </button>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QueueStat label="En attente" value={counts.pending} tone="cyan" />
        <QueueStat
          label="En traitement"
          value={counts.processing}
          tone="violet"
        />
        <QueueStat label="Envoyés" value={counts.sent} tone="emerald" />
        <QueueStat label="Échoués" value={counts.failed} tone="rose" />
      </section>

      <div className="rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-violet-100 backdrop-blur-2xl">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            PX Sentinel inspecte la file...
          </div>
        ) : queue.length === 0 ? (
          <EmptyState text="Aucun email en file Sentinel pour le moment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-4">Statut</th>
                  <th className="px-4 py-4">Destinataire</th>
                  <th className="px-4 py-4">Objet</th>
                  <th className="px-4 py-4">Prévu le</th>
                  <th className="px-4 py-4">Envoyé le</th>
                  <th className="px-4 py-4">Erreur</th>
                </tr>
              </thead>

              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-4">
                      <QueueBadge status={item.status || "pending"} />
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-800">
                      {item.recipient_email}
                    </td>
                    <td className="px-4 py-4">{item.subject || "—"}</td>
                    <td className="px-4 py-4">
                      {item.scheduled_at
                        ? new Date(item.scheduled_at).toLocaleString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      {item.sent_at
                        ? new Date(item.sent_at).toLocaleString("fr-FR")
                        : "—"}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-xs text-rose-600">
                      {item.error_message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsHub({ session }: { session: Session }) {
  const [tab, setTab] = useState<"clients" | "follow_ups">("clients");

  const tabs = [
    { key: "clients", label: "Dossiers clients", icon: Users },
    { key: "follow_ups", label: "Actions IA", icon: Bell },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <HubHeader
        icon={<Users size={14} />}
        badge="Portefeuille relationnel"
        title="Dossiers clients et actions prioritaires"
        description="Gère tes fiches, tes relances, tes signaux et ton suivi commercial depuis un seul espace."
      />

      <TabBar tabs={tabs} activeTab={tab} setTab={setTab} />

      {tab === "clients" && <Clients session={session} />}
      {tab === "follow_ups" && <FollowUps session={session} />}
    </div>
  );
}

type AppShellProps = {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  handleLogout: () => Promise<void>;
  unreadEmails: number;
  children: React.ReactNode;
};

function AppShell({
  activeView,
  setActiveView,
  handleLogout,
  unreadEmails,
  children,
}: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f3ea] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.20),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.18),transparent_30%),linear-gradient(135deg,#fff7ed_0%,#f5f3ff_50%,#ecfeff_100%)]" />
      <div className="pointer-events-none fixed left-[-90px] top-[-90px] h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-110px] right-[-110px] h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[1680px]">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          unreadEmails={unreadEmails}
        />

        <main className="w-full min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-5 md:px-6 lg:pb-8 lg:pt-6 xl:px-8">
          <MobileTopBar
            activeView={activeView}
            setActiveView={setActiveView}
            handleLogout={handleLogout}
            unreadEmails={unreadEmails}
          />

          {activeView !== "home" && (
            <div className="mx-auto mb-5 flex w-full max-w-7xl flex-wrap gap-3">
              <button
                onClick={() => setActiveView("home")}
                className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:text-slate-950"
              >
                Retour commandement
              </button>

              <button
                onClick={handleLogout}
                className="hidden rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:text-slate-950 sm:inline-flex"
              >
                Déconnexion
              </button>
            </div>
          )}

          <div className="min-w-0">{children}</div>
        </main>
      </div>

      <MobileNav
        activeView={activeView}
        setActiveView={setActiveView}
        unreadEmails={unreadEmails}
      />
    </div>
  );
}

type SidebarProps = {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  unreadEmails: number;
};

function Sidebar({ activeView, setActiveView, unreadEmails }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-r border-white/70 bg-white/55 p-6 shadow-2xl shadow-violet-100 backdrop-blur-2xl lg:block">
      <div className="overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-300/40">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white">
            <Sparkles size={20} />
          </div>

          <div>
            <p className="text-xl font-black">MyPX</p>
            <p className="text-xs font-bold text-white/45">
              Portfolio Intelligence
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            <Wand2 size={14} />
            PX Sentinel actif
          </div>

          <p className="text-sm leading-6 text-white/65">
            Analyse les relations, détecte les signaux et priorise les actions à
            fort impact.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.view;
          const showBadge = item.view === "email_hub" && unreadEmails > 0;

          return (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition active:scale-[0.98] ${
                active
                  ? "bg-slate-950 text-white shadow-xl shadow-slate-300"
                  : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={17} />
                {item.label}
              </span>

              {showBadge && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                  {unreadEmails}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function MobileTopBar({
  activeView,
  setActiveView,
  handleLogout,
  unreadEmails,
}: SidebarProps & {
  handleLogout: () => Promise<void>;
}) {
  const currentItem = navItems.find((item) => item.view === activeView);
  const CurrentIcon = currentItem?.icon || LayoutDashboard;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-3 shadow-xl shadow-violet-100 backdrop-blur-2xl lg:hidden">
      <button
        onClick={() => setActiveView("home")}
        className="flex min-w-0 items-center gap-3"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Sparkles size={19} />
        </div>

        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-black text-slate-950">MyPX</p>
          <p className="flex items-center gap-1 truncate text-xs font-bold text-slate-500">
            <CurrentIcon size={13} />
            {currentItem?.label || "Commandement"}
          </p>
        </div>
      </button>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveView("email_hub")}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
          aria-label="Transmissions"
        >
          <InboxIcon size={18} />
          {unreadEmails > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
              {unreadEmails}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
          aria-label="Déconnexion"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}

function MobileNav({ activeView, setActiveView, unreadEmails }: SidebarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/75 bg-white/90 px-2 py-2 shadow-2xl backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-xl justify-around gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.view;
          const showBadge = item.view === "email_hub" && unreadEmails > 0;

          return (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              className={`relative flex min-w-[76px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-black transition active:scale-[0.97] ${
                active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-300"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon size={17} />
              <span className="max-w-[70px] truncate">{item.label}</span>

              {showBadge && (
                <span className="absolute right-2 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">
                  {unreadEmails}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HubHeader({
  icon,
  badge,
  title,
  description,
}: {
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-violet-100 backdrop-blur-2xl sm:p-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
        {icon}
        {badge}
      </div>

      <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function TabBar<T extends string>({
  tabs,
  activeTab,
  setTab,
}: {
  tabs: readonly {
    key: T;
    label: string;
    icon: React.ElementType;
  }[];
  activeTab: T;
  setTab: (tab: T) => void;
}) {
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.key;

        return (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.98] ${
              active
                ? "bg-slate-950 text-white shadow-xl shadow-slate-300"
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Icon size={17} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-black text-slate-800">{title}</p>
      </div>

      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function QueueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "violet" | "emerald" | "rose";
}) {
  const classes = {
    cyan: "bg-cyan-50 text-cyan-800 border-cyan-100",
    violet: "bg-violet-50 text-violet-800 border-violet-100",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
    rose: "bg-rose-50 text-rose-800 border-rose-100",
  };

  return (
    <div className={`rounded-[2rem] border p-5 shadow-xl ${classes[tone]}`}>
      <p className="text-sm font-black">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function QueueBadge({ status }: { status: string }) {
  const classes =
    status === "sent"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "failed"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : status === "processing"
      ? "bg-violet-50 text-violet-700 border-violet-100"
      : "bg-cyan-50 text-cyan-700 border-cyan-100";

  const label =
    status === "sent"
      ? "Envoyé"
      : status === "failed"
      ? "Échoué"
      : status === "processing"
      ? "En traitement"
      : "En attente";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${classes}`}
    >
      {label}
    </span>
  );
}

function PriorityCard({
  title,
  value,
  subtitle,
  tone,
  emoji,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "orange" | "amber" | "cyan" | "violet";
  emoji: string;
}) {
  const classes = {
    orange: "border-orange-100 bg-orange-50 text-orange-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-900",
    violet: "border-violet-100 bg-violet-50 text-violet-900",
  };

  const subClasses = {
    orange: "text-orange-700",
    amber: "text-amber-700",
    cyan: "text-cyan-700",
    violet: "text-violet-700",
  };

  return (
    <div
      className={`rounded-[2rem] border p-5 shadow-xl transition hover:-translate-y-1 ${classes[tone]}`}
    >
      <div
        className={`flex items-center gap-2 text-sm font-black ${subClasses[tone]}`}
      >
        <span>{emoji}</span>
        {title}
      </div>

      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className={`mt-1 text-xs font-bold ${subClasses[tone]}`}>{subtitle}</p>
    </div>
  );
}

function MiniSignal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function ReminderItem({
  children,
  tone,
  onAction,
}: {
  children: React.ReactNode;
  tone: "pink" | "fuchsia" | "slate" | "amber" | "rose" | "sky";
  onAction?: () => void;
}) {
  const classes = {
    pink: "border-pink-100 bg-pink-50 text-pink-800",
    fuchsia: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-800",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    sky: "border-sky-100 bg-sky-50 text-sky-800",
  };

  return (
    <div
      className={`rounded-3xl border p-4 text-sm font-bold leading-6 ${classes[tone]}`}
    >
      {children}

      {onAction && (
        <button
          onClick={onAction}
          className="mt-2 block text-xs font-black underline"
        >
          Agir maintenant →
        </button>
      )}
    </div>
  );
}
