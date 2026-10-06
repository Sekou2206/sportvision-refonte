// Renomme une équipe par le chemin de l'OS (le déclencheur v113 propage le nom partout). Usage : node renommer.mjs <team_id> <nouveau nom>
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
import { rest } from "./sb.mjs";
const [id, nom] = process.argv.slice(2);
const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
const r = await (await fetch(`${SB}/rest/v1/club_teams?id=eq.${id}`, { method: "PATCH", headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ name: nom }) })).json();
console.log("renommage :", Array.isArray(r) && r[0]?.name === nom ? `ok → ${nom}` : JSON.stringify(r).slice(0, 250));
const m = await rest(`club_matches?select=team&team_id=eq.${id}`); console.log("matchs de l'équipe, nom affiché :", [...new Set(m.map((x) => x.team))].join(", "), `(${m.length})`);
const e = await rest(`club_calendar_events?select=team&team_id=eq.${id}&limit=200`); console.log("créneaux et événements :", Array.isArray(e) ? [...new Set(e.map((x) => x.team))].join(", ") + ` (${e.length})` : "?");
