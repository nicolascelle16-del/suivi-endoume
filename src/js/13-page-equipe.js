/* ---------- page équipe ---------- */
async function writeEquipe(g, patch) {
  if (S.demo) { S.equipes[g] = { ...(S.equipes[g] || {}), ...patch }; return; }
  const ref = S.db.doc("equipe/" + g);
  if (S.equipes[g]) await ref.update(patch); else await ref.set(patch);
  S.equipes[g] = { ...(S.equipes[g] || {}), ...patch };
}
function equipeView(g, asCoach) {
  const G = GROUPS[g], eq = S.equipes[g] || {}, box = h("div", { class: "stack" });
  const M = "match";
  const players = Object.entries(S.fiches).filter(([, f]) => groupOf(f) === g).sort((a, b) => (a[1].nom || "").localeCompare(b[1].nom || "", "fr"));
  const saveBtn = (label, fn) => { const m = h("span", { class: "note" }); const b = h("button", { class: "btn small" }, label);
    b.onclick = async () => { b.disabled = true; try { await fn(); m.textContent = "Enregistré."; render(); } catch (e) { m.textContent = "Échec : réessaie."; } b.disabled = false; }; return h("div", { class: "row" }, b, m); };

  // objectif collectif
  const obj = h("div", { class: "card" }, h("h3", {}, "Objectif collectif du match"));
  if (eq.objectif) obj.append(h("div", { class: "hero-eq" }, eq.objectif)); else obj.append(h("p", { class: "note" }, "Pas encore d'objectif collectif pour le match."));
  if (asCoach) { const t = h("input", { id: "eq-obj-" + g, maxlength: "160", placeholder: "Ex. plus de 4 passes avant de frapper, 6 fois par match" }); t.value = eq.objectif || "";
    obj.append(h("div", { class: "stack", style: "margin-top:10px" }, h("label", { class: "field" }, "Modifier l'objectif", t), saveBtn("Enregistrer", () => writeEquipe(g, { objectif: t.value.trim().slice(0, 160) })))); }


  // homme du match / joueur du mois
  const hommes = (eq.hommes || []).slice().sort((a, b) => a.date < b.date ? 1 : -1);
  const hm = h("div", { class: "card" }, h("h3", {}, g === "U10" ? "Joueur du match" : "Homme du match"));
  if (hommes.length) hm.append(h("div", { class: "hero-eq" }, hommes[0].nom), h("p", { class: "note" }, `${M[0].toUpperCase() + M.slice(1)} du ${fmtLong(hommes[0].date)}`),
    hommes.length > 1 ? h("p", { class: "note" }, "Avant : " + hommes.slice(1, 5).map(x => `${x.nom} (${fmtDate(x.date)})`).join(", ")) : "");
  else hm.append(h("p", { class: "note" }, `Personne encore désigné.`));
  const jm = h("div", { class: "card" }, h("h3", {}, "Joueur du mois"));
  if (eq.mois && eq.mois.nom) jm.append(h("div", { class: "hero-eq" }, eq.mois.nom), h("p", { class: "note" }, eq.mois.label || "")); else jm.append(h("p", { class: "note" }, "Pas encore désigné."));
  if (asCoach && players.length) {
    const sel = h("select", { id: "eq-hm-" + g }, players.map(([fid, f]) => h("option", { value: fid }, f.nom)));
    const dt = h("input", { type: "date", id: "eq-hmd-" + g, value: today() });
    hm.append(h("div", { class: "row", style: "margin-top:10px" }, h("label", { class: "field" }, "Joueur", sel), h("label", { class: "field" }, "Date", dt)),
      saveBtn("Désigner", () => writeEquipe(g, { hommes: [...(eq.hommes || []), { date: dt.value || today(), fid: sel.value, nom: S.fiches[sel.value].nom }] })));
    const sel2 = h("select", { id: "eq-jm-" + g }, players.map(([fid, f]) => h("option", { value: fid }, f.nom)));
    const lab = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    jm.append(h("div", { class: "row", style: "margin-top:10px" }, h("label", { class: "field" }, "Joueur", sel2)),
      saveBtn(`Désigner pour ${lab}`, () => writeEquipe(g, { mois: { fid: sel2.value, nom: S.fiches[sel2.value].nom, label: lab } })));
  }

  // --- présentation compacte : résumé en tuiles + sections repliables ---
  const ouv = S.eqOpen || (S.eqOpen = {});
  const fold = (key, titre, sous, card, defaut) => {
    const k = g + ":" + key, d = h("details", { class: "eq-sec", id: "eqs-" + k.replace(/[^a-z0-9]/gi, ""), open: (k in ouv ? ouv[k] : !!defaut) || null });
    const t = card.querySelector(":scope > h3"); if (t) t.remove();
    card.classList.add("eq-in");
    d.append(h("summary", {}, h("span", { class: "eq-t" }, titre), sous ? h("span", { class: "eq-s" }, sous) : null), card);
    d.addEventListener("toggle", () => { ouv[k] = d.open; });
    return d;
  };
  const ouvrir = key => { ouv[g + ":" + key] = true; render(); setTimeout(() => { const el = document.getElementById("eqs-" + (g + ":" + key).replace(/[^a-z0-9]/gi, "")); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); };
  const tuile = (lab, val, sub, key, chaud, extra) => h("button", { type: "button", class: "eq-tile" + (chaud ? " chaud" : "") + (extra ? " t-" + extra : ""), onclick: key ? () => ouvrir(key) : null },
    h("span", { class: "eq-tl" }, lab), h("span", { class: "eq-tv" }, val), sub ? h("span", { class: "eq-ts" }, sub) : null);
  const tiles = h("div", { class: "eq-tiles" });
  let champ = null, contre = "";
  if (g === "U19") {
    champ = champView();
    const c = S.champ;
    if (c && Array.isArray(c.classement)) {
      const ME = c.equipe || "USM ENDOUME CATALANS", short = t => (c.noms && c.noms[t]) || t;
      const next = (c.matchs || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).find(m => !m.score);
      const moi = c.classement.find(x => x.t === ME);
      if (next) { const dom = next.h === ME, opp = dom ? next.a : next.h, r = c.classement.find(x => x.t === opp); contre = short(opp);
        tiles.append(tuile("Prochain match", short(opp), `${fmtDate(next.date)}${next.heure ? " · " + next.heure : ""} · ${dom ? "dom." : "ext."}${r ? ` · adv. ${r.rang === 1 ? "1er" : r.rang + "e"}` : ""}`, "cal", true)); }
      if (moi) tiles.append(tuile("Classement", moi.rang === 1 ? "1er" : `${moi.rang}e`, `${moi.pts} pts · ${moi.v}V ${moi.n}N ${moi.d}D`, "cl"));
    }
  }
  const vOuv = Object.values(S.votes || {}).filter(v => v && v.groupe === g && v.ouvert);
  const aVoter = !asCoach && votesOuverts().length > 0;
  if (g !== "U10" && vOuv.length) tiles.append(tuile("Vote", aVoter ? "À toi de voter" : "Vote ouvert", vOuv.map(v => v.titre || voteLabel(v.type, g)).join(", "), "votes", true));
  if (eq.objectif) tiles.append(tuile("Objectif du match", eq.objectif, contre ? "contre " + contre : null, "obj", false, "obj"));
  else if (asCoach) tiles.append(tuile("Objectif du match", "À fixer", contre ? "contre " + contre : null, "obj"));

  tiles.append(tuile("Joueur du mois", eq.mois && eq.mois.nom ? eq.mois.nom : "–", eq.mois && eq.mois.label ? eq.mois.label : "pas encore désigné", asCoach ? "jm" : null));
  box.append(tiles);
  // les deux hommes du match : choix du coach et élu par les joueurs
  const parentG = !!G.parent, choixC = hommes.find(x => !x.titre), choixV = hommes.find(x => x.titre);
  const hdms = [];
  if (choixC) hdms.push({ e: choixC, lab: "Choix du coach" });
  if (choixV) { const same = choixC && choixC.fid === choixV.fid && choixC.date === choixV.date; if (same) hdms[0].lab = "Choix du coach et des joueurs"; else hdms.push({ e: choixV, lab: "Élu par les joueurs" }); }
  if (hdms.length) {
    // carte « vitrine » : identité seulement, aucune note
    const live = e => { const f = S.fiches[e.fid]; if (!f) return null; const d = fcardData(f, parentG); return { nom: d.nom, pos: d.pos, grp: d.grp, poste: d.poste }; };
    if (asCoach && !S.demo && (!S.scope || S.scope.includes(g))) {
      const maj = (eq.hommes || []).map(x => { if (!hdms.some(o => o.e === x)) return x; const c = live(x); return c && stable(c) !== stable(x.carte || null) ? { ...x, carte: c } : x; });
      const cle = g + stable(maj);
      if (maj.some((x, i) => x !== (eq.hommes || [])[i]) && S.carteSync !== cle) { S.carteSync = cle; writeEquipe(g, { hommes: maj }).catch(() => {}); }
    }
    const zone = h("div", { class: "hdm-cards" + (hdms.length === 1 ? " seul" : "") });
    for (const { e, lab } of hdms) {
      watchAvatar(e.fid);
      const c = (asCoach && live(e)) || e.carte || { nom: e.nom };
      const d = { vitrine: true, nom: c.nom || e.nom, pos: c.pos || "", grp: c.grp || "", poste: c.poste || "", titre: g === "U10" ? "Joueur du match" : "Homme du match", lab, date: fmtDate(e.date) };
      zone.append(h("div", { class: "hdm-c" }, fcardDraw(d, e.fid, "mini"), e.titre ? h("div", { class: "hdm-l" }, h("span", {}, e.titre)) : null));
    }
    box.append(h("div", { class: "card hdm-box" }, h("h3", {}, g === "U10" ? "Joueur du match" : "Hommes du match"), zone));
  }
  if (champ) {
    const cl = champ.querySelector('[data-k="cl"]'), cal = champ.querySelector('[data-k="cal"]');
    if (cl) box.append(fold("cl", "Classement", null, cl));
    if (cal) box.append(fold("cal", "Calendrier et résultats", null, cal));
    if (!cl && !cal) box.append(champ);
  }
  if (g === "U19") { const compos = (eq.compos || []); if (asCoach || compos.length) box.append(fold("compos", "Compositions de match", compos.length ? `${compos.length} publiée${compos.length > 1 ? "s" : ""}` : "aucune", composCard(g, asCoach), asCoach && !!S.compoDraft[g])); }
  if (g !== "U10" && (asCoach || Object.values(S.votes || {}).some(v => v && v.groupe === g))) box.append(fold("votes", "Votes des joueurs", vOuv.length ? "vote en cours" : "aucun vote en cours", votesCard(g, asCoach), aVoter));
  { const an = Array.isArray(eq.analyses) ? eq.analyses.length : 0; if (asCoach || an) box.append(fold("ana", "Analyses de match", an ? `${an} publiée${an > 1 ? "s" : ""}` : "aucune", analysesCard(g, asCoach), !!(S.anaEdit && S.anaEdit.g === g))); }
  if (asCoach || eq.objectif) box.append(fold("obj", "Objectif collectif du match", eq.objectif ? null : "pas encore fixé", obj));
  if (asCoach || hommes.length > 1) box.append(fold("hm", g === "U10" ? "Joueur du match" : "Homme du match", hommes.length ? "historique" + (asCoach ? " et désignation" : "") : null, hm));
  if (asCoach) box.append(fold("jm", "Joueur du mois", asCoach ? "désignation" : null, jm));

  return box;
}

