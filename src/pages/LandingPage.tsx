import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mail,
  MousePointerClick,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "CRM intelligent",
    text: "Centralise tes clients, prospects, groupes, statuts, notes, potentiel commercial et historique dans un seul espace simple.",
  },
  {
    icon: Mail,
    title: "Campagnes email ciblées",
    text: "Envoie des campagnes personnalisées à tes groupes de clients avec suivi des ouvertures, clics et performances.",
  },
  {
    icon: BellRing,
    title: "Relances importantes",
    text: "Anniversaires, clients inactifs, suivis à faire, opportunités chaudes : MyPX t’aide à ne plus rien oublier.",
  },
  {
    icon: BarChart3,
    title: "Dashboard commercial",
    text: "Visualise ton portefeuille, tes relances, ton pipeline, tes campagnes et tes actions prioritaires en un coup d’œil.",
  },
  {
    icon: Radar,
    title: "Radar IA",
    text: "Détecte les signaux utiles pour relancer le bon contact, au bon moment, avec le bon message.",
  },
  {
    icon: ShieldCheck,
    title: "Pensé SaaS & équipes",
    text: "Une base solide pour indépendants, conseillers, commerciaux, réseaux, cabinets et offres en marque blanche.",
  },
];

const stats = [
  ["Contacts suivis", "248"],
  ["Relances IA", "18"],
  ["Campagnes", "7"],
  ["Pipeline", "86k€"],
];

const radarSignals = [
  "Un client dormant devient une opportunité commerciale",
  "Une entreprise bouge, recrute ou montre un signal intéressant",
  "Un contact mérite une relance personnalisée",
  "Une action commerciale est proposée automatiquement",
];

const useCases = [
  "Conseillers en assurance",
  "Courtiers",
  "Commerciaux indépendants",
  "Agences et cabinets",
  "Réseaux de vente",
  "Entrepreneurs avec portefeuille client",
];

