// Relevé d'un groupe : familles inscrites, fiche complète ou non, accord de reconnaissance, Pass Photo, commandes.
import { rest, URL_SB, H } from "./sb.mjs";
const g = process.argv[2];
const m = await rest(`team_memberships?select=player_profiles(id,prenom,nom,user_id,date_naissance)&team_id=eq.${g}&statut=eq.active`);
const P = m.map((x) => x.player_profiles); const ids = P.map((p) => p.id).join(",");
const rel = await rest(`parent_player_relationships?select=statut,player_id,created_at,parent_profiles(user_id)&player_id=in.(${ids})`);
const cons = await rest(`consentements_biometrie?select=player_id,statut&player_id=in.(${ids})`);
const ent = await rest(`media_entitlements?select=beneficiary_person_id,status,created_at,purchased_by_user_id,product_id&beneficiary_person_id=in.(${ids})`);
const refs = await rest(`player_face_refs?select=player_id&player_id=in.(${ids})`);
const inscrits = P.filter((p) => p.user_id || rel.some((r) => r.player_id === p.id));
console.log(`inscrits au groupe : ${P.length} | familles avec un compte : ${inscrits.length} | sans compte : ${P.length - inscrits.length}`);
for (const p of inscrits.sort((a, b) => a.prenom.localeCompare(b.prenom))) {
  const r = rel.filter((x) => x.player_id === p.id);
  let co = "jamais";
  for (const x of r) { const u = await (await fetch(`${URL_SB}/auth/v1/admin/users/${x.parent_profiles.user_id}`, { headers: H })).json(); if (u.last_sign_in_at) co = new Date(u.last_sign_in_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }); }
  console.log(`${(p.prenom + " " + p.nom).padEnd(22)} | parent ${r.map((x) => x.statut).join(",") || (p.user_id ? "compte joueur" : "aucun")} | nom ${/\p{L}/u.test(p.nom) ? "ok" : "MANQUE"} | date ${p.date_naissance ? "ok" : "MANQUE"} | accord ${cons.find((c) => c.player_id === p.id)?.statut ?? "non"} | réf. actives ${refs.filter((x) => x.player_id === p.id).length} | Pass ${ent.filter((e) => e.beneficiary_person_id === p.id).map((e) => e.status).join(",") || "non"} | dernière connexion ${co}`);
}
console.log("Pass sur le groupe :", ent.length);
