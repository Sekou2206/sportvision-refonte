// Met une galerie en ligne comme le bouton de l'OS (galMettreEnLigne) : lien principal puis statut, sous l'identité de l'administrateur.
// Usage : node publier.mjs <album_id> [<album_id> …]
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
const H = { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json", Prefer: "return=representation" };
for (const id of process.argv.slice(2)) {
  const [a] = await (await fetch(`${SB}/rest/v1/media_albums?select=id,title,status,access_mode,photo_count&id=eq.${id}`, { headers: H })).json();
  if (!a) { console.log(id, "introuvable"); continue; }
  if (a.status === "published") { console.log(a.title, ": déjà en ligne"); continue; }
  const l = await (await fetch(`${SB}/rest/v1/rpc/media_link_save`, { method: "POST", headers: H, body: JSON.stringify({ p_album_id: id, p_offers: [], p_link_id: null, p_label: "Lien principal", p_audience: null, p_expires_at: null, p_is_enabled: true, p_preview_limit: null, p_visible_in_clubplus: a.access_mode === "free_members" }) })).json();
  const res = Array.isArray(l) ? l[0] : l;
  if (!res || res.ok === false || res.code) { console.log(a.title, ": lien refusé", JSON.stringify(l).slice(0, 200)); continue; }
  const p = await (await fetch(`${SB}/rest/v1/media_albums?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ status: "published", published_at: new Date().toISOString(), access_mode: a.access_mode }) })).json();
  console.log(a.title, ":", Array.isArray(p) && p[0]?.status === "published" ? `EN LIGNE (${a.photo_count} photos)` : "échec " + JSON.stringify(p).slice(0, 200));
}
