/* ---------- accès (coachs et comptes en attente) ---------- */
const normName = n => (n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(w => w.length > 1);
function guessFiche(nom, grp) {
  const w = normName(nom); if (!w.length) return "";
  let best = "", score = 0;
  for (const [fid, f] of Object.entries(S.fiches)) {
    if (!isTemp(fid) || (grp && groupOf(f) !== grp)) continue;
    const fw = normName(f.nom), sc = w.filter(x => fw.includes(x)).length;
    if (sc > score) { score = sc; best = fid; }
  }
  return best;
}
async function linkAccount(fid, uid) {
  const data = { ...S.fiches[fid], linkedAt: new Date().toISOString() };
  const ins = S.inscriptions[uid];
  if (ins && ins.poste && groupOf(data) === "U19") data.poste = String(ins.poste).slice(0, 40);
  if (ins && ins.email) data.email = String(ins.email).slice(0, 120);
  if (ins && ins.accordAt) data.accordAt = String(ins.accordAt).slice(0, 40);
  const ref = S.db.doc("fiches/" + uid); if ((await ref.get()).exists) throw new Error("exists");
  await ref.set(data); await S.db.doc("fiches/" + fid).delete(); await S.db.doc("inscriptions/" + uid).delete();
  for (const [sid, se] of Object.entries(S.seances)) { const d = ditOf(se); if (fid in d) { const n = { ...d, [uid]: d[fid] }; delete n[fid]; try { await S.db.doc("seances/" + sid).update({ dit: n }); } catch (e) {} } }
  return data;
}
function exporterTout(archive) {
  const data = { exporte: new Date().toISOString(), fiches: S.fiches, seances: S.seances, carnet: S.carnet || {}, equipes: S.equipes, votes: S.votes, coachs: S.coachs, inscriptions: S.inscriptions, objectifs: S.objectifs, championnat: S.champ || null };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: archive ? `suivi-endoume-archive-saison-${libSaison()}.json` : `suivi-endoume-sauvegarde-${today()}.json` });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  try { localStorage.setItem("derniereSauvegarde", today()); } catch (e) {}
}
function derniereSauvegarde() { try { return localStorage.getItem("derniereSauvegarde"); } catch (e) { return null; } }
function accesView() {
  const box = h("div", { class: "stack" });
  if (S.flash) { box.append(h("p", { class: "ok", style: "margin:0" }, S.flash)); S.flash = ""; }
  const ds = derniereSauvegarde();
  box.append(h("div", { class: "card row", style: "align-items:center" }, h("div", { style: "flex:1;min-width:220px" }, h("h3", { style: "margin:0 0 4px" }, "Sauvegarde"),
    h("p", { class: "note", style: "margin:0" }, `Télécharge toutes les données (fiches, notes, présences, séances, carnet BMF, équipes) dans un fichier. À faire une fois par mois et à garder en privé. ${ds ? "Dernière sauvegarde sur cet appareil : " + fmtLong(ds) + "." : "Pas encore de sauvegarde sur cet appareil."}`)),
    h("button", { class: "btn small", onclick: () => { exporterTout(); render(); } }, "Exporter toutes les données")));
  box.append(h("div", { class: "card row", style: "align-items:center" }, h("div", { style: "flex:1;min-width:220px" }, h("h3", { style: "margin:0 0 4px" }, `Saison ${libSaison()}`),
    h("p", { class: "note", style: "margin:0" }, `Le site affiche la saison en cours (depuis le ${fmtLong(debutSaison())}). Le 1er août, notes, présences et badges repartent à zéro tout seuls : rien n'est effacé, l'ancienne saison reste dans la base. Pense à télécharger l'archive avant.`)),
    h("div", { class: "row", style: "gap:6px" },
      h("button", { class: "btn small ghost", onclick: () => { exporterTout(true); render(); } }, "Télécharger l'archive de la saison"),
      h("button", { class: "btn small ghost", onclick: () => { S.toutesSaisons = !S.toutesSaisons; render(); } }, S.toutesSaisons ? "Revenir à la saison en cours" : "Voir toutes les saisons"))));
  const pend = Object.entries(S.inscriptions).filter(([uid]) => !S.fiches[uid] && !S.coachs[uid]);
  const pc = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, `Comptes en attente · ${pend.length}`),
    h("p", { class: "note", style: "margin:0" }, "Un joueur ou un parent qui crée son compte apparaît ici. Choisis sa fiche dans la liste et clique sur Relier : il verra uniquement sa fiche et son équipe (U19, U10 ou gardiens). L'accès coach est réservé à tes adjoints."));
  const free = Object.entries(S.fiches).filter(([fid]) => isTemp(fid)).sort((a, b) => (a[1].nom || "").localeCompare(b[1].nom || "", "fr"));
  for (const [uid, x] of pend.filter(([, x]) => x.role === "adjoint")) {
    const m = h("span", { class: "note" });
    let ok = false;
    const val = h("button", { class: "btn small" }, "Valider comme adjoint U19");
    val.onclick = async () => {
      if (!ok) { ok = true; val.textContent = `Confirmer : ${x.email || "cette adresse"} devient adjoint U19`; return; }
      val.disabled = true;
      try { await S.db.doc("coachs/" + uid).set({ nom: x.nom || "", email: x.email || "", at: new Date().toISOString(), groupes: ["U19"] }); await S.db.doc("inscriptions/" + uid).delete(); S.flash = `${x.nom || "L'adjoint"} est adjoint U19. Il doit recharger la page pour arriver sur son espace.`; render(); }
      catch (e) { val.disabled = false; m.className = "err"; m.textContent = "Échec : réessaie."; }
    };
    pc.append(h("div", { class: "hitem", style: "border-color:var(--or)" },
      h("div", { class: "hhead" }, h("span", { class: "row", style: "gap:8px;align-items:center;flex-wrap:nowrap" }, avatarNode(uid, x.nom, "av-mini"), h("strong", {}, x.nom || "Sans nom")), h("span", { class: "pill" }, "Demande adjoint U19")),
      h("p", { style: "margin:0" }, "Adresse : ", h("b", {}, x.email || "inconnue"), h("span", { class: "note" }, " · vérifie que c'est bien la sienne avant de valider.")),
      h("div", { class: "row", style: "align-items:center;justify-content:space-between" }, val, h("button", { class: "linkbtn danger", onclick: async () => { try { await S.db.doc("inscriptions/" + uid).delete(); } catch (e) { m.textContent = "Échec : réessaie."; } } }, "Refuser")), m));
  }
  for (const [uid, x] of pend.filter(([, x]) => x.role !== "adjoint")) {
    const m = h("span", { class: "note" });
    const sel = h("select", { id: "acc-link-" + uid, "aria-label": "Fiche à relier" }, h("option", { value: "" }, free.length ? "Choisir sa fiche…" : "Aucune fiche libre"),
      ["U19", "U10", "GB"].map(g => { const l = free.filter(([, f]) => groupOf(f) === g); return l.length ? h("optgroup", { label: GROUPS[g].label }, l.map(([fid, f]) => h("option", { value: fid }, f.nom || "Sans nom"))) : null; }));
    sel.value = guessFiche(x.nom, x.groupe) || guessFiche(x.nom);
    const lb = h("button", { class: "btn small" }, "Relier");
    lb.onclick = async () => {
      const fid = sel.value; if (!fid) { m.className = "err"; m.textContent = "Choisis sa fiche."; return; }
      lb.disabled = true; m.className = "note"; m.textContent = "Liaison…";
      try { const d = await linkAccount(fid, uid); S.flash = `${d.nom} est relié à son compte : il voit maintenant sa fiche et son équipe.`; render(); }
      catch (e) { lb.disabled = false; m.className = "err"; m.textContent = e && e.message === "exists" ? "Ce compte a déjà une fiche." : "Échec : réessaie."; }
    };
    let armed = false;
    const cb = h("button", { class: "linkbtn" }, "C'est un adjoint ?");
    cb.onclick = async () => {
      if (!armed) { armed = true; cb.className = "btn ghost small"; cb.textContent = `Confirmer : donner l'accès coach à ${x.nom || "ce compte"}`; return; }
      try { await S.db.doc("coachs/" + uid).set({ nom: x.nom || "", email: x.email || "", at: new Date().toISOString() }); await S.db.doc("inscriptions/" + uid).delete(); } catch (e) { m.textContent = "Échec : réessaie."; }
    };
    let armedU = false;
    const cu = h("button", { class: "linkbtn" }, "Adjoint U19 uniquement");
    cu.onclick = async () => {
      if (!armedU) { armedU = true; cu.className = "btn ghost small"; cu.textContent = `Confirmer : ${x.nom || "ce compte"} adjoint U19 (fiches et équipe U19, notes à 1/3)`; return; }
      try { await S.db.doc("coachs/" + uid).set({ nom: x.nom || "", email: x.email || "", at: new Date().toISOString(), groupes: ["U19"] }); await S.db.doc("inscriptions/" + uid).delete(); } catch (e) { m.textContent = "Échec : réessaie."; }
    };
    pc.append(h("div", { class: "hitem" },
      h("div", { class: "hhead" }, h("span", { class: "row", style: "gap:8px;align-items:center;flex-wrap:nowrap" }, avatarNode(uid, x.nom, "av-mini"), h("strong", {}, x.nom || "Sans nom"), x.groupe ? h("span", { class: "pill" }, [GROUPS[x.groupe] ? (x.groupe === "U10" ? "Parent U10" : GROUPS[x.groupe].label) : x.groupe, x.poste && x.groupe === "U19" ? x.poste : ""].filter(Boolean).join(" · ")) : null), h("span", { class: "note" }, x.email || "")),
      h("div", { class: "row", style: "align-items:center" }, h("label", { class: "field", style: "flex:1;min-width:200px" }, sel), lb),
      h("div", { class: "row", style: "align-items:center;justify-content:space-between" }, h("span", { class: "row", style: "gap:12px" }, cb, cu), h("button", { class: "linkbtn danger", onclick: async () => { try { await S.db.doc("inscriptions/" + uid).delete(); } catch (e) { m.textContent = "Échec : réessaie."; } } }, "Refuser")), m));
  }
  const cc = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Coachs"), h("p", { class: "note", style: "margin:0" }, "Accès complet : toutes les fiches. Adjoint U19 : fiches et équipe U19 seulement, ses notes comptent pour 1/3 de la note finale (les tiennes 2/3)."));
  for (const [uid, x] of Object.entries(S.coachs)) {
    const m = h("span", { class: "note" }), lim = Array.isArray(x.groupes) && x.groupes.length;
    const tog = uid === S.me ? null : h("button", { class: "linkbtn", onclick: async () => { try { const d = { nom: x.nom || "", email: x.email || "", at: x.at || new Date().toISOString() }; if (!lim) d.groupes = ["U19"]; await S.db.doc("coachs/" + uid).set(d); } catch (e) { m.textContent = "Échec : réessaie."; } } }, lim ? "Donner l'accès complet" : "Limiter aux U19");
    cc.append(h("div", { class: "hitem" }, h("div", { class: "hhead" }, h("strong", {}, x.nom || x.email || "Coach"), h("span", { class: "pill" }, lim ? `Adjoint ${x.groupes.map(g => (GROUPS[g] || {}).label || g).join(", ")}` : "Accès complet"), h("span", { class: "note" }, x.email || "")), tog,
      uid === S.me ? h("span", { class: "note" }, "C'est toi") : h("button", { class: "linkbtn danger", onclick: async () => { try { await S.db.doc("coachs/" + uid).delete(); } catch (e) { m.textContent = "Échec : réessaie."; } } }, "Retirer l'accès coach"), m));
  }
  const imp = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Importer des données"), h("p", { class: "note", style: "margin:0" }, "Fichier JSON préparé par Jarvis. Les fiches qui existent déjà ne sont pas écrasées."));
  const fi = h("input", { type: "file", id: "import-file", accept: ".json,application/json" });
  const im = h("p", { class: "note", style: "margin:0" });
  fi.onchange = async () => {
    const f = fi.files && fi.files[0]; if (!f) return;
    im.className = "note"; im.textContent = "Import en cours…";
    try {
      const data = JSON.parse(await f.text()); let n = 0, skip = 0;
      for (const [id, d] of Object.entries(data.fiches || {})) { const ref = S.db.doc("fiches/" + id); if ((await ref.get()).exists) { skip++; continue; } await ref.set(d); n++; }
      for (const [col, docs] of Object.entries({ championnat: data.championnat || {}, equipe: data.equipe || {} })) for (const [id, d] of Object.entries(docs)) { await S.db.doc(col + "/" + id).set(d); n++; }
      im.className = "ok"; im.textContent = `${n} élément${n > 1 ? "s" : ""} importé${n > 1 ? "s" : ""}${skip ? `, ${skip} fiche${skip > 1 ? "s" : ""} déjà présente${skip > 1 ? "s" : ""}` : ""}.`;
    } catch (e) { im.className = "err"; im.textContent = "Échec de l'import : " + (e && e.message ? e.message : "fichier illisible"); }
  };
  imp.append(fi, im);
  box.append(pc, cc, imp);
  return box;
}