const plans = [
  [
    "Starter",
    "Pour structurer ton suivi",
    "CRM, clients, groupes, relances, notes et suivi simple du portefeuille.",
  ],
  [
    "Business",
    "Pour vendre plus intelligemment",
    "Campagnes email, statistiques, logs, relances prioritaires et dashboard commercial.",
  ],
  [
    "White Label",
    "Pour réseaux et marques",
    "Solution personnalisable pour équipes, réseaux commerciaux et déploiement en marque blanche.",
  ],
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbf7ef] text-slate-950">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#fbf7ef]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-violet-200 transition group-hover:scale-105">
              <Sparkles size={20} />
            </div>

            <div className="text-left">
              <p className="text-lg font-black tracking-tight">MyPX</p>
              <p className="text-xs font-medium text-slate-500">
                Portfolio Intelligence
              </p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-500 md:flex">
            <a href="#features" className="transition hover:text-slate-950">
              Fonctionnalités
            </a>
            <a href="#radar" className="transition hover:text-slate-950">
              Radar IA
            </a>
            <a href="#usecases" className="transition hover:text-slate-950">
              Pour qui ?
            </a>
            <a href="#pricing" className="transition hover:text-slate-950">
              Offres
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className="hidden rounded-full px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-white sm:block"
            >
              Connexion
            </button>

            <button
              onClick={() => navigate("/register")}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black"
            >
              Démarrer
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="absolute right-[-140px] top-[-160px] h-[440px] w-[440px] rounded-full bg-violet-300/35 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[-160px] h-[420px] w-[420px] rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute left-[45%] top-[20%] h-[260px] w-[260px] rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-xl">
              <Radar size={16} className="text-violet-600" />
              CRM intelligent pour portefeuilles clients
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Transforme tes contacts dormants en opportunités.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              MyPX aide les conseillers, commerciaux et entrepreneurs à mieux
              suivre leur portefeuille client : relances intelligentes,
              campagnes email, historique, rappels, statistiques et Radar IA.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {["Suivi client", "Relances", "Campagnes", "IA commerciale"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-black text-slate-600 shadow-sm backdrop-blur-xl"
                  >
                    {item}
                  </span>
                )
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/register")}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-2xl shadow-slate-300 transition hover:-translate-y-1 hover:bg-black"
              >
                Créer mon espace
                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </button>

              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/5 bg-white/75 px-7 py-4 text-sm font-black text-slate-800 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white"
              >
                J’ai déjà un compte
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["+ clair", "portefeuille structuré"],
                ["0 oubli", "relances guidées"],
                ["+ ventes", "actions prioritaires"],
              ].map(([title, subtitle]) => (
                <div
                  key={title}
                  className="rounded-[1.5rem] border border-white/70 bg-white/65 p-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-1"
                >
                  <p className="font-black">{title}</p>
                  <p className="text-sm font-medium text-slate-500">
                    {subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* HERO CARD */}
          <div className="relative">
            <div className="absolute -left-5 top-12 hidden rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-sm font-black">Action détectée</p>
                  <p className="text-xs text-slate-500">12 relances utiles</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-3 bottom-16 hidden rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                  <Wand2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-black">Message IA</p>
                  <p className="text-xs text-slate-500">prêt à envoyer</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2.6rem] border border-white/80 bg-white/70 p-4 shadow-2xl shadow-violet-200/60 backdrop-blur-2xl">
              <div className="rounded-[2.1rem] bg-slate-950 p-5 text-white shadow-inner">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white/45">
                      Dashboard MyPX
                    </p>
                    <h3 className="mt-1 text-2xl font-black">
                      Portfolio Intelligence
                    </h3>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-3">
                    <Brain size={23} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {stats.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"
                    >
                      <p className="text-sm text-white/45">{label}</p>
                      <p className="mt-2 text-2xl font-black">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-3xl bg-gradient-to-br from-amber-200 to-cyan-200 p-4 text-slate-950">
                  <div className="flex items-start gap-3">
                    <Sparkles size={21} className="mt-0.5 text-violet-700" />
                    <div>
                      <p className="font-black">Suggestion IA</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        12 clients inactifs peuvent être réactivés avec une
                        campagne personnalisée cette semaine.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-violet-50 p-4">
                  <p className="text-sm font-bold text-slate-500">Ouverture</p>
                  <p className="mt-2 text-3xl font-black">42%</p>
                </div>
                <div className="rounded-3xl bg-cyan-50 p-4">
                  <p className="text-sm font-bold text-slate-500">Clic</p>
                  <p className="mt-2 text-3xl font-black">16%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur-xl">
            <Clock3 className="text-violet-600" size={26} />
            <h3 className="mt-5 text-xl font-black">Tu oublies de relancer</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Les clients importants passent après l’urgence du quotidien. MyPX
              remet les bonnes actions devant toi.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur-xl">
            <Mail className="text-violet-600" size={26} />
            <h3 className="mt-5 text-xl font-black">Tes contacts dorment</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Un portefeuille client non animé perd de la valeur. MyPX aide à
              créer des conversations régulières et utiles.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur-xl">
            <Brain className="text-violet-600" size={26} />
            <h3 className="mt-5 text-xl font-black">Tu manques de signal</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Le Radar IA aide à prioriser les clients à contacter et propose
              des angles de relance plus pertinents.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-violet-600">
            Fonctionnalités
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Tout pour animer ton portefeuille client.
          </h2>
          <p className="mt-4 leading-8 text-slate-600">
            MyPX ne sert pas seulement à stocker des contacts. Il t’aide à
            décider qui relancer, pourquoi, quand et avec quel message.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="group rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition group-hover:rotate-3 group-hover:scale-105">
                <item.icon size={21} />
              </div>
              <h3 className="mt-5 text-xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RADAR */}
      <section
        id="radar"
        className="relative overflow-hidden bg-slate-950 py-20 text-white"
      >
        <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">
              Radar IA
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Ton CRM ne stocke plus seulement des contacts. Il les comprend.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/60">
              MyPX devient ton assistant commercial : il observe les signaux,
              priorise les actions et t’aide à créer la bonne conversation.
            </p>

            <button
              onClick={() => navigate("/register")}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1"
            >
              Activer mon radar
              <MousePointerClick size={18} />
            </button>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            {radarSignals.map((item) => (
              <div
                key={item}
                className="mb-3 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4"
              >
                <CheckCircle2 className="text-cyan-300" size={20} />
                <p className="font-medium text-white/80">{item}</p>
              </div>
            ))}

            <div className="mt-5 rounded-3xl bg-white p-5 text-slate-950">
              <p className="text-sm font-black text-violet-700">Exemple IA</p>
              <p className="mt-2 text-lg font-black">
                “Relance ce contact cette semaine avec une approche
                partenariat.”
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                MyPX aide à passer de la donnée froide à une opportunité réelle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="usecases" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-violet-600">
              Pour qui ?
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Pour tous ceux qui vivent de la relation client.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              MyPX est pensé pour les professionnels qui ont un portefeuille à
              suivre, à animer et à convertir dans le temps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {useCases.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl"
              >
                <CheckCircle2 size={20} className="text-violet-600" />
                <p className="font-bold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-violet-600">
            Offres
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Une solution pensée pour démarrer simple, puis évoluer.
          </h2>
          <p className="mt-4 leading-8 text-slate-600">
            Commence avec le CRM et les relances, puis ajoute les campagnes, le
            suivi email, l’IA et les options équipe selon tes besoins.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map(([name, subtitle, desc], index) => (
            <div
              key={name}
              className={`rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-1 ${
                index === 1
                  ? "border-slate-950 bg-slate-950 text-white shadow-2xl shadow-slate-300"
                  : "border-white/70 bg-white/70 text-slate-950 backdrop-blur-xl"
              }`}
            >
              {index === 1 && (
                <div className="mb-4 inline-flex rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950">
                  Populaire
                </div>
              )}

              <p className="text-2xl font-black">{name}</p>
              <p
                className={`mt-2 text-sm ${
                  index === 1 ? "text-white/55" : "text-slate-500"
                }`}
              >
                {subtitle}
              </p>
              <p
                className={`mt-6 leading-7 ${
                  index === 1 ? "text-white/70" : "text-slate-600"
                }`}
              >
                {desc}
              </p>

              <button
                onClick={() => navigate("/register")}
                className={`mt-8 w-full rounded-full px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${
                  index === 1
                    ? "bg-gradient-to-r from-amber-200 to-cyan-200 text-slate-950"
                    : "bg-slate-950 text-white"
                }`}
              >
                Demander une démo
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-200 via-violet-100 to-cyan-200 p-8 text-center shadow-2xl shadow-violet-100 sm:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Sparkles size={24} />
          </div>

          <h2 className="mx-auto max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
            Ton portefeuille client vaut plus que tu ne l’exploites.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-700">
            MyPX t’aide à transformer tes contacts dormants en conversations,
            relances, campagnes et opportunités concrètes.
          </p>

          <button
            onClick={() => navigate("/register")}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-8 py-4 text-sm font-black text-white shadow-xl shadow-slate-400/30 transition hover:-translate-y-1"
          >
            Lancer MyPX
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
