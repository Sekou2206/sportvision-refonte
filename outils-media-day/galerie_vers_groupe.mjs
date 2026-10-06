// Rattache une galerie à l'équipe-groupe de sa catégorie (sous l'identité de l'administrateur). Usage : node galerie_vers_groupe.mjs "<titre exact>" <club_id>
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
import { rest } from "./sb.mjs";
const [titre, cid] = process.argv.slice(2);
const a = await rest(`media_albums?select=id,title,team_id,club_teams(name,categorie,est_groupe)&club_id=eq.${cid}&title=eq.${encodeURIComponent(titre)}`);
if (a.length !== 1) { console.log("galerie introuvable ou en double :", a.length); process.exit(1); }
if (a[0].club_teams?.est_groupe) { console.log("déjà sur le groupe"); process.exit(0); }
const [g] = await rest(`club_teams?select=id,name&club_id=eq.${cid}&categorie=eq.${a[0].club_teams.categorie}&est_groupe=is.true`);
if (!g) { console.log("pas de groupe pour", a[0].club_teams.categorie); process.exit(1); }
const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
const r = await (await fetch(`${SB}/rest/v1/media_albums?id=eq.${a[0].id}`, { method: "PATCH", headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ team_id: g.id }) })).json();
console.log(`« ${titre} » : ${a[0].club_teams.name} → ${Array.isArray(r) && r[0]?.team_id === g.id ? g.name : "ÉCHEC " + JSON.stringify(r).slice(0, 200)}`);
