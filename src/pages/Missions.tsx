import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Props = {
  session: Session;
};

type MissionStatus = "todo" | "in_progress" | "done";
type MissionPriority = "low" | "normal" | "high" | "urgent";
type MissionSource =
  | "manual"
  | "birthday"
  | "follow_up"
  | "inbound_email"
  | "ai_signal";

type Client = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email?: string | null;
  phone?: string | null;
  birthday: string | null;
  last_contact_at?: string | null;
  created_at?: string | null;
};

type Mission = {
  id: string;
  user_id: string;
  client_id: string | null;
  source_ref_id: string | null;
  action_url?: string | null;
  action_type?: string | null;
  meta?: Record<string, unknown> | null;
  title: string;
  description: string | null;
  status: MissionStatus;
  priority: MissionPriority;
  source: MissionSource;
  due_date: string | null;
  position: number;
  created_by_ai: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: Client | null;
};

type FollowUp = {
  id: string;
  title: string | null;
  note: string | null;
  due_date: string | null;
  status: string | null;
  client_id: string | null;
  clients?: Client | null;
};

type InboundEmail = {
  id: string;
  client_id: string | null;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  status: string | null;
  created_at: string;
  clients?: Client | null;
};

const columns: { key: MissionStatus; title: string; subtitle: string }[] = [
  { key: "todo", title: "À faire", subtitle: "Actions détectées" },
  {
    key: "in_progress",
    title: "En cours",
    subtitle: "Missions prises en main",
  },
  { key: "done", title: "Terminé", subtitle: "Historique exécuté" },
];

const todayIso = new Date().toISOString().slice(0, 10);

function getClientName(client?: Client | null) {
  if (!client) return "Contact";
  const full = [client.first_name, client.last_name].filter(Boolean).join(" ");
  return full || client.company || "Contact";
}

function isBirthdayToday(birthday?: string | null) {
  if (!birthday) return false;
  return birthday.slice(5, 10) === todayIso.slice(5, 10);
}

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  return cleaned;
}

function whatsAppPhone(phone?: string | null) {
  return normalizePhone(phone).replace(/\D/g, "");
}

function priorityStyle(priority: MissionPriority) {
  if (priority === "urgent") return "bg-rose-100 text-rose-700 border-rose-200";
  if (priority === "high")
    return "bg-orange-100 text-orange-700 border-orange-200";
  if (priority === "low") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-indigo-100 text-indigo-700 border-indigo-200";
}

function sourceLabel(source: MissionSource) {
  if (source === "birthday") return "Anniversaire";
  if (source === "follow_up") return "Relance";
  if (source === "inbound_email") return "Réponse client";
  if (source === "ai_signal") return "PX Sentinel";
  return "Manuel";
}

function priorityLabel(priority: MissionPriority) {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "Haute";
  if (priority === "low") return "Basse";
  return "Normale";
}

