import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function hmac(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) throw new Error("Некорректная подпись Telegram.");
  params.delete("hash");
  const pairs = Array.from(params.entries()).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => k + "=" + v);
  const secretKey = await hmac(new TextEncoder().encode(botToken), "WebAppData");
  const calculatedHash = hex(await hmac(secretKey, pairs.join("\n")));
  if (!safeEqual(calculatedHash, receivedHash.toLowerCase())) throw new Error("Подпись Telegram не прошла проверку.");
  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || authDate > now + 60 || now - authDate > 86400) throw new Error("Данные Telegram устарели. Перезапусти приложение.");
  const rawUser = params.get("user");
  if (!rawUser) throw new Error("Telegram не передал данные пользователя.");
  const user = JSON.parse(rawUser);
  if (!user?.id) throw new Error("Не удалось определить Telegram ID.");
  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const botToken = Deno.env.get("BOT_TOKEN");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!botToken || !url || !serviceKey || !anonKey) {
      console.error("Telegram auth is missing required environment variables.");
      return json({ error: "Авторизация ещё не настроена на сервере." }, 503);
    }
    const body = await req.json();
    if (typeof body?.initData !== "string" || body.initData.length > 8192) return json({ error: "Не переданы данные Telegram." }, 400);
    const tg = await verifyTelegramInitData(body.initData, botToken);
    const email = "tg_" + String(tg.id) + "@telegram.masterhub.invalid";
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const publicClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const fullName = [tg.first_name, tg.last_name].filter(Boolean).join(" ");
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { telegram_id: String(tg.id), first_name: tg.first_name || "", last_name: tg.last_name || "", full_name: fullName, username: tg.username || "", avatar_url: tg.photo_url || "" },
    });
    if (createError && !/already|registered|exists/i.test(createError.message)) {
      console.error("Supabase create user failed:", createError.message);
      throw new Error("Не удалось создать аккаунт. Попробуй позже.");
    }
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError || !linkData?.properties?.hashed_token || !linkData?.user?.id) {
      console.error("Magic link generation failed:", linkError?.message);
      throw new Error("Не удалось создать сессию. Проверь настройки Supabase Auth.");
    }
    const { error: profileError } = await admin.from("profiles").upsert({
      id: linkData.user.id, telegram_id: String(tg.id), display_name: fullName, avatar_url: tg.photo_url || null,
    }, { onConflict: "id" });
    if (profileError) { console.error("Profile sync failed:", profileError.message); throw new Error("Не удалось синхронизировать профиль."); }
    const { data: sessionData, error: verifyError } = await publicClient.auth.verifyOtp({
      email, token_hash: linkData.properties.hashed_token, type: "magiclink",
    });
    if (verifyError || !sessionData.session) {
      console.error("Session exchange failed:", verifyError?.message);
      throw new Error("Не удалось открыть сессию. Попробуй ещё раз.");
    }
    return json({ session: sessionData.session });
  } catch (error) {
    console.error("telegram-auth:", error);
    return json({ error: error instanceof Error ? error.message : "Ошибка авторизации." }, 400);
  }
});