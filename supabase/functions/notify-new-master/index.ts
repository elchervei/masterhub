import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("BOT_TOKEN");
    if (!botToken) throw new Error("Telegram bot is not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const authClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const masterId = typeof body.master_id === "string" ? body.master_id : "";
    if (!masterId) return json({ error: "Missing master_id" }, 400);

    const { data: master, error: masterError } = await admin.from("masters")
      .select("id,user_id,public_name,category,city,studio_name,contact_telegram,experience_years,created_at,status")
      .eq("id", masterId).eq("user_id", authData.user.id).eq("status", "pending").maybeSingle();
    if (masterError) throw masterError;
    if (!master) return json({ error: "Master application not found" }, 404);

    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("display_name,telegram_id").eq("id", authData.user.id).maybeSingle();
    if (profileError) throw profileError;
    const { data: admins, error: adminsError } = await admin.from("profiles")
      .select("telegram_id,display_name").eq("role", "admin").not("telegram_id", "is", null);
    if (adminsError) throw adminsError;
    if (!admins?.length) return json({ error: "No Telegram admin recipient configured" }, 500);

    const categoryNames: Record<string, string> = {
      tattoo: "Татуировка", nails: "Маникюр / ногти", piercing: "Пирсинг",
      makeup: "Макияж", brows: "Брови и ресницы", hair: "Волосы",
    };
    const lines = [
      "🆕 НОВАЯ АНКЕТА МАСТЕРА — MASTER HUB",
      "",
      `Имя: ${master.public_name || "Не указано"}`,
      `Направление: ${categoryNames[master.category] || master.category || "Не указано"}`,
      `Город: ${master.city || "Не указан"}`,
      `Студия: ${master.studio_name || "Не указана"}`,
      `Опыт: ${master.experience_years ?? 0} лет`,
      `Telegram мастера: ${master.contact_telegram ? "@" + master.contact_telegram.replace(/^@/, "") : "Не указан"}`,
      `Аккаунт: ${profile?.display_name || "Не указано"}`,
      `Telegram ID: ${profile?.telegram_id || "не привязан"}`,
      "",
      "Открой админ-панель MASTER HUB, чтобы проверить анкету.",
    ];
    const message = lines.join("\n");
    const results = await Promise.all(admins.map(async (recipient) => {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: recipient.telegram_id, text: message, disable_web_page_preview: true }),
      });
      const result = await response.json().catch(() => ({}));
      return { ok: response.ok && result?.ok === true, error: result?.description };
    }));
    if (results.some((item) => !item.ok)) {
      console.error("Admin master application notification failed", results);
      return json({ error: "Telegram could not deliver notification" }, 502);
    }
    return json({ ok: true });
  } catch (error) {
    console.error("notify-new-master:", error);
    return json({ error: error instanceof Error ? error.message : "Notification failed" }, 500);
  }
});