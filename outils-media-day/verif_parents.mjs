import { rest } from "./sb.mjs";
const g = "50f0da25-b7be-4248-9c5d-32f18b9b8aa4";
const m = await rest(`team_memberships?select=player_profiles(id,prenom,nom,user_id,date_naissance,photo_url)&team_id=eq.${g}&statut=eq.active`);
const P = m.map((x) => x.player_profiles);
const rel = await rest(`parent_player_relationships?select=statut,player_id,created_at,parent_profiles(user_id,prenom,nom)&player_id=in.(${P.map((p) => p.id).join(",")})`);
console.log("fiches encore rattachées à un compte « joueur » :", P.filter((p) => p.user_id).map((p) => p.prenom).join(", ") || "aucune");
for (const r of rel) { const p = P.find((x) => x.id === r.player_id); const cs = await rest(`connect_profile_settings?select=account_type,profil_particulier&user_id=eq.${r.parent_profiles.user_id}`);
  console.log(`${p.prenom} ${p.nom} | lien parent ${r.statut} (${r.created_at.slice(11, 16)} UTC) | compte ${cs[0]?.account_type}/${cs[0]?.profil_particulier} | date de naissance ${p.date_naissance ?? "à redonner"} | photo ${p.photo_url ? "oui" : "non"}`); }
