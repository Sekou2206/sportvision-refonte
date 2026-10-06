// Dépose les photos de référence EN ATTENTE par la fonction de l'OS (effectif_deposer_photo), sous l'identité de
// l'administrateur. Rien n'est calculé tant que la famille n'a pas donné son accord (et la date de naissance).
// Usage : node refs_deposer.mjs <reglages.json> <dossier de travail>
import { compte, jeton, SB, ANON, KEY } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
import { readFileSync } from "node:fs";
const G = JSON.parse(readFileSync(process.argv[2], "utf8")), T = process.argv[3];
const refs = JSON.parse(readFileSync(`${T}/refs.json`, "utf8"));
const j = await jeton((await compte(`id=eq.${G.cree_par}`)).email);
let n = 0, ko = 0;
for (const p of G.personnes) {
  for (let k = 1; k <= (refs[p.player_id] || []).length; k++) {
    const chemin = `effectif/${p.player_id}/mediaday-${k}.jpg`;
    const up = await fetch(`${SB}/storage/v1/object/sportvision-media-prive/${chemin}`, { method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: readFileSync(`${T}/${p.player_id}_${k}.jpg`) });
    const r = up.ok && await fetch(`${SB}/rest/v1/rpc/effectif_deposer_photo`, { method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_player_id: p.player_id, p_storage_path: chemin }) });
    if (r && r.ok) n++; else { ko++; console.log("KO", p.dossier, k, up.ok ? (await r.text()).slice(0, 160) : (await up.text()).slice(0, 160)); }
  }
}
console.log(`${n} photo(s) de référence déposée(s) en attente, ${ko} en échec`);
