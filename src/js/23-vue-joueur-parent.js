/* ---------- vue joueur / parent ---------- */
function joueurView() {
  const box = h("div", { style: "margin-top:20px" });
  if (S.demo && S.demoAs !== "coach") {
    const fid = Object.keys(S.fiches).find(k => groupOf(S.fiches[k]) === S.demoAs);
    if (fid) box.append(psubtabs(), S.psub === "equipe" ? equipeView(groupOf(S.fiches[fid]), false) : ficheView(fid, S.fiches[fid], false));
    return box;
  }
  if (!S.me) { box.append(h("div", { class: "empty" }, "Connecte-toi pour voir ta fiche.")); return box; }
  if (S.blocked) { box.append(h("div", { class: "empty" }, "Ce compte a été désactivé par le coach. Si c'est une erreur, contacte-le directement.")); return box; }
  if (S.myFiche === undefined) { box.append(h("p", { class: "note" }, S.slow ? "Les données ne répondent pas encore. La page se mettra à jour seule." : "Chargement de ta fiche…")); return box; }
  if (S.myFiche === null) {
    const nomI = h("input", { id: "ins-nom", maxlength: "60", placeholder: "Prénom et nom" });
    const msg = h("span", { class: "note" });
    const card = h("div", { class: "card stack" }, h("h2", {}, "Ton compte est créé"),
      h("p", { style: "margin:0" }, S.myInscription && S.myInscription.role === "adjoint" ? "Ta demande d'accès coach adjoint U19 est envoyée. Dès que le coach l'a validée, recharge la page : tu arriveras sur l'espace coach U19." : "Ton coach doit maintenant le relier à ta fiche. Dès que c'est fait, cette page affichera tes notes, tes badges et l'équipe. Tu ne verras que ta propre fiche."));
    if (!S.myInscription) {
      card.append(h("label", { class: "field" }, "Indique ton prénom et ton nom pour que le coach te reconnaisse", nomI),
        h("div", { class: "row" }, h("button", { class: "btn", onclick: async () => {
          const n = nomI.value.trim(); if (!n) { msg.textContent = "Indique ton prénom et ton nom."; return; }
          try { await S.db.doc("inscriptions/" + S.me).set({ nom: n.slice(0, 60), email: S.email || "", at: new Date().toISOString() }); S.myInscription = { nom: n }; render(); } catch (e) { msg.textContent = "Échec : réessaie."; }
        } }, "Envoyer au coach"), msg));
    } else card.append(h("p", { class: "note", style: "margin:0" }, `Demande envoyée au nom de ${S.myInscription.nom}.`));
    box.append(card);
    const am = h("span", { class: "note" });
    box.append(h("div", { class: "card stack", style: "margin-top:12px" }, h("h3", { style: "margin:0" }, S.avatars[S.me] ? "Ton avatar" : "Crée ton avatar"), avatarEditor(S.avDraft || S.avatars[S.me], a => { S.avDraft = a; }),
      h("div", { class: "row" }, h("button", { class: "btn small", onclick: async () => { try { await saveAvatar(S.me, S.avDraft || S.avatars[S.me]); am.textContent = "Avatar enregistré : il sera sur ta carte."; } catch (e) { am.textContent = "Échec : réessaie."; } } }, "Enregistrer"), am)));
    return box;
  }
  box.append(semaineCard());
  if ("Notification" in window && Notification.permission === "default" && !S.notifAsk) box.append(h("div", { class: "card row", style: "align-items:center" }, h("span", { style: "flex:1;min-width:200px" }, "Être prévenu d'une nouvelle note ou d'un vote ouvert pendant que le site est ouvert ?"),
    h("button", { class: "btn small ghost", onclick: async () => { S.notifAsk = true; try { await Notification.requestPermission(); } catch (e) {} render(); } }, "Activer"), h("button", { class: "linkbtn", onclick: () => { S.notifAsk = true; render(); } }, "Non merci")));
  box.append(psubtabs(), S.psub === "equipe" ? equipeView(groupOf(S.myFiche), false) : ficheView(S.me, masquerNotes(S.me, S.myFiche), false));
  if (S.psub !== "equipe" && !S.demo) box.append(h("div", { style: "margin-top:12px" }, monCompteCard()));
  if (location.hash === "#mails" && !S.mailsVu) { S.mailsVu = true; setTimeout(() => { const el = document.getElementById("mon-compte"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300); }
  return box;
}
function vuLe() { try { return localStorage.getItem("vu-" + S.me) || ""; } catch (e) { return ""; } }
/* bloc « Cette semaine » en haut de l'espace joueur */
if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; softRender(); });
const enAppli = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
function badgesVus() { try { return JSON.parse(localStorage.getItem("bdg-" + S.me) || "null"); } catch (e) { return null; } }
function semaineCard() {
  const f = S.myFiche, g = groupOf(f), G = GROUPS[g], items = [];
  const it = (ico, txt, sub, act, lab, chaud) => items.push(h("div", { class: "sem-it" + (chaud ? " chaud" : "") }, h("span", { class: "sem-ico", "aria-hidden": "true" }, ico),
    h("div", { class: "sem-tx" }, h("b", {}, txt), sub ? h("small", {}, sub) : null), act ? h("button", { class: "btn small" + (chaud ? "" : " ghost"), onclick: act }, lab || "Voir") : null));
  const go = sub => () => { S.psub = sub; render(); };
  // nouveautés (notes, votes)
  for (const n of nouveautes()) it(n.sub === "equipe" ? "🗳️" : "📝", n.t, null, () => { if (n.sub === "fiche") marquerVu(); S.psub = n.sub; render(); }, n.sub === "equipe" ? "Voter" : "Voir", n.sub === "equipe");
  // auto-évaluation
  if (g !== "U10") {
    watchAutos(S.me);
    const { todo, bientot } = autoAFaire(f, S.autos[S.me] || []);
    for (const t of todo.slice(0, 2)) it("🪞", t.type === "Match" ? `Auto-évaluation du match du ${fmtDate(t.date)}` : "Auto-évaluation de la semaine", t.date >= MASQUE_DEBUT ? "À faire pour découvrir les notes du coach." : "Donne ton ressenti.", () => { S.psub = "fiche"; render(); setTimeout(() => { const el = document.getElementById("auto-card"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); }, "Faire", true);
    if (!todo.length && bientot) it("⏳", "Auto-évaluation de la semaine", "S'ouvre vendredi à 22h.");
  }
  const mq = masquerNotes(S.me, f); if (mq && mq._masque) it("🔒", `${mq._masque} évaluation${mq._masque > 1 ? "s" : ""} du coach en attente`, "Visible après ton auto-évaluation.");
  // convocation
  const eq = S.equipes[g] || {};
  const compo = (eq.compos || []).filter(c => c.date >= today()).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  if (compo) { const conv = [...(compo.xi || []), ...(compo.rempl || [])].includes(S.me), tit = (compo.xi || []).includes(S.me);
    it("📋", conv ? `Convoqué : ${compo.titre || "match"}` : `Pas convoqué : ${compo.titre || "match"}`, `${fmtLong(compo.date)}${conv ? (tit ? " · titulaire" : " · remplaçant") : ""}`, go("equipe"), "Compo", conv); }
  // prochaine séance
  const prochaine = seancesOf(g).map(([, x]) => x).filter(x => x.date >= today()).sort((a, b) => (a.date + (a.heure || "")) < (b.date + (b.heure || "")) ? -1 : 1)[0];
  if (prochaine) it("📅", `${prochaine.type === "Match" ? "Match" : "Entraînement"} ${jourLong(prochaine.date).toLowerCase()}`, prochaine.heure ? "à " + prochaine.heure : null);
  // nouveaux badges
  const got = badges(S.me, mq || f, eq).filter(b => b.got).map(b => b.nom), vus = badgesVus();
  if (vus === null) { try { localStorage.setItem("bdg-" + S.me, JSON.stringify(got)); } catch (e) {} }
  else { const nb = got.filter(n => !vus.includes(n)); if (nb.length) it("🏅", nb.length > 1 ? `${nb.length} nouveaux badges` : "Nouveau badge", nb.join(", "), () => { try { localStorage.setItem("bdg-" + S.me, JSON.stringify(got)); } catch (e) {} S.psub = "fiche"; render(); }, "Voir", true); }
  // appli
  if (!enAppli() && !S.appliNon) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (installEvt) it("📲", "Installer l'appli Endoume", "Une icône sur ton téléphone, en plein écran.", async () => { try { installEvt.prompt(); await installEvt.userChoice; } catch (e) {} installEvt = null; render(); }, "Installer");
    else if (ios) it("📲", "Mettre Endoume sur ton écran d'accueil", "Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ».", () => { S.appliNon = true; render(); }, "OK");
  }
  const card = h("div", { class: "card semaine" }, h("h3", {}, "Cette semaine"));
  // la règle ne s'affiche qu'aux joueurs concernés : ceux que le coach a notés et qui ont une auto-évaluation à faire
  const aFaire = g === "U19" && (autoAFaire(f, S.autos[S.me] || []).todo.length > 0 || (mq && mq._masque));
  if (aFaire) card.append(h("div", { class: "regle-auto" }, h("b", {}, "📌 La règle"), h("span", {}, "Pas d'auto-évaluation = pas de note de match."), h("span", {}, "Tu t'évalues, puis tu vois la note du coach.")));
  if (items.length) card.append(...items); else card.append(h("p", { class: "note", style: "margin:0" }, "Rien à faire pour l'instant. Profite !"));
  return card;
}
function marquerVu() { try { localStorage.setItem("vu-" + S.me, new Date().toISOString()); } catch (e) {} }
function votesOuverts() {
  const g = S.myFiche ? groupOf(S.myFiche) : null;
  return Object.entries(S.votes || {}).filter(([vid, v]) => v && v.ouvert && v.groupe === g && (!Array.isArray(v.convoques) || v.convoques.includes(S.me)) && S.myBallots[vid] !== true);
}
function nouveautes() {
  if (!S.myFiche) return [];
  const vu = vuLe(), out = [];
  if (vu) { const n = sortedNotes(masquerNotes(S.me, S.myFiche)).filter(x => (x.at || x.date) > vu).length; if (n) out.push({ t: `${n} nouvelle${n > 1 ? "s" : ""} note${n > 1 ? "s" : ""}`, sub: "fiche" }); }
  else if (sortedNotes(S.myFiche).length) marquerVu();
  for (const [vid, v] of votesOuverts()) { watchBulletins(vid); if (S.myBallots[vid] === true) continue; out.push({ t: `Vote ouvert : ${voteLabel(v.type, v.groupe).toLowerCase()}`, sub: "equipe" }); }
  return out;
}
function notifier(titre, corps) { try { if ("Notification" in window && Notification.permission === "granted") new Notification(titre, { body: corps, icon: document.querySelector(".crest").src, tag: titre }); } catch (e) {} }
function psubtabs() {
  return h("div", { class: "subtabs", role: "tablist" },
    h("button", { class: "subtab", role: "tab", "aria-selected": String(S.psub === "fiche"), onclick: () => { S.psub = "fiche"; render(); } }, "Ma fiche"),
    h("button", { class: "subtab", role: "tab", "aria-selected": String(S.psub === "equipe"), onclick: () => { S.psub = "equipe"; render(); } }, "L'équipe"));
}



