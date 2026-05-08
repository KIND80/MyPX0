import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Euro,
  FileSpreadsheet,
  Flame,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
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

type ImportClientRow = NewClientForm & {
  id: string;
  selected: boolean;
  errors: string[];
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

const getSignalLabel = (client: Client) => {
  const score = Number(client.score || 0);

  if (client.status === "chaud" || score >= 100) return "Signal chaud";
  if (client.status === "a_relancer") return "Action requise";
  if (client.status === "client") return "Relation active";
  if (score >= 50) return "Potentiel latent";

  return "À observer";
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
  const cleanValue = String(value ?? "")
    .split('"')
    .join('""');
  return `"${cleanValue}"`;
};

export default function Clients({ session }: ClientsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<ImportClientRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [prepareQueuedEmails, setPrepareQueuedEmails] = useState(false);
  const [queueDelayMinutes, setQueueDelayMinutes] = useState("2");
  const [form, setForm] = useState<NewClientForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { settings } = useUserSettings(session);

  const openClient = (clientId: string) => {
    setSelectedClientId(clientId);

    const url = new URL(window.location.href);
    url.searchParams.set("view", "clients");
    url.searchParams.set("client_id", clientId);
    window.history.replaceState({}, "", url.toString());
  };

  const closeClient = () => {
    setSelectedClientId(null);

    const url = new URL(window.location.href);
    url.searchParams.set("view", "clients");
    url.searchParams.delete("client_id");
    window.history.replaceState({}, "", url.toString());
  };

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientIdFromUrl = params.get("client_id");

    if (clientIdFromUrl) {
      setSelectedClientId(clientIdFromUrl);
    }
  }, []);

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

  const hotCount = clients.filter(
    (client) => Number(client.score || 0) >= 100 || client.status === "chaud"
  ).length;

  const actionRequiredCount = clients.filter(
    (client) => client.status === "a_relancer"
  ).length;

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
      "Supprimer ce dossier relationnel ? Cette action est définitive."
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
      "Réseau",
      "Statut",
      "Score",
      "Indice IA",
      "Potentiel",
      "Dernier contact",
      "Créé le",
      "Renseignements",
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
      client.ai_score,
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
    link.download = `dossiers-mypx-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderVariables = (text: string, insertedClient: Client) =>
    (text || "")
      .split("{{first_name}}")
      .join(insertedClient.first_name || "")
      .split("{{last_name}}")
      .join(insertedClient.last_name || "")
      .split("{{group_name}}")
      .join(insertedClient.group_name || "")
      .split("{{city}}")
      .join(insertedClient.city || "")
      .split("{{company}}")
      .join(insertedClient.company || "")
      .split("{{advisor_name}}")
      .join(settings?.advisor_name || "")
      .split("{{advisor_role}}")
      .join(settings?.advisor_role || "")
      .split("{{company_name}}")
      .join(settings?.company_name || "")
      .split("{{company_email}}")
      .join(settings?.company_email || "")
      .split("{{company_phone}}")
      .join(settings?.company_phone || "")
      .split("{{company_website}}")
      .join(settings?.company_website || "");

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
      : renderedContent.split("\n").join("<br />");

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
  const buildWelcomeEmailForQueue = async (insertedClient: Client) => {
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

    return {
      templateType,
      subject: renderedSubject,
      content: renderedContent,
    };
  };
  const isValidEmail = (email: string) =>
    !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateImportRow = (row: ImportClientRow) => {
    const errors: string[] = [];

    const hasIdentity =
      row.first_name || row.last_name || row.email || row.phone || row.company;

    if (!hasIdentity) errors.push("Ligne vide");
    if (row.email && !isValidEmail(row.email)) errors.push("Email invalide");

    const alreadyExists = clients.some(
      (client) =>
        client.email &&
        row.email &&
        client.email.toLowerCase() === row.email.toLowerCase()
    );

    if (alreadyExists) errors.push("Email déjà présent");

    return errors;
  };

  const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && insideQuotes && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if ((char === ";" || char === ",") && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const normalizeHeader = (value: string) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  
  const FIELD_ALIASES: Record<keyof NewClientForm, string[]> = {
    first_name: [
      "prenom",
      "prénom",
      "first_name",
      "firstname",
      "first name",
      "givenname",
      "given name",
    ],
    last_name: [
      "nom",
      "last_name",
      "lastname",
      "last name",
      "surname",
      "familyname",
      "family name",
    ],
    email: [
      "email",
      "mail",
      "e-mail",
      "adresse email",
      "courriel",
      "email address",
    ],
    phone: [
      "telephone",
      "téléphone",
      "tel",
      "phone",
      "mobile",
      "portable",
      "numero",
      "numéro",
      "phone number",
    ],
    company: [
      "societe",
      "société",
      "company",
      "entreprise",
      "business",
      "organisation",
      "organization",
      "structure",
    ],
    city: [
      "ville",
      "city",
      "localite",
      "localité",
      "commune",
      "lieu",
    ],
    birthday: [
      "anniversaire",
      "birthday",
      "date naissance",
      "date de naissance",
      "birthdate",
      "birth date",
    ],
    group_name: [
      "groupe",
      "reseau",
      "réseau",
      "segment",
      "categorie",
      "catégorie",
      "group",
      "group_name",
      "source",
      "origine",
    ],
    status: [
      "statut",
      "status",
      "etat",
      "état",
      "stage",
      "pipeline",
    ],
    potential_amount: [
      "potentiel",
      "potential_amount",
      "montant",
      "valeur",
      "budget",
      "ca",
      "chiffre affaire",
      "chiffre d affaire",
      "amount",
      "value",
    ],
    notes: [
      "notes",
      "note",
      "commentaire",
      "commentaires",
      "renseignements",
      "description",
      "memo",
      "message",
      "details",
      "détails",
    ],
  };
  
  const getFieldValue = (
    row: Record<string, string>,
    field: keyof NewClientForm
  ) => {
    const aliases = FIELD_ALIASES[field] || [];
  
    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const found = row[normalizedAlias];
  
      if (found && String(found).trim()) {
        return String(found).trim();
      }
    }
  
    return "";
  };
  
  const cleanPotentialAmount = (value: string) => {
    if (!value) return "";
  
    const cleaned = String(value)
      .replace(/[^\d,.-]/g, "")
      .replace(",", ".");
  
    const number = Number(cleaned);
  
    return Number.isFinite(number) ? String(number) : "";
  };
  
  const cleanStatus = (value: string) => {
    const normalized = normalizeHeader(value);
  
    if (["client", "relationactive", "actif"].includes(normalized)) return "client";
    if (["chaud", "hot", "urgent"].includes(normalized)) return "chaud";
    if (["arelancer", "relance", "relancer", "suivi"].includes(normalized))
      return "a_relancer";
  
    return "prospect";
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      alert("Le fichier semble vide ou incomplet.");
      return;
    }

    const headers = parseCsvLine(lines[0]).map(normalizeHeader);

    const rows = lines.slice(1).map((line, index) => {
      const values = parseCsvLine(line);
      const rawRow: Record<string, string> = {};

      headers.forEach((header, i) => {
        rawRow[header] = values[i] || "";
      });

      const row: ImportClientRow = {
        id: `${Date.now()}-${index}`,
        selected: true,
        first_name: getFieldValue(rawRow, "first_name"),
        last_name: getFieldValue(rawRow, "last_name"),
        email: getFieldValue(rawRow, "email").toLowerCase(),
        phone: getFieldValue(rawRow, "phone"),
        company: getFieldValue(rawRow, "company"),
        city: getFieldValue(rawRow, "city"),
        birthday: getFieldValue(rawRow, "birthday"),
        group_name: getFieldValue(rawRow, "group_name"),
        status: cleanStatus(getFieldValue(rawRow, "status")),
        potential_amount: cleanPotentialAmount(
          getFieldValue(rawRow, "potential_amount")
        ),
        notes: getFieldValue(rawRow, "notes"),
        errors: [],
      };

      row.errors = validateImportRow(row);
      row.selected = row.errors.length === 0;

      return row;
    });

    setImportRows(rows);
  };

  const updateImportRow = (
    id: string,
    field: keyof NewClientForm,
    value: string
  ) => {
    setImportRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const updated = {
          ...row,
          [field]: value,
        };

        return {
          ...updated,
          errors: validateImportRow(updated),
        };
      })
    );
  };

  const toggleImportRow = (id: string) => {
    setImportRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row
      )
    );
  };

  const handleConfirmImport = async () => {
    const rowsToImport = importRows.filter(
      (row) => row.selected && row.errors.length === 0
    );

    if (rowsToImport.length === 0) {
      alert("Aucune ligne valide sélectionnée.");
      return;
    }

    setImporting(true);

    const payload = rowsToImport.map((row) => ({
      user_id: session.user.id,
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      email: row.email || null,
      phone: row.phone || null,
      company: row.company || null,
      city: row.city || null,
      birthday: row.birthday || null,
      group_name: row.group_name || null,
      status: row.status || "prospect",
      potential_amount: row.potential_amount
  ? Number(cleanPotentialAmount(row.potential_amount))
  : 0,
      notes: row.notes || null,
      last_contact_at: null,
      score: 0,
      public_enrichment_status: "pending",
    }));

    const { data: insertedClients, error } = await supabase
      .from("clients")
      .insert(payload)
      .select();

    if (error) {
      setImporting(false);
      alert(error.message);
      return;
    }

    if (prepareQueuedEmails && insertedClients?.length) {
      const delay = Math.max(Number(queueDelayMinutes || 2), 1);
      const clientsWithEmail = (insertedClients as Client[]).filter(
        (client) => client.email
      );

      const queueRows = await Promise.all(
        clientsWithEmail.map(async (client, index) => {
          const emailContent = await buildWelcomeEmailForQueue(client);

          const scheduledAt = new Date(
            Date.now() + index * delay * 60 * 1000
          ).toISOString();

          return {
            user_id: session.user.id,
            client_id: client.id,
            template_type: emailContent.templateType,
            recipient_email: client.email as string,
            subject: emailContent.subject,
            content: emailContent.content,
            status: "pending",
            scheduled_at: scheduledAt,
          };
        })
      );

      if (queueRows.length > 0) {
        const { error: queueError } = await supabase
          .from("email_queue")
          .insert(queueRows);

        if (queueError) {
          setImporting(false);
          alert(
            `Les clients ont été importés, mais la file email n’a pas été créée : ${queueError.message}`
          );
          fetchClients();
          return;
        }
      }
    }

    setImporting(false);
    setShowImportModal(false);
    setImportRows([]);
    setImportFileName("");
    setPrepareQueuedEmails(false);
    setQueueDelayMinutes("2");
    fetchClients();

    alert(
      prepareQueuedEmails
        ? "Import terminé. Les emails de bienvenue ont été préparés dans la file Sentinel."
        : "Import terminé. Aucun email automatique n’a été préparé."
    );
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
        onBack={closeClient}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-950/30 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.40),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.25),transparent_35%)]" />
        <div className="absolute right-5 top-5 h-32 w-32 rounded-full border border-violet-400/20 bg-violet-500/10 blur-sm" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-100">
              <Users size={14} />
              Terrain relationnel
            </div>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-white">
              Dossiers
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Centralise tes relations, détecte les signaux utiles et transforme
              ton portefeuille en système d’intelligence relationnelle.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <Download size={16} />
              Exporter les dossiers
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-400/15"
            >
              <Upload size={16} />
              Import Sentinel
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-0.5"
            >
              <Plus size={16} />
              Nouveau dossier
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MiniStat
          icon={<Users size={18} />}
          label="Dossiers actifs"
          value={clients.length}
          tone="slate"
        />
        <MiniStat
          icon={<Flame size={18} />}
          label="Signaux chauds"
          value={hotCount}
          tone="orange"
        />
        <MiniStat
          icon={<Sparkles size={18} />}
          label="Actions requises"
          value={actionRequiredCount}
          tone="violet"
        />
        <MiniStat
          icon={<Euro size={18} />}
          label="Potentiel terrain"
          value={`${pipelineAmount.toLocaleString("fr-FR")}€`}
          tone="cyan"
        />
      </section>

      <div className="rounded-[2rem] border border-white/75 bg-white/80 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">
              Console de recherche
            </p>
            <p className="text-xs font-medium text-slate-500">
              Filtre par relation, société, réseau, statut, score ou signal IA.
            </p>
          </div>

          {aiProcessingCount > 0 && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700">
              <Loader2 size={13} className="animate-spin" />
              {aiProcessingCount} analyse Sentinel en cours
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px_220px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un dossier, une société, un email, un signal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-300"
            />
          </div>

          <FilterSelect value={groupFilter} onChange={setGroupFilter}>
            <option value="all">Tous les réseaux</option>
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
            <option value="all">Tous les signaux</option>
            <option value="hot">🔥 Signaux chauds 100+</option>
            <option value="warm">Potentiel latent 50-99</option>
            <option value="cold">À observer -50</option>
          </FilterSelect>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/75 bg-white/80 p-4 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        {loadingClients ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            PX Sentinel charge les dossiers...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-300">
              <UserPlus size={26} />
            </div>
            <h3 className="text-lg font-black text-slate-950">
              Aucun dossier détecté
            </h3>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Modifie tes filtres ou crée un nouveau dossier pour activer
              l’intelligence relationnelle MyPX.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300"
            >
              Créer un dossier
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredClients.map((client) => (
                <ClientMobileCard
                  key={client.id}
                  client={client}
                  onOpen={() => openClient(client.id)}
                  onDelete={(e) => handleDeleteClient(e, client.id)}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Dossier</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Téléphone</th>
                    <th className="px-4 py-4">Société</th>
                    <th className="px-4 py-4">Ville</th>
                    <th className="px-4 py-4">Réseau</th>
                    <th className="px-4 py-4">Signal</th>
                    <th className="px-4 py-4">Scores</th>
                    <th className="px-4 py-4">Potentiel</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => openClient(client.id)}
                      className="cursor-pointer border-t border-slate-100 transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-4 font-black text-slate-950">
                        {[client.first_name, client.last_name]
                          .filter(Boolean)
                          .join(" ") || "Dossier sans nom"}
                      </td>
                      <td className="px-4 py-4">{client.email || "—"}</td>
                      <td className="px-4 py-4">{client.phone || "—"}</td>
                      <td className="px-4 py-4">{client.company || "—"}</td>
                      <td className="px-4 py-4">{client.city || "—"}</td>
                      <td className="px-4 py-4">{client.group_name || "—"}</td>
                      <td className="px-4 py-4">
                        <StatusBadge value={getSignalLabel(client)} />
                      </td>
                      <td className="px-4 py-4">
                        <ScoreStack client={client} />
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-800">
                        {client.potential_amount
                          ? `${client.potential_amount.toLocaleString(
                              "fr-FR"
                            )} €`
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/75 bg-white/95 p-5 shadow-2xl shadow-cyan-300/40 backdrop-blur-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
                  <FileSpreadsheet size={14} />
                  Import Sentinel
                </div>

                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  Importer des contacts en masse
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  PX Sentinel lit ton fichier, prépare un tableau de contrôle et
                  te laisse valider chaque fiche avant création. Aucun email
                  n’est envoyé automatiquement.
                </p>
              </div>

              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:text-slate-950"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-cyan-200 bg-cyan-50/70 p-6 text-center transition hover:bg-cyan-50">
              <Upload className="mb-3 h-8 w-8 text-cyan-700" />
              <span className="text-sm font-black text-slate-950">
                Déposer un fichier CSV
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Colonnes acceptées : prénom, nom, email, téléphone, société,
                ville, groupe, statut, potentiel, notes.
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {importFileName && (
              <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                Fichier chargé : {importFileName}
              </div>
            )}

            {importRows.length > 0 && (
              <>
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <MiniStat
                    icon={<Users size={18} />}
                    label="Lignes détectées"
                    value={importRows.length}
                    tone="slate"
                  />
                  <MiniStat
                    icon={<CheckCircle2 size={18} />}
                    label="Lignes valides"
                    value={
                      importRows.filter((row) => row.errors.length === 0).length
                    }
                    tone="cyan"
                  />
                  <MiniStat
                    icon={<AlertTriangle size={18} />}
                    label="À vérifier"
                    value={
                      importRows.filter((row) => row.errors.length > 0).length
                    }
                    tone="orange"
                  />
                </div>

                <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
                  <table className="min-w-[1200px] text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      <tr>
                        <th className="px-3 py-3">OK</th>
                        <th className="px-3 py-3">Prénom</th>
                        <th className="px-3 py-3">Nom</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Téléphone</th>
                        <th className="px-3 py-3">Société</th>
                        <th className="px-3 py-3">Ville</th>
                        <th className="px-3 py-3">Groupe</th>
                        <th className="px-3 py-3">Statut</th>
                        <th className="px-3 py-3">Potentiel</th>
                        <th className="px-3 py-3">Contrôle Sentinel</th>
                      </tr>
                    </thead>

                    <tbody>
                      {importRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={row.errors.length > 0}
                              onChange={() => toggleImportRow(row.id)}
                            />
                          </td>

                          {[
                            "first_name",
                            "last_name",
                            "email",
                            "phone",
                            "company",
                            "city",
                            "group_name",
                            "status",
                            "potential_amount",
                          ].map((field) => (
                            <td key={field} className="px-3 py-3">
                              <input
                                value={row[field as keyof NewClientForm]}
                                onChange={(e) =>
                                  updateImportRow(
                                    row.id,
                                    field as keyof NewClientForm,
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[120px] rounded-xl border border-slate-200 px-3 py-2 font-semibold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                              />
                            </td>
                          ))}

                          <td className="px-3 py-3">
                            {row.errors.length === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-black text-emerald-700">
                                <CheckCircle2 size={13} />
                                Validé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 font-black text-orange-700">
                                <AlertTriangle size={13} />
                                {row.errors.join(", ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 rounded-[1.4rem] border border-violet-100 bg-violet-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        Sécurité PX Sentinel
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Les fiches sont importées sans envoi brutal. Si tu
                        actives la file d’attente, les emails seront préparés
                        avec un délai entre chaque envoi.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3 text-xs font-black text-slate-700">
                        <input
                          type="checkbox"
                          checked={prepareQueuedEmails}
                          onChange={(e) =>
                            setPrepareQueuedEmails(e.target.checked)
                          }
                        />
                        Préparer les emails en file Sentinel
                      </label>

                      <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3">
                        <span className="text-xs font-black text-slate-500">
                          1 email toutes les
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={queueDelayMinutes}
                          onChange={(e) => setQueueDelayMinutes(e.target.value)}
                          disabled={!prepareQueuedEmails}
                          className="w-16 bg-transparent text-center text-sm font-black text-slate-950 outline-none disabled:opacity-40"
                        />
                        <span className="text-xs font-black text-slate-500">
                          min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleConfirmImport}
                      disabled={importing}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {importing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Import Sentinel...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Importer les lignes validées
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/75 bg-white/95 p-5 shadow-2xl shadow-violet-300/40 backdrop-blur-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                  <Sparkles size={14} />
                  Nouveau dossier
                </div>

                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  Créer un dossier relationnel
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  MyPX prépare automatiquement le dossier, la séquence d’accueil
                  et l’analyse PX Sentinel dès l’enregistrement.
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
                    PX Sentinel activé
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Après création : analyse IA, score relationnel, email de
                    bienvenue et historique d’envoi si l’email est renseigné.
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
                placeholder="Moment relationnel"
                value={form.birthday}
                onChange={handleChange}
              />
              <FormInput
                icon={<Users size={15} />}
                name="group_name"
                placeholder="Réseau : Assurance, Invest, Premium..."
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
                <option value="client">Relation active</option>
                <option value="chaud">Signal chaud</option>
                <option value="a_relancer">Action requise</option>
              </select>

              <FormInput
                icon={<Euro size={15} />}
                name="potential_amount"
                type="number"
                placeholder="Potentiel commercial (€)"
                value={form.potential_amount}
                onChange={handleChange}
              />

              <textarea
                name="notes"
                placeholder="Renseignements, contexte, besoin, origine du contact, signaux faibles..."
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
                      Création du dossier...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Créer le dossier
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
    <div className="rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-xl shadow-violet-100/50 backdrop-blur-2xl">
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
  const isHot = value.toLowerCase().includes("chaud");
  const isAction = value.toLowerCase().includes("action");
  const isActive = value.toLowerCase().includes("active");

  const classes = isHot
    ? "border-orange-100 bg-orange-50 text-orange-700"
    : isAction
    ? "border-violet-100 bg-violet-50 text-violet-700"
    : isActive
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : "border-slate-100 bg-slate-50 text-slate-600";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${classes}`}
    >
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
        Sentinel {client.ai_score ?? 0}
      </span>

      {client.public_enrichment_status === "processing" && (
        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600">
          <Loader2 size={12} className="animate-spin" />
          Analyse Sentinel...
        </span>
      )}

      {client.public_enrichment_status === "failed" && (
        <span className="text-xs font-black text-rose-600">
          Sentinel échoué
        </span>
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
              "Dossier sans nom"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {client.company || client.email || "Sans société"}
          </p>
        </div>

        <StatusBadge value={getSignalLabel(client)} />
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
            Action Sentinel
          </p>
          <p className="text-xs leading-5 text-slate-600">
            {client.next_best_action}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">
          {client.potential_amount
            ? `${client.potential_amount.toLocaleString("fr-FR")} €`
            : "0 €"}
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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
