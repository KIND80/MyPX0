import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import {
  Bot,
  Building2,
  CalendarDays,
  Download,
  Euro,
  Flame,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ClientDetail from "./ClientDetail";
import { useUserSettings } from "../hooks/useUserSettings";

type ClientsProps = {
  session: Session;
};

type Client = {
  id: string;
  user_id?: string;
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

type NewClientForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  birthday: string;
  group_name: string;
  status: string;
  potential_amount: string;
  notes: string;
};

type WelcomeTemplate = {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  content: string | null;
  is_active: boolean | null;
};

const initialForm: NewClientForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  company: "",
  city: "",
  birthday: "",
  group_name: "",
  status: "prospect",
  potential_amount: "",
  notes: "",
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
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, html },
  });

  if (error) {
    console.error("Erreur fonction send-email:", error);
    return { success: false, error };
  }

  return { success: true, data };
};

const enrichClientWithAI = async ({
  client,
  userId,
}: {
  client: Client;
  userId: string;
}) => {
  if (!client?.id) return;

  await supabase
    .from("clients")
    .update({
      public_enrichment_status: "processing",
    })
    .eq("id", client.id)
    .eq("user_id", userId);

  const { error } = await supabase.functions.invoke("enrich-client", {
    body: {
      client_id: client.id,
      user_id: userId,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      city: client.city,
      notes: client.notes,
    },
  });

  if (error) {
    console.error("Erreur enrich-client:", error);

    await supabase
      .from("clients")
      .update({
        public_enrichment_status: "failed",
      })
      .eq("id", client.id)
      .eq("user_id", userId);
  }
};

const csvEscape = (value: string | number | null | undefined) => {
  const cleanValue = String(value ?? "").replaceAll('"', '""');
  return `"${cleanValue}"`;
};

