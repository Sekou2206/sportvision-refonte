// Parcours réel d'un parent sans compte : le nom tapé retrouve-t-il la fiche préinscrite ? (lecture seule, 1 appel par essai)
import { rest, URL_SB } from "./sb.mjs";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("/Users/fouka/Downloads/jarvis-starter-kit/.env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const team = process.argv[3] || "8623e7d1-7afa-44cd-b253-f40ff269d656";
const codes = await rest(`team_invite_codes?select=code,actif,expire_at,max_uses,uses_count&team_id=eq.${team}`);
console.log("codes de l'équipe U11 :", codes.map((c) => `${c.actif ? "actif" : "inactif"} ${c.uses_count}/${c.max_uses ?? "∞"}`));
const code = codes.find((c) => c.actif)?.code; if (!code) process.exit(0);
for (const [p, n] of JSON.parse(process.argv[2])) {
  const r = await (await fetch(`${URL_SB}/rest/v1/rpc/fiches_equipe_par_nom`, { method: "POST", headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_code: code, p_prenom: p, p_nom: n }) })).json();
  console.log(`« ${p} ${n} » →`, Array.isArray(r) ? (r.map((x) => `${x.prenom} ${x.nom}`).join(" | ") || "AUCUNE FICHE PROPOSÉE") : JSON.stringify(r).slice(0, 150));
}
