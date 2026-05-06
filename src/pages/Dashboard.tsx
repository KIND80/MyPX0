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
import {
  Bell,
  Bot,
  Cake,
  CircleAlert,
  Clock3,
  Flame,
  Inbox as InboxIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Plus,
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

type ActiveView = "home" | "clients" | "email_hub" | "radar_ai" | "settings";

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

const onboardingSteps = [
  {
    title: "Connecte ton email MyPX",
    description:
      "Ton adresse conseiller reçoit les réponses clients directement dans MyPX.",
  },
  {
    title: "Ajoute tes clients",
    description:
      "Centralise ton portefeuille avec statut, potentiel, groupe et relances.",
  },
  {
    title: "Personnalise ton Welcome",
    description:
      "Prépare un message d’accueil automatique propre et professionnel.",
  },
  {
    title: "Anime ton portefeuille",
    description:
      "Relances, anniversaires, campagnes et Radar IA t’aident à rester présent.",
  },
];

const navItems: {
  view: ActiveView;
  label: string;
  icon: React.ElementType;
}[] = [
  { view: "home", label: "Dashboard", icon: LayoutDashboard },
  { view: "email_hub", label: "Email", icon: InboxIcon },
  { view: "radar_ai", label: "Radar IA", icon: Bot },
  { view: "clients", label: "Clients", icon: Users },
  { view: "settings", label: "Paramètres", icon: SettingsIcon },
];

function getInitialView(): ActiveView {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (
    view === "inbox" ||
    view === "campaigns" ||
    view === "welcome" ||
    view === "email_logs"
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

    const [clientsRes, followUpsRes, campaignsRes, inboxRes] =
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

  const stats = [
    {
      label: "Clients",
      value: loadingStats ? "..." : String(clients.length),
      sub: "Portefeuille total",
      icon: Users,
    },
    {
      label: "Emails non lus",
      value: loadingStats ? "..." : String(unreadEmails),
      sub: "Réponses clients reçues",
      icon: InboxIcon,
    },
    {
      label: "Relances dues",
      value: loadingStats ? "..." : String(dueFollowUps.length),
      sub: "À traiter maintenant",
      icon: Clock3,
    },
    {
      label: "Pipeline",
      value: loadingStats
        ? "..."
        : `${pipelineAmount.toLocaleString("fr-FR")}€`,
      sub: "Potentiel estimé",
      icon: WalletCards,
    },
  ];

  const viewComponents: Record<Exclude<ActiveView, "home">, React.ReactNode> = {
    radar_ai: <RadarAI session={session} />,
    email_hub: <EmailHub session={session} />,
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
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur-xl">
              <Bot size={14} />
              Portfolio Intelligence
            </div>

            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
              Bonjour, {userName}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              Ton cockpit MyPX centralise tes clients, réponses email, relances,
              campagnes et opportunités IA.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
            <button
              onClick={() => setActiveView("email_hub")}
              className="relative inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 shadow-xl shadow-violet-100 transition hover:-translate-y-0.5"
            >
              <InboxIcon size={17} />
              Email
              {unreadEmails > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                  {unreadEmails}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView("clients")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black"
            >
              <Plus size={17} />
              Gérer les clients
            </button>
          </div>
        </header>

        {showOnboarding && (
          <section className="mb-6 overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-2xl shadow-violet-100 backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                  <Sparkles size={14} />
                  Workflow conseillé
                </div>

                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Fais vivre ton portefeuille sans effort.
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  MyPX devient ton assistant relationnel : il garde le lien,
                  détecte les signaux et t’aide à agir au bon moment.
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
                    Étape {index + 1}
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === "Emails non lus")
                    setActiveView("email_hub");
                  if (item.label === "Clients") setActiveView("clients");
                  if (item.label === "Relances dues") setActiveView("clients");
                }}
                className="rounded-[2rem] border border-white/80 bg-white/75 p-5 text-left shadow-xl shadow-violet-100/50 backdrop-blur-2xl transition hover:-translate-y-1"
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

                  <div className="shrink-0 rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-300">
                    <Icon size={18} />
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <PriorityCard
            title="Aujourd’hui"
            value={loadingStats ? "..." : String(todayFollowUps.length)}
            subtitle="Relances à traiter"
            tone="orange"
            emoji="🔥"
          />

          <PriorityCard
            title="Réponses client"
            value={loadingStats ? "..." : String(unreadEmails)}
            subtitle="Emails non lus"
            tone="amber"
            emoji="📩"
          />

          <PriorityCard
            title="Dormants"
            value={loadingStats ? "..." : String(inactiveClients90.length)}
            subtitle="90+ jours sans contact"
            tone="cyan"
            emoji="💡"
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <DashboardCard
            icon={<Flame size={18} className="text-orange-500" />}
            title="Top clients chauds"
          >
            {hotClients.length === 0 ? (
              <EmptyState text="Aucun client scoré pour le moment." />
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
                        {client.group_name || "Sans groupe"} •{" "}
                        {client.status || "prospect"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-orange-200 px-3 py-1 text-xs font-black text-orange-900">
                      {client.score ?? 0}
                    </span>
                  </div>

                  <button
                    onClick={() => openClientFromDashboard(client.id)}
                    className="mt-3 text-xs font-black text-orange-700 hover:underline"
                  >
                    Ouvrir fiche →
                  </button>
                </div>
              ))
            )}
          </DashboardCard>

          <DashboardCard
            icon={<CircleAlert size={18} className="text-violet-600" />}
            title="Rappels intelligents"
          >
            {todayFollowUps.length === 0 &&
            dueFollowUps.length === 0 &&
            urgentFollowUps.length === 0 &&
            birthdaysToday.length === 0 &&
            upcomingBirthdays.length === 0 &&
            inactiveClients90.length === 0 ? (
              <EmptyState text="Aucun rappel critique pour le moment." />
            ) : (
              <>
                {birthdaysToday.map((client) => (
                  <ReminderItem
                    key={`birthday-${client.id}`}
                    tone="pink"
                    onAction={() => openClientFromDashboard(client.id)}
                  >
                    🎂 Anniversaire aujourd’hui :{" "}
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
                    Aujourd’hui : {item.title}
                  </ReminderItem>
                ))}

                {dueFollowUps.slice(0, 3).map((item) => (
                  <ReminderItem
                    key={`due-${item.id}`}
                    tone="amber"
                    onAction={() => setActiveView("clients")}
                  >
                    En retard : {item.title}
                  </ReminderItem>
                ))}

                {urgentFollowUps.slice(0, 2).map((item) => (
                  <ReminderItem
                    key={`urgent-${item.id}`}
                    tone="rose"
                    onAction={() => setActiveView("clients")}
                  >
                    Urgent : {item.title}
                  </ReminderItem>
                ))}

                {inactiveClients90.slice(0, 3).map((client) => (
                  <ReminderItem
                    key={`inactive-${client.id}`}
                    tone="sky"
                    onAction={() => openClientFromDashboard(client.id)}
                  >
                    90+ jours sans contact :{" "}
                    {[client.first_name, client.last_name]
                      .filter(Boolean)
                      .join(" ") || "Client"}
                  </ReminderItem>
                ))}
              </>
            )}
          </DashboardCard>

          <DashboardCard
            icon={<Star size={18} className="text-cyan-600" />}
            title="Relances prioritaires"
          >
            {dueFollowUps.length === 0 ? (
              <EmptyState text="Aucune relance à traiter immédiatement." />
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
                      : "Sans client lié"}
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
                    Traiter la relance →
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
  const [tab, setTab] = useState<"inbox" | "campaigns" | "welcome" | "logs">(
    "inbox"
  );

  const tabs = [
    { key: "inbox", label: "Boîte mail", icon: InboxIcon },
    { key: "campaigns", label: "Campagnes", icon: Megaphone },
    { key: "welcome", label: "Welcome", icon: Mail },
    { key: "logs", label: "Logs", icon: Clock3 },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-5 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-violet-100 backdrop-blur-2xl sm:p-6">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            <InboxIcon size={14} />
            Centre email MyPX
          </div>

          <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
            Emails, campagnes, welcome et logs
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Tout ce qui concerne la relation email est regroupé ici.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;

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
      </div>

      {tab === "inbox" && <Inbox session={session} />}
      {tab === "campaigns" && <Campaigns session={session} />}
      {tab === "welcome" && <WelcomeBuilder session={session} />}
      {tab === "logs" && <EmailLogs session={session} />}
    </div>
  );
}

function ClientsHub({ session }: { session: Session }) {
  const [tab, setTab] = useState<"clients" | "follow_ups">("clients");

  const tabs = [
    { key: "clients", label: "Portefeuille clients", icon: Users },
    { key: "follow_ups", label: "Relances", icon: Bell },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-5 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-violet-100 backdrop-blur-2xl sm:p-6">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            <Users size={14} />
            Portefeuille client
          </div>

          <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
            Clients et relances
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Gère tes fiches clients et ton suivi commercial au même endroit.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;

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
      </div>

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
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ef] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.18),transparent_30%),linear-gradient(135deg,#fff7ed_0%,#f5f3ff_50%,#ecfeff_100%)]" />
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
                Retour dashboard
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
      <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-300/40">
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

        <div className="mt-5 rounded-3xl bg-white/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            <Wand2 size={14} />
            IA active
          </div>

          <p className="text-sm leading-6 text-white/65">
            Ton assistant priorise les relances, détecte les signaux et classe
            tes opportunités.
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
            {currentItem?.label || "Dashboard"}
          </p>
        </div>
      </button>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveView("email_hub")}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
          aria-label="Email"
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
  tone: "orange" | "amber" | "cyan";
  emoji: string;
}) {
  const classes = {
    orange: "border-orange-100 bg-orange-50 text-orange-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-900",
  };

  const subClasses = {
    orange: "text-orange-700",
    amber: "text-amber-700",
    cyan: "text-cyan-700",
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
