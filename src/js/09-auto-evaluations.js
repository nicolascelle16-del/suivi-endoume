/* ---------- auto-évaluations ---------- */
function watchAutos(fid) {
  if (S.subs["a-" + fid]) return;
  S.subs["a-" + fid] = S.db.collection("fiches/" + fid + "/auto").onSnapshot(q => {
    const tous = q.docs.map(d => ({ id: d.id, ...d.data() })), vu = new Map();
    for (const a of tous) { const k = (a.type === "Match" ? "M" : "S") + a.date; if (!vu.has(k) || a.id === k) vu.set(k, a); }
    S.autos[fid] = [...vu.values()].sort((a, b) => a.date < b.date ? 1 : -1);
    if (fid === S.me && !S.admin) {
      // anciennes auto-évaluations (identifiant aléatoire) : copie sous la clé de période pour débloquer les notes
      for (const a of tous) { const k = (a.type === "Match" ? "M" : "S") + a.date; if (a.id !== k && a.date >= MASQUE_DEBUT && !tous.some(x => x.id === k)) S.db.doc("fiches/" + fid + "/auto/" + k).set({ date: a.date, type: a.type, crit: a.crit || {}, com: a.com || "", at: a.at || new Date().toISOString() }).catch(() => {}); }
      S.priveEssai = {}; chargerPrive();
    }
    softRender();
  }, () => {});
}
function autoMissing(fid, f) {
  if (groupOf(f) === "U10") return false;
  const lastMatch = sortedNotes(f).filter(n => n.type === "Match").pop();
  if (!lastMatch) return false;
  const autos = S.autos[fid] || [];
  return !autos.some(a => a.type === "Match" && a.date >= lastMatch.date);
}
/* auto-évaluation : seulement sur ce que le coach a noté ; semaine ouverte le vendredi à 22h */
const lundiDe = d => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
const plusJours = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
function autoAFaire(f, autos) {
  const notes = sortedNotes(f), fait = (type, date) => autos.some(a => a.type === type && a.date === date), limite = ilYa(21), now = new Date();
  // périodes notées par le coach mais encore illisibles pour le joueur (notes protégées) : connues par la liste « prives » de la fiche
  const cles = (f && (f.prives || (f._plein && f._plein.prives))) || [];
  const dMatchs = [...new Set([...notes.filter(n => n.type === "Match").map(n => n.date), ...cles.filter(k => k[0] === "M").map(k => k.slice(1))])].sort();
  const matchs = dMatchs.filter(d => d >= limite && !fait("Match", d)).slice(-2).reverse()
    .map(d => ({ key: "M" + d, type: "Match", date: d, lab: `Ton match du ${fmtLong(d)}`, court: `Match du ${fmtDate(d)}` }));
  const sem = {}; for (const n of notes.filter(n => n.type !== "Match" && n.date >= limite)) { const l = lundiDe(n.date); sem[l] = (sem[l] || 0) + 1; }
  for (const k of cles) if (k[0] === "S") { const l = plusJours(k.slice(1), -4); if (k.slice(1) >= limite && !sem[l]) sem[l] = "?"; }
  let bientot = null; const semaines = [];
  for (const l of Object.keys(sem).sort().reverse()) {
    const ven = plusJours(l, 4);
    if (now < new Date(ven + "T22:00:00")) { bientot = `vendredi ${fmtDate(ven)} à 22h`; continue; }
    if (!fait("Semaine", ven)) semaines.push({ key: "S" + ven, type: "Semaine", date: ven, lab: `Ta semaine du ${fmtDate(l)} au ${fmtDate(ven)}${sem[l] === "?" ? " (entraînements notés)" : ` (${sem[l]} entraînement${sem[l] > 1 ? "s" : ""} noté${sem[l] > 1 ? "s" : ""})`}`, court: `Semaine du ${fmtDate(l)}` });
  }
  return { todo: [...matchs, ...semaines.slice(0, 2)], bientot };
}
/* notes U19 protégées dans la base : fiches/{fid}/prive/{clé de période}, lisibles par le joueur
   seulement quand son auto-évaluation de la période existe (auto/{clé}) ou après 22 jours */
