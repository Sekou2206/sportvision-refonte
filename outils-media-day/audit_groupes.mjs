// Pour chaque catégorie qui a un groupe : des joueurs ou des liens d'invitation sont-ils restés sur une équipe au lieu du groupe ?
import { rest } from "./sb.mjs";
for (const [nom, cid] of [["RCP Fontainebleau", "0ab96066-2ca5-4fb1-98eb-2204771ecf8d"], ["SF Villemomble", "f0d3bafa-3004-4831-bd85-249aa9af5c54"]]) {
  const T = (await rest(`club_teams?select=id,name,categorie,section,est_groupe,archivee&club_id=eq.${cid}`)).filter((t) => !t.archivee);
  const m = await rest(`team_memberships?select=team_id&club_id=eq.${cid}&statut=eq.active&limit=5000`);
  const c = await rest(`team_invite_codes?select=team_id,uses_count&club_id=eq.${cid}&actif=is.true`);
  const n = (id) => m.filter((x) => x.team_id === id).length;
  console.log(`\n=== ${nom}`);
  for (const g of T.filter((t) => t.est_groupe).sort((a, b) => a.name.localeCompare(b.name))) {
    const eq = T.filter((t) => !t.est_groupe && t.categorie === g.categorie && /f[ée]minin/i.test(t.section || "") === /f[ée]minin/i.test(g.section || ""));
    const horsG = eq.filter((t) => n(t.id) > 0).map((t) => `${t.name}:${n(t.id)}`);
    const liens = eq.filter((t) => c.some((x) => x.team_id === t.id)).map((t) => t.name);
    console.log(`${g.name.padEnd(22)} groupe ${String(n(g.id)).padStart(3)} | équipes ${eq.map((t) => t.name).join(", ")} | joueurs restés en équipe : ${horsG.join(", ") || "aucun"} | liens d'invitation sur une équipe : ${liens.join(", ") || "aucun"} | lien du groupe : ${c.some((x) => x.team_id === g.id) ? "oui" : "non"}`);
  }
  const sansG = T.filter((t) => !t.est_groupe && !T.some((g) => g.est_groupe && g.categorie === t.categorie));
  console.log("catégories à une seule équipe (pas de groupe) :", sansG.map((t) => `${t.name}:${n(t.id)}`).join(", "));
}
