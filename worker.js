const JSON_HEADERS = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" };
const COOKIE_NAMES = { station:"sss_station", vault:"sss_vault", settings:"sss_settings" };
const SECRET_NAMES = { station:"STATION_CODE", vault:"VAULT_CODE", settings:"SETTINGS_CODE" };
const PROTECTED_PATHS = { "/station.html":"station", "/vault.html":"vault", "/settings.html":"settings" };
const SESSION_SECONDS = 8 * 60 * 60;

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers:{ ...JSON_HEADERS, ...headers } });
const bytesToBase64Url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
const textToBase64Url = text => bytesToBase64Url(new TextEncoder().encode(text));

async function signature(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function safeEqual(a = "", b = "") {
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  return mismatch === 0;
}

function readCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

async function createSession(destination, env) {
  const payload = textToBase64Url(JSON.stringify({ destination, expires:Date.now() + SESSION_SECONDS * 1000 }));
  return `${payload}.${await signature(payload, env.SESSION_SECRET)}`;
}

async function hasSession(request, destination, env) {
  if (!env.SESSION_SECRET) return false;
  const token = readCookie(request, COOKIE_NAMES[destination]);
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || !safeEqual(suppliedSignature, await signature(payload, env.SESSION_SECRET))) return false;
  try {
    const normalized = payload.replaceAll("-","+").replaceAll("_","/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const data = JSON.parse(atob(padded));
    return data.destination === destination && data.expires > Date.now();
  } catch { return false; }
}

async function blockedByAttempts(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `access_attempts:${ip}`;
  const attempts = Number(await env.STATION_STATE.get(key) || 0);
  return { blocked:attempts >= 10, key, attempts };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const protectedDestination = PROTECTED_PATHS[url.pathname];
    if (protectedDestination && !(await hasSession(request, protectedDestination, env))) return Response.redirect(`${url.origin}/index.html`, 302);

    if (url.pathname === "/api/unlock" && request.method === "POST") {
      const rate = await blockedByAttempts(request, env);
      if (rate.blocked) return json({ error:"Too many wrong paths. Try again in a minute." }, 429);
      let body;
      try { body = await request.json(); } catch { return json({ error:"Invalid request." }, 400); }
      const { destination, sequence } = body;
      if (!COOKIE_NAMES[destination] || !Array.isArray(sequence) || sequence.length !== 8) return json({ error:"Invalid path." }, 400);
      const expectedCode = env[SECRET_NAMES[destination]];
      if (!expectedCode || !env.SESSION_SECRET) return json({ error:"Access secrets are not configured." }, 503);
      const enteredCode = sequence.map(direction => String(direction).toUpperCase()[0]).join("");
      const accepted = safeEqual(enteredCode, expectedCode);
      if (!accepted) {
        await env.STATION_STATE.put(rate.key, String(rate.attempts + 1), { expirationTtl:60 });
        return json({ error:"If you don't know where you want to go, then it doesn't matter which path you take." }, 401);
      }
      await env.STATION_STATE.delete(rate.key);
      const token = await createSession(destination, env);
      return json({ ok:true, destination }, 200, { "Set-Cookie":`${COOKIE_NAMES[destination]}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax` });
    }

    if (url.pathname === "/api/live") {
      if (request.method === "GET") return json({ live:(await env.STATION_STATE.get("broadcast_live")) === "true" });
      if (request.method === "POST") {
        if (!(await hasSession(request, "settings", env))) return json({ error:"Settings access required." }, 401);
        let body;
        try { body = await request.json(); } catch { return json({ error:"Invalid request." }, 400); }
        if (typeof body.live !== "boolean") return json({ error:"A live boolean is required." }, 400);
        await env.STATION_STATE.put("broadcast_live", String(body.live));
        return json({ live:body.live });
      }
      return json({ error:"Method not allowed." }, 405);
    }

    return env.ASSETS.fetch(request);
  }
};