const clePeriode = n => n.type === "Match" ? "M" + n.date : "S" + plusJours(lundiDe(n.date), 4);
const estPrive = (fid, raw, n) => !isTemp(fid) && !!raw && groupOf(raw) === "U19" && !!n && typeof n.date === "string" && n.date >= MASQUE_DEBUT;
function avecPrive(fid, raw) {
  const p = S.prive && S.prive[fid]; if (!raw || !p || !Object.keys(p).length) return raw;
  const fus = (a, b) => { const m = new Map(); for (const n of [...(a || []), ...(b || [])]) if (n) m.set(n.id || (n.date + n.type + (n.par || "")), n); return [...m.values()]; };
  const ex = Object.values(p);
  return { ...raw, notes: fus(raw.notes, ex.flatMap(d => d.notes || [])), notesAdj: fus(raw.notesAdj, ex.flatMap(d => d.notesAdj || [])) };
}
function watchPrive(fid) {
  if (S.demo || !S.db || isTemp(fid) || S.subs["pr-" + fid]) return;
  S.subs["pr-" + fid] = S.db.collection("fiches/" + fid + "/prive").onSnapshot(q => {
    S.prive[fid] = Object.fromEntries(q.docs.map(d => [d.id, d.data()]));
    if (S.fichesRaw[fid]) S.fiches[fid] = avecPrive(fid, S.fichesRaw[fid]);
    migrerPrive();
    softRender();
  }, () => {});
}
function poserFiches(raw) {
  S.fichesRaw = raw; const out = {};
  for (const [fid, f] of Object.entries(raw)) { if (groupOf(f) === "U19") watchPrive(fid); out[fid] = avecPrive(fid, f); }
  S.fiches = out;
  migrerPrive();
}
/* déplace une seule fois les notes U19 récentes encore stockées dans la fiche */
function migrerPrive() {
  if (S.demo || !S.admin || S.scope) return;
  S.migre = S.migre || new Set();
  for (const [fid, raw] of Object.entries(S.fichesRaw)) {
    if (S.migre.has(fid) || groupOf(raw) !== "U19" || isTemp(fid) || !S.prive[fid]) continue;
    const aDeplacer = [...(raw.notes || []), ...(raw.notesAdj || [])].some(n => estPrive(fid, raw, n));
    if (!aDeplacer) continue;
    S.migre.add(fid);
    const f = S.fiches[fid];
    ecrireFiche(fid, { notes: rawNotes(f), notesAdj: adjNotes(f) }).catch(() => S.migre.delete(fid));
  }
}
/* joueur : récupère les périodes auxquelles il a droit */
async function chargerPrive() {
  if (S.demo || !S.db || !S.myRaw || groupOf(S.myRaw) !== "U19") return;
  const mine = S.prive[S.me] = S.prive[S.me] || {};
  let neuf = false;
  for (const k of (Array.isArray(S.myRaw.prives) ? S.myRaw.prives : [])) {
    if (mine[k] || (S.priveEssai && S.priveEssai[k] && Date.now() - S.priveEssai[k] < 20000)) continue;
    (S.priveEssai = S.priveEssai || {})[k] = Date.now();
    try { const d = await S.db.doc(`fiches/${S.me}/prive/${k}`).get(); if (d.exists) { mine[k] = d.data(); neuf = true; } } catch (e) { /* pas encore autorisé */ }
  }
  if (neuf) { S.myFiche = avecPrive(S.me, S.myRaw); softRender(); }
}
async function ecrireFiche(fid, patch) {
  const raw = S.fichesRaw[fid] || S.fiches[fid];
  if (!(patch.notes || patch.notesAdj) || isTemp(fid) || !raw || groupOf(raw) !== "U19") return S.db.doc("fiches/" + fid).update(patch);
  watchPrive(fid);
  for (let i = 0; i < 30 && !S.prive[fid]; i++) await new Promise(r => setTimeout(r, 100));
  const out = { ...patch }, parCle = {}, cur = S.prive[fid] || {};
  for (const champ of ["notes", "notesAdj"]) {
    if (!patch[champ]) continue;
    const pub = [], priv = [];
    for (const n of patch[champ]) (estPrive(fid, raw, n) ? priv : pub).push(n);
    out[champ] = pub;
    for (const k of Object.keys(cur)) (parCle[k] = parCle[k] || {})[champ] = [];
    for (const n of priv) { const k = clePeriode(n); parCle[k] = parCle[k] || {}; (parCle[k][champ] = parCle[k][champ] || []).push(n); }
  }
  for (const [k, d] of Object.entries(parCle)) {
    const libre = new Date(plusJours(k.slice(1), 22) + "T00:00:00");
    await S.db.doc(`fiches/${fid}/prive/${k}`).set({ ...d, libre }, { merge: true });
  }
  out.prives = [...new Set([...(Array.isArray(raw.prives) ? raw.prives : []), ...Object.keys(parCle)])].filter(k => {
    const d = { ...(cur[k] || {}), ...(parCle[k] || {}) }; return (d.notes || []).length || (d.notesAdj || []).length; }).sort();
  await S.db.doc("fiches/" + fid).update(out);
}
/* U19 : les notes du coach restent cachées au joueur tant qu'il ne s'est pas auto-évalué (semaine et match) */
const MASQUE_DEBUT = "2026-11-09";
function masquerNotes(fid, f) {
  if (!f || groupOf(f) !== "U19") return f;
  watchAutos(fid);
  const { todo } = autoAFaire(f, S.autos[fid] || []), cles = new Set(todo.map(t => t.key)), now = new Date();
  const cache = n => {
    if (!n || typeof n.date !== "string" || n.date < MASQUE_DEBUT) return false;
    if (n.type === "Match") return cles.has("M" + n.date);
    const ven = plusJours(lundiDe(n.date), 4);
    return now < new Date(ven + "T22:00:00") || cles.has("S" + ven);
  };
  const notes = Array.isArray(f.notes) ? f.notes : [], adj = Array.isArray(f.notesAdj) ? f.notesAdj : [];
  // périodes protégées pas encore lisibles par le joueur (il doit d'abord s'auto-évaluer)
  const charge = (S.prive && S.prive[fid]) || {}, attente = (Array.isArray(f.prives) ? f.prives : []).filter(k => !charge[k]).length;
  const nb = notes.filter(cache).length + attente;
  if (!nb) return f;
  return { ...f, notes: notes.filter(n => !cache(n)), notesAdj: adj.filter(n => !cache(n)), _plein: f, _masque: nb };
}
function coachRef(notes, a) {
  if (a.type === "Match") return notes.find(n => n.type === "Match" && n.date === a.date) || notes.filter(n => n.type === "Match" && n.date <= a.date).pop();
  const l = lundiDe(a.date), fin = plusJours(l, 6), ns = notes.filter(n => n.type !== "Match" && n.date >= l && n.date <= fin);
  if (!ns.length) return notes.filter(n => n.date <= a.date && n.type !== "Match").pop();
  const crit = {}; for (const k of new Set(ns.flatMap(n => Object.keys(n.crit || {})))) { const v = ns.map(n => n.crit && n.crit[k]).filter(x => typeof x === "number"); if (v.length) crit[k] = Math.round(mean(v) * 10) / 10; }
  return { date: a.date, crit, semaine: true, n: ns.length };
}
function autoCard(fid, f, asCoach) {
  const g = groupOf(f), G = GROUPS[g], autos = S.autos[fid] || [], notes = sortedNotes(f);
  const card = h("div", { class: "card stack", id: "auto-card" }, h("h3", { style: "margin:0" }, asCoach ? "Auto-évaluations du joueur" : "Mon auto-évaluation"));
  if (!asCoach) {
    const { todo, bientot } = autoAFaire(f._plein || f, autos);
    if (!todo.length) {
      card.append(h("p", { style: "margin:0" }, "Rien à évaluer pour l'instant."),
        h("p", { class: "note", style: "margin:0" }, bientot ? `Ta semaine s'ouvre ${bientot}.` : "Tu pourras t'auto-évaluer sur ta semaine le vendredi à partir de 22h, quand le coach aura noté tes entraînements, et sur chaque match une fois qu'il l'aura noté."));
    } else {
      const choixId = todo.some(t => t.key === S.autoSel) ? S.autoSel : todo[0].key, cur = todo.find(t => t.key === choixId);
      if (todo.length > 1) card.append(h("div", { class: "row", style: "gap:6px" }, todo.map(t => h("button", { type: "button", class: "opt", "aria-pressed": String(t.key === choixId), onclick: () => { S.autoSel = t.key; render(); } }, t.court))));
      card.append(h("div", { class: "record", style: cur.type === "Match" ? "border-color:var(--rouge)" : "" }, cur.type === "Match" ? `${cur.lab} : auto-évaluation obligatoire.` : `${cur.lab} : comment tu as ressenti tes entraînements ?`));
      const st = { crit: {} }, grille = critsJ(g, cur.type, f._plein || f), crits = h("div", {});
      for (const [k, lab] of grille) {
        const sc = h("div", { class: "scale", role: "group", "aria-label": lab });
        for (let v = 1; v <= 5; v++) { const b = h("button", { class: "sc", "aria-pressed": "false", title: LEVELS[v] }, v); b.onclick = () => { st.crit[k] = st.crit[k] === v ? undefined : v; if (st.crit[k] === undefined) delete st.crit[k]; sc.querySelectorAll(".sc").forEach((x, i) => x.setAttribute("aria-pressed", String(st.crit[k] === i + 1))); }; sc.append(b); }
        crits.append(h("div", { class: "crit-row" }, critLabel(k, lab), sc));
      }
      const com = h("textarea", { id: "au-com", rows: "3", maxlength: "1000", placeholder: cur.type === "Match" ? "Ton match : ce que tu as bien fait, ce que tu dois travailler" : "Ta semaine : ton ressenti sur les deux entraînements" });
      const msg = h("span", { class: "note" });
      const go = h("button", { class: "btn small" }, "Envoyer mon auto-évaluation");
      go.onclick = async () => {
        if (Object.keys(st.crit).length < grille.length) { msg.className = "err"; msg.textContent = "Note-toi sur tous les critères."; return; }
        go.disabled = true;
        try { await S.db.doc("fiches/" + S.me + "/auto/" + (cur.key || nid())).set({ date: cur.date, type: cur.type, crit: { ...st.crit }, com: com.value.trim().slice(0, 1000), at: new Date().toISOString() }); S.autoSel = null; msg.className = "ok"; msg.textContent = "Envoyé au coach."; }
        catch (e) { go.disabled = false; msg.className = "err"; msg.textContent = "Échec : réessaie."; }
      };
      card.append(crits, h("label", { class: "field" }, "Commentaire", com), h("div", { class: "row" }, go, msg),
        h("p", { class: "note", style: "margin:0" }, `Tu t'évalues seulement sur ce que le coach a déjà noté : chaque match, et ta semaine d'entraînement à partir du vendredi 22h.${bientot ? " Ta semaine en cours s'ouvre " + bientot + "." : ""} Le coach compare avec ses notes.`));
    }
  } else if (autoMissing(fid, f)) card.append(h("span", { class: "pill match" }, "Auto-évaluation du dernier match manquante"));
  if (!autos.length) card.append(h("p", { class: "note", style: "margin:0" }, "Aucune auto-évaluation pour l'instant."));
  for (const a of autos.slice(0, 12)) {
    const coach = coachRef(notes, a);
    if (asCoach) { card.append(autoCompare(fid, a, coach)); continue; }
    const rows = h("div", { class: "chips" });
    for (const k of Object.keys(a.crit || {})) {
      const lab = LABEL[k] || k, mine = a.crit[k], co = coach && coach.crit && coach.crit[k];
      if (typeof mine !== "number") continue;
      rows.append(h("span", { class: "chip" }, `${lab} `, h("b", {}, `${mine}`), co ? h("span", { class: "note" }, ` · coach ${co}`) : null));
    }
    const item = h("div", { class: "hitem" }, h("div", { class: "hhead" }, h("strong", {}, a.type === "Match" ? `Match · ${fmtLong(a.date)}` : `Semaine du ${fmtDate(plusJours(lundiDe(a.date), 0))} au ${fmtDate(plusJours(lundiDe(a.date), 4))}`), coach ? h("span", { class: "pill" }, coach.semaine ? `comparé à ${coach.n} entraînement${coach.n > 1 ? "s" : ""}` : `comparé au ${fmtDate(coach.date)}`) : null), rows, a.com ? h("div", { class: "com-text" }, a.com) : null);
    if (asCoach) { const del = h("button", { class: "linkbtn danger" }, "Supprimer"); del.onclick = async () => { if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmer"; return; } try { await S.db.doc("fiches/" + fid + "/auto/" + a.id).delete(); } catch (e) { del.textContent = "Échec"; } }; item.append(del); }
    card.append(item);
  }
  return card;
}

/* vue coach : auto-évaluation du joueur face à la note du coach, critère par critère */
function autoCompare(fid, a, coach) {
  const titre = a.type === "Match" ? `Match · ${fmtLong(a.date)}` : `Semaine du ${fmtDate(lundiDe(a.date))} au ${fmtDate(plusJours(lundiDe(a.date), 4))}`;
  const lignes = [], ecarts = [];
  for (const k of Object.keys(a.crit || {})) {
    const j = a.crit[k], c = coach && coach.crit && coach.crit[k];
    if (typeof j !== "number") continue;
    const d = typeof c === "number" ? Math.round((j - c) * 10) / 10 : null;
    if (d != null) ecarts.push(d);
    lignes.push(h("div", { class: "cmp-r" }, h("span", { class: "cmp-l" }, LABEL[k] || k),
      h("span", { class: "cmp-v" }, String(j).replace(".", ",")),
      h("span", { class: "cmp-v co" }, typeof c === "number" ? String(Math.round(c * 10) / 10).replace(".", ",") : "–"),
      h("span", { class: "cmp-d " + (d == null ? "" : d >= 1 ? "haut" : d <= -1 ? "bas" : "ok") }, d == null ? "" : d === 0 ? "=" : (d > 0 ? "+" : "−") + String(Math.abs(d)).replace(".", ","))));
  }
  const m = ecarts.length ? mean(ecarts) : null;
  const verdict = m == null ? h("span", { class: "pill" }, "pas encore noté par le coach")
    : m >= .5 ? h("span", { class: "pill v-haut" }, `Se surestime +${n1(m)}`)
    : m <= -.5 ? h("span", { class: "pill v-bas" }, `Se sous-estime −${n1(-m)}`)
    : h("span", { class: "pill v-ok" }, "Lucide");
  const del = h("button", { class: "linkbtn danger small" }, "Supprimer");
  del.onclick = async () => { if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmer"; return; } try { await S.db.doc("fiches/" + fid + "/auto/" + a.id).delete(); } catch (e) { del.textContent = "Échec"; } };
  return h("div", { class: "hitem cmp" },
    h("div", { class: "hhead" }, h("strong", {}, titre), verdict),
    h("div", { class: "cmp-t" }, h("div", { class: "cmp-r cmp-h" }, h("span", {}, ""), h("span", {}, "Joueur"), h("span", {}, "Coach"), h("span", {}, "Écart")), ...lignes),
    a.com ? h("blockquote", { class: "cmp-com" }, a.com) : null,
    h("div", { style: "text-align:right" }, del));
}

