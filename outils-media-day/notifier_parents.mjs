// Prévient les parents confirmés d'un groupe dont l'enfant a une fiche incomplète (nom « ? » ou date de naissance absente).
import { rest } from "./sb.mjs";
const g = process.argv[2];
const m = await rest(`team_memberships?select=player_profiles(id,prenom,nom,date_naissance)&team_id=eq.${g}&statut=eq.active`);
let n = 0;
for (const p of m.map((x) => x.player_profiles)) {
  const sansNom = !/\p{L}/u.test(p.nom || ""), sansDate = !p.date_naissance;
  if (!sansNom && !sansDate) continue;
  const rel = await rest(`parent_player_relationships?select=parent_profiles(user_id)&player_id=eq.${p.id}&statut=eq.confirme`);
  for (const r of rel) {
    const href = `/particulier/sportifs/club/${p.id}`;
    const deja = await rest(`member_notifications?select=id&user_id=eq.${r.parent_profiles.user_id}&target_href=eq.${encodeURIComponent(href)}&title=ilike.Complétez*`);
    if (deja.length) continue;
    const quoi = sansNom && sansDate ? "son nom de famille et sa date de naissance" : sansNom ? "son nom de famille" : "sa date de naissance";
    const x = await rest("member_notifications", { method: "POST", body: JSON.stringify({ user_id: r.parent_profiles.user_id, category: "users",
      title: `Complétez la fiche de ${p.prenom}`, body: `Il manque ${quoi}.${sansDate ? " La date est nécessaire pour retrouver ses photos." : ""}`, target_href: href }) });
    if (Array.isArray(x)) { n++; console.log(`  prévenu : parent de ${p.prenom} (${quoi})`); } else console.log("  KO", p.prenom, JSON.stringify(x).slice(0, 150));
  }
}
console.log(n, "notification(s) envoyée(s)");