const POSTES_433 = [["Gardien", 50, 90], ["Latéral droit", 85, 70], ["Défenseur central", 62, 76], ["Défenseur central", 38, 76], ["Latéral gauche", 15, 70], ["Milieu défensif", 50, 58], ["Milieu central", 72, 45], ["Milieu central", 28, 45], ["Ailier droit", 82, 21], ["Attaquant", 50, 14], ["Ailier gauche", 18, 21]];
const ABR_P = { "Gardien": "GB", "Latéral droit": "DD", "Défenseur central": "DC", "Latéral gauche": "DG", "Milieu défensif": "MDC", "Milieu central": "MC", "Ailier droit": "AD", "Attaquant": "BU", "Ailier gauche": "AG" };
function postePicker(cur, onPick) {
  const pitch = h("div", { class: "pitch pick", role: "group", "aria-label": "Choisis ton poste" });
  pitch.innerHTML = `<svg viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(205,189,143,.35)" stroke-width=".4"><rect x="2" y="2" width="64" height="96"/><line x1="2" y1="50" x2="66" y2="50"/><circle cx="34" cy="50" r="8"/><rect x="16" y="2" width="36" height="15"/><rect x="16" y="83" width="36" height="15"/></g></svg>`;
  const btns = [];
  const paint = v => btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === v)));
  POSTES_433.forEach(([lab, x, y]) => {
    const b = h("button", { type: "button", class: "pk", "data-p": lab, style: `left:${x}%;top:${y}%`, "aria-label": lab, onclick: () => { paint(lab); onPick(lab); } }, h("span", { class: "pk-a" }, ABR_P[lab]), h("span", { class: "pk-l" }, lab));
    btns.push(b); pitch.append(b);
  });
  paint(cur);
  return pitch;
}

