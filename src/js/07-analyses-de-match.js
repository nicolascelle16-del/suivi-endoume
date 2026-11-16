/* ---------- analyses de match ---------- */
function analysesCard(g, asCoach) {
  const eq = S.equipes[g] || {}, list = (Array.isArray(eq.analyses) ? eq.analyses : []).slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Analyses de match"));
  if (asCoach) {
    const st = S.anaEdit && S.anaEdit.g === g ? S.anaEdit : { g, id: null, date: today(), titre: "", texte: "" };
    const date = h("input", { type: "date", id: "ana-d-" + g, value: st.date });
    const titre = h("input", { id: "ana-t-" + g, maxlength: "80", placeholder: "Ex. J7 · Endoume – Simiane, 2-1" }); titre.value = st.titre;
    const fields = [h("label", { class: "field" }, "Date du match", date)];
    if (g === "U19" && S.champ && Array.isArray(S.champ.matchs)) {
      const ME = S.champ.equipe, sh = t => (S.champ.noms && S.champ.noms[t]) || t;
      const ms = S.champ.matchs.slice().sort((a, b) => a.j - b.j);
      const sel = h("select", { id: "ana-m-" + g }, h("option", { value: "" }, "Choisir un match de la saison (J1 à J22)"), ms.map((m, i) => h("option", { value: String(i) }, `J${m.j} · ${sh(m.h)} – ${sh(m.a)}${m.score ? " " + m.score.join("-") : ""}`)));
      sel.onchange = () => { const m = ms[+sel.value]; if (!m) return; date.value = m.date; titre.value = `J${m.j} · ${sh(m.h)} – ${sh(m.a)}${m.score ? ", " + m.score.join("-") : ""}`; };
      fields.push(h("label", { class: "field", style: "flex:1;min-width:220px" }, "Match", sel));
    }
    const ta = h("textarea", { id: "ana-x-" + g, rows: "10", maxlength: "8000", placeholder: "Ton analyse du match : ce qui s'est passé, pourquoi, ce que tu en retiens, ce que tu changes…" }); ta.value = st.texte;
    const msg = h("span", { class: "note" });
    const save = h("button", { class: "btn small" }, st.id ? "Enregistrer les modifications" : "Publier l'analyse");
    save.onclick = async () => {
      const x = ta.value.trim(), t = titre.value.trim();
      if (!x) { msg.className = "err"; msg.textContent = "Écris l'analyse avant de l'enregistrer."; return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) { msg.className = "err"; msg.textContent = "Choisis la date du match."; return; }
      save.disabled = true;
      const item = { id: st.id || nid(), date: date.value, titre: t.slice(0, 80) || `Match du ${fmtDate(date.value)}`, texte: x.slice(0, 8000), at: new Date().toISOString() };
      const next = [...(eq.analyses || []).filter(a => a.id !== item.id), item];
      try { await writeEquipe(g, { analyses: next }); S.anaEdit = null; render(); }
      catch (e) { save.disabled = false; msg.className = "err"; msg.textContent = "Échec de l'enregistrement : réessaie."; }
    };
    const cancel = st.id ? h("button", { class: "btn ghost small", onclick: () => { S.anaEdit = null; render(); } }, "Annuler") : null;
    card.append(h("div", { class: "row" }, fields), h("label", { class: "field" }, "Titre", titre), h("label", { class: "field" }, "Analyse", ta), h("div", { class: "row" }, save, cancel, msg),
      h("p", { class: "note", style: "margin:0" }, "Les joueurs du groupe peuvent lire les analyses publiées."));
  }
  if (!list.length) card.append(h("p", { class: "note", style: "margin:0" }, "Aucune analyse publiée pour l'instant."));
  for (const a of list) {
    const item = h("div", { class: "hitem" }, h("div", { class: "hhead" }, h("strong", {}, a.titre || "Match"), h("span", { class: "pill" }, fmtLong(a.date))),
      h("div", { class: "com-text", style: "white-space:pre-wrap" }, a.texte || ""));
    if (asCoach) {
      const del = h("button", { class: "linkbtn danger" }, "Supprimer");
      del.onclick = async () => {
        if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmer la suppression"; return; }
        try { await writeEquipe(g, { analyses: (eq.analyses || []).filter(x => x.id !== a.id) }); render(); } catch (e) { del.textContent = "Échec : réessaie"; }
      };
      item.append(h("div", { class: "row" }, h("button", { class: "linkbtn", onclick: () => { S.anaEdit = { g, id: a.id, date: a.date, titre: a.titre || "", texte: a.texte || "" }; render(); window.scrollTo({ top: 0 }); } }, "Modifier"), del));
    }
    card.append(item);
  }
  return card;
}

