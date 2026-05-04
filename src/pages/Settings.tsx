import { useState } from "react";
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
  Trash2,
  UserRound,
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

      if (signOutError) {
        throw signOutError;
      }

      setMessage("Votre compte a été supprimé de l’application.");
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
    <div>
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700 shadow-sm backdrop-blur-xl">
          <UserRound size={14} />
          Paramètres
        </div>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
          Mon espace MyPX
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          Gérez votre compte, contactez le support et suivez les informations
          importantes de votre espace.
        </p>
      </header>

      {message ? (
        <div className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl xl:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <UserRound size={22} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                Compte connecté
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {session.user.email}
              </h2>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                Votre espace est sécurisé avec Supabase Auth. Les données sont
                rattachées à votre compte utilisateur.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoCard
              icon={Crown}
              title="Plan actuel"
              value="Free"
              description="3 analyses IA par mois"
            />

            <InfoCard
              icon={ShieldCheck}
              title="Sécurité"
              value="Privé"
              description="Données séparées par compte"
            />

            <InfoCard
              icon={CheckCircle2}
              title="Statut"
              value="Actif"
              description="Compte opérationnel"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-violet-100 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Support direct
          </p>

          <h2 className="mt-3 text-2xl font-black">Besoin d’aide ?</h2>

          <p className="mt-3 text-sm font-bold leading-6 text-white/60">
            Contactez MyPX rapidement par WhatsApp ou par email.
          </p>

          <div className="mt-6 space-y-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>

            <a
              href={supportMailHref}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
            >
              <Mail size={18} />
              Email support
            </a>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActionCard
          icon={Lightbulb}
          title="Proposer une idée"
          description="Une amélioration, une intégration ou une fonctionnalité à ajouter ? Envoyez-nous votre suggestion."
          href={ideaMailHref}
          buttonLabel="Envoyer une suggestion"
        />

        <ActionCard
          icon={Bug}
          title="Signaler un bug"
          description="Un problème d’affichage, d’envoi email ou de synchronisation ? Prévenez-nous rapidement."
          href={bugMailHref}
          buttonLabel="Signaler un bug"
        />
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-700">
              <AlertTriangle size={14} />
              Zone sensible
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Supprimer mon compte
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
              Cette action supprime les données principales liées à votre espace
              MyPX et vous déconnecte de l’application.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-700"
          >
            <Trash2 size={18} />
            Supprimer mon compte
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-cyan-100 bg-cyan-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cyan-700">
            <HelpCircle size={22} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-950">
              À venir dans MyPX
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              Prochaines évolutions possibles : synchronisation Google Agenda,
              offres Pro, plus d’analyses IA mensuelles, scoring client avancé
              et automatisations intelligentes.
            </p>
          </div>
        </div>
      </section>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <AlertTriangle size={26} />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              Confirmer la suppression
            </h2>

            <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
              Cette action est importante. Vos clients, campagnes, historiques,
              relances et données de configuration seront supprimés de
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
    <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
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
    <article className="rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-2xl shadow-violet-100/60 backdrop-blur-2xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Icon size={22} />
      </div>

      <h2 className="mt-4 text-2xl font-black text-slate-950">{title}</h2>

      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
        {description}
      </p>

      <a
        href={href}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
      >
        <Mail size={17} />
        {buttonLabel}
      </a>
    </article>
  );
}
