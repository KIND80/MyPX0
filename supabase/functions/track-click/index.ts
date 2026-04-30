Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const logId = url.searchParams.get("id");
    const redirectUrl = url.searchParams.get("url");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!logId || !redirectUrl || !supabaseUrl || !serviceRoleKey) {
      return new Response("bad request", { status: 400 });
    }

    await fetch(`${supabaseUrl}/rest/v1/email_logs?id=eq.${logId}`, {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        clicked_at: new Date().toISOString(),
      }),
    });

    await fetch(`${supabaseUrl}/rest/v1/rpc/increment_email_click`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ log_id: logId }),
    });

    return Response.redirect(redirectUrl, 302);
  } catch {
    return new Response("error", { status: 500 });
  }
});
