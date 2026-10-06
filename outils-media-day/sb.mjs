// petit client REST / stockage, clé lue dans .env
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("/Users/fouka/Downloads/jarvis-starter-kit/.env", "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
export const URL_SB = env.SUPABASE_URL, CLE = env.SUPABASE_SECRET_KEY;
export const H = { apikey: CLE, Authorization: `Bearer ${CLE}` };
export async function rest(chemin, init = {}) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, { ...init, headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const t = await r.text(); try { return JSON.parse(t); } catch { return t; }
}
