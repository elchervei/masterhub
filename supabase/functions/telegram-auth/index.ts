import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: Uint8Array, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new Error("Некорректная подпись Telegram.");
  }
  params.delete("hash");
  const pairs = Array.from(params.entries())
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => key + "=" + value);
  const secretKey = await hmac(new TextEncoder().encode("WebAppData"), botToken);
  const calculatedHash = hex(await hmac(secretKey, pairs.join("\n")));
  if (!safeEqual(calculatedHash, receivedHash.toLowerCase())) {
    throw new Error("Подпись Telegram не прошла проверку.");
  }
  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || authDate > now + 60 || now - authDate > 86400) {
    throw new Error("Данные Telegram устарели. Перезапусти приложение.");
  }
  const rawUser = params.get("user");
  if (!rawUser) throw new Error("Telegram не передал данные пользователя.");
  const user = JSON.parse(rawUser);
  if (!user?.id) throw new Error("Не удалось определить Telegram ID.");
  return user;
}

async function resolveTelegramAccount(
  admin: ReturnType<typeof createClient>,
  telegramUser: Record<string, unknown>,
  fullName: string,
) {
  const telegramId = String(telegramUser.id);

  // The profile mapping is server-owned. Never adopt an Auth user just because
  // somebody pre-registered a predictable synthetic email address.
  const { data: existingProfile, error: lookupError } = await admin
    .from("profiles")
    .select("id,telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (lookupError) {
    console.error("Telegram profile lookup failed:", lookupError.message);
    throw new Error("Не удалось найти Telegram-профиль.");
  }

  if (existingProfile) {
    const { data: existingAuth, error: authError } = await admin.auth.admin.getUserById(existingProfile.id);
    if (authError || !existingAuth.user?.email) {
      console.error("Linked Telegram account lookup failed:", authError?.message);
      throw new Error("Не удалось найти привязанный аккаунт.");
    }

    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({
        display_name: fullName,
        avatar_url: typeof telegramUser.photo_url === "string" ? telegramUser.photo_url : null,
      })
      .eq("id", existingProfile.id);

    if (profileUpdateError) {
      console.error("Telegram profile update failed:", profileUpdateError.message);
      throw new Error("Не удалось обновить профиль.");
    }

    return { id: existingAuth.user.id, email: existingAuth.user.email };
  }

  // Random address prevents account pre-claiming through public Supabase sign-up.
  const generatedEmail =
    "tg_" + telegramId + "_" + crypto.randomUUID().replace(/-/g, "") + "@telegram.masterhub.invalid";

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: generatedEmail,
    email_confirm: true,
    user_metadata: {
      telegram_id: telegramId,
      first_name: typeof telegramUser.first_name === "string" ? telegramUser.first_name : "",
      last_name: typeof telegramUser.last_name === "string" ? telegramUser.last_name : "",
      full_name: fullName,
      username: typeof telegramUser.username === "string" ? telegramUser.username : "",
      avatar_url: typeof telegramUser.photo_url === "string" ? telegramUser.photo_url : "",
    },
  });

  if (createError || !created.user?.id) {
    console.error("Supabase create user failed:", createError?.message);
    throw new Error("Не удалось создать аккаунт. Попробуй позже.");
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    telegram_id: telegramId,
    display_name: fullName,
    avatar_url: typeof telegramUser.photo_url === "string" ? telegramUser.photo_url : null,
  }, { onConflict: "id" });

  if (profileError) {
    // A simultaneous first login may have claimed this Telegram ID first.
    let racedAccount: { id: string; email: string } | null = null;
    if (profileError.code === "23505") {
      const { data: racedProfile, error: raceLookupError } = await admin
        .from("profiles")
        .select("id,telegram_id")
        .eq("telegram_id", telegramId)
        .maybeSingle();

      if (!raceLookupError && racedProfile) {
        const { data: racedAuth, error: racedAuthError } = await admin.auth.admin.getUserById(racedProfile.id);
        if (!racedAuthError && racedAuth.user?.email) {
          racedAccount = { id: racedAuth.user.id, email: racedAuth.user.email };
        }
      }
    }

    if (racedAccount) return racedAccount;

    // If the profile write failed for a non-race reason, the newly created Auth
    // user is left unlinked and cannot be reached through Telegram identity lookup.
    console.error("Telegram profile linking failed:", profileError.message);
    throw new Error("Не удалось привязать Telegram к аккаунту. Попробуй ещё раз.");
  }

  return {
    id: created.user.id,
    email: created.user.email || generatedEmail,
  };
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
    if (typeof body?.initData !== "string" || body.initData.length > 8192) {
      return json({ error: "Не переданы данные Telegram." }, 400);
    }

    const telegramUser = await verifyTelegramInitData(body.initData, botToken);
    const fullName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ");

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const publicClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const account = await resolveTelegramAccount(admin, telegramUser, fullName);
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: account.email,
    });

    if (
      linkError ||
      !linkData?.properties?.hashed_token ||
      !linkData.user?.id ||
      linkData.user.id !== account.id
    ) {
      console.error("Magic link generation failed:", linkError?.message);
      throw new Error("Не удалось создать сессию. Проверь настройки Supabase Auth.");
    }

    const { data: sessionData, error: verifyError } = await publicClient.auth.verifyOtp({
      email: account.email,
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
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
