// Valide une demande d'entrée dans une équipe par la fonction de l'OS, sous l'identité de l'administrateur. Usage : node valider.mjs <player_id>
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
import { rest } from "./sb.mjs";
const pid = process.argv[2];
const [d] = await rest(`membership_requests?select=id,statut,team_id&player_id=eq.${pid}&order=created_at.desc&limit=1`);
console.log("demande :", d?.statut);
if (d && d.statut !== "validee") {
  const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
  const r = await fetch(`${SB}/rest/v1/rpc/validate_team_membership`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_request_id: d.id }) });
  console.log("validation :", r.status, (await r.text()).slice(0, 260));
}
const [p] = await rest(`player_profiles?select=prenom,nom,photo_url,user_id&id=eq.${pid}`);
const refs = await rest(`photos_reference_attente?select=promue_le&player_id=eq.${pid}&refusee_le=is.null`);
const tags = await rest(`media_player_tags?select=id&player_id=eq.${pid}`);
const m = await rest(`team_memberships?select=statut,club_teams(name)&player_id=eq.${pid}`);
const c = await rest(`consentements_biometrie?select=statut&player_id=eq.${pid}`);
const [d2] = await rest(`membership_requests?select=statut&player_id=eq.${pid}&order=created_at.desc&limit=1`);
console.log(`${p.prenom} ${p.nom} | photo de profil ${p.photo_url ? "oui" : "non"} | références ${refs.length} (activées ${refs.filter((x) => x.promue_le).length}) | photos marquées ${tags.length} | équipes ${m.map((x) => x.club_teams?.name + ":" + x.statut).join(", ") || "aucune"} | demande ${d2?.statut} | accord reconnaissance ${c.map((x) => x.statut).join(",") || "aucun"}`);
