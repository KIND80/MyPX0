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
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UserRound,
  Wand2,
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
};

type EnrichResult = {
  ai_score?: number;
  ai_status?: string;
  ai_summary?: string;
  next_best_action?: string;
  suggested_message?: string;
  last_ai_update?: string;
  sources?: SourceItem[];
  monthly_limit?: number;
  monthly_used?: number;
  monthly_remaining?: number;
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

const MONTHLY_AI_LIMIT = 3;

function getClientName(client: ClientRow) {
  return (
    [client.first_name, client.last_name].filter(Boolean).join(" ") ||
    client.company ||
    "Client sans nom"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Jamais analysé";

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RadarAI({ session }: RadarAIProps) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [history, setHistory] = useState<AIHistoryRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [search, setSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyRemaining, setMonthlyRemaining] = useState(MONTHLY_AI_LIMIT);
  const [loadingUsage, setLoadingUsage] = useState(true);

  const fetchUsage = async () => {
    setLoadingUsage(true);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("client_ai_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .gte("created_at", startOfMonth.toISOString());

    if (!error) {
      const used = count || 0;
      setMonthlyUsed(used);
      setMonthlyRemaining(Math.max(0, MONTHLY_AI_LIMIT - used));
    }

    setLoadingUsage(false);
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
      setError("Impossible de charger les clients.");
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

  useEffect(() => {
    fetchClients();
    fetchUsage();
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

  const isLimitReached = monthlyRemaining <= 0;

  const handleSelectClient = async (client: ClientRow) => {
    setSelectedClientId(client.id);
    setError("");
    setCopied(false);

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
      setError("Sélectionne un client à analyser.");
      return;
    }

    if (isLimitReached) {
      setError(
        "Limite atteinte : vous avez déjà utilisé vos 3 analyses IA ce mois-ci."
      );
      return;
    }

    setAnalyzing(true);
    setError("");
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

      const isMonthlyLimitError =
        errorMessage.toLowerCase().includes("limite") ||
        errorMessage.toLowerCase().includes("monthly") ||
        errorMessage.includes("403");

      setError(
        isMonthlyLimitError
          ? "Limite atteinte : vous avez déjà utilisé vos 3 analyses IA ce mois-ci."
          : errorMessage || "Erreur pendant l’analyse IA."
      );

      await fetchUsage();
      setAnalyzing(false);
      return;
    }

    const enrichData = data as EnrichResult;

    setResult(enrichData);

    if (typeof enrichData.monthly_used === "number") {
      setMonthlyUsed(enrichData.monthly_used);
    }

    if (typeof enrichData.monthly_remaining === "number") {
      setMonthlyRemaining(enrichData.monthly_remaining);
    } else {
      await fetchUsage();
    }

    await fetchClients();
    await fetchHistory(selectedClient.id);

    setAnalyzing(false);
  };

  const copySuggestedMessage = async () => {
    if (!currentSuggestedMessage) return;

    await navigator.clipboard.writeText(currentSuggestedMessage);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

  const emailBody = `
${currentSuggestedMessage}

---

Contexte IA MyPX :
${currentNextAction}

Résumé public :
${currentAiSummary}
`.trim();

  const emailHref = selectedClient?.email
    ? `mailto:${selectedClient.email}?subject=${encodeURIComponent(
        `Opportunité de conversation - ${getClientName(selectedClient)}`
      )}&body=${encodeURIComponent(emailBody)}`
    : "";

  return (
    <div>
      <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700 shadow-sm backdrop-blur-xl">
            <Brain size={14} />
            Radar IA
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Recherche intelligente client
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            Chaque analyse est conservée dans l’historique pour suivre les
            nouveautés et garder une trace des opportunités détectées.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div
            className={`rounded-3xl border p-4 shadow-sm ${
              isLimitReached
                ? "border-rose-100 bg-rose-50 text-rose-700"
                : "border-violet-100 bg-white text-slate-800"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Analyses IA ce mois
            </p>

            <p className="mt-2 text-2xl font-black">
              {loadingUsage ? "..." : `${monthlyRemaining}/${MONTHLY_AI_LIMIT}`}
            </p>

            <p className="mt-1 text-xs font-bold opacity-70">
              {loadingUsage
                ? "Calcul en cours..."
                : isLimitReached
                ? "Limite mensuelle atteinte"
                : `${monthlyUsed} analyse${
                    monthlyUsed > 1 ? "s" : ""
                  } utilisée${monthlyUsed > 1 ? "s" : ""}`}
            </p>
          </div>

          <button
            onClick={() => {
              fetchClients();
              fetchUsage();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-xl shadow-slate-200 transition hover:-translate-y-0.5"
          >
            {loadingClients ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Actualiser les clients
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-6 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <aside className="rounded-[2rem] border border-white/75 bg-white/75 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="mt-5 max-h-[650px] space-y-3 overflow-y-auto pr-1">
            {loadingClients ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-violet-600" />
                <p className="mt-3 text-sm font-black text-slate-600">
                  Chargement des clients...
                </p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center">
                <p className="text-sm font-black text-slate-600">
                  Aucun client trouvé.
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
                          {client.company || client.city || "Aucune entreprise"}
                        </p>

                        {client.ai_summary ? (
                          <p
                            className={`mt-2 text-xs font-black ${
                              isActive ? "text-cyan-200" : "text-emerald-600"
                            }`}
                          >
                            Analyse disponible
                          </p>
                        ) : (
                          <p
                            className={`mt-2 text-xs font-black ${
                              isActive ? "text-white/50" : "text-slate-400"
                            }`}
                          >
                            Non analysé
                          </p>
                        )}
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
                Sélectionne un client
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                    <Wand2 size={14} />
                    Client sélectionné
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
                    Dernière analyse : {formatDate(currentLastUpdate)}
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
                      <Search size={18} />
                    )}
                    {analyzing
                      ? "Recherche en cours..."
                      : isLimitReached
                      ? "Limite mensuelle atteinte"
                      : "Nouvelle analyse SerpApi"}
                  </button>

                  <p className="text-center text-xs font-bold text-slate-400">
                    {monthlyRemaining} analyse
                    {monthlyRemaining > 1 ? "s" : ""} restante
                    {monthlyRemaining > 1 ? "s" : ""} ce mois
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
                  label="Statut"
                  value={selectedClient.status || "Non défini"}
                />

                <InfoCard
                  icon={Brain}
                  label="Score IA"
                  value={currentScore ? `${currentScore}/10` : "À analyser"}
                />
              </section>

              <section className="mt-7 space-y-4">
                <ResultBlock
                  title="Résumé public"
                  icon={Brain}
                  content={
                    currentAiSummary ||
                    "Aucune analyse disponible pour le moment."
                  }
                />

                <ResultBlock
                  title="Opportunité / nouveauté détectée"
                  icon={Sparkles}
                  content={
                    currentNextAction ||
                    "Lance une analyse pour générer une opportunité personnalisée."
                  }
                />

                <ResultBlock
                  title="Message conseillé"
                  icon={Wand2}
                  content={
                    currentSuggestedMessage ||
                    "Aucun message conseillé pour le moment."
                  }
                  action={
                    currentSuggestedMessage ? (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={copySuggestedMessage}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
                        >
                          {copied ? <Check size={15} /> : <Copy size={15} />}
                          {copied ? "Message copié" : "Copier le message"}
                        </button>

                        {selectedClient.email ? (
                          <a
                            href={emailHref}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700"
                          >
                            <Mail size={15} />
                            Envoyer email avec nouveauté
                          </a>
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
                    ) : null
                  }
                />
              </section>

              {currentSources && currentSources.length > 0 ? (
                <section className="mt-7 rounded-[2rem] border border-cyan-100 bg-cyan-50 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-700">
                    <Search size={16} />
                    Sources publiques de la dernière analyse
                  </h3>

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
                  Historique des analyses
                </h3>

                <div className="mt-4 space-y-3">
                  {loadingHistory ? (
                    <div className="rounded-3xl bg-slate-50 p-5 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="rounded-3xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                      Aucun historique pour ce client.
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
                            Score {item.ai_score || 5}/10
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-black text-slate-900">
                          {item.next_best_action ||
                            "Opportunité non renseignée"}
                        </p>

                        <p className="mt-2 line-clamp-3 text-xs leading-5 font-bold text-slate-500">
                          {item.ai_summary || "Résumé non disponible"}
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

      <p className="mt-3 whitespace-pre-line text-sm leading-7 font-bold text-slate-700">
        {content}
      </p>

      {action}
    </article>
  );
}
