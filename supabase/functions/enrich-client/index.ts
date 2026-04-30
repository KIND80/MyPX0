import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function safeJsonParse(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON IA invalide");
    return JSON.parse(match[0]);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      client_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      company,
      city,
      notes,
    } = body;

    if (!client_id || !user_id) {
      throw new Error("client_id ou user_id manquant");
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");

    if (!supabaseUrl) throw new Error("PROJECT_URL manquant");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY manquant");
    if (!tavilyApiKey) throw new Error("TAVILY_API_KEY manquant");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const fullName = `${cleanText(first_name)} ${cleanText(last_name)}`.trim();
    const companyName = cleanText(company);
    const cityName = cleanText(city);

    const searchQueries = [
      `${fullName} ${companyName} ${cityName}`,
      `${fullName} LinkedIn ${companyName}`,
      `${companyName} actualité recrutement événement`,
      `${companyName} ${cityName} entreprise`,
    ].filter((q) => q.replace(/\s/g, "").length > 3);

    const tavilyResults: any[] = [];

    for (const query of searchQueries.slice(0, 4)) {
      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": tavilyApiKey,
        },
        body: JSON.stringify({
          query,
          search_depth: "advanced",
          max_results: 5,
          include_answer: true,
          include_raw_content: false,
        }),
      });

      const tavilyRaw = await tavilyResponse.text();

      if (tavilyResponse.ok) {
        const tavilyJson = JSON.parse(tavilyRaw);
        tavilyResults.push({
          query,
          answer: tavilyJson.answer || "",
          results: tavilyJson.results || [],
        });
      } else {
        tavilyResults.push({
          query,
          error: tavilyRaw,
        });
      }
    }

    const publicContext = tavilyResults
      .map((block) => {
        const results = (block.results || [])
          .slice(0, 5)
          .map((r: any) => {
            return `
Titre: ${r.title || ""}
URL: ${r.url || ""}
Contenu: ${r.content || ""}
`;
          })
          .join("\n");

        return `
Recherche: ${block.query}
Réponse courte: ${block.answer || ""}
Résultats:
${results}
`;
      })
      .join("\n---\n");

    const prompt = `
Tu es le Radar IA commercial de MyPX.

Mission :
Analyser un contact CRM avec les données internes + les signaux publics trouvés sur internet.
Tu dois détecter s'il existe une opportunité naturelle de conversation.

Contact CRM :
Prénom : ${first_name || ""}
Nom : ${last_name || ""}
Email : ${email || ""}
Téléphone : ${phone || ""}
Société : ${company || ""}
Ville : ${city || ""}
Notes internes : ${notes || ""}

Signaux publics trouvés :
${publicContext}

Analyse les éléments suivants :
- changement de poste possible
- présence LinkedIn publique
- actualité entreprise
- recrutement
- événement récent
- croissance
- levée de fonds
- nouveau projet
- opportunité de relance
- angle de conversation non agressif

Règles :
- Ne prétends jamais avoir une certitude si le signal est faible.
- Si les données publiques sont insuffisantes, dis-le clairement.
- Le message suggéré doit être naturel, court et professionnel.
- Ne donne pas de conseil intrusif.
- Retourne uniquement un JSON valide.

Format obligatoire :
{
  "ai_score": 0,
  "ai_status": "froid | tiède | chaud | opportunité détectée",
  "ai_summary": "",
  "conversation_opportunity": "",
  "next_best_action": "",
  "suggested_message": "",
  "public_enrichment_status": "completed",
  "detected_signals": [
    {
      "type": "",
      "title": "",
      "description": "",
      "source_url": "",
      "confidence": "faible | moyen | fort"
    }
  ]
}
`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Tu es un assistant CRM expert en enrichissement commercial. Tu réponds uniquement en JSON valide.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const rawOpenAI = await openaiResponse.text();

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI error: ${rawOpenAI}`);
    }

    const openaiJson = JSON.parse(rawOpenAI);
    const content = openaiJson.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Réponse OpenAI vide");
    }

    const result = safeJsonParse(content);

    const aiScore = Math.max(0, Math.min(100, Number(result.ai_score || 0)));

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        ai_score: aiScore,
        ai_status: result.ai_status || "froid",
        ai_summary: result.ai_summary || "",
        conversation_opportunity: result.conversation_opportunity || "",
        next_best_action: result.next_best_action || "",
        suggested_message: result.suggested_message || "",
        public_enrichment_status:
          result.public_enrichment_status || "completed",
        last_ai_update: new Date().toISOString(),
      })
      .eq("id", client_id)
      .eq("user_id", user_id);

    if (updateError) {
      throw new Error(`Supabase update error: ${updateError.message}`);
    }

    const detectedSignals = Array.isArray(result.detected_signals)
      ? result.detected_signals
      : [];

    for (const signal of detectedSignals.slice(0, 10)) {
      await supabase.from("public_radar_events").insert({
        user_id,
        client_id,
        event_type: signal.type || "signal_public",
        title: signal.title || "Signal détecté",
        description: signal.description || "",
        source_url: signal.source_url || "",
        confidence: signal.confidence || "moyen",
        created_at: new Date().toISOString(),
      });
    }

    if (aiScore >= 70 || result.conversation_opportunity) {
      await supabase.from("notifications").insert({
        user_id,
        client_id,
        title: "Opportunité de conversation détectée",
        message:
          result.conversation_opportunity ||
          `MyPX a détecté une opportunité avec ${fullName || "ce contact"}.`,
        type: "radar_ai",
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        searches: tavilyResults,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("enrich-client error", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
