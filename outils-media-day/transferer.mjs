// Doublon à l'inscription : une famille a créé une NOUVELLE fiche au lieu de reprendre la fiche préinscrite.
// On passe sur la fiche de la famille tout ce que portait la fiche préinscrite (photo de fiche, photos de référence en
// attente, marquages des photos), puis on retire la fiche préinscrite, qui n'a jamais eu de compte.
// Usage : node transferer.mjs <fiche préinscrite> <fiche de la famille> [--pour-de-vrai]
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
import { rest, URL_SB, H } from "./sb.mjs";
const [anc, nouv, mode] = process.argv.slice(2); const vrai = mode === "--pour-de-vrai";
const [a] = await rest(`player_profiles?select=*&id=eq.${anc}`), [n] = await rest(`player_profiles?select=*&id=eq.${nouv}`);
if (!a || !n) throw new Error("fiche introuvable");
if (a.user_id) throw new Error("la fiche préinscrite a un compte : on n'y touche pas");
if (a.club_id !== n.club_id) throw new Error("clubs différents");
const refs = await rest(`photos_reference_attente?select=id,storage_path&player_id=eq.${anc}&refusee_le=is.null`);
const tags = await rest(`media_player_tags?select=id&player_id=eq.${anc}`);
console.log(`préinscrite « ${a.prenom} ${a.nom} » → famille « ${n.prenom} ${n.nom} » | photo de fiche ${a.photo_url ? "oui" : "non"} | références ${refs.length} | marquages ${tags.length}`);
if (!vrai) { console.log("simulation : rien n'a été modifié"); process.exit(0); }
const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
const copier = async (bucket, de, vers) => { const f = await fetch(`${URL_SB}/storage/v1/object/${bucket}/${de}`, { headers: H }); if (!f.ok) throw new Error("lecture " + de);
  const up = await fetch(`${URL_SB}/storage/v1/object/${bucket}/${vers}`, { method: "POST", headers: { ...H, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: Buffer.from(await f.arrayBuffer()) }); if (!up.ok) throw new Error("dépôt " + vers); };
// 1. photos de référence : nouveau chemin (le chemin porte l'identifiant de la fiche), enregistré par la fonction de l'OS
let nr = 0;
for (const r of refs) { const vers = `effectif/${nouv}/${r.storage_path.split("/").pop()}`; await copier("sportvision-media-prive", r.storage_path, vers);
  const x = await fetch(`${SB}/rest/v1/rpc/effectif_deposer_photo`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_player_id: nouv, p_storage_path: vers }) });
  if (x.ok) nr++; else console.log("  référence refusée :", (await x.text()).slice(0, 160)); }
// 2. photo de fiche, seulement si la famille n'en a pas posé
if (a.photo_url && !n.photo_url) { await copier("portail-media", `avatars/fiches/${anc}.jpg`, `avatars/fiches/${nouv}.jpg`);
  await rest(`player_profiles?id=eq.${nouv}`, { method: "PATCH", body: JSON.stringify({ photo_url: `${URL_SB}/storage/v1/object/public/portail-media/avatars/fiches/${nouv}.jpg?v=${Math.floor(Date.now() / 1000)}` }) }); }
// 3. marquages
const t = await rest(`media_player_tags?player_id=eq.${anc}`, { method: "PATCH", body: JSON.stringify({ player_id: nouv }) });
console.log(`références ${nr}/${refs.length} | marquages ${Array.isArray(t) ? t.length : JSON.stringify(t).slice(0, 150)}`);
if (nr !== refs.length || !Array.isArray(t) || t.length !== tags.length) { console.log("transfert incomplet : la fiche préinscrite est CONSERVÉE"); process.exit(1); }
// 4. la fiche préinscrite, vidée, est retirée avec ses fichiers
for (const r of refs) await fetch(`${URL_SB}/storage/v1/object/sportvision-media-prive/${r.storage_path}`, { method: "DELETE", headers: H });
await fetch(`${URL_SB}/storage/v1/object/portail-media/avatars/fiches/${anc}.jpg`, { method: "DELETE", headers: H });
const d = await rest(`player_profiles?id=eq.${anc}&user_id=is.null`, { method: "DELETE" }); console.log("fiche préinscrite retirée :", Array.isArray(d) ? d.length : JSON.stringify(d).slice(0, 150));
