const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: "Variables manquantes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    const followUpsRes = await fetch(
      `${supabaseUrl}/rest/v1/follow_ups?status=eq.pending&auto_email_sent=eq.false&due_date=lte.${now}&select=*`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const followUps = await followUpsRes.json();

    let sent = 0;
    let failed = 0;

    for (const followUp of followUps) {
      if (!followUp.client_id) continue;

      const clientRes = await fetch(
        `${supabaseUrl}/rest/v1/clients?id=eq.${followUp.client_id}&select=*`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );

      const clients = await clientRes.json();
      const client = clients?.[0];

      if (!client?.email) continue;

      const subject = `Relance : ${followUp.title}`;
      const html = `
          Bonjour ${client.first_name || ""},
          <br/><br/>
          Je reviens vers vous concernant :
          <br/>
          <strong>${followUp.title}</strong>
          <br/><br/>
          ${followUp.note || ""}
          <br/><br/>
          À bientôt.
        `;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MyPX <onboarding@resend.dev>",
          to: client.email,
          subject,
          html,
        }),
      });

      const success = resendRes.ok;

      await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id: followUp.user_id,
          client_id: client.id,
          template_type: "auto_follow_up",
          subject,
          content: html,
          recipient_email: client.email,
          status: success ? "sent" : "failed",
        }),
      });

      if (success) {
        sent++;

        await fetch(`${supabaseUrl}/rest/v1/follow_ups?id=eq.${followUp.id}`, {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            auto_email_sent: true,
            auto_email_sent_at: now,
            status: "done",
          }),
        });

        await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${client.id}`, {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            last_contact_at: now,
          }),
        });
      } else {
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