export default function Clients({ session }: ClientsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewClientForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { settings } = useUserSettings(session);

  const fetchClients = async () => {
    setLoadingClients(true);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      const enrichedClients = ((data as Client[]) || []).map((client) => ({
        ...client,
        score: calculateScore(client),
      }));

      setClients(enrichedClients);
    }

    setLoadingClients(false);
  };

  useEffect(() => {
    fetchClients();
  }, [session.user.id]);

  const groups = useMemo(() => {
    return Array.from(
      new Set(clients.map((client) => client.group_name).filter(Boolean))
    ) as string[];
  }, [clients]);

  const statuses = useMemo(() => {
    return Array.from(
      new Set(clients.map((client) => client.status).filter(Boolean))
    ) as string[];
  }, [clients]);

  const filteredClients = clients.filter((client) => {
    const full = [
      client.first_name,
      client.last_name,
      client.email,
      client.phone,
      client.company,
      client.city,
      client.group_name,
      client.status,
      client.score,
      client.ai_score,
      client.ai_status,
      client.ai_summary,
      client.next_best_action,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = full.includes(search.toLowerCase());
    const matchesGroup =
      groupFilter === "all" || client.group_name === groupFilter;
    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter;

    const score = Number(client.score || 0);
    const matchesScore =
      scoreFilter === "all" ||
      (scoreFilter === "hot" && score >= 100) ||
      (scoreFilter === "warm" && score >= 50 && score < 100) ||
      (scoreFilter === "cold" && score < 50);

    return matchesSearch && matchesGroup && matchesStatus && matchesScore;
  });

  const hotCount = clients.filter((client) => Number(client.score || 0) >= 100)
    .length;

  const aiProcessingCount = clients.filter(
    (client) => client.public_enrichment_status === "processing"
  ).length;

  const pipelineAmount = clients.reduce(
    (sum, client) => sum + Number(client.potential_amount || 0),
    0
  );

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

  const handleDeleteClient = async (
    e: React.MouseEvent<HTMLButtonElement>,
    clientId: string
  ) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      "Supprimer ce client ? Cette action est définitive."
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId)
      .eq("user_id", session.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchClients();
  };

  const handleExportCsv = () => {
    const headers = [
      "Prénom",
      "Nom",
      "Email",
      "Téléphone",
      "Société",
      "Ville",
      "Groupe",
      "Statut",
      "Score",
      "Potentiel",
      "Dernier contact",
      "Créé le",
      "Notes",
    ];

    const rows = filteredClients.map((client) => [
      client.first_name,
      client.last_name,
      client.email,
      client.phone,
      client.company,
      client.city,
      client.group_name,
      client.status,
      client.score,
      client.potential_amount,
      client.last_contact_at,
      client.created_at,
      client.notes,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients-mypx-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderVariables = (text: string, insertedClient: Client) =>
    text
      .replaceAll("{{first_name}}", insertedClient.first_name || "")
      .replaceAll("{{last_name}}", insertedClient.last_name || "")
      .replaceAll("{{group_name}}", insertedClient.group_name || "")
      .replaceAll("{{city}}", insertedClient.city || "")
      .replaceAll("{{company}}", insertedClient.company || "")
      .replaceAll("{{advisor_name}}", settings?.advisor_name || "")
      .replaceAll("{{advisor_role}}", settings?.advisor_role || "")
      .replaceAll("{{company_name}}", settings?.company_name || "")
      .replaceAll("{{company_email}}", settings?.company_email || "")
      .replaceAll("{{company_phone}}", settings?.company_phone || "")
      .replaceAll("{{company_website}}", settings?.company_website || "");

  const sendWelcomeEmail = async (insertedClient: Client) => {
    if (!insertedClient.email) return;

    const { data: welcomeTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("type", "welcome_email")
      .eq("is_active", true)
      .maybeSingle();

    let renderedSubject = "";
    let renderedContent = "";
    let templateType = "welcome_email";

    if (!templateError && welcomeTemplate) {
      const template = welcomeTemplate as WelcomeTemplate;

      renderedSubject = renderVariables(template.subject || "", insertedClient);
      renderedContent = renderVariables(template.content || "", insertedClient);
    } else {
      templateType = "welcome_email_fallback";
      renderedSubject = `Bienvenue ${insertedClient.first_name || ""}`.trim();

      renderedContent = `
Bonjour ${insertedClient.first_name || ""},

Ravi de vous compter parmi nos contacts.

Vous pouvez simplement répondre à cet email si vous souhaitez échanger ou préciser votre besoin.

À bientôt,
${settings?.advisor_name || settings?.company_name || "MyPX"}
${settings?.company_phone || ""}
${settings?.company_website || ""}
`.trim();
    }

    if (!renderedSubject) {
      renderedSubject = `Bienvenue ${insertedClient.first_name || ""}`.trim();
    }

    if (!renderedContent) {
      renderedContent = `
Bonjour ${insertedClient.first_name || ""},

Ravi de vous compter parmi nos contacts.

À bientôt,
${settings?.advisor_name || settings?.company_name || "MyPX"}
`.trim();
    }

    const htmlToSend = renderedContent.includes("<")
      ? renderedContent
      : renderedContent.replaceAll("\n", "<br />");

    const result = await sendEmail({
      to: insertedClient.email,
      subject: renderedSubject,
      html: htmlToSend,
    });

    await supabase.from("email_logs").insert({
      user_id: session.user.id,
      client_id: insertedClient.id,
      template_type: templateType,
      subject: renderedSubject,
      content: renderedContent,
      recipient_email: insertedClient.email,
      status: result.success ? "sent" : "failed",
    });

    if (result.success) {
      await supabase
        .from("clients")
        .update({
          last_contact_at: new Date().toISOString(),
        })
        .eq("id", insertedClient.id)
        .eq("user_id", session.user.id);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const nowIso = new Date().toISOString();

    const payload = {
      user_id: session.user.id,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      city: form.city || null,
      birthday: form.birthday || null,
      group_name: form.group_name || null,
      status: form.status || "prospect",
      potential_amount: form.potential_amount
        ? Number(form.potential_amount)
        : 0,
      notes: form.notes || null,
      last_contact_at: nowIso,
      score: 0,
    };

    const { data: insertedClient, error } = await supabase
      .from("clients")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    if (insertedClient) {
      enrichClientWithAI({
        client: insertedClient as Client,
        userId: session.user.id,
      });

      await sendWelcomeEmail(insertedClient as Client);
    }

    setLoading(false);
    setForm(initialForm);
    setShowModal(false);
    fetchClients();
  };

  if (selectedClientId) {
    return (
      <ClientDetail
        session={session}
        clientId={selectedClientId}
        onBack={() => setSelectedClientId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
            <Users size={14} />
            Portefeuille client
          </div>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            Clients
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Ajoute, filtre, exporte et structure ton portefeuille dans une
            interface simple, rapide et augmentée par l’IA.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black"
          >
            <Plus size={16} />
            Nouveau client
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MiniStat
          icon={<Users size={18} />}
          label="Contacts"
          value={clients.length}
          tone="slate"
        />
        <MiniStat
          icon={<Flame size={18} />}
          label="Clients chauds"
          value={hotCount}
          tone="orange"
        />
        <MiniStat
          icon={<Bot size={18} />}
          label="Analyses IA"
          value={aiProcessingCount}
          tone="violet"
        />
        <MiniStat
          icon={<Euro size={18} />}
          label="Pipeline"
          value={`${pipelineAmount.toLocaleString("fr-FR")}€`}
          tone="cyan"
        />
      </section>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px_220px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un client, une société, un email, un groupe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
            />
          </div>

          <FilterSelect value={groupFilter} onChange={setGroupFilter}>
            <option value="all">Tous les groupes</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={statusFilter} onChange={setStatusFilter}>
            <option value="all">Tous les statuts</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={scoreFilter} onChange={setScoreFilter}>
            <option value="all">Tous les scores</option>
            <option value="hot">🔥 Chauds 100+</option>
            <option value="warm">Tièdes 50-99</option>
            <option value="cold">Froids -50</option>
          </FilterSelect>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        {loadingClients ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Chargement des clients...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-300">
              <UserPlus size={26} />
            </div>
            <h3 className="text-lg font-black text-slate-950">
              Aucun client trouvé
            </h3>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Modifie tes filtres ou ajoute un nouveau client pour lancer
              l’intelligence MyPX.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300"
            >
              Ajouter un client
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredClients.map((client) => (
                <ClientMobileCard
                  key={client.id}
                  client={client}
                  onOpen={() => setSelectedClientId(client.id)}
                  onDelete={(e) => handleDeleteClient(e, client.id)}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Nom</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Téléphone</th>
                    <th className="px-4 py-4">Société</th>
                    <th className="px-4 py-4">Ville</th>
                    <th className="px-4 py-4">Groupe</th>
                    <th className="px-4 py-4">Statut</th>
                    <th className="px-4 py-4">Score</th>
                    <th className="px-4 py-4">Potentiel</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className="cursor-pointer border-t border-slate-100 transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-4 font-black text-slate-950">
                        {[client.first_name, client.last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="px-4 py-4">{client.email || "—"}</td>
                      <td className="px-4 py-4">{client.phone || "—"}</td>
                      <td className="px-4 py-4">{client.company || "—"}</td>
                      <td className="px-4 py-4">{client.city || "—"}</td>
                      <td className="px-4 py-4">{client.group_name || "—"}</td>
                      <td className="px-4 py-4">
                        <StatusBadge value={client.status || "prospect"} />
                      </td>
                      <td className="px-4 py-4">
                        <ScoreStack client={client} />
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-800">
                        {client.potential_amount
                          ? `${client.potential_amount} €`
                          : "0 €"}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => handleDeleteClient(e, client.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
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
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/75 bg-white/90 p-5 shadow-2xl shadow-violet-300/40 backdrop-blur-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                  <Sparkles size={14} />
                  Nouveau client
                </div>

                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  Ajouter un contact
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  MyPX prépare automatiquement la fiche, l’email de bienvenue et
                  l’enrichissement IA dès l’enregistrement.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:text-slate-950"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 rounded-[1.4rem] border border-cyan-100 bg-cyan-50 p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 text-cyan-700" />
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Automatisation active
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Après ajout : analyse IA, score CRM, email de bienvenue et
                    log d’envoi si l’email est renseigné.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleAddClient}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <FormInput
                icon={<UserPlus size={15} />}
                name="first_name"
                placeholder="Prénom"
                value={form.first_name}
                onChange={handleChange}
              />
              <FormInput
                icon={<Users size={15} />}
                name="last_name"
                placeholder="Nom"
                value={form.last_name}
                onChange={handleChange}
              />
              <FormInput
                icon={<Mail size={15} />}
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
              />
              <FormInput
                icon={<Phone size={15} />}
                name="phone"
                placeholder="Téléphone"
                value={form.phone}
                onChange={handleChange}
              />
              <FormInput
                icon={<Building2 size={15} />}
                name="company"
                placeholder="Société"
                value={form.company}
                onChange={handleChange}
              />
              <FormInput
                icon={<MapPin size={15} />}
                name="city"
                placeholder="Ville"
                value={form.city}
                onChange={handleChange}
              />
              <FormInput
                icon={<CalendarDays size={15} />}
                name="birthday"
                type="date"
                placeholder="Date anniversaire"
                value={form.birthday}
                onChange={handleChange}
              />
              <FormInput
                icon={<Users size={15} />}
                name="group_name"
                placeholder="Groupe : Assurance, Invest, Premium..."
                value={form.group_name}
                onChange={handleChange}
              />

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="prospect">Prospect</option>
                <option value="client">Client</option>
                <option value="chaud">Chaud</option>
                <option value="a_relancer">À relancer</option>
              </select>

              <FormInput
                icon={<Euro size={15} />}
                name="potential_amount"
                type="number"
                placeholder="Potentiel (€)"
                value={form.potential_amount}
                onChange={handleChange}
              />

              <textarea
                name="notes"
                placeholder="Notes, contexte, besoin, origine du contact..."
                value={form.notes}
                onChange={handleChange}
                className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 md:col-span-2"
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
                      <Plus size={16} />
                      Enregistrer le client
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

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "slate" | "orange" | "violet" | "cyan";
}) {
  const toneClass = {
    slate: "bg-slate-950 text-white shadow-slate-300",
    orange: "bg-orange-100 text-orange-700 shadow-orange-100",
    violet: "bg-violet-100 text-violet-700 shadow-violet-100",
    cyan: "bg-cyan-100 text-cyan-700 shadow-cyan-100",
  };

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/70 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>

        <div className={`rounded-2xl p-3 shadow-lg ${toneClass[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
    >
      {children}
    </select>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
      {value}
    </span>
  );
}

function ScoreStack({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        CRM {client.score ?? 0}
      </span>

      <span className="w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
        IA {client.ai_score ?? 0}
      </span>

      {client.public_enrichment_status === "processing" && (
        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600">
          <Loader2 size={12} className="animate-spin" />
          Analyse IA...
        </span>
      )}

      {client.public_enrichment_status === "failed" && (
        <span className="text-xs font-black text-rose-600">IA échouée</span>
      )}

      {client.ai_status && (
        <span className="text-xs font-medium text-slate-400">
          {client.ai_status}
        </span>
      )}
    </div>
  );
}

function ClientMobileCard({
  client,
  onOpen,
  onDelete,
}: {
  client: Client;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="cursor-pointer rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">
            {[client.first_name, client.last_name].filter(Boolean).join(" ") ||
              "Client"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {client.company || client.email || "Sans société"}
          </p>
        </div>

        <StatusBadge value={client.status || "prospect"} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
        <InfoLine icon={<Mail size={13} />} value={client.email || "—"} />
        <InfoLine icon={<Phone size={13} />} value={client.phone || "—"} />
        <InfoLine icon={<MapPin size={13} />} value={client.city || "—"} />
        <InfoLine icon={<Users size={13} />} value={client.group_name || "—"} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <ScoreStack client={client} />
      </div>

      {client.next_best_action && (
        <div className="mt-3 rounded-2xl bg-violet-50 p-3">
          <p className="mb-1 flex items-center gap-2 text-xs font-black text-violet-700">
            <Bot size={13} />
            Action IA
          </p>
          <p className="text-xs leading-5 text-slate-600">
            {client.next_best_action}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">
          {client.potential_amount ? `${client.potential_amount} €` : "0 €"}
        </p>

        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
        >
          <Trash2 size={14} />
          Supprimer
        </button>
      </div>
    </div>
  );
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function FormInput({
  icon,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
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
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
      />
    </div>
  );
}