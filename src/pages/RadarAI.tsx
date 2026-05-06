import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import {
  Brain,
  Building2,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  History,
  Loader2,
  Mail,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Wand2,
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
  group_name: string | null;
  ai_score: number | null;
  ai_status: string | null;
  ai_summary: string | null;
  next_best_action: string | null;
  suggested_message: string | null;
  last_ai_update: string | null;
  created_at: string;
};

type SourceItem = {
  title: string;
  link: string;
  snippet: string;
  date?: string | null;
  published_at?: string | null;
  source_date?: string | null;
};

type EnrichResult = {
  ai_score?: number;
  ai_status?: string;
  ai_summary?: string;
  next_best_action?: string;
  suggested_message?: string;
  last_ai_update?: string;
  sources?: SourceItem[];
  daily_limit?: number;
  daily_used?: number;
  daily_remaining?: number;
};

type AIHistoryRow = {
  id: string;
  client_id: string;
  user_id: string;
  ai_summary: string | null;
  next_best_action: string | null;
  suggested_message: string | null;
  ai_score: number | null;
  sources: SourceItem[] | null;
  created_at: string;
};

type UserOnboarding = {
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  company_address: string | null;
  logo_url: string | null;
  main_color: string | null;
  advisor_name: string | null;
  advisor_role: string | null;
  advisor_photo_url: string | null;
  whatsapp_url: string | null;
  booking_url: string | null;
};

const DAILY_AI_LIMIT = 10;

