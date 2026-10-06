// Constitue le groupe d'une catégorie : réactive la 2e équipe (l'OS crée le groupe par déclencheur), puis, si demandé,
// déplace les inscrits de l'équipe 1 vers le groupe, bascule son lien d'invitation et la galerie Media Day sur le groupe.
// Tout sous l'identité de l'administrateur (les règles de l'OS s'appliquent). Usage : node grouper.mjs <catégorie> <équipe1> <équipe2> [deplacer]
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
const cid = "0ab96066-2ca5-4fb1-98eb-2204771ecf8d"; const [cat, e1, e2, dep] = process.argv.slice(2);
const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
const H = { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (q, init = {}) => { const r = await fetch(`${SB}/rest/v1/${q}`, { ...init, headers: H }); const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const equipes = async () => api(`club_teams?select=id,name,est_groupe,archivee&club_id=eq.${cid}&categorie=eq.${cat}`);
let T = await equipes(); const t1 = T.find((x) => x.name === e1), t2 = T.find((x) => x.name === e2);
if (!t1 || !t2) { console.log("équipes introuvables", T); process.exit(1); }
if (t2.archivee) { const r = await api(`club_teams?id=eq.${t2.id}`, { method: "PATCH", body: JSON.stringify({ archivee: false, archivee_at: null }) }); console.log(`réactivation ${e2} :`, Array.isArray(r) && r.length === 1 ? "ok" : JSON.stringify(r).slice(0, 200)); }
T = await equipes(); const g = T.find((x) => x.est_groupe);
console.log("groupe :", g ? g.name : "ABSENT", "| équipes actives :", T.filter((x) => !x.est_groupe && !x.archivee).map((x) => x.name).join(", "));
if (!g || dep !== "deplacer") process.exit(g ? 0 : 1);
const m = await api(`team_memberships?team_id=eq.${t1.id}&statut=eq.active`, { method: "PATCH", body: JSON.stringify({ team_id: g.id }) });
console.log("inscrits déplacés vers le groupe :", Array.isArray(m) ? m.length : JSON.stringify(m).slice(0, 200));
const c = await api(`team_invite_codes?team_id=eq.${t1.id}&actif=is.true`, { method: "PATCH", body: JSON.stringify({ team_id: g.id }) });
console.log("liens d'invitation basculés sur le groupe :", Array.isArray(c) ? c.length : JSON.stringify(c).slice(0, 200));
const a = await api(`media_albums?team_id=eq.${t1.id}&title=ilike.Media Day*`, { method: "PATCH", body: JSON.stringify({ team_id: g.id }) });
console.log("galerie Media Day rattachée au groupe :", Array.isArray(a) ? a.map((x) => x.title).join(", ") || "aucune" : JSON.stringify(a).slice(0, 200));
