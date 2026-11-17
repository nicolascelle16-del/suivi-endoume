/* ---------- vue coach ---------- */

/* ---------- carnet BMF : séances, matchs, analyses réflexives ---------- */
const PHASES = [
  { k: "cp", l: "Conserver – Progresser", bloc: "On a le ballon", p: [[1, "Créer et utiliser des espaces"], [2, "Jouer dans les intervalles et entre les lignes"]] },
  { k: "df", l: "Déséquilibrer – Finir", bloc: "On a le ballon", p: [[3, "Jouer à l'opposé après avoir fixé collectivement"], [4, "Jouer combiné pour créer un surnombre"], [5, "Se démarquer pour fixer et éliminer, passer ou finir"]] },
  { k: "op", l: "S'opposer à la progression", bloc: "On n'a pas le ballon", p: [[6, "Freiner la progression de l'adversaire, organiser et réorganiser les alignements"]] },
  { k: "pb", l: "S'organiser pour protéger son but", bloc: "On n'a pas le ballon", p: [[7, "S'organiser en déséquilibre"], [8, "Densifier et être actif dans le CJD (axe ballon-but)"], [9, "Défendre son but, récupérer ou dégager le ballon"]] }
];
const PROC_CHAMPS = [["objectif", "Objectif"], ["buts", "But(s)"], ["consignes", "Consignes / variables"], ["rotations", "Gestion des rotations"], ["comportements", "Comportements attendus"], ["criteres", "Critères de réussite"]];
const REFLEX = [
  ["contexte", "Le contexte et ce que j'avais prévu", "Je décris avec précision le contexte et ce que j'avais prévu de faire, en lien avec mes objectifs d'apprentissage.", "Ex. : 12 présents, terrain mouillé. J'avais prévu de travailler…"],
  ["faits", "Ce qui s'est passé", "Je décris factuellement ce qui s'est passé et ce que j'ai fait, en lien avec mes objectifs.", "Ex. : sur le procédé 3, les joueurs… J'ai arrêté le jeu pour…"],
  ["ecarts", "Les écarts", "J'identifie les écarts entre ce que j'ai réellement fait et ce que j'avais prévu de faire.", "Ex. : j'ai dû réduire la surface parce que…"],
  ["causes", "Les causes, par hypothèses", "J'analyse les causes possibles des écarts, par hypothèses. Je précise mes succès autant que mes difficultés.", "Ex. : la consigne était peut-être trop longue… Ce qui a marché : …"],
  ["refaire", "Si c'était à refaire", "Et si c'était à refaire, qu'est-ce que je devrais faire ?", "Ex. : je ferais d'abord une démonstration avec 4 joueurs…"],
  ["lecons", "Ce que je retiens", "Je tire les enseignements qui me permettront de transposer ce que j'ai appris. Quelle évolution par rapport à mes objectifs initiaux ?", "Ex. : pour les prochaines séances, je…"]
];
const BMF_OBJ = { U10: { s: 15, m: 10 }, U19: { s: 4, m: 1 }, GB: { s: 4, m: 1 } };
const phaseOf = k => PHASES.find(p => p.k === k);
const principeLab = (ph, n) => { const P = phaseOf(ph); const x = P && P.p.find(q => String(q[0]) === String(n)); return x ? `${x[0]}. ${x[1]}` : ""; };
const reflexFaite = e => REFLEX.every(([k]) => e.r && typeof e.r[k] === "string" && e.r[k].trim().length > 0);
const carnetList = () => Object.entries(S.carnet || {}).map(([id, e]) => ({ id, ...e })).filter(e => e && GROUPS[e.groupe]);
function bmfStatut(e) {
  if (reflexFaite(e)) return ["Analysée", "ok"];
  if (e.date && e.date <= today()) return ["Analyse à faire", "no"];
  return ["Prévue", ""];
}
function bmfCompteur() {
  const L = carnetList(), out = {};
  for (const g of Object.keys(BMF_OBJ)) out[g] = { s: L.filter(e => e.groupe === g && e.kind === "seance" && reflexFaite(e)).length, m: L.filter(e => e.groupe === g && e.kind === "match" && reflexFaite(e)).length };
  out.np = L.filter(e => e.kind === "seance" && e.np && reflexFaite(e)).length;
  return out;
}
function nextNum(g) { return 1 + Math.max(0, ...carnetList().filter(e => e.groupe === g && e.kind === "seance").map(e => +e.num || 0)); }
function newSeance(g, date) {
  const n = g === "U10" ? 6 : 4;
  return { kind: "seance", groupe: g, date: date || today(), num: nextNum(g), phase: "", principe: "", objectif: "", effectif: "", duree: g === "U10" ? "1h15" : "1h30", np: false,
    procedes: Array.from({ length: n }, () => ({ type: "", surface: "", sequence: "", objectif: "", buts: "", consignes: "", rotations: "", comportements: "", criteres: "" })), r: {} };
}
function newMatch(g, date) {
  return { kind: "match", groupe: g, date: date || today(), journee: "", domext: "Domicile", conditions: "", adversaire: "", resultat: "", scoreF: "", scoreMT: "", systeme: g === "U10" ? "" : "1-4-3-3",
    compo: [], causerie: "", objOffDef: "", supports: "", mtForts: "", mtAmeliorer: "", offPos: "", offPb: "", defPos: "", defPb: "", chgJoueurs: "", chgTactiques: "", r: {} };
}
async function saveCarnet(id, data) {
  const clean = JSON.parse(JSON.stringify({ ...data, at: new Date().toISOString() }));
  delete clean.id;
  if (S.demo) { S.carnet = { ...(S.carnet || {}), [id]: clean }; return; }
  await S.db.doc("carnet/" + id).set(clean);
}
function openCarnet(id, draft) { S.dash = false; S.bmf = true; S.bmfEdit = id; S.bmfDraft = JSON.parse(JSON.stringify(draft)); S.view = "list"; render(); }

