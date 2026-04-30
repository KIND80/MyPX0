import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type TimelineItem = {
  type: string;
  title: string;
  content: string;
  created_at: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      first_name,
      last_name,
      company,
      city,
      group_name,
      status,
      notes,
      ai_summary,
      next_best_action,
      timeline,
    } = body;

    const fullName =
      [first_name, last_name].filter(Boolean).join(" ") || "ce contact";

    const recentTimeline = Array.isArray(timeline)
      ? timeline
          .slice(0, 5)
          .map(
            (item: TimelineItem) =>
              `- ${item.type} : ${item.title} / ${item.content || "—"}`
          )
          .join("\n")
      : "";

    let angle = "Reprendre contact avec une approche personnalisée";
    let reason =
      "La fiche contient assez d’informations pour créer une conversation utile sans approche commerciale agressive.";
    let message = `Bonjour ${first_name || ""},

Je me permets de revenir vers vous pour prendre de vos nouvelles et voir où vous en êtes actuellement.

Je pense qu’il peut y avoir un échange intéressant à avoir selon votre situation actuelle.

Seriez-vous disponible prochainement pour un court échange ?`;

    if (company) {
      angle = `Créer une conversation autour de l’évolution de ${company}`;
      reason = `Le contact est lié à ${company}. C’est un bon point d’entrée pour engager une discussion professionnelle contextualisée.`;
      message = `Bonjour ${first_name || ""},

Je me permets de revenir vers vous car je pensais à votre activité chez ${company}.

Selon votre situation actuelle, il peut y avoir des sujets intéressants à regarder ensemble, sans engagement.

Seriez-vous disponible cette semaine pour un court échange ?`;
    }

    if (status === "chaud") {
      angle = "Transformer l’intérêt existant en échange concret";
      reason =
        "Le contact est déjà identifié comme chaud. Il faut capitaliser sur cet intérêt pendant que l’attention est encore présente.";
      message = `Bonjour ${first_name || ""},

Je reviens vers vous suite à nos précédents échanges.

Comme le sujet semblait pertinent pour vous, je me dis que c’est peut-être le bon moment pour avancer ou au moins refaire un point rapide.

Avez-vous un créneau cette semaine ?`;
    }

    if (status === "a_relancer") {
      angle = "Relance douce avec prétexte utile";
      reason =
        "Le contact est marqué comme à relancer. L’objectif est de rouvrir la discussion sans pression.";
      message = `Bonjour ${first_name || ""},

Je me permets de vous relancer simplement pour savoir si le sujet est toujours d’actualité de votre côté.

Même si ce n’est pas urgent, je peux vous faire un point rapide ou vous orienter si besoin.

Êtes-vous disponible pour un court échange ?`;
    }

    if (notes) {
      reason += `\n\nNote interne prise en compte : ${notes}`;
    }

    if (ai_summary) {
      reason += `\n\nRésumé IA existant : ${ai_summary}`;
    }

    if (next_best_action) {
      angle = next_best_action;
    }

    if (recentTimeline) {
      reason += `\n\nHistorique récent :\n${recentTimeline}`;
    }

    if (city) {
      reason += `\n\nLocalisation : ${city}.`;
    }

    if (group_name) {
      reason += `\n\nGroupe client : ${group_name}.`;
    }

    return new Response(
      JSON.stringify({
        angle,
        reason,
        message,
        contact_name: fullName,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Erreur pendant la génération de l’opportunité.",
        details: String(error),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});