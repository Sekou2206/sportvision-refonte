// Audit léger des familles inscrites d'un groupe : compte, e-mail confirmé, dernière connexion, accord, références, Pass, demandes.
import { rest, URL_SB, H } from "./sb.mjs";
const g = process.argv[2];
const m = await rest(`team_memberships?select=statut,player_profiles(id,prenom,nom,user_id,date_naissance,photo_url)&team_id=eq.${g}`);
const P = m.map((x) => ({ ...x.player_profiles, statut: x.statut })).filter((p) => p.user_id);
const cols = async (t) => { const r = await rest(`${t}?select=*&limit=1`); return Array.isArray(r) ? Object.keys(r[0] || {}).join(",") : "ABSENTE " + r.message; };
for (const t of ["player_parent_links", "consentements_biometrie", "media_entitlements", "member_notifications", "connect_profile_settings"]) console.log(t, "→", (await cols(t)).slice(0, 230));
for (const p of P) {
  const u = await (await fetch(`${URL_SB}/auth/v1/admin/users/${p.user_id}`, { headers: H })).json();
  const c = await rest(`consentements_biometrie?select=statut,qualite&player_id=eq.${p.id}`);
  const r = await rest(`photos_reference_attente?select=promue_le&player_id=eq.${p.id}&refusee_le=is.null`);
  const fr = await rest(`player_face_refs?select=id&player_id=eq.${p.id}`);
  const e = await rest(`media_entitlements?select=id&beneficiary_person_id=eq.${p.id}`);
  const d = await rest(`membership_requests?select=statut&player_id=eq.${p.id}`);
  const age = p.date_naissance ? Math.floor((Date.now() - new Date(p.date_naissance)) / 31557600000) : "?";
  console.log(`\n${p.prenom} ${p.nom} (${age} ans) | inscription ${p.statut} | demandes ${d.map((x) => x.statut).join(",") || "aucune"}`);
  console.log(`   compte : créé ${String(u.created_at).slice(11, 16)} UTC | e-mail confirmé ${u.email_confirmed_at ? "oui" : "NON"} | dernière connexion ${u.last_sign_in_at ? String(u.last_sign_in_at).slice(11, 16) : "JAMAIS"} | fournisseur ${u.app_metadata?.provider} | méta ${JSON.stringify(Object.fromEntries(Object.entries(u.user_metadata || {}).filter(([k]) => !/email|sub|verified/.test(k)))).slice(0, 200)}`);
  console.log(`   accord reconnaissance : ${c.map((x) => x.statut + "/" + x.qualite).join(",") || "aucun"} | références en attente ${r.length} (activées ${r.filter((x) => x.promue_le).length}) | références actives ${fr.length} | Pass ${e.length}`);
}
