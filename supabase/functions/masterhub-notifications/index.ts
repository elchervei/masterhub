import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const TIME_ZONE = "Europe/Kaliningrad";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(value));
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
function clean(value: unknown, fallback = "Не указано") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function main() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const botToken = Deno.env.get("BOT_TOKEN");
  if (!supabaseUrl || !serviceKey || !botToken) throw new Error("Missing server configuration");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  async function authorized(req: Request) {
    const candidate = req.headers.get("x-masterhub-cron-secret") || "";
    if (!candidate) return false;
    const { data, error } = await admin.rpc("verify_masterhub_notification_secret", { candidate });
    if (error) {
      console.error("Notification secret verification failed:", error.message);
      return false;
    }
    return data === true;
  }

  async function telegram(chatId: string, text: string) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true) {
      throw new Error(String(result?.description || `Telegram HTTP ${response.status}`));
    }
  }

  async function sendOnce(bookingId: string, profileId: string, chatId: string | null, kind: string, message: string) {
    if (!chatId) return { skipped: "no_telegram_id" };
    const { data: existing, error: lookupError } = await admin
      .from("booking_notification_log")
      .select("id,status,attempted_at")
      .eq("booking_id", bookingId)
      .eq("recipient_profile_id", profileId)
      .eq("notification_type", kind)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.status === "sent" || existing?.status === "sending") return { skipped: existing.status };
    if (existing?.status === "failed" && existing.attempted_at && Date.now() - new Date(existing.attempted_at).getTime() < 30 * 60 * 1000) {
      return { skipped: "retry_backoff" };
    }

    let logId: string;
    if (existing) {
      const { data, error } = await admin.from("booking_notification_log")
        .update({ status: "sending", attempted_at: new Date().toISOString(), last_error: null })
        .eq("id", existing.id).eq("status", "failed").select("id").maybeSingle();
      if (error) throw error;
      if (!data) return { skipped: "claimed_elsewhere" };
      logId = data.id;
    } else {
      const { data, error } = await admin.from("booking_notification_log")
        .insert({ booking_id: bookingId, recipient_profile_id: profileId, notification_type: kind, status: "sending", attempted_at: new Date().toISOString() })
        .select("id").single();
      if (error) {
        if (error.code === "23505") return { skipped: "claimed_elsewhere" };
        throw error;
      }
      logId = data.id;
    }

    try {
      await telegram(chatId, message);
      const { error } = await admin.from("booking_notification_log")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", logId);
      if (error) throw error;
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await admin.from("booking_notification_log")
        .update({ status: "failed", last_error: message.slice(0, 500) }).eq("id", logId);
      console.error("Telegram notification failed:", { bookingId, profileId, kind, error: message });
      return { error: message };
    }
  }

  async function loadContext(bookingId: string) {
    const { data: booking, error } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (error) throw error;
    if (!booking) return null;
    const [{ data: master, error: masterError }, { data: client, error: clientError }] = await Promise.all([
      admin.from("masters").select("id,user_id,public_name,studio_name,address,reminder_enabled").eq("id", booking.master_id).maybeSingle(),
      admin.from("profiles").select("id,telegram_id,display_name").eq("id", booking.client_id).maybeSingle(),
    ]);
    if (masterError) throw masterError;
    if (clientError) throw clientError;
    if (!master || !client) return null;
    const [{ data: masterProfile, error: masterProfileError }, { data: service, error: serviceError }] = await Promise.all([
      admin.from("profiles").select("id,telegram_id,display_name").eq("id", master.user_id).maybeSingle(),
      booking.service_id
        ? admin.from("services").select("title").eq("id", booking.service_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (masterProfileError) throw masterProfileError;
    if (serviceError) throw serviceError;
    return { booking, master, client, masterProfile, service };
  }

  async function notifyNewBooking(bookingId: string) {
    const ctx = await loadContext(bookingId);
    if (!ctx || ctx.booking.status !== "pending") return { skipped: "booking_not_pending" };
    const { booking, master, client, masterProfile, service } = ctx;
    if (!masterProfile?.telegram_id) return { skipped: "master_has_no_telegram" };
    const date = formatDate(booking.starts_at);
    const time = formatTime(booking.starts_at);
    const message = [
      "🔔 Новая заявка в MASTER HUB",
      "",
      `Клиент: ${clean(client.display_name, booking.client_telegram || "Клиент")}`,
      `Дата: ${date}`,
      `Время: ${time}`,
      `Услуга: ${clean(service?.title, booking.client_note || "Запись")}`,
      booking.client_note ? `Комментарий: ${booking.client_note}` : "",
      "",
      "Открой кабинет мастера, чтобы принять заявку или предложить стоимость.",
    ].filter(Boolean).join("\n");
    return await sendOnce(booking.id, masterProfile.id, masterProfile.telegram_id, "booking_new", message);
  }

  async function notifyReminder(bookingId: string, kind: "reminder_24h" | "reminder_2h") {
    const ctx = await loadContext(bookingId);
    if (!ctx || ctx.booking.status !== "confirmed") return { skipped: "booking_not_confirmed" };
    const { booking, master, client, masterProfile, service } = ctx;
    const lead = kind === "reminder_24h" ? "примерно через 24 часа" : "примерно через 2 часа";
    const date = formatDate(booking.starts_at);
    const time = formatTime(booking.starts_at);
    const serviceName = clean(service?.title, booking.client_note || "Сеанс");
    const clientName = clean(client.display_name, booking.client_telegram || "Клиент");
    const masterName = clean(master.public_name, "Мастер");
    const address = master.address ? `\nАдрес: ${master.address}` : "";
    const clientMessage = [
      "⏰ Напоминание о сеансе в MASTER HUB",
      "",
      `До встречи осталось ${lead}.`,
      `Мастер: ${masterName}`,
      `Услуга: ${serviceName}`,
      `Дата: ${date}`,
      `Время: ${time}`,
      address ? address.trim() : "",
      "",
      "Если планы изменились, свяжись с мастером заранее.",
    ].filter(Boolean).join("\n");
    const masterMessage = [
      "⏰ Напоминание о предстоящем сеансе",
      "",
      `До встречи осталось ${lead}.`,
      `Клиент: ${clientName}`,
      `Услуга: ${serviceName}`,
      `Дата: ${date}`,
      `Время: ${time}`,
      address ? address.trim() : "",
    ].filter(Boolean).join("\n");

    const results = [];
    results.push(await sendOnce(booking.id, client.id, client.telegram_id, kind, clientMessage));
    if (master.reminder_enabled !== false && masterProfile?.telegram_id) {
      results.push(await sendOnce(booking.id, masterProfile.id, masterProfile.telegram_id, kind, masterMessage));
    }
    return results;
  }

  async function processReminders() {
    const now = new Date();
    const horizon = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const { data: bookings, error } = await admin.from("bookings").select("id,starts_at,created_at,status")
      .eq("status", "confirmed").gt("starts_at", now.toISOString()).lte("starts_at", horizon.toISOString())
      .order("starts_at", { ascending: true }).limit(200);
    if (error) throw error;
    const results = [];
    for (const booking of bookings || []) {
      const start = new Date(booking.starts_at).getTime();
      const hoursLeft = (start - now.getTime()) / 3600000;
      if (hoursLeft <= 24 && hoursLeft > 0 && new Date(booking.created_at).getTime() <= start - 23 * 3600000) {
        results.push({ booking_id: booking.id, kind: "reminder_24h", result: await notifyReminder(booking.id, "reminder_24h") });
      }
      if (hoursLeft <= 2 && hoursLeft > 0) {
        results.push({ booking_id: booking.id, kind: "reminder_2h", result: await notifyReminder(booking.id, "reminder_2h") });
      }
    }
    const pendingCutoff = new Date(now.getTime() - 48 * 3600000).toISOString();
    const { data: pending, error: pendingError } = await admin.from("bookings").select("id")
      .eq("status", "pending").gte("created_at", pendingCutoff).order("created_at", { ascending: false }).limit(100);
    if (pendingError) throw pendingError;
    for (const booking of pending || []) {
      results.push({ booking_id: booking.id, kind: "booking_new_retry", result: await notifyNewBooking(booking.id) });
    }
    return { processed: results.length, results };
  }

  return { admin, authorized, notifyNewBooking, processReminders };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const runtime = await main();
    if (!(await runtime.authorized(req))) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    if (body?.mode === "booking_created" && typeof body.booking_id === "string") {
      return json({ ok: true, result: await runtime.notifyNewBooking(body.booking_id) });
    }
    if (body?.mode === "reminders") {
      return json({ ok: true, ...(await runtime.processReminders()) });
    }
    return json({ error: "Unsupported notification mode" }, 400);
  } catch (error) {
    console.error("masterhub-notifications:", error);
    return json({ error: error instanceof Error ? error.message : "Notification error" }, 500);
  }
});