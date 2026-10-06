// État d'une catégorie : où sont les joueurs (groupe ou équipes), qui a un compte, demandes en attente, doublons probables, galeries.
import { rest } from "./sb.mjs";
const cid = process.argv[3] || "0ab96066-2ca5-4fb1-98eb-2204771ecf8d", cat = process.argv[2];
const T = await rest(`club_teams?select=id,name,est_groupe,archivee&club_id=eq.${cid}&categorie=eq.${cat}&order=name`);
const tous = [];
for (const t of T.filter((x) => !x.archivee)) {
  const m = await rest(`team_memberships?select=statut,created_at,player_profiles(id,prenom,nom,user_id,photo_url,date_naissance,created_at)&team_id=eq.${t.id}`);
  const g = await rest(`media_albums?select=title,status,type_evenement&team_id=eq.${t.id}`);
  console.log(`\n== ${t.name}${t.est_groupe ? " (groupe)" : ""} : ${m.filter((x) => x.statut === "active").length} inscrits | galeries : ${g.map((x) => `${x.title} [${x.status}]`).join(" ; ") || "aucune"}`);
  for (const x of m) tous.push({ ...x.player_profiles, equipe: t.name, statut: x.statut, groupe: t.est_groupe });
}
const avecCompte = tous.filter((x) => x.user_id);
console.log(`\ncomptes créés : ${avecCompte.length} sur ${tous.length}`);
for (const x of avecCompte) console.log(`  ${x.prenom} ${x.nom} | ${x.equipe} | ${x.statut} | photo ${x.photo_url ? "oui" : "NON"} | date ${x.date_naissance ? "oui" : "non"}`);
const hors = tous.filter((x) => !x.groupe); console.log("joueurs hors du groupe :", hors.map((x) => `${x.prenom} ${x.nom} (${x.equipe})`).join(", ") || "aucun");
const dbl = tous.filter((x) => !x.photo_url); console.log("fiches sans photo (doublons probables) :", dbl.map((x) => `${x.prenom} ${x.nom} [${x.id}]`).join(", ") || "aucune");
const r = await rest(`membership_requests?select=id,statut,created_at,team_id,player_id,player_profiles(prenom,nom)&team_id=in.(${T.map((t) => t.id).join(",")})&order=created_at.desc`);
console.log("demandes :", Array.isArray(r) ? r.map((x) => `${x.player_profiles?.prenom} ${x.player_profiles?.nom} → ${T.find((t) => t.id === x.team_id)?.name} : ${x.statut}`).join(" ; ") || "aucune" : JSON.stringify(r).slice(0, 200));
