// Verser un media day dans une galerie de l'OS, joueur par joueur (06/10/2026).
//
// Le media day est déjà trié sur le disque : un dossier par personne, et dans chacun un sous-dossier
// des photos à livrer (« fond Villemomble »). On sait donc QUI est sur chaque photo sans aucune
// reconnaissance : chaque photo est marquée à son joueur (source « humain », validée). Avec la règle
// du Pass, chacun retrouve les siennes et seulement les siennes.
//
// Le dépôt REJOUE LE CODE DE L'OS, comme scripts/regenerer-apercus.mjs : mêmes trois dérivés, même
// filigrane, mêmes chemins, original sur R2. Une galerie versée ici ne se distingue pas d'une
// galerie versée depuis l'écran.
//
// LA GALERIE RESTE EN BROUILLON. La mise en ligne prévient l'équipe une seule fois et enregistre le
// lien principal : c'est le bouton « Mettre en ligne » de l'OS qui le fait, pas ce script.
//
//   node verser-galerie.mjs <reglages.json>            # verse, reprenable
//   node verser-galerie.mjs <reglages.json> --limite 1 # essai sur une photo
//
// reglages.json : { dossier, sous_dossier, titre, date, club_id, team_id, type_evenement, cree_par,
//                   album_id?, personnes: [{ dossier, player_id|null }] }
// album_id est écrit dans le fichier à la création : relancer complète la même galerie.
import { chromium } from "../SportVision-Connect/app-next/node_modules/playwright/index.mjs";
import { urlSigneeR2 } from "../SportVision-TV/supabase/functions/_shared/r2.ts";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";

