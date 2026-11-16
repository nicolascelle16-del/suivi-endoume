/* ---------- fiche détaillée (joueur, parent ou coach) ---------- */
function ficheView(fid, f, asCoach) {
  const g = groupOf(f), G = GROUPS[g], notes = sortedNotes(f), parent = G.parent && !asCoach;
  const wrap = h("div", { class: "stack" });
  const title = parent ? `Suivi de ${f.nom || "votre enfant"}` : (f.nom || "Joueur");
  wrap.append(h("div", { class: "bar" },
    h("div", {}, h("h2", {}, title), h("div", { class: "pmeta" }, [G.label, f.age, f.sousCat, f.poste].filter(Boolean).join(" · "), " · ", `${notes.length} évaluation${notes.length > 1 ? "s" : ""}`)),
    asCoach ? h("button", { class: "btn ghost small", onclick: () => { S.view = "list"; S.sel = null; render(); } }, "← Retour à la liste") : null));

  // carte, records, mot du coach
  const side = h("div", { class: "stack" });
  for (const r of records(f, parent)) side.append(h("div", { class: "record" }, r));
  if (asCoach && !S.scope) {
    const mt = h("input", { id: "mot-" + fid, maxlength: "160", placeholder: "Un mot personnel, épinglé en haut de sa fiche" }); mt.value = f.mot || "";
    const mm = h("span", { class: "note" });
    side.append(h("div", { class: "card" }, h("h3", {}, "Mot du coach"), h("label", { class: "field" }, mt), h("div", { class: "row", style: "margin-top:8px" },
      h("button", { class: "btn small", onclick: async () => { const v = mt.value.trim().slice(0, 160); try { await writeFiche(fid, { mot: v }); mm.textContent = "Mot enregistré."; } catch (e) { mm.textContent = "Échec : réessaie."; } } }, "Épingler"), mm)));
  } else if (f.mot) side.append(h("div", { class: "card" }, h("h3", {}, "Le mot du coach"), h("div", { class: "mot" }, f.mot)));
  if (!asCoach) { const dc = [...notes].reverse().find(n => n.com && n.com.trim());
    if (dc) side.prepend(h("div", { class: "card com-coach" }, h("div", { class: "eq-tl" }, parent ? "Le mot du coach sur la dernière séance" : "Ce que le coach a écrit"),
      h("blockquote", {}, dc.com), h("small", {}, `${dc.type === "Match" ? "Match" : "Entraînement"} du ${fmtLong(dc.date)}`))); }
  side.append(h("div", { class: "card" }, h("h3", {}, "Badges"), badgesBox(fid, f, asCoach)));
  wrap.append(h("div", { class: "top-fiche" }, h("div", { class: "stack", style: "align-items:center" }, fcard(f, parent, fid),
    !asCoach && fid === S.me && !S.demo ? h("button", { class: "btn ghost small", onclick: () => { S.avEdit = !S.avEdit; S.avDraft = null; render(); } }, S.avEdit ? "Fermer" : (S.avatars[fid] ? "Modifier mon avatar" : "Créer mon avatar")) : null), side));
  if (!asCoach && fid === S.me && S.avEdit && !S.demo) {
    const m = h("span", { class: "note" });
    wrap.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Mon avatar"), avatarEditor(S.avDraft || S.avatars[fid], a => { S.avDraft = a; }),
      h("div", { class: "row" }, h("button", { class: "btn small", onclick: async () => { try { await saveAvatar(S.me, S.avDraft || S.avatars[fid]); S.avEdit = false; S.avDraft = null; render(); } catch (e) { m.textContent = "Échec : réessaie."; } } }, "Enregistrer sur ma carte"), m)));
  }

  if (asCoach && isTemp(fid)) {
    const pend = Object.entries(S.inscriptions).filter(([uid]) => !S.fiches[uid] && !S.coachs[uid]);
    const sel = h("select", { id: "link-" + fid }, h("option", { value: "" }, pend.length ? "Choisir le compte du joueur" : "Aucun compte en attente"), pend.map(([uid, x]) => h("option", { value: uid }, `${x.nom || "Sans nom"}${x.email ? " · " + x.email : ""}`)));
    const lm = h("span", { class: "note" });
    const lb = h("button", { class: "btn small", disabled: !pend.length }, "Relier ce compte");
    lb.onclick = async () => {
      const c = sel.value; if (!c) { lm.className = "err"; lm.textContent = "Choisis un compte."; return; }
      lb.disabled = true; lm.className = "note"; lm.textContent = "Liaison…";
      try {
        const data = await linkAccount(fid, c);
        S.sel = c; S.flash = `${data.nom} est relié à son compte.`; render();
      } catch (e) { lb.disabled = false; lm.className = "err"; lm.textContent = e && e.message === "exists" ? "Ce compte a déjà une fiche." : "Échec : réessaie."; }
    };
    wrap.append(h("div", { class: "card" }, h("h3", {}, "Relier au compte du joueur"),
      h("p", { class: "note", style: "margin:0 0 8px" }, "Le joueur crée son compte sur ce site, puis il apparaît dans cette liste. Ses notes et badges sont gardés lors de la liaison."),
      h("label", { class: "field" }, sel), h("div", { class: "row", style: "margin-top:8px" }, lb, lm)));
  }
  if (asCoach && !S.scope && !isTemp(fid) && !f.exemple && !S.demo) wrap.append(compteCard(fid, f));
  // objectif individuel : U19 uniquement, choisi par le joueur
  if (g === "U19") wrap.append(objectifCard(fid, f, asCoach));

  if (f._masque && !asCoach) wrap.append(h("div", { class: "regle-auto" }, h("b", {}, "🔒 Ta note est bloquée"), h("span", {}, "Pas d'auto-évaluation = pas de note."), h("span", {}, "Fais-la juste en dessous pour la débloquer.")));
  if (!notes.length) { watchAutos(fid); wrap.append(h("div", { class: "empty" }, f._masque ? "Tes notes apparaîtront ici après ton auto-évaluation." : "Aucune évaluation du coach pour l'instant."), (g === "U10" && !asCoach) ? null : autoCard(fid, f, asCoach)); return wrap; }

  // moyennes par critère
  const hasMatch = notes.some(n => n.type === "Match");
  const bars = h("div", { class: "bars" });
  const barRow = (k, lab, a, cls) => parent
    ? [h("div", { class: "barline" }, critLabel(k, lab), h("div", { class: "track" }, h("div", { class: "fill" + (cls || ""), style: `width:${a ? a / 5 * 100 : 0}%` })), h("span", { class: "val", style: "width:auto" }, "")),
       h("div", { class: "pmeta", style: "margin:-6px 0 2px" }, a == null ? "–" : LEVELS[Math.round(a)])]
    : [h("div", { class: "barline" }, critLabel(k, lab), h("div", { class: "track" }, h("div", { class: "fill" + (cls || ""), style: `width:${a ? a / 5 * 100 : 0}%` })), h("span", { class: "val" }, n1(a)))];
  const anciennes = GRILLES[g] ? notes.filter(n => isOldNote(n, g)) : [], nouvelles = GRILLES[g] ? notes.filter(n => !isOldNote(n, g)) : [];
  if (GRILLES[g]) {
    const ne = nouvelles.filter(n => n.type !== "Match"), nm = nouvelles.filter(n => n.type === "Match");
    bars.append(h("div", { class: "bars-t" }, "À l'entraînement"));
    if (ne.length) for (const [k, lab] of GRILLES[g].E) bars.append(...barRow(k, lab, critAvg(ne, k)));
    else bars.append(h("p", { class: "note", style: "margin:0" }, "Pas encore d'entraînement noté avec cette grille."));
    bars.append(h("div", { class: "bars-t" }, "En match"));
    if (nm.length) for (const [k, lab] of mGrid(g, f)) bars.append(...barRow(k, lab, critAvg(nm, k), " m"));
    else bars.append(h("p", { class: "note", style: "margin:0" }, "Pas encore de match noté avec cette grille."));
    if (anciennes.length) {
      bars.append(h("div", { class: "bars-t" }, `Ancienne grille (${anciennes.length} évaluation${anciennes.length > 1 ? "s" : ""})`));
      for (const [k, lab] of G.crit) bars.append(...barRow(k, lab, critAvg(anciennes, k)));
    }
  } else for (const [k, lab] of G.crit) {
    const e = critAvg(notes, k, "Entraînement"), m = critAvg(notes, k, "Match"), a = critAvg(notes, k);
    if (parent) {
      const lv = a == null ? "–" : LEVELS[Math.round(a)];
      bars.append(h("div", { class: "barline" }, h("span", {}, lab), h("div", { class: "track" }, h("div", { class: "fill", style: `width:${a ? a / 5 * 100 : 0}%` })), h("span", { class: "val", style: "width:auto" }, "")),
        h("div", { class: "pmeta", style: "margin:-6px 0 2px" }, lv));
    } else {
      bars.append(h("div", { class: "barline" }, h("span", {}, lab), h("div", { class: "track" }, h("div", { class: "fill", style: `width:${e ? e / 5 * 100 : 0}%` })), h("span", { class: "val" }, n1(e))));
      if (hasMatch) bars.append(h("div", { class: "barline" }, h("span", {}, ""), h("div", { class: "track" }, h("div", { class: "fill m", style: `width:${m ? m / 5 * 100 : 0}%` })), h("span", { class: "val" }, n1(m))));
    }
  }
  const moy = h("div", { class: "card" }, h("h3", {}, parent ? "Où il en est" : "Moyenne par critère, sur 5"));
  if (GRILLES[g]) moy.append(h("p", { class: "note", style: "margin:0 0 6px" }, "Touche un critère pour voir ce qu'il veut dire."));
  if (!parent && hasMatch && !GRILLES[g]) moy.append(h("div", { class: "legend" }, h("span", {}, h("span", { class: "dot", style: "background:var(--rouge)" }), "Entraînement"), h("span", {}, h("span", { class: "dot", style: "background:#b08c40" }), "Match")));
  moy.append(bars);

  const evo = h("div", { class: "card" }, h("h3", {}, "Évolution"), parent ? null : h("div", { class: "legend" }, h("span", {}, h("span", { class: "dot", style: "background:var(--rouge)" }), "Entraînement"), h("span", {}, h("span", { class: "dot", style: "background:#b08c40" }), "Match")), chart(f));
  watchAutos(fid);
  wrap.append(profilCard(fid, f, parent, asCoach));
  wrap.append(h("div", { class: "two" }, moy, evo));
  wrap.append(saisonCard(fid, f, parent));

  if (!(g === "U10" && !asCoach)) wrap.append(autoCard(fid, f, asCoach)); // U10 : auto-évaluation faite en fin de mois avec le coach
  // historique
  const hist = h("div", { class: "hist" });
  for (const n of [...notes].reverse()) {
    const chips = h("div", { class: "chips" });
    for (const [k, lab] of critsForNote(n, g)) {
      const v = n.crit && n.crit[k];
      if (typeof v !== "number") continue;
      chips.append(h("span", { class: "chip" }, `${lab} `, h("b", {}, parent ? LEVELS[Math.round(v)] : `${String(v).replace(".", ",")}/5`)));
    }
    if (asCoach && n.detail) {
      const moy = c => { const v = critsForNote(n, g).map(x => c && c[x[0]]).filter(x => typeof x === "number"); return v.length ? n1(mean(v)) : "–"; };
      chips.append(h("span", { class: "chip", style: "border-style:dashed" }, n.detail.coach ? `Coach ${moy(n.detail.coach)} · ` : "", n.detail.adj.map(a => `${a.nom} ${moy(a.crit)}`).join(" · "), h("b", {}, n.detail.coach ? " (2/3 – 1/3)" : "")));
    }
    const stt = n.stats || {};
    if (typeof stt.min === "number") chips.append(h("span", { class: "chip" }, "Temps de jeu ", h("b", {}, `${stt.min} min`)));
    if (typeof stt.buts === "number" && stt.buts) chips.append(h("span", { class: "chip" }, "Buts ", h("b", {}, String(stt.buts))));
    if (typeof stt.pd === "number" && stt.pd) chips.append(h("span", { class: "chip" }, "Passes déc. ", h("b", {}, String(stt.pd))));
    if (typeof stt.be === "number") chips.append(h("span", { class: "chip" + (stt.be === 0 ? " ok" : "") }, stt.be === 0 ? "Clean sheet" : "Buts encaissés ", stt.be === 0 ? null : h("b", {}, String(stt.be))));
    if (n.theme && (n.theme.phase || n.theme.principe)) chips.append(h("span", { class: "chip theme" }, "Thème ", h("b", {}, [n.theme.phase, n.theme.principe].filter(Boolean).join(" · "))));
    let item;
    if (asCoach) {
      const av = noteAvg(n, g), cls = av == null ? "" : av >= 4 ? "hi" : av < 3 ? "lo" : "mid";
      const qui = n.detail ? [n.detail.coach ? "Nico" : null, ...n.detail.adj.map(x => x.nom)].filter(Boolean).join(" + ") : (n.parNom || "");
      item = h("details", { class: "hitem hnote", open: hist.children.length === 0 || null },
        h("summary", {}, h("span", { class: "hn-d" }, fmtDate(n.date)), h("span", { class: "pill" + (n.type === "Match" ? " match" : "") }, n.type === "Match" ? "Match" : "Entr."),
          h("span", { class: "hn-avg " + cls }, av == null ? "–" : n1(av)), h("span", { class: "hn-q" }, [qui, n.com ? "💬" : "", isOldNote(n, g) ? "ancienne grille" : ""].filter(Boolean).join(" · "))),
        chips, n.com ? h("div", { class: "com-text" }, n.com) : null);
    } else item = h("div", { class: "hitem" },
      h("div", { class: "hhead" }, h("strong", {}, fmtLong(n.date)), h("span", { class: "pill" + (n.type === "Match" ? " match" : "") }, n.type === "Match" ? "Match" : "Entraînement"), isOldNote(n, g) ? h("span", { class: "pill" }, "Ancienne grille") : null),
      chips, n.com ? h("div", { class: "com-text" }, n.com) : null);
    if (asCoach && !S.scope) {
      const del = h("button", { class: "linkbtn danger" }, "Supprimer cette évaluation");
      del.onclick = async () => {
        if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmer la suppression"; return; }
        try { await writeFiche(fid, { notes: rawNotes(f).filter(x => x.id !== n.id), notesAdj: adjNotes(f).filter(x => !(x.date === n.date && x.type === n.type)) }); } catch (e) { del.textContent = "Échec : réessaie"; }
      };
      item.append(del);
    }
    hist.append(item);
  }
  wrap.append(h("div", { class: "card" }, h("h3", {}, "Historique"), hist));

  if (asCoach && !S.scope) {
    const rm = h("button", { class: "linkbtn danger" }, "Supprimer cette fiche");
    rm.onclick = async () => {
      if (rm.dataset.c !== "1") { rm.dataset.c = "1"; rm.textContent = "Confirmer : la fiche et toutes ses notes seront effacées"; return; }
      try { if (S.demo) delete S.fiches[fid]; else await S.db.doc("fiches/" + fid).delete(); S.view = "list"; S.sel = null; render(); } catch (e) { rm.textContent = "Échec : réessaie"; }
    };
    wrap.append(rm);
  }
  return wrap;
}

/* mails : script Google (Gmail du coach) — la base vérifie qui demande l'envoi */
const MAIL_URL = "https://script.google.com/macros/s/AKfycbzO4Vca4Ct1Kf0zxi1Qatc9O29sydcE-HNn6qQW5SlD-NjoDcJ1S5drjjEE_nPn1CbH/exec";
async function envoyerMails(kind, fids, extra) {
  if (!MAIL_URL || S.demo || !fids.length || !auth.currentUser) return null;
  try {
    const token = await auth.currentUser.getIdToken();
    const r = await fetch(MAIL_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token, kind, fids: fids.slice(0, 40), ...(extra || {}) }) });
    return await r.json();
  } catch (e) { return null; }
}
async function writeFiche(fid, patch) {
  if (S.demo) { S.fiches[fid] = { ...S.fiches[fid], ...patch }; render(); return; }
  await ecrireFiche(fid, patch);
}

