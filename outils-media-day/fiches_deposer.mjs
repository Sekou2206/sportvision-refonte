// Pose la photo de fiche (player_profiles.photo_url, seau public portail-media) des personnes d'un réglage.
// Décision de Fouka (06/10/2026) : oui aussi pour les mineurs, « après les parents ou l'enfant lui-même changera ».
// Ne remplace jamais une photo déjà posée par quelqu'un d'autre. Usage : node fiches_deposer.mjs <reglages.json> <dossier des carrés>
import { rest, URL_SB, H } from "./sb.mjs";
import { readFileSync, existsSync } from "node:fs";
const G = JSON.parse(readFileSync(process.argv[2], "utf8")), D = process.argv[3], v = Math.floor(Date.now() / 1000);
let n = 0;
for (const p of G.personnes) {
  const f = `${D}/${p.player_id}.jpg`; if (!p.player_id || !existsSync(f)) continue;
  const chemin = `avatars/fiches/${p.player_id}.jpg`, url = `${URL_SB}/storage/v1/object/public/portail-media/${chemin}`;
  const [fiche] = await rest(`player_profiles?select=photo_url,user_id&id=eq.${p.player_id}`);
  if (fiche.photo_url && !fiche.photo_url.startsWith(url)) { console.log("déjà une autre photo, laissée :", p.dossier); continue; }
  const up = await fetch(`${URL_SB}/storage/v1/object/portail-media/${chemin}`, { method: "POST", headers: { ...H, "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "3600" }, body: readFileSync(f) });
  if (!up.ok) { console.log("KO dépôt", p.dossier, (await up.text()).slice(0, 120)); continue; }
  const m = await rest(`player_profiles?id=eq.${p.player_id}`, { method: "PATCH", body: JSON.stringify({ photo_url: `${url}?v=${v}` }) });
  if (Array.isArray(m) && m.length === 1) n++; else console.log("KO fiche", p.dossier, JSON.stringify(m).slice(0, 150));
}
console.log(`${n} photo(s) de fiche posée(s)`);
