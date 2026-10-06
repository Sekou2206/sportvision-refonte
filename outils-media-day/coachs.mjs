// Relevé des coachs d'un club : pour chaque équipe active, le coach noté sur la fiche, les comptes Club+ qui la couvrent, les invitations en cours.
import { rest } from "./sb.mjs";
const norm = (s) => (s || "").normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
for (const [nom, cid] of [["RCP Fontainebleau", "0ab96066-2ca5-4fb1-98eb-2204771ecf8d"], ["SF Villemomble", "f0d3bafa-3004-4831-bd85-249aa9af5c54"]]) {
  const T = (await rest(`club_teams?select=name,coach,categorie,est_groupe,archivee&club_id=eq.${cid}&order=name`)).filter((t) => !t.archivee && !t.est_groupe);
  const M = await rest(`club_members?select=role,prenom,nom,status,teams,user_id&club_id=eq.${cid}`);
  const I = await rest(`club_invitations?select=email,prenom,nom,role,teams,statut,ouverte_at,accepted_at,expire_at,sent_at&club_id=eq.${cid}&order=created_at.desc`);
  console.log(`\n=== ${nom} : ${M.length} comptes Club+ (${M.filter((m) => ["coach", "team_manager", "resp_equipe"].includes(m.role)).length} coachs), ${I.filter((i) => i.statut !== "acceptee").length} invitation(s) en cours`);
  for (const i of I.filter((i) => i.statut !== "acceptee")) console.log(`  invitation ${i.role} ${i.prenom ?? ""} ${i.nom ?? ""} → ${JSON.stringify(i.teams)} : ${i.statut}, ${i.ouverte_at ? "ouverte" : "pas ouverte"}, envoyée le ${String(i.sent_at).slice(0, 10)}`);
  let ok = 0, invite = 0; const manquants = [];
  for (const t of T) {
    const comptes = M.filter((m) => Array.isArray(m.teams) && m.teams.some((x) => norm(x) === norm(t.name)) && ["coach", "team_manager", "resp_equipe"].includes(m.role));
    const inv = I.filter((i) => i.statut !== "acceptee" && Array.isArray(i.teams) && i.teams.some((x) => norm(x) === norm(t.name)));
    if (comptes.length) ok++; else if (inv.length) invite++; else manquants.push(`${t.name}${t.coach ? " (" + t.coach + ")" : " (aucun coach noté)"}`);
    if (comptes.length) console.log(`  ✓ ${t.name} : ${comptes.map((m) => `${m.prenom ?? ""} ${m.nom ?? ""} (${m.status})`).join(", ")}`);
  }
  console.log(`  équipes actives : ${T.length} | avec un coach inscrit : ${ok} | coach invité, pas encore inscrit : ${invite} | sans coach dans Club+ : ${manquants.length}`);
  console.log("  sans coach dans Club+ :", manquants.join(" ; "));
}
