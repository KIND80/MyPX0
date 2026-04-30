import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import { sendEmail } from "../lib/email";
import {
  BarChart3,
  CheckCircle2,
  Loader2,
  MailPlus,
  Megaphone,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type CampaignsProps = {
  session: Session;
};

type Campaign = {
  id: string;
  name: string;
  subject: string | null;
  content: string | null;
  target_group: string | null;
  target_type: string | null;
  target_client_id: string | null;
  status: string | null;
  sent_count: number | null;
  open_rate: number | null;
  click_rate: number | null;
  created_at: string;
};

type GroupOption = {
  group_name: string | null;
};

type ClientPreview = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  group_name: string | null;
};

type CampaignForm = {
  id?: string;
  name: string;
  subject: string;
  content: string;
  target_type: "group" | "client";
  target_group: string;
  target_client_id: string;
  status: string;
};

const initialForm: CampaignForm = {
  name: "",
  subject: "",
  content: "",
  target_type: "group",
  target_group: "",
  target_client_id: "",
  status: "draft",
};

const SUPABASE_FUNCTIONS_BASE =
  "https://jithpgooytpypqsmhfzy.supabase.co/functions/v1";

const badgeMap: Record<string, string> = {
  draft: "bg-slate-50 text-slate-600 border-slate-100",
  scheduled: "bg-sky-50 text-sky-700 border-sky-100",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-100",
  sent: "bg-violet-50 text-violet-700 border-violet-100",
};

function addTrackingToHtml(html: string, logId: string) {
  const trackedLinks = html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_match, url) => {
      const trackedUrl = `${SUPABASE_FUNCTIONS_BASE}/track-click?id=${logId}&url=${encodeURIComponent(
        url
      )}`;
      return `href="${trackedUrl}"`;
    }
  );

  const openPixel = `<img src="${SUPABASE_FUNCTIONS_BASE}/track-open?id=${logId}" width="1" height="1" style="display:none;" />`;

  return `${trackedLinks}${openPixel}`;
}

