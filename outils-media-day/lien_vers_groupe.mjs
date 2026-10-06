// Bascule sur l'équipe-groupe le lien d'invitation actif posé sur une équipe. Usage : node lien_vers_groupe.mjs <team_id équipe> <team_id groupe>
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
const [eq, g] = process.argv.slice(2);
const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
const r = await (await fetch(`${SB}/rest/v1/team_invite_codes?team_id=eq.${eq}&actif=is.true`, { method: "PATCH", headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ team_id: g }) })).json();
console.log("liens basculés sur le groupe :", Array.isArray(r) ? r.length : JSON.stringify(r).slice(0, 200));
