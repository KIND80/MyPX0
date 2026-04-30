import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import {
  BellPlus,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type FollowUpsProps = {
  session: Session;
};

type FollowUp = {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  note: string | null;
  due_date: string | null;
  status: string | null;
  priority: string | null;
  created_at: string;
};

type ClientOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type FollowUpForm = {
  client_id: string;
  title: string;
  note: string;
  due_date: string;
  priority: string;
};

const initialForm: FollowUpForm = {
  client_id: "",
  title: "",
  note: "",
  due_date: "",
  priority: "normal",
};

const priorityClassMap: Record<string, string> = {
  low: "bg-slate-50 text-slate-600 border-slate-100",
  normal: "bg-sky-50 text-sky-700 border-sky-100",
  high: "bg-amber-50 text-amber-700 border-amber-100",
  urgent: "bg-rose-50 text-rose-700 border-rose-100",
};

const statusClassMap: Record<string, string> = {
  pending: "bg-slate-50 text-slate-600 border-slate-100",
  done: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default function FollowUps({ session }: FollowUpsProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FollowUpForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(true);

  const fetchFollowUps = async () => {
    setLoadingFollowUps(true);

    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("user_id", session.user.id)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      alert(error.message);
    } else {
      setFollowUps((data as FollowUp[]) || []);
    }

    setLoadingFollowUps(false);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
    } else {
      setClients((data as ClientOption[]) || []);
    }
  };

  useEffect(() => {
    fetchFollowUps();
    fetchClients();
  }, [session.user.id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_id: session.user.id,
      client_id: form.client_id || null,
      title: form.title,
      note: form.note || null,
      due_date: form.due_date || null,
      priority: form.priority || "normal",
      status: "pending",
    };

    const { error } = await supabase.from("follow_ups").insert(payload);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (form.client_id) {
      await supabase
        .from("clients")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", form.client_id)
        .eq("user_id", session.user.id);
    }

    setForm(initialForm);
    setShowModal(false);
    fetchFollowUps();
  };

  const handleMarkDone = async (id: string) => {
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "done" })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchFollowUps();
  };

  const clientMap = useMemo(() => {
    return new Map(
      clients.map((client) => [
        client.id,
        [client.first_name, client.last_name].filter(Boolean).join(" ") ||
          client.email ||
          "Client",
      ])
    );
  }, [clients]);

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((item) => {
      const clientName = item.client_id ? clientMap.get(item.client_id) : "";
      const full = [
        item.title,
        item.note,
        item.status,
        item.priority,
        clientName,
      ]
        .join(" ")
        .toLowerCase();

      return full.includes(search.toLowerCase());
    });
  }, [followUps, search, clientMap]);

  const pendingCount = followUps.filter(
    (item) => item.status !== "done"
  ).length;

  const doneCount = followUps.filter((item) => item.status === "done").length;

  const urgentCount = followUps.filter(
    (item) => item.priority === "urgent" && item.status !== "done"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
            <Sparkles size={14} />
            Suivi commercial
          </div>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            Relances
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Planifie, visualise et clôture tes relances clients dans un espace
            clair, rapide et mobile-first.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black"
        >
          <BellPlus size={16} />
          Nouvelle relance
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard label="Relances en cours" value={pendingCount} />
        <StatCard label="Relances terminées" value={doneCount} />
        <StatCard label="Urgentes" value={urgentCount} urgent />
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une relance, un client, une priorité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        {loadingFollowUps ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Chargement des relances...
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-300">
              <CalendarClock size={26} />
            </div>

            <h3 className="text-lg font-black text-slate-950">
              Aucune relance pour le moment
            </h3>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Crée ta première relance pour structurer le suivi commercial de
              ton portefeuille.
            </p>

            <button
              onClick={() => setShowModal(true)}
              className="mt-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300"
            >
              Ajouter une relance
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredFollowUps.map((item) => (
                <FollowUpMobileCard
                  key={item.id}
                  item={item}
                  clientName={
                    item.client_id
                      ? clientMap.get(item.client_id) || "—"
                      : "—"
                  }
                  onDone={() => handleMarkDone(item.id)}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Titre</th>
                    <th className="px-4 py-4">Client</th>
                    <th className="px-4 py-4">Échéance</th>
                    <th className="px-4 py-4">Priorité</th>
                    <th className="px-4 py-4">Statut</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFollowUps.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 align-top transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">
                          {item.title}
                        </p>

                        {item.note && (
                          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                            {item.note}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 font-medium">
                        {item.client_id
                          ? clientMap.get(item.client_id) || "—"
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        {item.due_date
                          ? new Date(item.due_date).toLocaleString("fr-FR")
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          value={item.priority || "normal"}
                          className={
                            priorityClassMap[item.priority || "normal"] ||
                            priorityClassMap.normal
                          }
                        />
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          value={item.status || "pending"}
                          className={
                            statusClassMap[item.status || "pending"] ||
                            statusClassMap.pending
                          }
                        />
                      </td>

                      <td className="px-4 py-4">
                        {item.status !== "done" && (
                          <button
                            onClick={() => handleMarkDone(item.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm"
                          >
                            <CheckCircle2 size={14} />
                            Marquer fait
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/75 bg-white/90 p-5 shadow-2xl shadow-violet-300/40 backdrop-blur-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                  <BellPlus size={14} />
                  Nouvelle relance
                </div>

                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  Planifier une relance
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ajoute une échéance claire pour ne plus laisser passer un
                  suivi important.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:text-slate-950"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddFollowUp}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <select
                name="client_id"
                value={form.client_id}
                onChange={handleChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Choisir un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {[client.first_name, client.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                      client.email ||
                      "Client"}
                  </option>
                ))}
              </select>

              <Input
                name="title"
                placeholder="Titre de la relance"
                value={form.title}
                onChange={handleChange}
                required
              />

              <Input
                name="due_date"
                type="datetime-local"
                placeholder="Date"
                value={form.due_date}
                onChange={handleChange}
              />

              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>

              <textarea
                name="note"
                placeholder="Note ou contexte"
                value={form.note}
                onChange={handleChange}
                className="min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 md:col-span-2"
              />

              <div className="flex justify-end gap-3 pt-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:text-slate-950"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <BellPlus size={16} />
                      Enregistrer la relance
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  urgent,
}: {
  label: string;
  value: number;
  urgent?: boolean;
}) {
  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        </div>

        <div
          className={`rounded-2xl p-3 shadow-lg ${
            urgent
              ? "bg-rose-100 text-rose-700 shadow-rose-100"
              : "bg-slate-950 text-white shadow-slate-300"
          }`}
        >
          {urgent ? <Sparkles size={18} /> : <Clock3 size={18} />}
        </div>
      </div>
    </div>
  );
}

function Badge({ value, className }: { value: string; className: string }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {value}
    </span>
  );
}

function FollowUpMobileCard({
  item,
  clientName,
  onDone,
}: {
  item: FollowUp;
  clientName: string;
  onDone: () => void;
}) {
  return (
    <div className="rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">{item.title}</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
            <User size={14} />
            {clientName}
          </p>
        </div>

        <Badge
          value={item.priority || "normal"}
          className={
            priorityClassMap[item.priority || "normal"] ||
            priorityClassMap.normal
          }
        />
      </div>

      {item.note && (
        <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-500">
          {item.note}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <CalendarClock size={14} />
          {item.due_date
            ? new Date(item.due_date).toLocaleString("fr-FR")
            : "Sans date"}
        </p>

        {item.status !== "done" ? (
          <button
            onClick={onDone}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
          >
            <CheckCircle2 size={14} />
            Fait
          </button>
        ) : (
          <Badge value="done" className={statusClassMap.done} />
        )}
      </div>
    </div>
  );
}

function Input({
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
    />
  );
}