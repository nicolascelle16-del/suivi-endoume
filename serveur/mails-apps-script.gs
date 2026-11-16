// Suivi joueurs US Endoume : envoi des mails (nouvelle note, auto-évaluation).
// Seul un compte qui peut lire la fiche dans la base (coach, adjoint, ou le joueur lui-même) peut déclencher un envoi,
// et les mails partent uniquement vers l'adresse enregistrée sur la fiche.
const PROJET = "suivi-endoume";
const SITE = "https://nicolascelle16-del.github.io/suivi-endoume/";

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || "{}");
    const token = String(req.token || ""), kind = String(req.kind || "note");
    const par = String(req.par || "").replace(/[<>&"']/g, "").slice(0, 40);
    const fids = Array.isArray(req.fids) ? req.fids.slice(0, 40) : [];
    if (kind === "quota") return token ? out({ ok: true, quota: MailApp.getRemainingDailyQuota() }) : out({ ok: false, err: "requête vide" });
    if (!token || !fids.length || ["note", "match", "auto", "recap"].indexOf(kind) < 0) return out({ ok: false, err: "requête vide" });
    let sent = 0, bloques = 0;
    for (const fid of fids) {
      if (!/^[A-Za-z0-9_-]{6,60}$/.test(fid)) continue;
      const r = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/projects/" + PROJET + "/databases/(default)/documents/fiches/" + fid,
        { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
      if (r.getResponseCode() !== 200) continue;
      const f = JSON.parse(r.getContentText()).fields || {};
      const email = f.email && f.email.stringValue;
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
      if (f.mailsNon && f.mailsNon.booleanValue === true) continue;
      const nom = (f.nom && f.nom.stringValue) || "";
      const prenom = nom.split(" ")[0] || "";
      const groupe = (f.groupe && f.groupe.stringValue) || "U19";
      const data = kind === "recap" ? (req.recaps || {})[fid] : null;
      if (kind === "recap" && !data) continue;
      const m = kind === "recap" ? recap(groupe, prenom, data) : message(kind, groupe, prenom, par);
      if (MailApp.getRemainingDailyQuota() < 1) { bloques++; continue; }
      MailApp.sendEmail({ to: email, subject: m.sujet, htmlBody: m.html, body: m.texte, name: (par ? par.replace(/, coach adjoint$/, "") : "Coach Nico") + " · US Endoume" });
      sent++;
    }
    return out({ ok: true, sent: sent, bloques: bloques, quota: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return out({ ok: false, err: String(err) });
  }
}

function message(kind, groupe, prenom, par) {
  const parent = groupe === "U10";
  const qui = par || "Le coach";
  const salut = parent ? "Bonjour," : "Salut " + prenom + ",";
  let corps, sujet;
  if (kind === "auto") {
    sujet = "Ton auto-évaluation du match t'attend";
    corps = "Petit rappel : tu n'as pas encore fait ton auto-évaluation du dernier match. Ça prend deux minutes, et c'est obligatoire.";
  } else if (kind === "match" && !parent) {
    sujet = "Ton match a été noté par " + qui;
    corps = qui + " vient de noter ton match. Fais ton auto-évaluation du match pour débloquer ta note : pas d'auto-évaluation, pas de note.";
  } else {
    sujet = parent ? "Nouvelle évaluation pour " + prenom + " (" + qui + ")" : "Nouvelle évaluation de " + qui;
    corps = parent ? qui + " vient d'ajouter une nouvelle évaluation pour " + prenom + ". Connectez-vous pour la voir." : qui + " vient d'ajouter une nouvelle évaluation. Connecte-toi pour la voir.";
  }
  const signe = par || "Coach Nico";
  const texte = salut + "\n\n" + corps + "\n\n" + SITE + "\n\n" + signe + "\nUS Endoume Marseille Catalans\n\nSe désinscrire de ces mails : " + SITE + "#mails";
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;max-width:520px">' +
    '<p>' + salut + '</p><p>' + corps + '</p>' +
    '<p><a href="' + SITE + '" style="display:inline-block;background:#e0182d;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">Ouvrir le suivi</a></p>' +
    '<p>' + signe + '<br>US Endoume Marseille Catalans</p>' +
    '<p style="font-size:12px;color:#777">Message automatique du suivi des joueurs de l\'US Endoume, envoyé par ' + signe + '. <a href="' + SITE + '#mails" style="color:#777">Se désinscrire de ces mails</a></p></div>';
  return { sujet: sujet, html: html, texte: texte };
}

function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]).slice(0, 300); }
function recap(groupe, prenom, d) {
  const parent = groupe === "U10";
  const LOGO = SITE + "assets/endoume-logo.png";
  const NOIR = "#100e0f", ROUGE = "#e0182d", OR = "#cdbd8f", SABLE = "#7c6f4f", PAPIER = "#f6f3ec";
  const serif = "'Oranienbaum','Didot','Bodoni 72',Georgia,'Times New Roman',serif", sans = "'Barlow','Helvetica Neue',Arial,sans-serif";
  const mois = esc(d.mois), qui = esc(prenom);
  const sujet = parent ? "Le mois de " + prenom + " à l'US Endoume · " + d.mois : "Ton récap de " + d.mois + " · US Endoume";
  const label = function (t) { return '<div style="font-family:' + sans + ';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + SABLE + ';font-weight:600">' + esc(t) + '</div>'; };
  // tuiles
  const tiles = (d.tiles || []).slice(0, 4).map(function (t) {
    return '<td width="50%" style="padding:6px" valign="top"><div style="background:#ffffff;border:1px solid #e6e0d2;border-radius:10px;padding:14px 14px 12px">' + label(t[0]) +
      '<div style="font-family:' + serif + ';font-size:30px;line-height:1.1;color:' + NOIR + ';margin-top:4px">' + esc(t[1]) + '</div>' +
      (t[2] ? '<div style="font-family:' + sans + ';font-size:12px;color:#777;margin-top:2px">' + esc(t[2]) + '</div>' : '') + '</div></td>';
  });
  let tilesHtml = ""; for (let k = 0; k < tiles.length; k += 2) tilesHtml += '<tr>' + tiles[k] + (tiles[k + 1] || '<td width="50%"></td>') + '</tr>';
  // barres par critère
  const bars = (d.crits || []).slice(0, 10).map(function (x) {
    const pct = Math.max(4, Math.min(100, Math.round((Number(x[1]) || 0) / 5 * 100)));
    const col = x === (d.crits || [])[0] ? OR : (x === (d.crits || [])[(d.crits || []).length - 1] && d.crits.length > 1 ? ROUGE : NOIR);
    return '<tr><td style="font-family:' + sans + ';font-size:13px;color:#333;padding:5px 10px 5px 0;white-space:nowrap" width="38%">' + esc(x[0]) + '</td>' +
      '<td style="padding:5px 0" width="44%"><div style="background:#e9e4d8;border-radius:6px;height:10px;width:100%;font-size:0;line-height:0"><div style="background:' + col + ';border-radius:6px;height:10px;width:' + pct + '%;font-size:0;line-height:0">&nbsp;</div></div></td>' +
      '<td style="font-family:' + sans + ';font-size:13px;font-weight:600;color:' + NOIR + ';padding:5px 0 5px 10px;white-space:nowrap" align="right">' + esc(x[2]) + '</td></tr>';
  }).join("");
  const evo = d.evo ? '<span style="display:inline-block;background:' + (String(d.evo).charAt(0) === "+" ? "#1f7a3a" : ROUGE) + ';color:#fff;font-family:' + sans + ';font-size:12px;font-weight:600;border-radius:20px;padding:3px 10px;margin-top:6px">' + esc(d.evo) + ' vs le mois d’avant</span>' : '';
  const carte = function (titre, txt, col) { return txt ? '<td width="50%" style="padding:6px" valign="top"><div style="border-radius:10px;padding:14px;background:' + NOIR + ';border-left:5px solid ' + col + '">' +
    '<div style="font-family:' + sans + ';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + col + ';font-weight:600">' + titre + '</div>' +
    '<div style="font-family:' + serif + ';font-size:20px;line-height:1.2;color:#fff;margin-top:6px">' + esc(txt) + '</div></div></td>' : '<td width="50%"></td>'; };
  const html =
'<div style="background:' + PAPIER + ';padding:0;margin:0">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + PAPIER + '"><tr><td align="center" style="padding:20px 10px">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">' +
// en-tête noir
'<tr><td style="background:' + NOIR + ';padding:26px 24px 20px;text-align:center;border-bottom:5px solid ' + ROUGE + '">' +
  '<img src="' + LOGO + '" width="74" alt="US Endoume Catalans" style="display:block;margin:0 auto 10px;width:74px;height:auto">' +
  '<div style="font-family:' + sans + ';font-size:11px;letter-spacing:4px;color:' + OR + ';font-weight:600">US ENDOUME CATALANS · DEPUIS 1925</div>' +
  '<div style="font-family:' + serif + ';font-size:34px;line-height:1.1;color:#ffffff;margin-top:10px;text-transform:uppercase;letter-spacing:1px">Récap de ' + mois + '</div>' +
  '<div style="font-family:' + sans + ';font-size:14px;color:#cfc8bb;margin-top:6px">' + (parent ? "Le mois de " + qui + " en un coup d’œil" : qui + ", voici ton mois en un coup d’œil") + '</div>' +
'</td></tr>' +
// moyenne
(d.moy ? '<tr><td style="padding:26px 24px 8px;text-align:center">' + label(parent ? "Son niveau du mois" : "Ta moyenne du mois") +
  '<div style="font-family:' + serif + ';font-size:64px;line-height:1;color:' + ROUGE + ';margin-top:6px">' + esc(d.moy) + '</div>' +
  (d.moyUnite ? '<div style="font-family:' + sans + ';font-size:13px;color:#777">' + esc(d.moyUnite) + '</div>' : '') + evo + '</td></tr>' : '') +
// tuiles
(tilesHtml ? '<tr><td style="padding:12px 18px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + tilesHtml + '</table></td></tr>' : '') +
// barres
(bars ? '<tr><td style="padding:18px 24px 6px">' + label(parent ? "Critère par critère" : "Tes critères du mois") + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">' + bars + '</table></td></tr>' : '') +
// point fort / à travailler
((d.fort || d.axe) ? '<tr><td style="padding:14px 18px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' + carte("Point fort", d.fort, OR) + carte("À travailler", d.axe, ROUGE) + '</tr></table></td></tr>' : '') +
// bouton
'<tr><td style="padding:22px 24px 28px;text-align:center">' +
  '<div style="font-family:' + sans + ';font-size:14px;color:#333;margin-bottom:14px">' + (parent ? "Le détail de chaque séance est sur le suivi." : "Ton profil complet et le détail de chaque séance t’attendent sur le suivi. Continue comme ça !") + '</div>' +
  '<a href="' + SITE + '" style="display:inline-block;background:' + ROUGE + ';color:#ffffff;text-decoration:none;font-family:' + sans + ';font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:600;padding:14px 26px;border-radius:6px">Ouvrir ' + (parent ? "le suivi" : "mon suivi") + '</a>' +
'</td></tr>' +
// pied
'<tr><td style="background:' + NOIR + ';padding:16px 24px;text-align:center">' +
  '<div style="font-family:' + serif + ';font-size:16px;color:#ffffff">Coach Nico</div>' +
  '<div style="font-family:' + sans + ';font-size:11px;letter-spacing:3px;color:' + OR + ';margin-top:4px">US ENDOUME MARSEILLE CATALANS</div>' +
  '<div style="font-family:' + sans + ';font-size:11px;color:#8a8378;margin-top:10px">Message du suivi des joueurs de l\'US Endoume. <a href="' + SITE + '#mails" style="color:#8a8378">Se désinscrire de ces mails</a></div>' +
'</td></tr>' +
'</table></td></tr></table></div>';
  const texte = (parent ? "Bonjour, voici le récap de " + d.mois + " pour " + prenom : "Salut " + prenom + ", voici ton récap de " + d.mois) + "\n\n" +
    (d.lignes || []).map(function (l) { return l[0] + " : " + l[1]; }).join("\n") + (d.fort ? "\nPoint fort : " + d.fort : "") + (d.axe ? "\nÀ travailler : " + d.axe : "") + "\n\n" + SITE + "\n\nCoach Nico\n\nSe désinscrire de ces mails : " + SITE + "#mails";
  return { sujet: sujet, html: html, texte: texte };
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// À lancer une fois depuis l'éditeur pour donner l'autorisation d'envoyer des mails.
function autoriser() { MailApp.getRemainingDailyQuota(); UrlFetchApp.fetch("https://www.google.com", { muteHttpExceptions: true }); }
