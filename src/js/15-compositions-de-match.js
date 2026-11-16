/* ---------- compositions de match ---------- */
const DEF4 = [["GB", 50, 91], ["DD", 85, 72], ["DC", 62, 77], ["DC", 38, 77], ["DG", 15, 72]];
const SYSTEMES = {
  "4-4-2": [...DEF4, ["MD", 85, 47], ["MC", 62, 52], ["MC", 38, 52], ["MG", 15, 47], ["BU", 62, 21], ["BU", 38, 21]],
  "4-3-3": [...DEF4, ["MDC", 50, 59], ["MC", 70, 46], ["MC", 30, 46], ["AD", 82, 23], ["BU", 50, 16], ["AG", 18, 23]],
  "4-2-3-1": [...DEF4, ["MDC", 62, 59], ["MDC", 38, 59], ["MOD", 83, 37], ["MOC", 50, 35], ["MOG", 17, 37], ["BU", 50, 15]],
  "4-1-4-1": [...DEF4, ["MDC", 50, 61], ["MD", 85, 43], ["MC", 62, 46], ["MC", 38, 46], ["MG", 15, 43], ["BU", 50, 17]],
  "3-5-2": [["GB", 50, 91], ["DC", 72, 76], ["DC", 50, 78], ["DC", 28, 76], ["PD", 88, 49], ["MC", 66, 52], ["MDC", 50, 60], ["MC", 34, 52], ["PG", 12, 49], ["BU", 62, 20], ["BU", 38, 20]],
  "3-4-3": [["GB", 50, 91], ["DC", 72, 76], ["DC", 50, 78], ["DC", 28, 76], ["PD", 86, 51], ["MC", 62, 54], ["MC", 38, 54], ["PG", 14, 51], ["AD", 80, 23], ["BU", 50, 17], ["AG", 20, 23]]
};
const shortNom = n => { const w = (n || "?").trim().split(/\s+/); if (w.length < 2) return w[0]; const caps = w.filter(x => x === x.toUpperCase() && /[A-Z]/.test(x)); const pre = w.find(x => !caps.includes(x)) || w[0]; const fam = caps[0] || w[w.length - 1]; return pre === fam ? pre : `${pre[0].toUpperCase() + pre.slice(1).toLowerCase()} ${fam[0].toUpperCase()}.`; };
function pitchView(c) {
  const pos = SYSTEMES[c.systeme] || SYSTEMES["4-4-2"];
  const pitch = h("div", { class: "pitch", role: "img", "aria-label": `Composition en ${c.systeme}` });
  pitch.innerHTML = `<svg viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(205,189,143,.35)" stroke-width=".4"><rect x="2" y="2" width="64" height="96"/><line x1="2" y1="50" x2="66" y2="50"/><circle cx="34" cy="50" r="8"/><rect x="16" y="2" width="36" height="15"/><rect x="16" y="83" width="36" height="15"/><rect x="26" y="2" width="16" height="5"/><rect x="26" y="93" width="16" height="5"/></g></svg>`;
  pos.forEach(([lab, x, y], i) => {
    const fid = (c.xi || [])[i], nom = fid ? ((c.noms || {})[fid] || "?") : "";
    const t = h("div", { class: "tok" + (fid && fid === S.me ? " me" : ""), style: `left:${x}%;top:${y}%` },
      fid ? avatarNode(fid, nom, "av-mini") : h("div", { class: "av-mini" }, "–"),
      h("span", { class: "tn" }, fid ? shortNom(nom) + (c.cap === fid ? " (C)" : "") : lab), h("span", { class: "tp" }, lab));
    pitch.append(t);
  });
  return pitch;
}
function composCard(g, asCoach) {
  const eq = S.equipes[g] || {}, compos = (eq.compos || []).slice().sort((a, b) => (a.date || "") < (b.date || "") ? 1 : -1);
  const card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Compositions de match"));
  const players = Object.entries(S.fiches).filter(([, f]) => groupOf(f) === g).sort((a, b) => (a[1].nom || "").localeCompare(b[1].nom || "", "fr"));
  // éditeur coach
  if (asCoach) {
    const d = S.compoDraft[g];
    if (!d) {
      card.append(h("div", { class: "row" }, h("button", { class: "btn small", onclick: () => { S.compoDraft[g] = { id: nid(), titre: "", date: today(), systeme: "4-3-3", xi: Array(11).fill(""), rempl: [], cap: "" }; render(); } }, "Nouvelle composition"),
        compos.length ? h("span", { class: "note" }, "ou modifie une compo existante plus bas") : null));
    } else {
      const ed = h("div", { class: "hitem stack" });
      const titre = h("input", { maxlength: "80", placeholder: "Ex. J7 · Endoume – Simiane", value: d.titre }); titre.addEventListener("input", () => d.titre = titre.value);
      const dt = h("input", { type: "date", value: d.date }); dt.addEventListener("change", () => d.date = dt.value);
      const fields = [];
      if (g === "U19" && S.champ && Array.isArray(S.champ.matchs)) {
        const sh = t => (S.champ.noms && S.champ.noms[t]) || t, ms = S.champ.matchs.slice().sort((a, b) => a.j - b.j);
        const ms2 = h("select", {}, h("option", { value: "" }, "Match de la saison"), ms.map((m, i) => h("option", { value: String(i) }, `J${m.j} · ${sh(m.h)} – ${sh(m.a)}`)));
        ms2.onchange = () => { const m = ms[+ms2.value]; if (!m) return; d.titre = `J${m.j} · ${sh(m.h)} – ${sh(m.a)}`; if (m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date)) d.date = m.date.slice(0, 10); render(); };
        fields.push(h("label", { class: "field", style: "flex:1;min-width:200px" }, "Match", ms2));
      }
      const sys = h("select", {}, Object.keys(SYSTEMES).map(k => h("option", { value: k, selected: k === d.systeme }, k))); sys.onchange = () => { d.systeme = sys.value; render(); };
      ed.append(h("div", { class: "row" }, ...fields, h("label", { class: "field" }, "Système", sys)), h("div", { class: "row" }, h("label", { class: "field", style: "flex:1;min-width:200px" }, "Titre", titre), h("label", { class: "field" }, "Date", dt)));
      const used = new Set(d.xi.filter(Boolean));
      const grid = h("div", { class: "compo-grid" });
      (SYSTEMES[d.systeme]).forEach(([lab], i) => {
        const sel = h("select", { "aria-label": `Poste ${lab}` }, h("option", { value: "" }, "—"), players.map(([fid, f]) => h("option", { value: fid, selected: d.xi[i] === fid, disabled: used.has(fid) && d.xi[i] !== fid }, f.nom)));
        sel.onchange = () => { d.xi[i] = sel.value; d.rempl = d.rempl.filter(x => x !== sel.value); render(); };
        grid.append(h("label", { class: "field" }, `${i + 1}. ${lab}`, sel));
      });
      ed.append(grid);
      const bench = players.filter(([fid]) => !used.has(fid));
      ed.append(h("div", {}, h("div", { class: "lab-s" }, `Remplaçants · ${d.rempl.length}`), h("div", { class: "row", style: "gap:6px" }, bench.map(([fid, f]) =>
        h("button", { type: "button", class: "opt", "aria-pressed": String(d.rempl.includes(fid)), onclick: () => { d.rempl = d.rempl.includes(fid) ? d.rempl.filter(x => x !== fid) : [...d.rempl, fid]; render(); } }, f.nom)))));
      const cap = h("select", {}, h("option", { value: "" }, "—"), d.xi.filter(Boolean).map(fid => h("option", { value: fid, selected: d.cap === fid }, S.fiches[fid] ? S.fiches[fid].nom : "?"))); cap.onchange = () => d.cap = cap.value;
      ed.append(h("label", { class: "field", style: "max-width:320px" }, "Capitaine", cap));
      const m = h("span", { class: "note" });
      const save = h("button", { class: "btn small" }, "Publier la compo");
      save.onclick = async () => {
        if (!d.titre.trim()) { m.className = "err"; m.textContent = "Donne un titre (le match)."; return; }
        if (d.xi.filter(Boolean).length < 7) { m.className = "err"; m.textContent = "Place au moins 7 titulaires."; return; }
        const ids = [...d.xi.filter(Boolean), ...d.rempl], noms = {}; ids.forEach(fid => noms[fid] = (S.fiches[fid] && S.fiches[fid].nom) || "?");
        const c = { id: d.id, titre: d.titre.trim().slice(0, 80), date: d.date || today(), systeme: d.systeme, xi: d.xi, rempl: d.rempl, cap: d.xi.includes(d.cap) ? d.cap : "", noms };
        save.disabled = true;
        try { await writeEquipe(g, { compos: [...(eq.compos || []).filter(x => x.id !== d.id), c] }); S.compoDraft[g] = null; S.compoSel[g] = c.id; S.flashCompo = "Compo publiée : les joueurs la voient dans L'équipe."; render(); }
        catch (e) { save.disabled = false; m.className = "err"; m.textContent = "Échec : réessaie."; }
      };
      ed.append(h("div", { class: "row", style: "align-items:center" }, save, h("button", { class: "btn ghost small", onclick: () => { S.compoDraft[g] = null; render(); } }, "Annuler"), m));
      card.append(ed);
    }
    if (S.flashCompo) { card.append(h("p", { class: "ok", style: "margin:0" }, S.flashCompo)); S.flashCompo = ""; }
  }
  if (!compos.length) { if (!asCoach) card.append(h("p", { class: "note", style: "margin:0" }, "Aucune composition publiée pour l'instant.")); return card; }
  const curId = compos.some(c => c.id === S.compoSel[g]) ? S.compoSel[g] : compos[0].id, c = compos.find(x => x.id === curId);
  const pick = h("select", { "aria-label": "Choisir le match" }, compos.map(x => h("option", { value: x.id, selected: x.id === curId }, `${x.titre} · ${fmtDate(x.date)}`)));
  pick.onchange = () => { S.compoSel[g] = pick.value; render(); };
  const hm = (eq.hommes || []).find(x => x.titre && x.titre === c.titre);
  const mine = S.me && ((c.xi || []).includes(S.me) ? "titulaire" : (c.rempl || []).includes(S.me) ? "remplaçant" : "");
  card.append(h("div", { class: "row", style: "align-items:center;justify-content:space-between" }, h("label", { class: "field", style: "flex:1;min-width:220px" }, "Match", pick),
    asCoach ? h("span", { class: "row", style: "gap:10px" }, h("button", { class: "linkbtn", onclick: () => { S.compoDraft[g] = JSON.parse(JSON.stringify({ id: c.id, titre: c.titre, date: c.date, systeme: c.systeme, xi: [...(c.xi || []), ...Array(11).fill("")].slice(0, 11), rempl: c.rempl || [], cap: c.cap || "" })); render(); } }, "Modifier"),
      h("button", { class: "linkbtn danger", onclick: async e => { const b = e.currentTarget; if (b.dataset.c !== "1") { b.dataset.c = "1"; b.textContent = "Confirmer la suppression"; return; } try { await writeEquipe(g, { compos: (eq.compos || []).filter(x => x.id !== c.id) }); render(); } catch (er) { b.textContent = "Échec"; } } }, "Supprimer")) : null));
  card.append(h("div", { class: "pmeta" }, `${c.systeme} · ${fmtLong(c.date)}`, mine ? h("span", { class: "pill match", style: "margin-left:8px" }, `Tu étais ${mine}`) : null, hm ? h("span", { class: "pill ex", style: "margin-left:8px" }, `Homme du match : ${hm.nom}`) : null));
  const subs = (c.rempl || []).map(fid => (c.noms || {})[fid] || "?");
  card.append(h("div", { class: "compo-wrap" }, pitchView(c), h("div", { class: "stack", style: "gap:6px" }, h("div", { class: "lab-s" }, "Remplaçants"),
    subs.length ? h("div", { class: "stack", style: "gap:6px" }, (c.rempl || []).map(fid => h("div", { class: "row" + (fid === S.me ? " me-row" : ""), style: "gap:8px;align-items:center;flex-wrap:nowrap" }, avatarNode(fid, (c.noms || {})[fid], "av-mini"), (c.noms || {})[fid] || "?"))) : h("p", { class: "note", style: "margin:0" }, "Aucun."),
    c.cap ? h("p", { class: "note", style: "margin:6px 0 0" }, `Capitaine : ${(c.noms || {})[c.cap] || "?"}`) : null)));
  return card;
}

