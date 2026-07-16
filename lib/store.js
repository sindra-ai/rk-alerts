// Stores the latest signal + a short history in Vercel KV (Upstash Redis).
// Every call is wrapped so that if KV isn't configured, the app still runs
// (the email path does not depend on this — the dashboard just stays empty).

import { kv } from "@vercel/kv";

const LATEST = "rk:latest";
const HISTORY = "rk:history";

export async function saveSignal(sig) {
  try {
    await kv.set(LATEST, sig);
    await kv.lpush(HISTORY, sig);
    await kv.ltrim(HISTORY, 0, 49);
  } catch (e) {
    console.error("[store] KV save skipped:", e.message);
  }
}

export async function getLatest() {
  try {
    return await kv.get(LATEST);
  } catch (e) {
    console.error("[store] KV read skipped:", e.message);
    return null;
  }
}

export async function getHistory() {
  try {
    return (await kv.lrange(HISTORY, 0, 49)) || [];
  } catch (e) {
    return [];
  }
}