/* champ texte lié au brouillon */
function fld(obj, key, lab, opts = {}) {
  const el = opts.area ? h("textarea", { rows: String(opts.rows || 3), maxlength: String(opts.max || 4000), placeholder: opts.ph || "" }) : h("input", { type: opts.type || "text", maxlength: String(opts.max || 200), placeholder: opts.ph || "", inputmode: opts.inputmode || null });
  el.value = obj[key] == null ? "" : obj[key];
  el.addEventListener("input", () => { obj[key] = el.value; S.bmfDirty = true; });
  return h("label", { class: "field" + (opts.cls ? " " + opts.cls : "") }, lab, el);
}
function sel(obj, key, lab, options, onChange) {
  const s = h("select", {}, options.map(([v, l]) => h("option", { value: v, selected: String(obj[key]) === String(v) }, l)));
  s.addEventListener("change", () => { obj[key] = s.value; S.bmfDirty = true; onChange && onChange(s.value); });
  return h("label", { class: "field" }, lab, s);
}

function reflexBlock(d, quoi) {
  const box = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, `Analyse réflexive ${quoi === "match" ? "du match" : "de la séance"}`),
    h("p", { class: "note", style: "margin:0" }, "Les 6 questions du carnet de l'éducateur. Sur téléphone, tu peux dicter avec le micro du clavier. Tout est gardé en brouillon tant que tu enregistres."));
  d.r = d.r || {};
  REFLEX.forEach(([k, lab, aide, ph], i) => {
    const t = h("textarea", { rows: "4", maxlength: "4000", placeholder: ph }); t.value = d.r[k] || "";
    t.addEventListener("input", () => { d.r[k] = t.value; S.bmfDirty = true; });
    const item = h("div", { class: "rq" }, h("div", { class: "rq-h" }, h("span", { class: "rq-n" }, String(i + 1)), h("b", {}, lab)), h("p", { class: "rq-a" }, aide), t);
    if (k === "contexte") {
      const b = h("button", { type: "button", class: "linkbtn" }, quoi === "match" ? "Reprendre les infos du match" : "Reprendre ce que j'avais prévu");
      b.onclick = () => { const txt = quoi === "match" ? resumeMatch(d) : resumeSeance(d); t.value = (t.value.trim() ? t.value.trim() + "\n" : "") + txt; d.r[k] = t.value; S.bmfDirty = true; };
      item.append(b);
    }
    box.append(item);
  });
  return box;
}
function presentsLe(g, date, type) { let ok = 0, n = 0; for (const [, f] of dFiches(g)) for (const p of (f.presences || [])) if (p && p.date === date && (!type || p.type === type)) { n++; if (p.p) ok++; } return n ? `${ok} présents sur ${n}` : ""; }
function resumeSeance(d) {
  const pres = presentsLe(d.groupe, d.date, "Entraînement");
  const procs = (d.procedes || []).map((p, i) => p.type || p.objectif ? `${i + 1}. ${[p.type, p.objectif].filter(Boolean).join(" : ")}` : null).filter(Boolean);
  return [`Séance n°${d.num || "?"} ${GROUPS[d.groupe].label} du ${fmtLong(d.date)}${pres ? ", " + pres : ""}${d.effectif ? " (effectif prévu : " + d.effectif + ")" : ""}.`,
    d.phase ? `Phase de jeu : ${phaseOf(d.phase).l}${d.principe ? ", principe " + principeLab(d.phase, d.principe) : ""}.` : "",
    d.objectif ? `Objectif de la séance : ${d.objectif}.` : "", procs.length ? "Procédés prévus : " + procs.join(" ; ") + "." : ""].filter(Boolean).join("\n");
}
function resumeMatch(d) {
  return [`Match ${GROUPS[d.groupe].label}${d.journee ? " (J" + d.journee + ")" : ""} du ${fmtLong(d.date)} contre ${d.adversaire || "?"}, ${String(d.domext || "").toLowerCase()}${d.conditions ? ", " + d.conditions : ""}.`,
    d.systeme ? `Système : ${d.systeme}.` : "", d.objOffDef ? `Objectifs offensifs et défensifs : ${d.objOffDef}.` : "", d.causerie ? `Idées fortes de la causerie : ${d.causerie}.` : ""].filter(Boolean).join("\n");
}

