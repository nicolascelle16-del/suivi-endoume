/* ---------- votes ---------- */
function voteLabel(type, g) { return type === "mois" ? "Joueur du mois" : (g === "U10" ? "Joueur du match" : "Homme du match"); }
function watchBulletins(vid) {
  if (S.subs["b-" + vid]) return;
  if (S.admin) {
    S.subs["b-" + vid] = S.db.collection("votes/" + vid + "/urne").onSnapshot(q => { S.bulletins[vid] = q.docs.map(d => d.data()); softRender(); }, () => {});
    S.subs["n-" + vid] = S.db.collection("votes/" + vid + "/votants").onSnapshot(q => { S.votants[vid] = q.docs.length; softRender(); }, () => {});
  } else S.subs["b-" + vid] = S.db.doc("votes/" + vid + "/votants/" + S.me).onSnapshot(d => { S.myBallots[vid] = d.exists; softRender(); }, () => {});
}
function votesCard(g, asCoach) {
  const all = Object.entries(S.votes).filter(([, v]) => v.groupe === g).sort((a, b) => (b[1].ouvert ? 1 : 0) - (a[1].ouvert ? 1 : 0) || (a[1].at < b[1].at ? 1 : -1));
  const open = all.filter(([, v]) => v.ouvert), closed = all.filter(([, v]) => !v.ouvert).slice(0, 3);
  const card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Votes des joueurs"));
  if (asCoach) {
    const type = h("select", { id: "v-type-" + g }, h("option", { value: "hdm" }, voteLabel("hdm", g)), h("option", { value: "mois" }, "Joueur du mois"));
    const titre = h("input", { id: "v-titre-" + g, maxlength: "80", placeholder: "Ex. J7 · Endoume – Simiane" });
    const fields = [h("label", { class: "field" }, "Type", type)];
    if (g === "U19" && S.champ && Array.isArray(S.champ.matchs)) {
      const sh = t => (S.champ.noms && S.champ.noms[t]) || t, ms = S.champ.matchs.slice().sort((a, b) => a.j - b.j);
      const sel = h("select", { id: "v-m-" + g }, h("option", { value: "" }, "Match de la saison"), ms.map((m, i) => h("option", { value: String(i) }, `J${m.j} · ${sh(m.h)} – ${sh(m.a)}`)));
      sel.onchange = () => { const m = ms[+sel.value]; if (m) titre.value = `J${m.j} · ${sh(m.h)} – ${sh(m.a)}`; };
      fields.push(h("label", { class: "field", style: "flex:1;min-width:200px" }, "Match", sel));
    }
    const players = Object.entries(S.fiches).filter(([, f]) => groupOf(f) === g).map(([fid, f]) => ({ fid, nom: f.nom || "Sans nom" })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    const conv = S.convoc[g] || (S.convoc[g] = new Set());
    const convBox = h("div", { class: "stack", style: "gap:6px" });
    const drawConv = () => {
      convBox.textContent = "";
      if (g !== "U19" || type.value !== "hdm") return;
      const nolink = [...conv].filter(isTemp).length;
      convBox.append(h("div", { class: "row", style: "justify-content:space-between;align-items:center" }, h("span", { class: "lab", style: "font-family:var(--label);letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:var(--muted)" }, `Joueurs convoqués · ${conv.size}`),
        h("span", { class: "row", style: "gap:10px" }, ...(((S.equipes[g] || {}).compos || []).length ? [(() => { const cs = ((S.equipes[g] || {}).compos || []).slice().sort((a, b) => (a.date || "") < (b.date || "") ? 1 : -1); const sc = h("select", { "aria-label": "Reprendre une compo", style: "max-width:220px" }, h("option", { value: "" }, "Reprendre une compo…"), cs.map(c => h("option", { value: c.id }, c.titre))); sc.onchange = () => { const c = cs.find(x => x.id === sc.value); if (!c) return; conv.clear(); [...(c.xi || []), ...(c.rempl || [])].filter(fid => S.fiches[fid]).forEach(fid => conv.add(fid)); if (!titre.value) titre.value = c.titre; drawConv(); }; return sc; })()] : []), h("button", { type: "button", class: "linkbtn", onclick: () => { players.forEach(p => conv.add(p.fid)); drawConv(); } }, "Tous"), h("button", { type: "button", class: "linkbtn", onclick: () => { conv.clear(); drawConv(); } }, "Aucun"))),
        h("div", { class: "row", style: "gap:6px" }, players.map(p => h("button", { type: "button", class: "opt", "aria-pressed": String(conv.has(p.fid)), onclick: () => { conv.has(p.fid) ? conv.delete(p.fid) : conv.add(p.fid); drawConv(); } }, p.nom))),
        h("p", { class: "note", style: "margin:0" }, "Seuls les joueurs convoqués votent, et uniquement pour un autre convoqué." + (nolink ? ` ${nolink} convoqué${nolink > 1 ? "s n'ont" : " n'a"} pas encore de compte relié : ${nolink > 1 ? "ils ne pourront" : "il ne pourra"} pas voter.` : "")));
    };
    type.addEventListener("change", drawConv); drawConv();
    const msg = h("span", { class: "note" });
    const go = h("button", { class: "btn small" }, "Ouvrir le vote");
    go.onclick = async () => {
      const restrict = g === "U19" && type.value === "hdm";
      const cands = restrict ? players.filter(p => conv.has(p.fid)) : players;
      if (restrict && cands.length < 2) { msg.className = "err"; msg.textContent = "Sélectionne les joueurs convoqués pour ce match."; return; }
      const t = titre.value.trim() || (type.value === "mois" ? new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "");
      if (!t) { msg.className = "err"; msg.textContent = "Donne un titre au vote (le match ou le mois)."; return; }
      if (!cands.length) { msg.className = "err"; msg.textContent = "Aucun joueur dans ce groupe."; return; }
      go.disabled = true;
      try { const d = { groupe: g, type: type.value, titre: t.slice(0, 80), candidats: cands, ouvert: true, at: new Date().toISOString() }; if (restrict) d.convoques = cands.map(c => c.fid);
        await S.db.doc("votes/" + nid()).set(d); msg.className = "ok"; msg.textContent = restrict ? `Vote ouvert pour les ${cands.length} convoqués.` : "Vote ouvert : les joueurs peuvent voter."; titre.value = ""; conv.clear(); }
      catch (e) { msg.className = "err"; msg.textContent = "Échec : réessaie."; }
      go.disabled = false;
    };
    card.append(h("div", { class: "row" }, fields), h("label", { class: "field" }, "Titre", titre), convBox, h("div", { class: "row" }, go, msg),
      h("p", { class: "note", style: "margin:0" }, "Vote anonyme : chaque joueur vote une seule fois, pas pour lui-même. Personne, même pas les coachs, ne voit qui a voté pour qui : seulement le total par joueur."));
  }
  if (!open.length && !asCoach) card.append(h("p", { class: "note", style: "margin:0" }, "Aucun vote en cours."));
  for (const [vid, v] of open) {
    watchBulletins(vid);
    const item = h("div", { class: "hitem" }, h("div", { class: "hhead" }, h("strong", {}, `${voteLabel(v.type, g)} · ${v.titre}`), h("span", { class: "pill match" }, "Vote ouvert")));
    if (asCoach) {
      const bs = S.bulletins[vid] || [], tally = {};
      for (const b of bs) tally[b.choix] = (tally[b.choix] || 0) + 1;
      const nv = (v.convoques || null);
      const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      const nomOf = fid => ((v.candidats || []).find(c => c.fid === fid) || {}).nom || "?";
      item.append(h("div", { class: "note" }, `${bs.length} vote${bs.length > 1 ? "s" : ""} reçu${bs.length > 1 ? "s" : ""}${nv ? ` sur ${nv.length} convoqués` : ""}`),
        rows.length ? h("div", { class: "chips" }, rows.map(([fid, n]) => h("span", { class: "chip" }, nomOf(fid), " ", h("b", {}, n)))) : null);
      const win = h("select", { id: "v-win-" + vid }, (v.candidats || []).map(c => h("option", { value: c.fid, selected: rows[0] && rows[0][0] === c.fid }, c.nom)));
      const cm = h("span", { class: "note" });
      const close = h("button", { class: "btn small" }, "Clôturer et désigner");
      close.onclick = async () => {
        const c = (v.candidats || []).find(x => x.fid === win.value); if (!c) return;
        close.disabled = true;
        try {
          await S.db.doc("votes/" + vid).update({ ouvert: false, gagnant: c, closAt: new Date().toISOString(), total: bs.length });
          const eq = S.equipes[g] || {};
          if (v.type === "mois") await writeEquipe(g, { mois: { fid: c.fid, nom: c.nom, label: v.titre } });
          else await writeEquipe(g, { hommes: [...(eq.hommes || []), { date: today(), fid: c.fid, nom: c.nom, titre: v.titre }] });
        } catch (e) { close.disabled = false; cm.textContent = "Échec : réessaie."; }
      };
      const del = h("button", { class: "linkbtn danger" }, "Annuler ce vote");
      del.onclick = async () => { if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmer l'annulation"; return; } try { await S.db.doc("votes/" + vid).delete(); } catch (e) { del.textContent = "Échec : réessaie"; } };
      item.append(h("div", { class: "row" }, h("label", { class: "field" }, "Gagnant", win), close, cm), del);
    } else {
      const done = S.myBallots[vid];
      const allowed = !v.convoques || v.convoques.includes(S.me);
      if (!allowed) item.append(h("p", { class: "note", style: "margin:0" }, "Ce vote est réservé aux joueurs convoqués pour ce match."));
      else if (done) item.append(h("p", { class: "ok", style: "margin:0" }, "Ton vote est enregistré. Il est anonyme : personne ne sait pour qui tu as voté."));
      else {
        const pick = S.voteDraft[vid];
        const choices = h("div", { class: "chips" });
        for (const c of (v.candidats || []).filter(c => c.fid !== S.me)) choices.append(h("button", { class: "toggle", "aria-pressed": String(pick === c.fid), onclick: () => { S.voteDraft[vid] = c.fid; render(); } }, c.nom));
        const m = h("span", { class: "note" });
        const ok = h("button", { class: "btn small", disabled: !pick }, "Valider mon vote");
        ok.onclick = async () => {
          if (!pick) return; ok.disabled = true; m.className = "note"; m.textContent = "Envoi…";
          try { const b = writeBatch(fs); b.set(fsDoc(fs, "votes/" + vid + "/votants/" + S.me), { ok: true }); b.set(fsDoc(fsCol(fs, "votes/" + vid + "/urne")), { choix: pick }); await b.commit(); S.myBallots[vid] = true; delete S.voteDraft[vid]; render(); }
          catch (e) { ok.disabled = false; m.className = "err"; m.textContent = "Échec : le vote est peut-être fermé, ou tu as déjà voté."; }
        };
        item.append(h("div", { class: "note" }, "Choisis un joueur puis valide. Ton vote est anonyme et définitif."), choices, h("div", { class: "row", style: "align-items:center" }, ok, m));
      }
    }
    card.append(item);
  }
  for (const [, v] of closed) card.append(h("div", { class: "hitem" }, h("div", { class: "hhead" }, h("strong", {}, `${voteLabel(v.type, g)} · ${v.titre}`), h("span", { class: "pill" }, "Terminé")),
    v.gagnant ? h("div", { class: "hero-eq" }, v.gagnant.nom) : null, v.total != null ? h("div", { class: "note" }, `${v.total} votant${v.total > 1 ? "s" : ""}`) : null));
  return card;
}