const RACINE = "/Users/fouka/Downloads/jarvis-starter-kit/";
const env = Object.fromEntries(readFileSync(`${RACINE}.env`, "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const URL_SB = env.SUPABASE_URL, CLE = env.SUPABASE_SECRET_KEY;
const R2 = { compte: env.R2_ACCOUNT_ID, cleId: env.R2_ACCESS_KEY_ID, secret: env.R2_SECRET_ACCESS_KEY, seau: env.R2_BUCKET || "sportvision-medias" };
if (!R2.compte || !R2.cleId || !R2.secret) { console.log("clés R2 absentes de .env"); process.exit(1); }

const fichierReglages = process.argv[2];
const G = JSON.parse(readFileSync(fichierReglages, "utf8"));
const iLim = process.argv.indexOf("--limite");
const LIMITE = iLim > 0 ? Number(process.argv[iLim + 1]) : Infinity;

const rest = async (chemin, init = {}) => {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, {
    ...init, headers: { apikey: CLE, Authorization: `Bearer ${CLE}`,
      "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const t = await r.text(); try { return { ok: r.ok, d: JSON.parse(t) }; } catch { return { ok: r.ok, d: t }; }
};
const deposer = async (bucket, chemin, octets, type) => {
  const r = await fetch(`${URL_SB}/storage/v1/object/${bucket}/${chemin}`, { method: "POST",
    headers: { apikey: CLE, Authorization: `Bearer ${CLE}`, "Content-Type": type, "x-upsert": "true" }, body: octets });
  if (!r.ok) throw new Error(`dépôt ${chemin} : ${(await r.text()).slice(0, 120)}`);
};

// ── Les fonctions de l'OS, extraites telles quelles (même méthode que regenerer-apercus.mjs) ─────
const html = readFileSync(new URL("../SportVision-TV/SportVision-OS-Full.html", import.meta.url).pathname, "utf8");
function extraire(nom, genre) {
  let debut = genre === "const" ? html.indexOf(`const ${nom}=`) : html.indexOf(`async function ${nom}(`);
  if (debut === -1 && genre !== "const") debut = html.indexOf(`function ${nom}(`);
  if (debut === -1) throw new Error(`introuvable dans l'OS : ${nom}`);
  let prof = 0, vu = false;
  for (let i = debut; i < html.length; i++) {
    if (html[i] === "{") { prof++; vu = true; }
    else if (html[i] === "}") { prof--; if (vu && prof === 0)
      return html.slice(debut, genre === "const" ? html.indexOf(";", i) + 1 : i + 1); }
  }
  throw new Error(`fin introuvable : ${nom}`);
}
const source = ["GAL_MEDIA_CFG|const", "_galDessiner|fn", "_galFiligrane|fn", "_galToBlob|fn"]
  .map((x) => extraire(...x.split("|"))).join("\n");

// ── La galerie : créée une fois, en brouillon ──────────────────────────────────────────────────
if (!G.album_id) {
  const { ok, d } = await rest("media_albums", { method: "POST", body: JSON.stringify({
    club_id: G.club_id, team_id: G.team_id, title: G.titre, event_date: G.date,
    type_evenement: G.type_evenement, status: "draft", access_mode: "free_members",
    watermark_previews: true, created_by: G.cree_par }) });
  if (!ok || !d?.[0]?.id) { console.log("création de la galerie refusée :", JSON.stringify(d).slice(0, 300)); process.exit(1); }
  G.album_id = d[0].id;
  writeFileSync(fichierReglages, JSON.stringify(G, null, 1));
  console.log(`  galerie créée en brouillon : ${G.album_id} (saison ${d[0].saison_id})`);
}
const { d: album } = await rest(`media_albums?select=id,title,status,club_id,team_id&id=eq.${G.album_id}`);
if (!album?.[0]) { console.log("galerie introuvable"); process.exit(1); }
console.log(`  galerie « ${album[0].title} » (${album[0].status})`);

// ── Ce qui est déjà versé (reprise) ────────────────────────────────────────────────────────────
const { d: deja } = await rest(`media_assets?select=id,original_filename,status&album_id=eq.${G.album_id}&limit=2000`);
const pretes = new Map(deja.filter((x) => x.status === "ready").map((x) => [x.original_filename, x.id]));
for (const x of deja.filter((x) => x.status !== "ready"))   // un dépôt interrompu se refait de zéro
  await rest(`media_assets?id=eq.${x.id}`, { method: "DELETE" });

// ── La liste, dans l'ordre de passage ──────────────────────────────────────────────────────────
const aFaire = [];
for (const p of G.personnes) {
  const d = join(G.dossier, p.dossier, G.sous_dossier);
  for (const f of readdirSync(d).filter((f) => /\.jpe?g$/i.test(f) && !f.startsWith("._")).sort())
    aFaire.push({ chemin: join(d, f), nom: f, player_id: p.player_id, qui: p.dossier });
}
console.log(`  ${aFaire.length} photo(s) sur le disque, ${pretes.size} déjà versée(s)\n`);

const serveur = createServer((_, res) => { res.setHeader("content-type", "text/html"); res.end("<!doctype html><meta charset=utf-8>"); });
await new Promise((r) => serveur.listen(0, "127.0.0.1", r));
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.goto(`http://127.0.0.1:${serveur.address().port}/`);
await page.addScriptTag({ content: source });

let faites = 0, ratees = 0, marquees = 0;
for (const [position, x] of aFaire.entries()) {
  if (faites >= LIMITE) break;
  let assetId = pretes.get(x.nom);
  try {
    if (!assetId) {
      const bin = readFileSync(x.chemin);
      // 1. Les trois dérivés, par le code de l'OS, dans un vrai navigateur.
      const dv = await page.evaluate(async ({ b64 }) => {
        const oct = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([oct], { type: "image/jpeg" }), { imageOrientation: "from-image" });
        const enB64 = async (blob) => {
          const buf = new Uint8Array(await blob.arrayBuffer());
          let s = ""; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
          return btoa(s);
        };
        const C = GAL_MEDIA_CFG;
        const t = await _galToBlob(_galDessiner(bitmap, C.thumb.max, true, "thumb"), C.thumb.mime, C.thumb.quality);
        const pv = await _galToBlob(_galDessiner(bitmap, C.preview.max, true, "preview"), C.preview.mime, C.preview.quality);
        const pc = await _galToBlob(_galDessiner(bitmap, C.preview.max, false, "preview"), C.preview.mime, C.preview.quality);
        return { thumb: await enB64(t), preview: await enB64(pv), clair: await enB64(pc), w: bitmap.width, h: bitmap.height };
      }, { b64: bin.toString("base64") });

      // 2. La ligne AVANT le fichier, comme l'OS : l'index (galerie, empreinte) refuse un doublon ici.
      assetId = randomUUID();
      const originalPath = `media/${G.album_id}/${assetId}.jpg`;
      const thumbPath = `${G.album_id}/${assetId}-t.webp`, previewPath = `${G.album_id}/${assetId}-p.webp`;
      const clairPath = `apercus-clairs/${G.album_id}/${assetId}-pc.webp`;
      const ligne = await rest("media_assets", { method: "POST", body: JSON.stringify({
        id: assetId, album_id: G.album_id, club_id: G.club_id, original_path: originalPath,
        original_filename: x.nom, mime_type: "image/jpeg", checksum: createHash("sha256").update(bin).digest("hex"),
        width: dv.w, height: dv.h, bytes: bin.length, storage_bucket: "r2", status: "uploading",
        position, created_by: G.cree_par }) });
      if (!ligne.ok) throw new Error("ligne refusée : " + JSON.stringify(ligne.d).slice(0, 160));

      try {
        // 3. L'original sur R2, par une adresse signée (même signature que la fonction r2-fichier).
        const put = await fetch(await urlSigneeR2(R2, originalPath, 600, undefined, "PUT"),
          { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: bin });
        if (!put.ok) throw new Error(`R2 a refusé l'original (HTTP ${put.status})`);
        // 4. Les dérivés, puis « ready » en dernier.
        await deposer("galerie-previews", thumbPath, Buffer.from(dv.thumb, "base64"), "image/webp");
        await deposer("galerie-previews", previewPath, Buffer.from(dv.preview, "base64"), "image/webp");
        await deposer("sportvision-media-prive", clairPath, Buffer.from(dv.clair, "base64"), "image/webp");
        const fin = await rest(`media_assets?id=eq.${assetId}`, { method: "PATCH", body: JSON.stringify({
          thumb_path: thumbPath, preview_path: previewPath, preview_clair_path: clairPath,
          status: "ready", processing_error: null, preview_watermarked: true }) });
        if (!fin.ok) throw new Error("finalisation refusée");
      } catch (e) {
        await rest(`media_assets?id=eq.${assetId}`, { method: "DELETE" });   // rien à moitié : on refera
        throw e;
      }
      faites++;
    }
    // 5. Le marquage : la photo est celle de ce joueur (les encadrants n'ont pas de fiche joueur).
    if (x.player_id) {
      const { d: t } = await rest(`media_player_tags?select=id&media_ref_type=eq.media_asset&media_ref_id=eq.${assetId}&player_id=eq.${x.player_id}`);
      if (!t.length) {
        const m = await rest("media_player_tags", { method: "POST", body: JSON.stringify({
          media_ref_type: "media_asset", media_ref_id: assetId, player_id: x.player_id,
          tagged_by: G.cree_par, source: "humain", statut: "valide", valide_par: G.cree_par, valide_le: new Date().toISOString() }) });
        if (!m.ok) throw new Error("marquage refusé : " + JSON.stringify(m.d).slice(0, 160));
        marquees++;
      }
    }
    console.log(`  ok ${String(position + 1).padStart(3)}/${aFaire.length}  ${x.qui}  ${x.nom}${pretes.has(x.nom) ? "  (déjà versée)" : ""}`);
  } catch (e) {
    ratees++;
    console.log(`  KO ${x.qui} ${x.nom} : ${String(e.message).slice(0, 200)}`);
  }
}
await navigateur.close(); serveur.close();
console.log(`\n  ${faites} versée(s), ${marquees} marquage(s) posé(s), ${ratees} en échec. Galerie ${G.album_id} toujours en brouillon.`);
process.exit(ratees ? 1 : 0);