export default function Missions({ session }: Props) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<MissionPriority>("normal");

  const grouped = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.key] = missions
        .filter((mission) => mission.status === column.key)
        .sort(
          (a, b) =>
            a.position - b.position ||
            +new Date(b.created_at) - +new Date(a.created_at)
        );

      return acc;
    }, {} as Record<MissionStatus, Mission[]>);
  }, [missions]);

  const missionStats = useMemo(() => {
    return {
      total: missions.length,
      urgent: missions.filter((mission) => mission.priority === "urgent")
        .length,
      ai: missions.filter((mission) => mission.created_by_ai).length,
    };
  }, [missions]);

  useEffect(() => {
    loadMissions();

    const channel = supabase
      .channel(`missions-live-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missions",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          loadMissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  async function loadMissions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("missions")
      .select(
        `
        *,
        clients (
          id,
          first_name,
          last_name,
          company,
          email,
          phone,
          birthday,
          last_contact_at,
          created_at
        )
      `
      )
      .eq("user_id", session.user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMissions(data as Mission[]);
    }

    setLoading(false);
  }

  async function syncTodayMissions() {
    setSyncing(true);

    const { data: freshMissions } = await supabase
      .from("missions")
      .select("id, source, source_ref_id, client_id, due_date, title")
      .eq("user_id", session.user.id);

    const existingKeys = new Set(
      ((freshMissions as Mission[]) || []).map((mission) =>
        mission.source_ref_id
          ? `${mission.source}:${mission.source_ref_id}`
          : `${mission.source}:${mission.client_id || ""}:${
              mission.due_date || ""
            }:${mission.title}`
      )
    );

    const inserts: Partial<Mission>[] = [];

    const { data: clients } = await supabase
      .from("clients")
      .select(
        "id, first_name, last_name, company, birthday, email, phone, last_contact_at, created_at"
      )
      .eq("user_id", session.user.id);

    (clients as Client[] | null)
      ?.filter((client) => isBirthdayToday(client.birthday))
      .forEach((client) => {
        const title = `Souhaiter l’anniversaire à ${getClientName(client)}`;
        const key = `birthday:${client.id}`;

        if (!existingKeys.has(key)) {
          inserts.push({
            user_id: session.user.id,
            client_id: client.id,
            source_ref_id: client.id,
            title,
            description: "Préparer un message personnalisé et chaleureux.",
            status: "todo",
            priority: "high",
            source: "birthday",
            due_date: todayIso,
            created_by_ai: true,
            action_type: "birthday",
            meta: { detected_at: new Date().toISOString() },
          });
        }
      });

    const { data: followUps } = await supabase
      .from("follow_ups")
      .select(
        `
        id,
        title,
        note,
        due_date,
        status,
        client_id,
        clients (
          id,
          first_name,
          last_name,
          company,
          email,
          phone,
          birthday
        )
      `
      )
      .eq("user_id", session.user.id)
      .lte("due_date", todayIso)
      .neq("status", "done");

    (followUps as FollowUp[] | null)?.forEach((followUp) => {
      const clientName = getClientName(followUp.clients);
      const title = followUp.title || `Relancer ${clientName}`;
      const key = `follow_up:${followUp.id}`;

      if (!existingKeys.has(key)) {
        inserts.push({
          user_id: session.user.id,
          client_id: followUp.client_id,
          source_ref_id: followUp.id,
          title,
          description: followUp.note || `Relance prévue pour ${clientName}.`,
          status: "todo",
          priority: "normal",
          source: "follow_up",
          due_date: followUp.due_date || todayIso,
          created_by_ai: true,
          action_type: "follow_up",
          meta: { detected_at: new Date().toISOString() },
        });
      }
    });

    const { data: inboundEmails } = await supabase
      .from("inbound_emails")
      .select(
        `
        id,
        client_id,
        from_email,
        from_name,
        subject,
        status,
        created_at,
        clients (
          id,
          first_name,
          last_name,
          company,
          email,
          phone,
          birthday
        )
      `
      )
      .eq("user_id", session.user.id)
      .or("status.is.null,status.neq.read")
      .order("created_at", { ascending: false })
      .limit(30);

    (inboundEmails as InboundEmail[] | null)?.forEach((email) => {
      const clientName = email.clients
        ? getClientName(email.clients)
        : email.from_name || email.from_email || "un contact";

      const title = `Répondre à ${clientName}`;
      const key = `inbound_email:${email.id}`;

      if (!existingKeys.has(key)) {
        inserts.push({
          user_id: session.user.id,
          client_id: email.client_id,
          source_ref_id: email.id,
          title,
          description:
            email.subject ||
            `Nouvelle réponse reçue de ${email.from_email || "ce contact"}.`,
          status: "todo",
          priority: "urgent",
          source: "inbound_email",
          due_date: todayIso,
          created_by_ai: true,
          action_type: "reply_email",
          meta: {
            from_email: email.from_email,
            from_name: email.from_name,
            received_at: email.created_at,
          },
        });
      }
    });

    const inactiveLimit = new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 60
    ).toISOString();

    const { data: inactiveClients } = await supabase
      .from("clients")
      .select(
        "id, first_name, last_name, company, email, phone, birthday, last_contact_at, created_at"
      )
      .eq("user_id", session.user.id)
      .or(
        `last_contact_at.lt.${inactiveLimit},and(last_contact_at.is.null,created_at.lt.${inactiveLimit})`
      )
      .limit(20);

    (inactiveClients as Client[] | null)?.forEach((client) => {
      const title = `Réactiver ${getClientName(client)}`;
      const key = `ai_signal:${client.id}`;

      if (!existingKeys.has(key)) {
        inserts.push({
          user_id: session.user.id,
          client_id: client.id,
          source_ref_id: client.id,
          title,
          description:
            "PX Sentinel détecte une relation inactive depuis plus de 60 jours. Prépare une relance personnalisée.",
          status: "todo",
          priority: "urgent",
          source: "ai_signal",
          due_date: todayIso,
          created_by_ai: true,
          action_type: "reactivation",
          meta: {
            detected_at: new Date().toISOString(),
            reason: "inactive_60_days",
          },
        });
      }
    });

    if (inserts.length > 0) {
      await supabase.from("missions").insert(
        inserts.map((mission, index) => ({
          ...mission,
          position: index,
        }))
      );
    }

    await loadMissions();
    setSyncing(false);
  }

  async function createMission() {
    if (!newTitle.trim()) return;

    setSaving(true);

    const currentTodoCount = missions.filter(
      (mission) => mission.status === "todo"
    ).length;

    const { error } = await supabase.from("missions").insert({
      user_id: session.user.id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      priority: newPriority,
      status: "todo",
      source: "manual",
      due_date: todayIso,
      created_by_ai: false,
      position: currentTodoCount,
      meta: {},
    });

    if (!error) {
      setNewTitle("");
      setNewDescription("");
      setNewPriority("normal");
      setShowCreate(false);
      await loadMissions();
    }

    setSaving(false);
  }

  async function moveMission(
    mission: Mission,
    status: MissionStatus,
    position?: number
  ) {
    const updates: Partial<Mission> = {
      status,
      position: typeof position === "number" ? position : mission.position,
      updated_at: new Date().toISOString(),
      completed_at: status === "done" ? new Date().toISOString() : null,
    };

    setMissions((prev) =>
      prev.map((item) =>
        item.id === mission.id ? { ...item, ...updates } : item
      )
    );

    await supabase
      .from("missions")
      .update(updates)
      .eq("id", mission.id)
      .eq("user_id", session.user.id);

    if (
      status === "done" &&
      mission.source === "follow_up" &&
      mission.source_ref_id
    ) {
      await supabase
        .from("follow_ups")
        .update({ status: "done" })
        .eq("id", mission.source_ref_id)
        .eq("user_id", session.user.id);
    }

    if (
      status === "done" &&
      mission.source === "inbound_email" &&
      mission.source_ref_id
    ) {
      await supabase
        .from("inbound_emails")
        .update({ status: "read" })
        .eq("id", mission.source_ref_id)
        .eq("user_id", session.user.id);
    }
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId as MissionStatus;
    const destinationStatus = destination.droppableId as MissionStatus;

    const sourceItems = Array.from(grouped[sourceStatus] || []);
    const destinationItems =
      sourceStatus === destinationStatus
        ? sourceItems
        : Array.from(grouped[destinationStatus] || []);

    const [draggedMission] = sourceItems.splice(source.index, 1);
    if (!draggedMission) return;

    const movedMission: Mission = {
      ...draggedMission,
      status: destinationStatus,
      position: destination.index,
      updated_at: new Date().toISOString(),
      completed_at:
        destinationStatus === "done" ? new Date().toISOString() : null,
    };

    destinationItems.splice(destination.index, 0, movedMission);

    const updatedSource = sourceItems.map((mission, index) => ({
      ...mission,
      position: index,
    }));

    const updatedDestination = destinationItems.map((mission, index) => ({
      ...mission,
      status: destinationStatus,
      position: index,
      completed_at:
        destinationStatus === "done"
          ? mission.completed_at || new Date().toISOString()
          : null,
    }));

    const otherMissions = missions.filter((mission) => {
      if (mission.id === draggedMission.id) return false;
      if (mission.status === sourceStatus) return false;
      if (mission.status === destinationStatus) return false;
      return true;
    });

    const nextMissions =
      sourceStatus === destinationStatus
        ? [...otherMissions, ...updatedDestination]
        : [...otherMissions, ...updatedSource, ...updatedDestination];

    setMissions(nextMissions);

    const rowsToUpdate =
      sourceStatus === destinationStatus
        ? updatedDestination
        : [...updatedSource, ...updatedDestination];

    await Promise.all(
      rowsToUpdate.map((mission) =>
        supabase
          .from("missions")
          .update({
            status: mission.status,
            position: mission.position,
            completed_at: mission.completed_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mission.id)
          .eq("user_id", session.user.id)
      )
    );

    if (destinationStatus === "done") {
      await moveMission(movedMission, "done", destination.index);
    }
  }

  async function deleteMission(id: string) {
    setMissions((prev) => prev.filter((mission) => mission.id !== id));
    await supabase
      .from("missions")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
  }

  function openClient(clientId: string | null) {
    if (!clientId) return;
    window.history.pushState(
      {},
      "",
      `/dashboard?view=clients&client_id=${clientId}`
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function openEmailHub(clientId: string | null) {
    const url = clientId
      ? `/dashboard?view=email_hub&client_id=${clientId}`
      : "/dashboard?view=email_hub";
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 pb-28 pt-6 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
                <Sparkles size={16} />
                Mission Control V2
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                Actions relationnelles
              </h1>

              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-300 sm:text-lg">
                PX Sentinel transforme tes anniversaires, relances, réponses
                clients et signaux dormants en missions concrètes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={syncTodayMissions}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 shadow-xl transition hover:scale-[1.02] disabled:opacity-60"
              >
                {syncing ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                Scanner
              </button>

              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 shadow-xl transition hover:scale-[1.02]"
              >
                <Plus size={18} />
                Nouvelle carte
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {columns.map((column) => (
              <div
                key={column.key}
                className="rounded-3xl border border-white/10 bg-white/10 p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  {column.title}
                </p>
                <p className="mt-2 text-3xl font-black">
                  {grouped[column.key]?.length || 0}
                </p>
              </div>
            ))}

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Urgent
              </p>
              <p className="mt-2 text-3xl font-black">{missionStats.urgent}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                IA
              </p>
              <p className="mt-2 text-3xl font-black">{missionStats.ai}</p>
            </div>
          </div>
        </section>

        {showCreate && (
          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Créer une mission</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Ex : rappeler Jean pour le devis"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-violet-400"
              />

              <input
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Description optionnelle"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-violet-400"
              />

              <select
                value={newPriority}
                onChange={(event) =>
                  setNewPriority(event.target.value as MissionPriority)
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none"
              >
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <button
              onClick={createMission}
              disabled={saving || !newTitle.trim()}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Plus size={18} />
              )}
              Ajouter
            </button>
          </section>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="animate-spin text-slate-500" size={34} />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <section className="mt-8 grid gap-5 lg:grid-cols-3">
              {columns.map((column) => (
                <Droppable droppableId={column.key} key={column.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`rounded-[2rem] border border-white bg-white/80 p-4 shadow-xl backdrop-blur-xl transition ${
                        snapshot.isDraggingOver ? "ring-4 ring-cyan-200" : ""
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-black">
                            {column.title}
                          </h2>
                          <p className="text-sm font-bold text-slate-500">
                            {column.subtitle}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black">
                          {grouped[column.key]?.length || 0}
                        </div>
                      </div>

                      <div className="min-h-[160px] space-y-3">
                        {grouped[column.key]?.length === 0 && (
                          <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center">
                            <Circle
                              className="mx-auto mb-2 text-slate-300"
                              size={28}
                            />
                            <p className="text-sm font-bold text-slate-400">
                              Aucune mission ici
                            </p>
                          </div>
                        )}

                        {grouped[column.key]?.map((mission, index) => (
                          <Draggable
                            draggableId={mission.id}
                            index={index}
                            key={mission.id}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <article
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                                  dragSnapshot.isDragging
                                    ? "rotate-1 shadow-2xl"
                                    : ""
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="mb-3 flex flex-wrap gap-2">
                                      <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white">
                                        {sourceLabel(mission.source)}
                                      </span>

                                      <span
                                        className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${priorityStyle(
                                          mission.priority
                                        )}`}
                                      >
                                        {priorityLabel(mission.priority)}
                                      </span>
                                    </div>

                                    <h3 className="text-lg font-black leading-snug">
                                      {mission.title}
                                    </h3>

                                    {mission.description && (
                                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                        {mission.description}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => deleteMission(mission.id)}
                                    className="rounded-full p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
                                  {mission.clients && (
                                    <button
                                      onClick={() =>
                                        openClient(mission.client_id)
                                      }
                                      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-2 text-violet-700"
                                    >
                                      <UserRound size={14} />
                                      {getClientName(mission.clients)}
                                    </button>
                                  )}

                                  {mission.due_date && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2">
                                      <CalendarDays size={14} />
                                      {mission.due_date}
                                    </span>
                                  )}

                                  {mission.completed_at && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
                                      <CheckCircle2 size={14} />
                                      Terminé
                                    </span>
                                  )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {mission.status !== "todo" && (
                                    <button
                                      onClick={() =>
                                        moveMission(mission, "todo")
                                      }
                                      className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                                    >
                                      À faire
                                    </button>
                                  )}

                                  {mission.status !== "in_progress" && (
                                    <button
                                      onClick={() =>
                                        moveMission(mission, "in_progress")
                                      }
                                      className="inline-flex items-center gap-1 rounded-2xl bg-indigo-100 px-3 py-2 text-xs font-black text-indigo-700"
                                    >
                                      <Clock3 size={14} />
                                      En cours
                                    </button>
                                  )}

                                  {mission.status !== "done" && (
                                    <button
                                      onClick={() =>
                                        moveMission(mission, "done")
                                      }
                                      className="inline-flex items-center gap-1 rounded-2xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700"
                                    >
                                      Terminer
                                      <ArrowRight size={14} />
                                    </button>
                                  )}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {mission.clients?.phone && (
                                    <a
                                      href={`tel:${normalizePhone(
                                        mission.clients.phone
                                      )}`}
                                      className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                                    >
                                      <Phone size={14} />
                                      Appeler
                                    </a>
                                  )}

                                  {mission.clients?.email && (
                                    <button
                                      onClick={() =>
                                        openEmailHub(mission.client_id)
                                      }
                                      className="inline-flex items-center gap-1 rounded-xl bg-cyan-100 px-3 py-2 text-xs font-black text-cyan-700"
                                    >
                                      <Mail size={14} />
                                      Email
                                    </button>
                                  )}

                                  {mission.clients?.phone && (
                                    <a
                                      href={`https://wa.me/${whatsAppPhone(
                                        mission.clients.phone
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700"
                                    >
                                      <MessageCircle size={14} />
                                      WhatsApp
                                    </a>
                                  )}
                                </div>
                              </article>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </section>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
