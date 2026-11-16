/* ---------- compte relié : gestion coach ---------- */
const slugify = n => (n || "joueur").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "joueur";
async function unlinkAccount(fid, block) {
  const f = { ...S.fiches[fid] }; delete f.linkedAt;
  const nfid = "j-" + slugify(f.nom) + "-" + Math.random().toString(36).slice(2, 6);
  await S.db.doc("fiches/" + nfid).set(f);
  const av = S.avatars[fid];
  if (av) { try { await setDoc(fsDoc(fs, "avatars/" + nfid), avClean(av)); } catch (e) {} }
  if (block) await setDoc(fsDoc(fs, "bloques/" + fid), { nom: f.nom || "", email: f.email || "", at: new Date().toISOString() });
  await S.db.doc("fiches/" + fid).delete();
  return nfid;
}
function compteCard(fid, f) {
  const card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Compte du joueur"));
  const em = h("input", { type: "email", id: "cpt-mail-" + fid, value: f.email || "", placeholder: "adresse@exemple.fr", style: "min-width:240px" });
  const m = h("span", { class: "note" });
  card.append(h("p", { class: "note", style: "margin:0" }, "L'adresse ci-dessous sert de contact et pour envoyer un lien de mot de passe. Changer l'adresse de connexion se fait par le joueur lui-même, dans « Mon compte » sur sa fiche."),
    h("div", { class: "row", style: "align-items:flex-end" }, h("label", { class: "field", style: "flex:1" }, "E-mail du compte", em),
      h("button", { class: "btn ghost small", onclick: async () => { const v = em.value.trim().slice(0, 120); if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { m.className = "err"; m.textContent = "Adresse invalide."; return; } try { await writeFiche(fid, { email: v }); m.className = "ok"; m.textContent = "Adresse enregistrée."; } catch (e) { m.className = "err"; m.textContent = "Échec : réessaie."; } } }, "Enregistrer"),
      h("button", { class: "btn ghost small", onclick: async () => { const v = em.value.trim(); if (!v) { m.className = "err"; m.textContent = "Renseigne l'adresse d'abord."; return; } try { await sendPasswordResetEmail(auth, v); m.className = "ok"; m.textContent = `Lien de nouveau mot de passe envoyé à ${v}.`; } catch (e) { m.className = "err"; m.textContent = "Envoi impossible : vérifie l'adresse."; } } }, "Envoyer un nouveau mot de passe")), m);
  const blk = h("input", { type: "checkbox", id: "cpt-blk-" + fid });
  const um = h("span", { class: "note" });
  const ub = h("button", { class: "linkbtn danger" }, "Retirer ce compte de la fiche");
  ub.onclick = async () => {
    if (ub.dataset.c !== "1") { ub.dataset.c = "1"; ub.className = "btn small"; ub.style.background = "#8e0e1c"; ub.textContent = blk.checked ? "Confirmer : retirer et bloquer le compte" : "Confirmer : retirer le compte"; return; }
    ub.disabled = true; um.textContent = "…";
    try { const n = await unlinkAccount(fid, blk.checked); S.sel = n; S.flash = blk.checked ? `Compte retiré et bloqué. La fiche de ${f.nom} est gardée, sans compte.` : `Compte retiré. La fiche de ${f.nom} est gardée et peut être reliée à un autre compte.`; render(); }
    catch (e) { ub.disabled = false; um.className = "err"; um.textContent = "Échec : réessaie."; }
  };
  card.append(h("div", { class: "stack", style: "gap:6px;border-top:1px solid var(--ligne);padding-top:10px" },
    h("p", { class: "note", style: "margin:0" }, "Retirer le compte : la fiche (notes, présences, badges, avatar) est gardée et redevient « compte non lié ». La personne perd l'accès. Pratique si un parent s'est trompé d'adresse : il recrée un compte et tu le relies."),
    h("label", { class: "row", style: "gap:8px;align-items:center;font-size:14px" }, blk, "Bloquer aussi ce compte (il ne pourra plus refaire de demande)"),
    h("div", { class: "row", style: "align-items:center" }, ub, um)));
  return card;
}
function monCompteCard() {
  const card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Mon compte"), h("p", { class: "note", style: "margin:0" }, `Connecté avec ${S.email || "ton adresse"}.`));
  if (!S.monCompteOpen) { card.append(h("button", { class: "linkbtn", style: "align-self:flex-start", onclick: () => { S.monCompteOpen = true; render(); } }, "Changer mon adresse mail")); return card; }
  const ne = h("input", { type: "email", autocomplete: "email", placeholder: "Nouvelle adresse" }), pw = h("input", { type: "password", autocomplete: "current-password", placeholder: "Mot de passe actuel" });
  const m = h("span", { class: "note" });
  card.append(h("div", { class: "row" }, h("label", { class: "field", style: "flex:1;min-width:200px" }, "Nouvelle adresse", ne), h("label", { class: "field", style: "flex:1;min-width:180px" }, "Mot de passe actuel", pw)),
    h("div", { class: "row", style: "align-items:center" }, h("button", { class: "btn small", onclick: async () => {
      const v = ne.value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { m.className = "err"; m.textContent = "Adresse invalide."; return; }
      m.className = "note"; m.textContent = "…";
      try { await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, pw.value)); await verifyBeforeUpdateEmail(auth.currentUser, v); m.className = "ok"; m.textContent = `Un e-mail de confirmation a été envoyé à ${v}. Clique sur le lien pour valider le changement.`; }
      catch (e) { m.className = "err"; m.textContent = AUTH_ERR[e && e.code] || "Échec : vérifie ton mot de passe et réessaie."; }
    } }, "Changer l'adresse"), h("button", { class: "btn ghost small", onclick: () => { S.monCompteOpen = false; render(); } }, "Annuler"), m));
  return card;
}

