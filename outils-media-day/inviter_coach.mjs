// Invite un encadrant dans Club+ par la fonction de l'OS (clubplus-invite), sous l'identité de l'administrateur.
// Usage : node inviter_coach.mjs <email> <club_id> <role> <équipe1,équipe2> [prénom] [nom]
import { compte, jeton, SB, ANON } from "/Users/fouka/Downloads/jarvis-starter-kit/.claude/worktrees/cockpit-main/livrables/SportVision-TV/tests/_session-os.mjs";
import { rest } from "./sb.mjs";
const [email, club_id, role, equipes, prenom = "", nom = ""] = process.argv.slice(2);
const avant = await rest(`club_members?select=id,role,status,teams,user_id&club_id=eq.${club_id}`);
console.log("membres du club avant :", avant.length);
const j = await jeton((await compte("id=eq.b4ff9a0e-9ae6-43a5-bddf-412fdf7d2cca")).email);
const r = await fetch(`${SB}/functions/v1/clubplus-invite`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${j.acces}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email, club_id, role, teams: equipes.split(","), prenom, nom, mode: "email" }) });
console.log("réponse :", r.status, (await r.text()).slice(0, 400));
const apres = await rest(`club_members?select=role,status,teams,prenom,nom,created_at&club_id=eq.${club_id}&order=created_at.desc&limit=1`);
console.log("dernier membre :", apres[0]);