export default function Campaigns({ session }: CampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [clients, setClients] = useState<ClientPreview[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setCampaigns((data as Campaign[]) || []);
    }

    setLoadingCampaigns(false);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("group_name")
      .eq("user_id", session.user.id)
      .neq("group_name", "")
      .not("group_name", "is", null);

    if (error) {
      console.error(error.message);
      return;
    }

    const uniqueGroups = Array.from(
      new Set(
        ((data as GroupOption[]) || [])
          .map((item) => item.group_name)
          .filter(Boolean) as string[]
      )
    );

    setGroups(uniqueGroups);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, group_name")
      .eq("user_id", session.user.id);

    if (error) {
      console.error(error.message);
      return;
    }

    setClients((data as ClientPreview[]) || []);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchGroups();
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

  const resetModal = () => {
    setForm(initialForm);
    setShowModal(false);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_id: session.user.id,
      name: form.name,
      subject: form.subject || null,
      content: form.content || null,
      target_type: form.target_type,
      target_group: form.target_type === "group" ? form.target_group || null : null,
      target_client_id:
        form.target_type === "client" ? form.target_client_id || null : null,
      status: form.status || "draft",
    };

    let error = null;

    if (form.id) {
      const response = await supabase
        .from("campaigns")
        .update(payload)
        .eq("id", form.id)
        .eq("user_id", session.user.id);

      error = response.error;
    } else {
      const response = await supabase.from("campaigns").insert(payload);
      error = response.error;
    }

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetModal();
    fetchCampaigns();
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setForm({
      id: campaign.id,
      name: campaign.name || "",
      subject: campaign.subject || "",
      content: campaign.content || "",
      target_type: campaign.target_type === "client" ? "client" : "group",
      target_group: campaign.target_group || "",
      target_client_id: campaign.target_client_id || "",
      status: campaign.status || "draft",
    });
    setShowModal(true);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Supprimer cette campagne ?")) return;

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("user_id", session.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchCampaigns();
  };

  const refreshCampaignStats = async (
    campaignId: string,
    sentCount: number
  ) => {
    const { data: logs, error } = await supabase
      .from("email_logs")
      .select("opened_at, clicked_at")
      .eq("user_id", session.user.id)
      .eq("campaign_id", campaignId)
      .eq("status", "sent");

    if (error) {
      console.error(error.message);
      return;
    }

    const sentLogs = logs || [];
    const opened = sentLogs.filter((log) => log.opened_at).length;
    const clicked = sentLogs.filter((log) => log.clicked_at).length;

    const openRate = sentCount > 0 ? Math.round((opened / sentCount) * 100) : 0;
    const clickRate =
      sentCount > 0 ? Math.round((clicked / sentCount) * 100) : 0;

    await supabase
      .from("campaigns")
      .update({
        open_rate: openRate,
        click_rate: clickRate,
      })
      .eq("id", campaignId)
      .eq("user_id", session.user.id);
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    if (!campaign.subject || !campaign.content) {
      alert("La campagne doit avoir un sujet et un contenu.");
      return;
    }
  
    let targetedClients: ClientPreview[] = [];
  
    if (campaign.target_type === "client") {
      if (!campaign.target_client_id) {
        alert("Choisis un client avant d’envoyer.");
        return;
      }
  
      targetedClients = clients.filter(
        (client) => client.id === campaign.target_client_id && client.email
      );
    } else {
      if (!campaign.target_group) {
        alert("Choisis un groupe cible avant d’envoyer.");
        return;
      }
  
      targetedClients = clients.filter(
        (client) =>
          client.email &&
          client.group_name &&
          client.group_name.toLowerCase() ===
            campaign.target_group?.toLowerCase()
      );
    }
  
    if (targetedClients.length === 0) {
      alert("Aucun client avec email trouvé pour ce ciblage.");
      return;
    }
  
    const confirmSend = confirm(
      campaign.target_type === "client"
        ? "Envoyer cet email à ce client ?"
        : `Envoyer cette campagne à ${targetedClients.length} client(s) ? Chaque client recevra un email séparé et privé.`
    );
  
    if (!confirmSend) return;
  
    setSendingId(campaign.id);
  
    let successCount = 0;
    let failedCount = 0;
  
    for (const client of targetedClients) {
      const subject = (campaign.subject || "")
        .replaceAll("{{first_name}}", client.first_name || "")
        .replaceAll("{{group_name}}", client.group_name || "");
  
      const rawContent = (campaign.content || "")
        .replaceAll("{{first_name}}", client.first_name || "")
        .replaceAll("{{group_name}}", client.group_name || "");
  
      const htmlBase = rawContent.replaceAll("\n", "<br />");
  
      const { data: logData, error: logError } = await supabase
        .from("email_logs")
        .insert({
          user_id: session.user.id,
          client_id: client.id,
          campaign_id: campaign.id,
          template_type: "campaign",
          subject,
          content: htmlBase,
          recipient_email: client.email,
          status: "pending",
        })
        .select("id")
        .single();
  
      if (logError || !logData?.id) {
        failedCount++;
        continue;
      }
  
      const trackedHtml = addTrackingToHtml(htmlBase, logData.id);
  
      const result = await sendEmail({
        to: client.email as string,
        subject,
        html: trackedHtml,
      });
  
      await supabase
        .from("email_logs")
        .update({
          status: result.success ? "sent" : "failed",
          content: trackedHtml,
        })
        .eq("id", logData.id)
        .eq("user_id", session.user.id);
  
      if (result.success) {
        successCount++;
  
        await supabase
          .from("clients")
          .update({ last_contact_at: new Date().toISOString() })
          .eq("id", client.id)
          .eq("user_id", session.user.id);
      } else {
        failedCount++;
      }
    }
  
    await supabase
      .from("campaigns")
      .update({
        status: "sent",
        sent_count: successCount,
        open_rate: 0,
        click_rate: 0,
      })
      .eq("id", campaign.id)
      .eq("user_id", session.user.id);
  
    await refreshCampaignStats(campaign.id, successCount);
  
    setSendingId(null);
  
    alert(
      `Campagne terminée : ${successCount} envoyé(s), ${failedCount} échec(s).`
    );
  
    fetchCampaigns();
    fetchClients();
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const full = [
        campaign.name,
        campaign.subject,
        campaign.target_group,
        campaign.status,
      ]
        .join(" ")
        .toLowerCase();

      return full.includes(search.toLowerCase());
    });
  }, [campaigns, search]);

  const targetedClients = useMemo(() => {
    if (!form.target_group) return [];

    return clients.filter(
      (client) =>
        client.group_name &&
        client.group_name.toLowerCase() === form.target_group.toLowerCase()
    );
  }, [clients, form.target_group]);

  const previewText = useMemo(() => {
    const sample = targetedClients[0];
    const firstName = sample?.first_name || "Prénom";
    const groupName = form.target_group || "Groupe";

    return (form.content || "")
      .replaceAll("{{first_name}}", firstName)
      .replaceAll("{{group_name}}", groupName);
  }, [form.content, form.target_group, targetedClients]);

  const readyCount = campaigns.filter((c) => c.status === "ready").length;
  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const totalSent = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.sent_count || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
            <Megaphone size={14} />
            Animation portefeuille
          </div>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            Campagnes
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Crée des campagnes ciblées par groupe pour animer ton portefeuille
            client et suivre les ouvertures / clics.
          </p>
        </div>

        <button
          onClick={() => {
            setForm(initialForm);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black"
        >
          <Plus size={16} />
          Nouvelle campagne
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard label="Campagnes totales" value={campaigns.length} />
        <StatCard label="Prêtes à envoyer" value={readyCount} tone="emerald" />
        <StatCard label="Envoyées" value={sentCount} tone="violet" />
        <StatCard label="Emails envoyés" value={totalSent} tone="cyan" />
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une campagne, un groupe, un statut..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        {loadingCampaigns ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Chargement des campagnes...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-300">
              <Megaphone size={26} />
            </div>

            <h3 className="text-lg font-black text-slate-950">
              Aucune campagne pour le moment
            </h3>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Crée ta première campagne pour commencer à structurer l’animation
              commerciale de tes groupes clients.
            </p>

            <button
              onClick={() => {
                setForm(initialForm);
                setShowModal(true);
              }}
              className="mt-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300"
            >
              Créer une campagne
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredCampaigns.map((campaign) => (
                <CampaignMobileCard
                  key={campaign.id}
                  campaign={campaign}
                  sending={sendingId === campaign.id}
                  onEdit={() => handleEditCampaign(campaign)}
                  onSend={() => handleSendCampaign(campaign)}
                  onDelete={() => handleDeleteCampaign(campaign.id)}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Nom</th>
                    <th className="px-4 py-4">Sujet</th>
                    <th className="px-4 py-4">Groupe cible</th>
                    <th className="px-4 py-4">Statut</th>
                    <th className="px-4 py-4">Envoyés</th>
                    <th className="px-4 py-4">Ouverture</th>
                    <th className="px-4 py-4">Clic</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-t border-slate-100 transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-4 font-black text-slate-950">
                        {campaign.name}
                      </td>
                      <td className="px-4 py-4">{campaign.subject || "—"}</td>
                      <td className="px-4 py-4">
                        {campaign.target_group || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          value={campaign.status || "draft"}
                          className={
                            badgeMap[campaign.status || "draft"] ||
                            badgeMap.draft
                          }
                        />
                      </td>
                      <td className="px-4 py-4">{campaign.sent_count ?? 0}</td>
                      <td className="px-4 py-4">{campaign.open_rate ?? 0}%</td>
                      <td className="px-4 py-4">{campaign.click_rate ?? 0}%</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleEditCampaign(campaign)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm hover:text-slate-950"
                          >
                            <Pencil size={14} />
                            Modifier
                          </button>

                          {campaign.status !== "sent" && (
                            <button
                              onClick={() => handleSendCampaign(campaign)}
                              disabled={sendingId === campaign.id}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                            >
                              {sendingId === campaign.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Play size={14} />
                              )}
                              {sendingId === campaign.id
                                ? "Envoi..."
                                : "Envoyer"}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                            Supprimer
                          </button>
                        </div>
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
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/75 bg-white/90 p-5 shadow-2xl shadow-violet-300/40 backdrop-blur-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                  <MailPlus size={14} />
                  Builder campagne
                </div>

                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  {form.id ? "Modifier la campagne" : "Créer une campagne"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Prépare un message ciblé, choisis ton groupe et visualise le
                  rendu dynamique.
                </p>
              </div>

              <button
                onClick={resetModal}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:text-slate-950"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <form onSubmit={handleSaveCampaign} className="space-y-4">
                <Input
                  name="name"
                  placeholder="Nom de la campagne"
                  value={form.name}
                  onChange={handleChange}
                  required
                />

<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  <select
    name="target_type"
    value={form.target_type}
    onChange={handleChange}
    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
  >
    <option value="group">Envoyer à un groupe</option>
    <option value="client">Envoyer à un client précis</option>
  </select>

  <select
    name="status"
    value={form.status}
    onChange={handleChange}
    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
  >
    <option value="draft">Brouillon</option>
    <option value="scheduled">Programmée</option>
    <option value="ready">Prête à envoyer</option>
  </select>
</div>

{form.target_type === "group" ? (
  <select
    name="target_group"
    value={form.target_group}
    onChange={handleChange}
    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
  >
    <option value="">Choisir un groupe</option>
    {groups.map((group) => (
      <option key={group} value={group}>
        {group}
      </option>
    ))}
  </select>
) : (
  <select
    name="target_client_id"
    value={form.target_client_id}
    onChange={handleChange}
    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
  >
    <option value="">Choisir un client</option>
    {clients
      .filter((client) => client.email)
      .map((client) => (
        <option key={client.id} value={client.id}>
          {[client.first_name, client.last_name].filter(Boolean).join(" ") ||
            "Contact"}{" "}
          — {client.email}
        </option>
      ))}
  </select>
)}

<Input
  name="subject"
  placeholder="Sujet de l’email"
  value={form.subject}
  onChange={handleChange}
/>

<div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-slate-500">
  Variables disponibles :
  <span className="ml-2 rounded-full border border-violet-100 bg-white px-2 py-1">
    {"{{first_name}}"}
  </span>
  <span className="ml-2 rounded-full border border-violet-100 bg-white px-2 py-1">
    {"{{group_name}}"}
  </span>
</div>

<textarea
  name="content"
  placeholder="Exemple : Bonjour {{first_name}}, je te contacte concernant une opportunité liée à {{group_name}}..."
  value={form.content}
  onChange={handleChange}
  className="min-h-[240px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
/>

<div className="flex justify-end gap-3 pt-2">
  <button
    type="button"
    onClick={resetModal}
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
        <MailPlus size={16} />
        Enregistrer
      </>
    )}
  </button>
</div>
</form>

<div className="space-y-4">
  <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2">
      <Sparkles size={16} className="text-violet-700" />
      <p className="text-sm font-black text-slate-950">Aperçu dynamique</p>
    </div>

    <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        Sujet
      </p>

      <p className="mt-2 text-base font-black text-slate-950">
        {form.subject || "Ton sujet apparaîtra ici"}
      </p>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        Message
      </p>

      <div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-600">
        {previewText || "Ton message personnalisé apparaîtra ici."}
      </div>
    </div>
  </div>

  <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
    <p className="text-sm font-black text-slate-950">Ciblage estimé</p>

    <p className="mt-2 text-3xl font-black text-slate-950">
      {targetedClients.length}
    </p>

    <p className="mt-2 text-sm font-medium text-slate-500">
      {form.target_type === "client"
        ? "client sélectionné pour cet envoi"
        : "client(s) trouvés dans le groupe sélectionné"}
    </p>

    <div className="mt-4 space-y-2">
      {targetedClients.slice(0, 5).map((client) => (
        <div
          key={client.id}
          className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600"
        >
          {[client.first_name, client.last_name].filter(Boolean).join(" ") ||
            "Contact"}{" "}
          {client.email ? `• ${client.email}` : ""}
        </div>
      ))}

      {targetedClients.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">
          {form.target_type === "client"
            ? "Aucun client sélectionné."
            : "Aucun client trouvé pour ce groupe."}
        </div>
      )}
    </div>
  </div>
</div>
</div>
</div>
</div>
)}
</div>
);
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "violet" | "cyan";
}) {
  const toneClass = {
    slate: "bg-slate-950 text-white shadow-slate-300",
    emerald: "bg-emerald-100 text-emerald-700 shadow-emerald-100",
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

        <div className={`rounded-2xl p-3 shadow-lg ${toneClass[tone]}`}>
          <BarChart3 size={18} />
        </div>
      </div>
    </div>
  );
}

function Badge({ value, className }: { value: string; className: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {value}
    </span>
  );
}

function CampaignMobileCard({
  campaign,
  sending,
  onEdit,
  onSend,
  onDelete,
}: {
  campaign: Campaign;
  sending: boolean;
  onEdit: () => void;
  onSend: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">{campaign.name}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {campaign.subject || "Sans sujet"}
          </p>
        </div>

        <Badge
          value={campaign.status || "draft"}
          className={badgeMap[campaign.status || "draft"] || badgeMap.draft}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallMetric label="Envoyés" value={campaign.sent_count ?? 0} />
        <SmallMetric label="Ouverture" value={`${campaign.open_rate ?? 0}%`} />
        <SmallMetric label="Clic" value={`${campaign.click_rate ?? 0}%`} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Users size={14} />
          Groupe cible : {campaign.target_group || "—"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
        >
          <Pencil size={14} />
          Modifier
        </button>

        {campaign.status !== "sent" && (
          <button
            onClick={onSend}
            disabled={sending}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        )}

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

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function Input({
  name,
  value,
  onChange,
  placeholder,
  required,
}: {
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <input
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300 transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
    />
  );
}
