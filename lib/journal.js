import { kv } from "@vercel/kv";

const KEY = "rk:journal";

async function readAll() {
  try {
    return (await kv.get(KEY)) || [];
  } catch (e) {
    console.error("[journal] read skipped:", e.message);
    return [];
  }
}
async function writeAll(arr) {
  try {
    await kv.set(KEY, arr);
  } catch (e) {
    console.error("[journal] write skipped:", e.message);
  }
}
function newId() {
  return "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

export async function listJournal() {
  return await readAll();
}

export async function addJournal(entry) {
  const arr = await readAll();
  const e = { id: newId(), createdAt: new Date().toISOString(), ...entry };
  arr.unshift(e);
  await writeAll(arr);
  return e;
}

export async function updateJournal(id, patch) {
  const arr = await readAll();
  const i = arr.findIndex((x) => x.id === id);
  if (i < 0) return null;
  arr[i] = { ...arr[i], ...patch };
  await writeAll(arr);
  return arr[i];
}

export async function deleteJournal(id) {
  const arr = await readAll();
  await writeAll(arr.filter((x) => x.id !== id));
  return true;
}

export async function clearJournal() {
  await writeAll([]);
  return true;
}
