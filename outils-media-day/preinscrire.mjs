// Préinscrit un groupe par la fonction de l'OS (effectif_constituer), sous l'identité de l'administrateur
// qui a fait Villemomble, avec l'utilitaire de session du projet. Usage : node preinscrire.mjs <reglages.json>
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const f = process.argv[2]; const G = JSON.parse(readFileSync(f, "utf8"));
const admin = await compte(`id=eq.${G.cree_par}`);
if (!admin) { console.log("compte administrateur introuvable"); process.exit(1); }
const j = await jeton(admin.email);
if (!j) { console.log("session impossible"); process.exit(1); }
const r = await fetch(`${SB}/rest/v1/rpc/effectif_constituer`, { method: "POST",
  headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_team_id: G.team_id, p_lignes: G.personnes.map((p) => ({ prenom: p.prenom, nom: p.nom })) }) });
const d = await r.json();
if (!Array.isArray(d)) { console.log("refus :", JSON.stringify(d).slice(0, 400)); process.exit(1); }
for (const x of d) {
  console.log(String(x.rang).padStart(2), x.verdict.padEnd(12), `${x.nom} ${x.prenom}`, x.detail ? "· " + x.detail : "");
  const p = G.personnes[x.rang - 1]; if (p && x.fiche_id) p.player_id = x.fiche_id;
}
writeFileSync(f, JSON.stringify(G, null, 1));
console.log("fiches :", G.personnes.filter((p) => p.player_id).length, "/", G.personnes.length);