function getClientName(client: ClientRow) {
  return (
    [client.first_name, client.last_name].filter(Boolean).join(" ") ||
    client.company ||
    "Dossier sans nom"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date non détectée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSourceDate(source: SourceItem) {
  const value = source.published_at || source.source_date || source.date;

  if (!value) return "Fraîcheur du signal non détectée";

  return `Publié / détecté : ${formatDate(value)}`;
}

function buildSignature(onboarding: UserOnboarding | null) {
  if (!onboarding) return "";

  const advisorName = onboarding.advisor_name || "";
  const advisorRole = onboarding.advisor_role || "";
  const companyName = onboarding.company_name || "";
  const companyEmail = onboarding.company_email || "";
  const companyPhone = onboarding.company_phone || "";
  const companyWebsite = onboarding.company_website || "";
  const companyAddress = onboarding.company_address || "";
  const logoUrl = onboarding.logo_url || "";
  const advisorPhotoUrl = onboarding.advisor_photo_url || "";
  const mainColor = onboarding.main_color || "#7c3aed";

  return `
<br />
<br />
<div style="font-family:Arial,Helvetica,sans-serif;border-top:1px solid #e5e7eb;padding-top:18px;margin-top:18px;color:#334155;">
  <table cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;">
    <tr>
      ${
        advisorPhotoUrl
          ? `<td style="width:72px;vertical-align:top;">
              <img src="${advisorPhotoUrl}" alt="${advisorName}" style="width:58px;height:58px;border-radius:18px;object-fit:cover;border:2px solid #f1f5f9;" />
            </td>`
          : logoUrl
          ? `<td style="width:72px;vertical-align:top;">
              <img src="${logoUrl}" alt="${companyName}" style="width:58px;height:58px;border-radius:18px;object-fit:cover;border:2px solid #f1f5f9;" />
            </td>`
          : ""
      }

      <td style="vertical-align:top;">
        <div style="font-size:15px;font-weight:800;color:#0f172a;">
          ${advisorName || companyName}
        </div>

        ${
          advisorRole
            ? `<div style="font-size:13px;color:#64748b;margin-top:3px;">${advisorRole}</div>`
            : ""
        }

        ${
          companyName
            ? `<div style="font-size:13px;font-weight:700;color:${mainColor};margin-top:6px;">${companyName}</div>`
            : ""
        }

        <div style="font-size:12px;line-height:1.7;color:#64748b;margin-top:8px;">
          ${companyEmail ? `<div>Email : ${companyEmail}</div>` : ""}
          ${companyPhone ? `<div>Téléphone : ${companyPhone}</div>` : ""}
          ${companyWebsite ? `<div>Site : ${companyWebsite}</div>` : ""}
          ${companyAddress ? `<div>Adresse : ${companyAddress}</div>` : ""}
        </div>
      </td>
    </tr>
  </table>
</div>
`.trim();
}

function textToHtml(value: string) {
  return value
    .split("\n")
    .map((line) => `<p style="margin:0 0 14px;">${line || "&nbsp;"}</p>`)
    .join("");
}

export default function RadarAI({ session }: RadarAIProps) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [history, setHistory] = useState<AIHistoryRow[]>([]);
  const [onboarding, setOnboarding] = useState<UserOnboarding | null>(null);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [search, setSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [editableMessage, setEditableMessage] = useState("");

  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyRemaining, setDailyRemaining] = useState(DAILY_AI_LIMIT);
  const [loadingUsage, setLoadingUsage] = useState(true);

  const fetchOnboarding = async () => {
    const { data } = await supabase
      .from("user_onboarding")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setOnboarding((data as UserOnboarding) || null);
  };

  const fetchUsage = async () => {
    setLoadingUsage(true);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("client_ai_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .gte("created_at", startOfDay.toISOString());

    if (!error) {
      const used = count || 0;
      setDailyUsed(used);
      setDailyRemaining(Math.max(0, DAILY_AI_LIMIT - used));
    }

    setLoadingUsage(false);
  };

  const fetchHistory = async (clientId: string) => {
    setLoadingHistory(true);

    const { data, error } = await supabase
      .from("client_ai_history")
      .select(
        "id, client_id, user_id, ai_summary, next_best_action, suggested_message, ai_score, sources, created_at"
      )
      .eq("user_id", session.user.id)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (!error) {
      setHistory((data || []) as AIHistoryRow[]);
    }

    setLoadingHistory(false);
  };

  const fetchClients = async () => {
    setLoadingClients(true);
    setError("");

    const { data, error } = await supabase
      .from("clients")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        phone,
        company,
        city,
        status,
        group_name,
        ai_score,
        ai_status,
        ai_summary,
        next_best_action,
        suggested_message,
        last_ai_update,
        created_at
      `
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError("Impossible de charger les dossiers clients.");
      setLoadingClients(false);
      return;
    }

    const rows = (data || []) as ClientRow[];
    setClients(rows);

    if (!selectedClientId && rows.length > 0) {
      setSelectedClientId(rows[0].id);
      setResult({
        ai_score: rows[0].ai_score || undefined,
        ai_status: rows[0].ai_status || undefined,
        ai_summary: rows[0].ai_summary || undefined,
        next_best_action: rows[0].next_best_action || undefined,
        suggested_message: rows[0].suggested_message || undefined,
        last_ai_update: rows[0].last_ai_update || undefined,
      });
      await fetchHistory(rows[0].id);
    }

    setLoadingClients(false);
  };

  useEffect(() => {
    fetchClients();
    fetchUsage();
    fetchOnboarding();
  }, [session.user.id]);

  const filteredClients = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return clients;

    return clients.filter((client) => {
      const text = [
        client.first_name,
        client.last_name,
        client.company,
        client.city,
        client.group_name,
        client.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(value);
    });
  }, [clients, search]);

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const latestHistory = history[0] || null;

  const currentAiSummary =
    result?.ai_summary ||
    latestHistory?.ai_summary ||
    selectedClient?.ai_summary ||
    "";

  const currentNextAction =
    result?.next_best_action ||
    latestHistory?.next_best_action ||
    selectedClient?.next_best_action ||
    "";

  const currentSuggestedMessage =
    result?.suggested_message ||
    latestHistory?.suggested_message ||
    selectedClient?.suggested_message ||
    "";

  const currentScore =
    result?.ai_score ||
    latestHistory?.ai_score ||
    selectedClient?.ai_score ||
    null;

  const currentSources = result?.sources || latestHistory?.sources || [];

  const currentLastUpdate =
    result?.last_ai_update ||
    latestHistory?.created_at ||
    selectedClient?.last_ai_update ||
    null;

  const isLimitReached = dailyRemaining <= 0;

  const analyzedClients = useMemo(() => {
    return clients.filter((client) => client.ai_summary || client.ai_score);
  }, [clients]);

  const untouchedClients = useMemo(() => {
    return clients.filter((client) => !client.ai_summary && !client.ai_score);
  }, [clients]);

  const handleSelectClient = async (client: ClientRow) => {
    setSelectedClientId(client.id);
    setError("");
    setSuccessMessage("");
    setCopied(false);
    setEditableMessage(client.suggested_message || "");

    setResult({
      ai_score: client.ai_score || undefined,
      ai_status: client.ai_status || undefined,
      ai_summary: client.ai_summary || undefined,
      next_best_action: client.next_best_action || undefined,
      suggested_message: client.suggested_message || undefined,
      last_ai_update: client.last_ai_update || undefined,
    });

    await fetchHistory(client.id);
  };

  const analyzeClient = async () => {
    if (!selectedClient) {
      setError("Sélectionne un dossier à analyser.");
      return;
    }

    if (isLimitReached) {
      setError(
        "Limite atteinte : vous avez déjà utilisé vos 10 enquêtes IA aujourd’hui."
      );
      return;
    }

    setAnalyzing(true);
    setError("");
    setSuccessMessage("");
    setCopied(false);

    const { data, error } = await supabase.functions.invoke("enrich-client", {
      body: {
        client_id: selectedClient.id,
        user_id: session.user.id,
        first_name: selectedClient.first_name,
        last_name: selectedClient.last_name,
        email: selectedClient.email,
        phone: selectedClient.phone,
        company: selectedClient.company,
        city: selectedClient.city,
        group_name: selectedClient.group_name,
        status: selectedClient.status,
      },
    });

    if (error) {
      const errorMessage = error.message || "";

      const isDailyLimitError =
        errorMessage.toLowerCase().includes("limite") ||
        errorMessage.toLowerCase().includes("daily") ||
        errorMessage.toLowerCase().includes("day") ||
        errorMessage.includes("403");

      setError(
        isDailyLimitError
          ? "Limite atteinte : vous avez déjà utilisé vos 10 enquêtes IA aujourd’hui."
          : errorMessage || "Erreur pendant l’enquête IA."
      );

      await fetchUsage();
      setAnalyzing(false);
      return;
    }

    const enrichData = data as EnrichResult;

    setResult(enrichData);
    setEditableMessage(enrichData.suggested_message || "");

    if (typeof enrichData.daily_used === "number") {
      setDailyUsed(enrichData.daily_used);
    }

    if (typeof enrichData.daily_remaining === "number") {
      setDailyRemaining(enrichData.daily_remaining);
    } else {
      await fetchUsage();
    }

    await fetchClients();
    await fetchHistory(selectedClient.id);
    await fetchUsage();

    setAnalyzing(false);
  };

  const copySuggestedMessage = async () => {
    if (!editableMessage.trim()) return;

await navigator.clipboard.writeText(editableMessage);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

  const sendSuggestedEmail = async () => {
    if (!selectedClient) return;

    setError("");
    setSuccessMessage("");

    if (!selectedClient.email) {
      setError("Ce dossier n’a pas d’adresse email.");
      return;
    }

    if (!editableMessage.trim()) {
      setError("Le message est vide.");
      return;
    }

    setSendingEmail(true);

    const subject = `Suite à notre échange - ${getClientName(selectedClient)}`;

    const htmlContent = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:1.75;">
${textToHtml(editableMessage)}
  ${buildSignature(onboarding)}
</div>
`.trim();

    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        user_id: session.user.id,
        client_id: selectedClient.id,
        to: selectedClient.email,
        subject,
        content: htmlContent,
        html: htmlContent,
        template_type: "radar_ai",
      },
    });

    setSendingEmail(false);

    if (error) {
      setError(error.message || "Impossible d’envoyer l’email.");
      return;
    }

    setSuccessMessage("Approche envoyée avec ta signature ✅");
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 grid gap-5 xl:grid-cols-[1.4fr_0.75fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-200/40 sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.46),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.28),transparent_34%)]" />
          <div className="pointer-events-none absolute right-6 top-6 h-40 w-40 rounded-full border border-cyan-300/15" />
          <div className="pointer-events-none absolute right-12 top-12 h-28 w-28 animate-pulse rounded-full border border-violet-300/20" />
          <div className="pointer-events-none absolute right-[5.8rem] top-[5.8rem] h-8 w-8 rounded-full bg-cyan-300/20 blur-md" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-xl">
              <Radar size={14} />
              PX Sentinel
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl xl:text-6xl">
              Enquêteur IA relationnel
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              PX Sentinel analyse tes dossiers, piste les signaux publics,
              conserve les sources et transforme les nouveautés en actions
              concrètes.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <MiniDarkStat label="Dossiers" value={clients.length} />
              <MiniDarkStat label="Analysés" value={analyzedClients.length} />
              <MiniDarkStat label="À scanner" value={untouchedClients.length} />
              <MiniDarkStat label="Restantes" value={dailyRemaining} />
            </div>
          </div>
        </section>

        <section
          className={`rounded-[2rem] border p-5 shadow-2xl backdrop-blur-2xl sm:p-6 ${
            isLimitReached
              ? "border-rose-100 bg-rose-50 text-rose-800"
              : "border-white/80 bg-white/80 text-slate-950"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                <ShieldCheck size={14} />
                Quota IA
              </div>

              <p className="mt-4 text-3xl font-black">
                {loadingUsage ? "..." : `${dailyRemaining}/${DAILY_AI_LIMIT}`}
              </p>

              <p className="mt-2 text-sm font-bold opacity-70">
                {loadingUsage
                  ? "Calcul en cours..."
                  : isLimitReached
                  ? "Limite journalière atteinte"
                  : `${dailyUsed} enquête${dailyUsed > 1 ? "s" : ""} utilisée${
                      dailyUsed > 1 ? "s" : ""
                    } aujourd’hui`}
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-300">
              <Brain size={22} />
            </div>
          </div>

          <button
            onClick={() => {
              fetchClients();
              fetchUsage();
              fetchOnboarding();
            }}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black"
          >
            {loadingClients ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Nouvelle lecture du terrain
          </button>
        </section>
      </header>

      {error ? (
        <div className="mb-6 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <aside className="rounded-[2rem] border border-white/75 bg-white/75 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
              Dossiers sous observation
            </p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Sélectionne un client pour lancer ou relire une enquête.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un dossier..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="mt-5 max-h-[650px] space-y-3 overflow-y-auto pr-1">
            {loadingClients ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-violet-600" />
                <p className="mt-3 text-sm font-black text-slate-600">
                  Lecture des dossiers...
                </p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center">
                <p className="text-sm font-black text-slate-600">
                  Aucun dossier trouvé.
                </p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isActive = client.id === selectedClientId;

                return (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-300"
                        : "border-slate-100 bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          isActive
                            ? "bg-white/15 text-white"
                            : "bg-violet-50 text-violet-700"
                        }`}
                      >
                        <UserRound size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {getClientName(client)}
                        </p>

                        <p
                          className={`mt-1 truncate text-xs font-bold ${
                            isActive ? "text-white/70" : "text-slate-500"
                          }`}
                        >
                          {client.company || client.city || "Signal faible"}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {client.ai_summary ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                isActive
                                  ? "bg-emerald-400/15 text-emerald-200"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              Enquête disponible
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                isActive
                                  ? "bg-white/10 text-white/55"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              Non scanné
                            </span>
                          )}

                          {client.ai_score ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                isActive
                                  ? "bg-cyan-400/15 text-cyan-200"
                                  : "bg-cyan-50 text-cyan-700"
                              }`}
                            >
                              Score {client.ai_score}/10
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="rounded-[2rem] border border-white/75 bg-white/75 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-7">
          {!selectedClient ? (
            <div className="rounded-[2rem] bg-slate-50 p-10 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-violet-600" />
              <p className="mt-4 text-lg font-black text-slate-900">
                Sélectionne un dossier
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                PX Sentinel attend un client à analyser.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                    <ShieldCheck size={14} />
                    Dossier sous surveillance
                  </div>

                  <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                    {getClientName(selectedClient)}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    {selectedClient.company && (
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        {selectedClient.company}
                      </span>
                    )}

                    {selectedClient.city && (
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        {selectedClient.city}
                      </span>
                    )}

                    {selectedClient.group_name && (
                      <span className="rounded-full bg-slate-100 px-3 py-2">
                        {selectedClient.group_name}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-400">
                    Dernière enquête : {formatDate(currentLastUpdate)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={analyzeClient}
                    disabled={analyzing || isLimitReached}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analyzing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Radar size={18} />
                    )}
                    {analyzing
                      ? "PX Sentinel analyse..."
                      : isLimitReached
                      ? "Limite atteinte"
                      : "Nouvelle enquête IA"}
                  </button>

                  <p className="text-center text-xs font-bold text-slate-400">
                    {dailyRemaining} enquête
                    {dailyRemaining > 1 ? "s" : ""} restante
                    {dailyRemaining > 1 ? "s" : ""} aujourd’hui
                  </p>
                </div>
              </div>

              <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
                <InfoCard
                  icon={Building2}
                  label="Entreprise"
                  value={selectedClient.company || "Non renseignée"}
                />

                <InfoCard
                  icon={Target}
                  label="Statut relationnel"
                  value={selectedClient.status || "Non défini"}
                />

                <InfoCard
                  icon={Brain}
                  label="Indice IA"
                  value={currentScore ? `${currentScore}/10` : "À scanner"}
                />
              </section>

              <section className="mt-7 space-y-4">
                <ResultBlock
                  title="Rapport d’enquête"
                  icon={Brain}
                  content={
                    currentAiSummary ||
                    "Aucune enquête disponible pour le moment. Lance PX Sentinel pour obtenir un résumé intelligent."
                  }
                />

                <ResultBlock
                  title="Signal détecté / prochaine action"
                  icon={Zap}
                  content={
                    currentNextAction ||
                    "PX Sentinel n’a pas encore détecté d’angle d’approche pour ce dossier."
                  }
                />

<ResultBlock
  title="Approche prête à envoyer"
  icon={Wand2}
  content=""
  action={
    currentSuggestedMessage ? (
      <div className="mt-5 space-y-3">
        <textarea
          value={editableMessage}
          onChange={(event) => setEditableMessage(event.target.value)}
          rows={8}
          placeholder="Modifie l’approche avant l’envoi..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        />
    
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={copySuggestedMessage}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copié" : "Copier l’approche"}
          </button>
    
          {selectedClient.email ? (
            <button
              onClick={sendSuggestedEmail}
              disabled={sendingEmail}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingEmail ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Mail size={15} />
              )}
              {sendingEmail
                ? "Transmission en cours..."
                : "Envoyer cette approche"}
            </button>
          ) : (
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-400"
            >
              <Mail size={15} />
              Email manquant
            </button>
          )}
        </div>
      </div>
    ) : null
                  }
                />
              </section>

              {currentSources && currentSources.length > 0 ? (
                <section className="mt-7 rounded-[2rem] border border-cyan-100 bg-cyan-50 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-700">
                    <Search size={16} />
                    Sources publiques consultées
                  </h3>

                  <p className="mt-2 text-xs font-bold leading-5 text-cyan-800/70">
                    PX Sentinel conserve les traces utilisées pour justifier
                    l’opportunité. La date est affichée quand elle est détectée.
                  </p>

                  <div className="mt-4 space-y-3">
                    {currentSources.map((source, index) => (
                      <a
                        key={`${source.link}-${index}`}
                        href={source.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-3xl border border-cyan-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              {source.title || "Source publique"}
                            </p>

                            <p className="mt-1 text-xs font-black text-cyan-700">
                              {formatSourceDate(source)}
                            </p>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {source.snippet || "Aucun extrait disponible."}
                            </p>
                          </div>

                          <ExternalLink
                            size={16}
                            className="shrink-0 text-cyan-600"
                          />
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-7 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-xl shadow-violet-100/40">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-700">
                  <History size={16} />
                  Archives d’enquête
                </h3>

                <div className="mt-4 space-y-3">
                  {loadingHistory ? (
                    <div className="rounded-3xl bg-slate-50 p-5 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="rounded-3xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                      Aucune archive pour ce dossier.
                    </p>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                            <Clock3 size={14} />
                            {formatDate(item.created_at)}
                          </p>

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">
                            Indice {item.ai_score || 5}/10
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-black text-slate-900">
                          {item.next_best_action ||
                            "Signal non renseigné"}
                        </p>

                        <p className="mt-2 line-clamp-3 text-xs font-bold leading-5 text-slate-500">
                          {item.ai_summary || "Rapport non disponible"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </section>
    </div>
  );
}

function MiniDarkStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        <Icon size={15} />
        {label}
      </div>

      <p className="mt-3 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function ResultBlock({
  title,
  icon: Icon,
  content,
  action,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  action?: React.ReactNode;
}) {
  return (
    <article className="rounded-[2rem] border border-white/75 bg-white p-5 shadow-xl shadow-violet-100/40">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-600">
        <Icon size={15} />
        {title}
      </div>

      <p className="mt-3 whitespace-pre-line text-sm font-bold leading-7 text-slate-700">
        {content}
      </p>

      {action}
    </article>
  );
}