function seanceForm(d) {
  const box = h("div", { class: "stack" });
  const head = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "La séance prévue"));
  const prin = h("div");
  const drawPrin = () => { prin.replaceChildren(); const P = phaseOf(d.phase); if (!P) { d.principe = ""; return; } if (!P.p.some(q => String(q[0]) === String(d.principe))) d.principe = String(P.p[0][0]); prin.append(sel(d, "principe", "Principe de jeu", P.p.map(([n, l]) => [String(n), `${n}. ${l}`]))); };
  head.append(h("div", { class: "row" },
    sel(d, "groupe", "Catégorie", Object.entries(GROUPS).map(([g, G]) => [g, G.label])),
    fld(d, "date", "Date", { type: "date" }), fld(d, "num", "Séance n°", { type: "number", inputmode: "numeric", cls: "f-s" })),
    h("div", { class: "row" }, sel(d, "phase", "Phase de jeu", [["", "Choisir…"], ...PHASES.map(p => [p.k, `${p.l} (${p.bloc.toLowerCase()})`])], drawPrin), prin),
    fld(d, "objectif", "Objectif de la séance", { max: 300, ph: "Ex. : créer et utiliser des espaces pour progresser vers le but" }),
    h("div", { class: "row" }, fld(d, "effectif", "Effectif", { inputmode: "numeric", cls: "f-s" }), fld(d, "duree", "Durée", { cls: "f-s" }),
      h("label", { class: "check" }, (() => { const c = h("input", { type: "checkbox" }); c.checked = !!d.np; c.onchange = () => { d.np = c.checked; S.bmfDirty = true; }; return c; })(), "Nouvelles pratiques ou futsal")));
  drawPrin();
  box.append(head);
  // les procédés ne se saisissent plus ici (Nico garde la séance prévue et l'analyse réflexive) ; ceux déjà enregistrés restent dans la fiche et l'export
  box.append(reflexBlock(d, "seance"));
  return box;
}
function matchForm(d) {
  const box = h("div", { class: "stack" });
  const info = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Le match"));
  const fillMsg = h("span", { class: "note" });
  const remplir = h("button", { type: "button", class: "btn ghost small" }, "Remplir depuis mes notes et le championnat");
  remplir.onclick = () => {
    const out = [];
    if (d.groupe === "U19" && S.champ && Array.isArray(S.champ.matchs)) {
      const c = S.champ, ME = c.equipe || "USM ENDOUME CATALANS", sh = t => (c.noms && c.noms[t]) || t, m = c.matchs.find(x => x.date === d.date);
      if (m) { const dom = m.h === ME; d.journee = String(m.j); d.adversaire = sh(dom ? m.a : m.h); d.domext = dom ? "Domicile" : "Extérieur";
        if (m.score) { const [a, b] = m.score, nous = dom ? a : b, eux = dom ? b : a; d.scoreF = `${nous}-${eux}`; d.resultat = nous > eux ? "Gagné" : nous < eux ? "Perdu" : "Nul"; } out.push("championnat"); }
    }
    const compo = [];
    for (const [fid, f] of dFiches(d.groupe)) { const n = sortedNotes(f).find(x => x.date === d.date && x.type === "Match"); if (!n) continue; const a = noteAvg(n, d.groupe);
      compo.push({ fid, nom: f.nom || "?", min: n.stats && typeof n.stats.min === "number" ? String(n.stats.min) : "", note: a == null ? "" : n1(a), rem: n.com || "" }); }
    if (compo.length) { d.compo = compo.sort((a, b) => a.nom.localeCompare(b.nom, "fr")); out.push(`${compo.length} joueurs notés`); }
    S.bmfDirty = true; S.bmfFill = out.length ? "Rempli : " + out.join(", ") + "." : "Rien trouvé à cette date. Note d'abord le match (Noter une séance › Match).";
    render();
  };
  info.append(h("div", { class: "row" }, sel(d, "groupe", "Catégorie", Object.entries(GROUPS).map(([g, G]) => [g, G.label])), fld(d, "date", "Date", { type: "date" }), fld(d, "journee", "Journée n°", { cls: "f-s", inputmode: "numeric" })),
    h("div", { class: "row" }, remplir, fillMsg),
    h("div", { class: "row" }, fld(d, "adversaire", "Équipe adverse"), sel(d, "domext", "Lieu", [["Domicile", "Domicile"], ["Extérieur", "Extérieur"]]), fld(d, "conditions", "Conditions de jeu", { ph: "Synthétique, vent…" })),
    h("div", { class: "row" }, sel(d, "resultat", "Résultat", [["", "–"], ["Gagné", "Gagné"], ["Nul", "Nul"], ["Perdu", "Perdu"]]), fld(d, "scoreF", "Score final", { cls: "f-s", ph: "2-1" }), fld(d, "scoreMT", "Score mi-temps", { cls: "f-s", ph: "1-0" }), fld(d, "systeme", "Système de jeu", { cls: "f-s" })));
  if (S.bmfFill) { fillMsg.textContent = S.bmfFill; S.bmfFill = ""; }
  box.append(info);
  // composition
  const comp = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Composition de l'équipe"), h("p", { class: "note", style: "margin:0" }, "Nom, temps de jeu, note sur 5, remarque."));
  const rows = h("div", { class: "stack", style: "gap:6px" });
  const drawComp = () => {
    rows.replaceChildren();
    d.compo.forEach((j, i) => {
      const ln = h("div", { class: "compo-l" }, fld(j, "nom", "", { ph: "Nom" }), fld(j, "min", "", { ph: "min", inputmode: "numeric", cls: "f-xs" }), fld(j, "note", "", { ph: "/5", cls: "f-xs" }), fld(j, "rem", "", { ph: "Remarque" }),
        h("button", { type: "button", class: "linkbtn danger", "aria-label": "Retirer", onclick: () => { d.compo.splice(i, 1); S.bmfDirty = true; drawComp(); } }, "×"));
      rows.append(ln);
    });
  };
  drawComp();
  comp.append(rows, h("button", { type: "button", class: "btn ghost small", style: "align-self:flex-start", onclick: () => { d.compo.push({ nom: "", min: "", note: "", rem: "" }); drawComp(); } }, "Ajouter un joueur"));
  box.append(comp);
  box.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Causerie d'avant-match"),
    fld(d, "causerie", "Plan de causerie et idées fortes", { area: true }), fld(d, "objOffDef", "Objectifs offensifs et défensifs, en lien avec l'entraînement", { area: true }), fld(d, "supports", "Supports et méthodes", { area: true, rows: 2 })));
  box.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Analyse à la mi-temps"), h("div", { class: "two" }, fld(d, "mtForts", "Points forts", { area: true }), fld(d, "mtAmeliorer", "Points à améliorer", { area: true }))));
  box.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Bilan du match"),
    h("b", {}, "Sur le plan offensif"), h("div", { class: "two" }, fld(d, "offPos", "Points positifs", { area: true }), fld(d, "offPb", "Problèmes rencontrés", { area: true })),
    h("b", {}, "Sur le plan défensif"), h("div", { class: "two" }, fld(d, "defPos", "Points positifs", { area: true }), fld(d, "defPb", "Problèmes rencontrés", { area: true }))));
  box.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Impact de mes décisions pendant le match"), h("div", { class: "two" }, fld(d, "chgJoueurs", "Changements de joueurs", { area: true }), fld(d, "chgTactiques", "Changements tactiques", { area: true }))));
  box.append(reflexBlock(d, "match"));
  return box;
}
function carnetEdit() {
  const id = S.bmfEdit, d = S.bmfDraft, isNew = !S.carnet || !S.carnet[id];
  const box = h("div", { class: "stack" });
  box.append(h("div", { class: "bar" }, h("h2", {}, d.kind === "match" ? "Fiche de match" : `Séance n°${d.num || ""}`),
    h("button", { class: "btn ghost small", onclick: () => { if (S.bmfDirty && !confirm("Quitter sans enregistrer ?")) return; S.bmfEdit = null; S.bmfDraft = null; S.bmfDirty = false; render(); } }, "Retour au carnet")));
  box.append(d.kind === "match" ? matchForm(d) : seanceForm(d));
  const msg = h("span", { class: "note" });
  const save = h("button", { class: "btn" }, "Enregistrer");
  save.onclick = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || "")) { msg.className = "err"; msg.textContent = "Choisis une date."; return; }
    save.disabled = true; msg.className = "note"; msg.textContent = "Enregistrement…";
    try { await saveCarnet(id, d); S.bmfDirty = false; msg.className = "ok"; msg.textContent = reflexFaite(d) ? "Enregistré. Analyse complète." : "Enregistré en brouillon."; }
    catch (e) { msg.className = "err"; msg.textContent = "Échec : vérifie ta connexion et réessaie."; }
    save.disabled = false;
  };
  const pdf = h("button", { class: "btn ghost" }, "PDF"); pdf.onclick = () => printCarnet([{ id, ...d }]);
  const bar = h("div", { class: "row save-bar" }, save, pdf, msg);
  if (!isNew) { const del = h("button", { class: "linkbtn danger" }, "Supprimer"); del.onclick = async () => { if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmer la suppression"; return; } try { if (S.demo) delete S.carnet[id]; else await S.db.doc("carnet/" + id).delete(); S.bmfEdit = null; S.bmfDraft = null; S.bmfDirty = false; render(); } catch (e) { del.textContent = "Échec"; } }; bar.append(del); }
  box.append(bar);
  return box;
}
function carnetView() {
  if (S.bmfEdit && S.bmfDraft) return carnetEdit();
  const box = h("div", { class: "stack" });
  box.append(h("div", { class: "bar" }, h("h2", {}, "Carnet BMF"),
    h("div", { class: "row" }, h("button", { class: "btn ghost", onclick: () => openCarnet(nid(), newMatch(S.bmfG || "U10")) }, "Fiche de match"),
      h("button", { class: "btn", onclick: () => openCarnet(nid(), newSeance(S.bmfG || "U10")) }, "Préparer une séance"))));
  // compteur
  const c = bmfCompteur();
  const prog = (lab, n, max) => h("div", { class: "bmf-p" }, h("div", { class: "bmf-pl" }, h("span", {}, lab), h("b", {}, `${n}/${max}`)), h("div", { class: "track" }, h("div", { class: "fill" + (n >= max ? " done" : ""), style: `width:${Math.min(100, n / max * 100)}%` })));
  box.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Où j'en suis pour le rapport de stage"), h("p", { class: "note", style: "margin:0" }, "Une séance ou un match compte quand ses 6 questions d'analyse sont remplies."),
    h("div", { class: "bmf-grid" }, prog("U10 · séances", c.U10.s, 15), prog("U10 · matchs", c.U10.m, 10), prog("U19 · séances", c.U19.s, 4), prog("U19 · match", c.U19.m, 1),
      prog("Gardiens · séances", c.GB.s, 4), prog("Gardiens · match", c.GB.m, 1), prog("Nouvelles pratiques / futsal", c.np, 5))));
  // filtres
  const fg = S.bmfG || "U10";
  box.append(h("div", { class: "d-chips" }, Object.entries(GROUPS).map(([g, G]) => h("button", { class: "opt", "aria-pressed": String(fg === g), onclick: () => { S.bmfG = g; render(); } }, G.label))));
  const L = carnetList().filter(e => e.groupe === fg).sort((a, b) => a.date < b.date ? 1 : -1);
  // volet des thèmes
  const sea = L.filter(e => e.kind === "seance").slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const vol = h("details", { class: "card bmf-vol" }, h("summary", {}, h("b", {}, `Mes thèmes et objectifs ${GROUPS[fg].label}`), h("span", { class: "note" }, ` · ${sea.length} séance${sea.length > 1 ? "s" : ""}`)));
  if (sea.length) vol.append(h("div", { class: "tablebox" }, h("table", { class: "stats" }, h("thead", {}, h("tr", {}, ["N°", "Date", "Phase de jeu", "Principe", "Objectif", ""].map(x => h("th", {}, x)))),
    h("tbody", {}, sea.map(e => h("tr", {}, h("td", {}, e.num || "–"), h("td", {}, fmtDate(e.date)), h("td", {}, e.phase ? phaseOf(e.phase).l : "–"), h("td", {}, e.principe ? principeLab(e.phase, e.principe) : "–"), h("td", {}, e.objectif || "–"), h("td", {}, h("span", { class: "pill " + bmfStatut(e)[1] }, bmfStatut(e)[0]))))))));
  else vol.append(h("p", { class: "note" }, "Aucune séance préparée pour l'instant."));
  const cnt = {}; for (const e of sea) if (e.phase) cnt[e.phase] = (cnt[e.phase] || 0) + 1;
  vol.append(h("h4", { style: "margin:14px 0 6px" }, "Les phases et principes de jeu"),
    h("div", { class: "bmf-ph" }, PHASES.map(P => h("div", { class: "bmf-phc" }, h("span", { class: "d-sub" }, P.bloc), h("b", {}, P.l, cnt[P.k] ? h("span", { class: "pill", style: "margin-left:6px" }, `${cnt[P.k]} séance${cnt[P.k] > 1 ? "s" : ""}`) : null), h("ol", { start: String(P.p[0][0]) }, P.p.map(([, l]) => h("li", {}, l)))))));
  box.append(vol);
  // liste
  if (!L.length) box.append(h("div", { class: "empty" }, `Rien dans le carnet ${GROUPS[fg].label} pour l'instant.`));
  for (const e of L) {
    const [st, cl] = bmfStatut(e);
    box.append(h("div", { class: "d-row" },
      h("div", { class: "d-main" }, h("div", { class: "row", style: "gap:6px" }, h("span", { class: "pill" + (e.kind === "match" ? " match" : "") }, e.kind === "match" ? "Match" : `Séance ${e.num || ""}`), h("span", { class: "pill " + cl }, st)),
        h("b", {}, e.kind === "match" ? `${e.adversaire ? (e.domext === "Extérieur" ? "À " : "Contre ") + e.adversaire : "Match"}${e.scoreF ? " · " + e.scoreF : ""}` : (e.objectif || (e.phase ? phaseOf(e.phase).l : "Séance"))),
        h("span", { class: "d-sub" }, `${fmtLong(e.date)}${e.kind === "seance" && e.phase ? " · " + phaseOf(e.phase).l : ""}`)),
      h("button", { class: "btn small ghost", onclick: () => openCarnet(e.id, e) }, "Ouvrir")));
  }
  const fin = L.filter(e => reflexFaite(e));
  if (fin.length) box.append(h("button", { class: "btn ghost small", style: "align-self:flex-start", onclick: () => printCarnet(fin.slice().sort((a, b) => a.date < b.date ? -1 : 1)) }, fin.length > 1 ? `Exporter les ${fin.length} fiches analysées ${GROUPS[fg].label} en PDF` : `Exporter la fiche analysée ${GROUPS[fg].label} en PDF`));
  return box;
}

