Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const logId = url.searchParams.get("id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!logId || !supabaseUrl || !serviceRoleKey) {
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
        opened_at: new Date().toISOString(),
      }),
    });

    await fetch(`${supabaseUrl}/rest/v1/rpc/increment_email_open`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ log_id: logId }),
    });

    const pixel = Uint8Array.from([
      71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33,
      249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59,
    ]);

    return new Response(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return new Response("error", { status: 500 });
  }
});
