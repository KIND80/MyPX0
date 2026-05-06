import { useState } from "react";
import type React from "react";
import { Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Crown,
  HelpCircle,
  Lightbulb,
  Loader2,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type SettingsProps = {
  session: Session;
};

export default function Settings({ session }: SettingsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const whatsappHref =
    "https://wa.me/41797896193?text=" +
    encodeURIComponent("Bonjour, j’ai besoin d’aide concernant MyPX.");

  const supportMailHref =
    "mailto:contact@mypx.ch?subject=" +
    encodeURIComponent("Support MyPX") +
    "&body=" +
    encodeURIComponent(
      "Bonjour,\n\nJ’ai besoin d’aide concernant MyPX.\n\nMerci."
    );

  const ideaMailHref =
    "mailto:contact@mypx.ch?subject=" +
    encodeURIComponent("Suggestion MyPX") +
    "&body=" +
    encodeURIComponent(
      "Bonjour,\n\nJ’aimerais proposer une idée pour MyPX :\n\n"
    );

  const bugMailHref =
    "mailto:contact@mypx.ch?subject=" +
    encodeURIComponent("Bug MyPX") +
    "&body=" +
    encodeURIComponent(
      "Bonjour,\n\nJe souhaite signaler un bug sur MyPX.\n\nPage concernée :\nDescription du problème :\n"
    );

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError("");
    setMessage("");

    try {
      const userId = session.user.id;

      await supabase.from("client_ai_history").delete().eq("user_id", userId);
      await supabase.from("client_notes").delete().eq("user_id", userId);
      await supabase.from("follow_ups").delete().eq("user_id", userId);
      await supabase.from("email_logs").delete().eq("user_id", userId);
      await supabase.from("campaigns").delete().eq("user_id", userId);
      await supabase.from("email_templates").delete().eq("user_id", userId);
      await supabase.from("user_onboarding").delete().eq("user_id", userId);
      await supabase.from("clients").delete().eq("user_id", userId);

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      setMessage("Votre espace MyPX a été neutralisé avec succès.");
      window.location.href = "/";
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur pendant la suppression du compte.";

      setError(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-56 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <header className="relative mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700 shadow-sm backdrop-blur-xl">
          <Sparkles size={14} />
          Configuration système
        </div>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
          Espace opérateur
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          Gérez votre accès, contactez le support MyPX et pilotez les réglages
          essentiels de votre centre de commandement relationnel.
        </p>
      </header>

      {message ? (
        <AlertBox type="success" text={message} />
      ) : null}

      {error ? (
        <AlertBox type="error" text={error} />
      ) : null}

      <section className="relative grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
              <UserRound size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                Identité connectée
              </p>

              <h2 className="mt-2 break-words text-2xl font-black text-slate-950">
                {session.user.email}
              </h2>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                Votre espace est rattaché à un compte sécurisé. Les dossiers,
                opérations, transmissions et renseignements restent séparés par
                utilisateur.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoCard
              icon={Crown}
              title="Plan actuel"
              value="Free"
              description="3 analyses PX Sentinel par mois"
            />

            <InfoCard
              icon={ShieldCheck}
              title="Protection"
              value="Privé"
              description="Données isolées par compte"
            />

            <InfoCard
              icon={CheckCircle2}
              title="Système"
              value="Actif"
              description="Centre opérationnel"
            />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
              Canal d’assistance
            </p>

            <h2 className="mt-3 text-2xl font-black">Besoin d’aide ?</h2>

            <p className="mt-3 text-sm font-bold leading-6 text-white/60">
              Contactez l’équipe MyPX pour débloquer une situation, signaler un
              problème ou obtenir un accompagnement.
            </p>

            <div className="mt-6 space-y-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-black text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-600"
              >
                <MessageCircle size={18} />
                WhatsApp direct
              </a>

              <a
                href={supportMailHref}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <Mail size={18} />
                Email support
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActionCard
          icon={Lightbulb}
          title="Proposer une amélioration"
          description="Une idée pour rendre MyPX plus intelligent, plus rapide ou plus utile dans votre quotidien ? Transmettez votre signal."
          href={ideaMailHref}
          buttonLabel="Transmettre l’idée"
        />

        <ActionCard
          icon={Bug}
          title="Signaler une anomalie"
          description="Un bug, un problème d’affichage, un souci d’envoi email ou une synchronisation étrange ? Envoyez un rapport au support."
          href={bugMailHref}
          buttonLabel="Signaler l’anomalie"
        />
      </section>

      <section className="relative mt-6 rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-700">
              <AlertTriangle size={14} />
              Zone sensible
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Neutraliser mon espace MyPX
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
              Cette action supprime les données principales liées à votre centre
              de commandement : dossiers, opérations, transmissions, actions
              prioritaires et configuration.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-700"
          >
            <Trash2 size={18} />
            Supprimer mon espace
          </button>
        </div>
      </section>

      <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-cyan-100 bg-cyan-50 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
            <HelpCircle size={22} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-950">
              Prochaines capacités PX Sentinel
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              Évolutions envisagées : synchronisation Google Agenda, offres Pro,
              analyses IA renforcées, scoring relationnel avancé,
              automatisations intelligentes et signatures multiples selon les
              profils.
            </p>
          </div>
        </div>
      </section>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <AlertTriangle size={26} />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              Confirmation requise
            </h2>

            <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
              Cette action est définitive pour les données principales de votre
              espace MyPX : dossiers, opérations, historiques, actions
              prioritaires, modèles emails et configuration seront supprimés de
              l’application.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-rose-600 px-5 py-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={17} className="animate-spin" />
                    Suppression...
                  </span>
                ) : (
                  "Supprimer définitivement"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AlertBox({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  const isSuccess = type === "success";

  return (
    <div
      className={`mb-6 rounded-3xl border p-4 text-sm font-bold ${
        isSuccess
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-rose-100 bg-rose-50 text-rose-700"
      }`}
    >
      {text}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="group rounded-[2rem] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-violet-100/50">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        <Icon size={15} />
        {title}
      </div>

      <p className="mt-3 text-lg font-black text-slate-950">{value}</p>

      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  buttonLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <article className="group rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-violet-200/70 sm:p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100 transition group-hover:scale-105">
        <Icon size={22} />
      </div>

      <h2 className="mt-4 text-2xl font-black text-slate-950">{title}</h2>

      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
        {description}
      </p>

      <a
        href={href}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black sm:w-auto"
      >
        <Mail size={17} />
        {buttonLabel}
      </a>
    </article>
  );
}