/* export PDF : page imprimable, « Enregistrer en PDF » dans la fenêtre d'impression */
function printCarnet(list) {
  const e = s => esc(s == null ? "" : String(s)).replace(/\n/g, "<br>");
  const reflex = x => `<h2>Analyse réflexive ${x.kind === "match" ? "de match" : "de séance"}</h2>` + REFLEX.map(([k, l, aide]) => `<div class="q"><div class="qh">${e(aide)}</div><div class="qa">${e((x.r || {})[k]) || "&nbsp;"}</div></div>`).join("");
  const seance = x => `<section class="land"><h1>Fiche de séance · ${e(GROUPS[x.groupe].label)}</h1><table class="hd"><tr><th>Séance n°</th><td>${e(x.num)}</td><th>Phase de jeu</th><td colspan="3">${x.phase ? e(phaseOf(x.phase).l) : ""}${x.principe ? " · " + e(principeLab(x.phase, x.principe)) : ""}</td></tr>
    <tr><th>Catégorie</th><td>${e(GROUPS[x.groupe].label)}</td><th>Effectif</th><td>${e(x.effectif)}</td><th>Durée</th><td>${e(x.duree)}</td></tr><tr><th>Date</th><td>${e(fmtLong(x.date))}</td><th>Objectif</th><td colspan="3">${e(x.objectif)}</td></tr></table>
    <div class="procs">${(x.procedes || []).map((p, i) => `<div class="pr"><div class="prh"><b>${i + 1}</b> ${e(p.type)}<span>Surface : ${e(p.surface)} · Séquence : ${e(p.sequence)}</span></div><div class="sch">Schéma</div>${PROC_CHAMPS.map(([k, l]) => `<div class="lab">${e(l)}</div><div class="val">${e(p[k]) || "&nbsp;"}</div>`).join("")}</div>`).join("")}</div></section>
    <section>${reflex(x)}</section>`;
  const match = x => `<section><h1>Fiche de match · ${e(GROUPS[x.groupe].label)}</h1><table class="hd"><tr><th>Journée n°</th><td>${e(x.journee)}</td><th>Date</th><td>${e(fmtLong(x.date))}</td><th>Lieu</th><td>${e(x.domext)}</td></tr>
    <tr><th>Équipe adverse</th><td>${e(x.adversaire)}</td><th>Conditions</th><td>${e(x.conditions)}</td><th>Résultat</th><td>${e(x.resultat)}</td></tr><tr><th>Score final</th><td>${e(x.scoreF)}</td><th>Score mi-temps</th><td>${e(x.scoreMT)}</td><th>Système</th><td>${e(x.systeme)}</td></tr></table>
    <h2>Composition de l'équipe</h2><table class="cp"><tr><th></th><th>Noms</th><th>Tps de jeu</th><th>Note/5</th><th>Remarques</th></tr>${(x.compo || []).map((j, i) => `<tr><td>${i + 1}</td><td>${e(j.nom)}</td><td>${e(j.min)}</td><td>${e(j.note)}</td><td>${e(j.rem)}</td></tr>`).join("")}</table>
    <h2>Causerie d'avant-match</h2><div class="lab">Plan de causerie et idées fortes</div><div class="val">${e(x.causerie)}</div><div class="lab">Objectifs off./déf. en lien avec l'entraînement</div><div class="val">${e(x.objOffDef)}</div><div class="lab">Supports et méthodes</div><div class="val">${e(x.supports)}</div>
    <h2>Analyse mi-temps</h2><table class="g2"><tr><th>Points forts</th><th>Points à améliorer</th></tr><tr><td>${e(x.mtForts)}</td><td>${e(x.mtAmeliorer)}</td></tr></table>
    <h2>Bilan du match</h2><table class="g2"><tr><th colspan="2">Sur le plan offensif</th></tr><tr><th>Points positifs</th><th>Problèmes rencontrés</th></tr><tr><td>${e(x.offPos)}</td><td>${e(x.offPb)}</td></tr><tr><th colspan="2">Sur le plan défensif</th></tr><tr><th>Points positifs</th><th>Problèmes rencontrés</th></tr><tr><td>${e(x.defPos)}</td><td>${e(x.defPb)}</td></tr></table>
    <h2>Impact des décisions de l'éducateur durant le match</h2><table class="g2"><tr><th>Changements de joueurs</th><th>Changements tactiques</th></tr><tr><td>${e(x.chgJoueurs)}</td><td>${e(x.chgTactiques)}</td></tr></table></section>
    <section>${reflex(x)}</section>`;
  const css = `@page{size:A4;margin:12mm}@page land{size:A4 landscape;margin:10mm}body{font:10.5pt/1.35 Arial,Helvetica,sans-serif;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}section{page-break-after:always}section:last-child{page-break-after:auto}.land{page:land}
    h1{font-size:16pt;margin:0 0 8px;color:#0b2a6f}h2{font-size:12pt;margin:14px 0 6px;color:#0b2a6f;text-transform:uppercase;letter-spacing:.03em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #9aa4b8;padding:4px 6px;text-align:left;vertical-align:top}th{background:#e8edf7;font-size:9pt;text-transform:uppercase}
    .hd{margin-bottom:8px}.procs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.pr{border:1px solid #0b2a6f;break-inside:avoid;font-size:8.5pt}.prh{background:#0b2a6f;color:#fff;padding:3px 6px}.prh span{float:right;font-size:8pt}.sch{height:90px;border-bottom:1px solid #9aa4b8;color:#aaa;text-align:center;line-height:90px;font-size:8pt}
    .lab{background:#e8edf7;font-weight:bold;font-size:8pt;text-transform:uppercase;padding:2px 6px;border-top:1px solid #9aa4b8;text-align:center}.val{padding:3px 6px;min-height:14px}section>.lab{text-align:left}
    .q{border:1px solid #9aa4b8;margin-bottom:6px;break-inside:avoid}.qh{background:#e8edf7;padding:5px 8px;font-weight:bold}.qa{padding:8px;min-height:40px}.g2 td{height:50px;width:50%}.cp td:first-child{width:18px}`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Carnet BMF</title><style>${css}</style></head><body>${list.map(x => x.kind === "match" ? match(x) : seance(x)).join("")}</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Autorise les fenêtres pop-up pour ce site, puis réessaie."); return; }
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (err) {} }, 400);
}

