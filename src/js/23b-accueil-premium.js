/* ---------- accueil premium : joueur (U19, gardiens) et coach ----------
   La carte joueur n'est PAS redessinée ici : on appelle fcard(), la carte du site, telle quelle. */

/* semaine : du lundi au dimanche */
const finSem = l => plusJours(l, 6);
function numSemaine(d) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7)); const j = new Date(x.getFullYear(), 0, 4); return 1 + Math.round(((x - j) / 864e5 - 3 + ((j.getDay() + 6) % 7)) / 7); }
function libSemaine(l) {
  const a = new Date(l + "T12:00:00"), b = new Date(finSem(l) + "T12:00:00");
  const m = x => x.toLocaleDateString("fr-FR", { month: "short" });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
}
const nomCourt = n => { const w = (n || "?").trim().split(/\s+/); return w.length < 2 ? w[0] : `${w[0]} ${w[w.length - 1][0].toUpperCase()}.`; };
const critsEnt = g => GRILLES[g] ? GRILLES[g].E : GROUPS[g].crit;
const notesEnt = (f, g) => { const c = critsEnt(g); return sortedNotes(f).filter(n => n.type !== "Match" && !isOldNote(n, g) && n.crit && c.some(x => typeof n.crit[x[0]] === "number")); };

/* Indice Endoume : la note de la carte (moyenne des 5 dernières évaluations, sur 100), calculée à une date donnée */
function indiceA(f, fin) {
  const g = groupOf(f), v = sortedNotes(f).filter(n => n.date <= fin).slice(-5).map(n => noteAvg(n, g)).filter(x => x != null);
  return v.length ? Math.round(mean(v) * 20) : null;
}
function serieIndice(f, nb) {
  const l0 = lundiDe(today()), out = [];
  for (let i = nb - 1; i >= 0; i--) { const l = plusJours(l0, -7 * i); out.push({ l, v: indiceA(f, i ? finSem(l) : today()) }); }
  return out;
}
/* moyenne d'un groupe par critère d'entraînement (5 dernières notes de chaque joueur) et liste anonyme des indices */
function calculStatsGroupe(g) {
  const fs = dFiches(g).filter(([, f]) => S.demo || !f.exemple), crits = critsEnt(g), moyE = {}, dist = [];
  for (const [k] of crits) { const v = fs.map(([, f]) => critAvg(notesEnt(f, g).slice(-5), k)).filter(x => x != null); if (v.length) moyE[k] = Math.round(mean(v) * 10) / 10; }
  for (const [, f] of fs) { const v = indiceA(f, today()); if (v != null) dist.push(v); }
  return { moyE, dist: dist.sort((a, b) => b - a), sem: lundiDe(today()) };
}
const statsGroupe = g => (S.admin || S.demo) ? calculStatsGroupe(g) : ((S.equipes[g] || {}).indices || null);
/* le coach publie ces chiffres anonymes dans equipe/{groupe} : le joueur ne peut pas lire les fiches des autres */
function publierStatsGroupes() {
  if (!S.admin || S.scope || S.demo || !S.loaded) return;
  const t = Date.now(); if (S.statsPub && t - S.statsPub < 60000) return; S.statsPub = t;
  for (const g of ["U19", "GB"]) {
    const st = calculStatsGroupe(g), cur = (S.equipes[g] || {}).indices;
    if (!st.dist.length || (cur && stable(cur) === stable(st))) continue;
    writeEquipe(g, { indices: st }).catch(() => {});
  }
}

/* objectif de la semaine, choisi automatiquement le lundi (avec les notes d'avant ce lundi, donc fixe toute la semaine) */
function objectifSemaine(fid, f) {
  const g = groupOf(f), crits = critsEnt(g), lundi = lundiDe(today()), ent = notesEnt(f, g);
  let src = ent.filter(n => n.date >= plusJours(lundi, -14) && n.date < lundi);
  if (!src.length) src = ent.filter(n => n.date < lundi).slice(-4);
  const perso = f.objSem && f.objSem.sem === lundi && f.objSem.txt ? f.objSem.txt : "";
  if (!src.length) return { vide: true, perso, lundi };
  const vals = crits.map(([k, lab]) => [k, lab, critAvg(src, k)]).filter(x => x[2] != null);
  if (!vals.length) return { vide: true, perso, lundi };
  const faible = vals.reduce((a, b) => b[2] < a[2] - 1e-9 ? b : a);
  const moySem = l => mean(ent.filter(n => n.date >= l && n.date <= finSem(l)).map(n => noteAvg(n, g)).filter(x => x != null));
  const w1 = moySem(plusJours(lundi, -7)), w2 = moySem(plusJours(lundi, -14)), w3 = moySem(plusJours(lundi, -21));
  const toutes = [...new Set(ent.filter(n => n.date < lundi).map(n => lundiDe(n.date)))].map(moySem).filter(x => x != null);
  let mode = "monte";
  if (faible[2] >= 4) mode = "garde";
  else if (w1 != null && w2 != null && w3 != null && w1 < w2 && w2 < w3) mode = "baisse";
  else if (w1 != null && w2 != null && w1 > w2 && toutes.length >= 3 && w1 >= Math.max(...toutes) - 1e-9) mode = "confirme";
  const [k, lab, v] = faible, cible = mode === "garde" ? 4 : Math.min(5, Math.floor(v + 1e-9) + 1), labMin = lab.charAt(0).toLowerCase() + lab.slice(1);
  const titre = mode === "garde" ? ["Garde ce niveau", "sur toute la", "semaine."] : mode === "confirme" ? ["Confirme ta", "meilleure", "semaine."] : mode === "baisse" ? ["Retrouve ton", "niveau en", labMin + "."] : ["Monte d'un cran", "en", labMin + "."];
  const desc = DESC[k] ? DESC[k] + " " : "", descMin = DESC[k] ? DESC[k].charAt(0).toLowerCase() + DESC[k].slice(1) + " " : "";
  const phrase = mode === "garde" ? "Tu es à 4 ou plus sur tous les critères. Tiens ce niveau à chaque séance."
    : mode === "confirme" ? `Ta dernière semaine est ta meilleure de la saison. Pour la confirmer, appuie-toi sur ${labMin} : ${descMin}Tu es à ${n1(v)} : vise ${cible}.`
    : `${desc}Tu es à ${n1(v)} : vise ${cible} cette semaine.`;
  // conditions de la semaine en cours, cochées toutes seules
  const fin = finSem(lundi), pres = (Array.isArray(f.presences) ? f.presences : []).filter(x => compteAssid(x) && x.date >= lundi && x.date <= fin);
  const ven = plusJours(lundi, 4), autoOk = (S.autos[fid] || []).some(a => a.type !== "Match" && a.date === ven);
  const cette = ent.filter(n => n.date >= lundi && n.date <= fin);
  const critOk = mode === "garde" ? cette.length > 0 && crits.every(([kk]) => { const a = critAvg(cette, kk); return a == null || a >= 4; }) : (critAvg(cette, k) || 0) >= cible;
  const conds = [
    [pres.length > 0 && pres.every(x => x.p), pres.length > 1 ? `Présent aux ${pres.length} séances` : "Présent à toutes les séances"],
    [autoOk, "Auto-évaluation faite"],
    [critOk, mode === "garde" ? "Tous les critères à 4 ou plus" : `${lab} à ${cible} ou plus`]];
  return { k, lab, v, cible, mode, titre, phrase, perso, conds, lundi };
}

/* pastille de section */
const secT = (t, droite) => h("div", { class: "acc-st" }, h("h2", { class: "acc-h" }, t), droite ? h("span", { class: "acc-meta" }, droite) : null);
const coche = (ok, txt) => h("div", { class: "acc-cond" + (ok ? " ok" : "") }, h("span", { class: "acc-ck", "aria-hidden": "true" }, ok ? "✓" : ""), h("span", {}, txt), h("span", { class: "sr" }, ok ? " (fait)" : " (pas encore)"));
function courbeIndice(serie) {
  const W = 300, H = 56, pts = serie.map((p, i) => [i * W / (serie.length - 1), p.v]).filter(p => p[1] != null);
  if (pts.length < 2) return null;
  const vs = pts.map(p => p[1]), lo = Math.min(...vs) - 4, hi = Math.max(...vs) + 4, y = v => 4 + (hi - v) / (hi - lo) * (H - 10);
  const d = pts.map(p => `${p[0].toFixed(1)},${y(p[1]).toFixed(1)}`).join(" "), l = pts[pts.length - 1];
  const el = h("div", { class: "acc-courbe" });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Évolution de l'indice sur ${serie.length} semaines, de ${vs[0]} à ${vs[vs.length - 1]}"><line x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}" stroke="#2a2626"/><polyline points="${d}" fill="none" stroke="#c9a24a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg><i style="left:${(l[0] / W * 100).toFixed(1)}%;top:${(y(l[1]) / H * 100).toFixed(1)}%"></i>`;
  return el;
}
function radarAcc(g, mes, grp) {
  const crits = critsEnt(g), n = crits.length, cx = 150, cy = 128, R = 88;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 5, cy + Math.sin(a) * R * v / 5]; };
  const poly = vals => crits.map(([k], i) => pt(i, typeof vals[k] === "number" ? vals[k] : 0).map(x => x.toFixed(1)).join(",")).join(" ");
  let s = `<svg viewBox="0 0 300 262" role="img" aria-label="${esc("Profil de jeu : " + crits.map(([k, l]) => `${RLAB[k] || l} ${n1(mes[k])}`).join(", ") + (grp ? ", comparé à la moyenne du groupe" : ""))}">`;
  for (const v of [5, 2.5]) s += `<polygon points="${poly(Object.fromEntries(crits.map(([k]) => [k, v])))}" fill="none" stroke="#2e2a2a"/>`;
  crits.forEach((_, i) => { const [x, y] = pt(i, 5); s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2e2a2a"/>`; });
  if (grp && Object.keys(grp).length >= 3) s += `<polygon points="${poly(grp)}" fill="none" stroke="#75706a" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  s += `<polygon points="${poly(mes)}" fill="#c8102e" fill-opacity=".35" stroke="#c8102e" stroke-width="2" stroke-linejoin="round"/>`;
  crits.forEach(([k], i) => { if (typeof mes[k] !== "number") return; const [x, y] = pt(i, mes[k]); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#c9a24a"/>`; });
  crits.forEach(([k, l], i) => {
    const [lx, ly] = pt(i, 6.15), anc = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "end" : "start";
    const x = anc === "end" ? Math.min(298, lx + 30) : anc === "start" ? Math.max(2, lx - 30) : lx;
    s += `<text x="${x.toFixed(1)}" y="${(ly + (ly > cy ? 10 : 0)).toFixed(1)}" text-anchor="${anc}" font-size="11" fill="#cfc8bd">${esc(RLAB[k] || l)} ${typeof mes[k] === "number" ? n1(mes[k]) : "–"}</text>`;
  });
  const el = h("div", { class: "acc-radar" }); el.innerHTML = s + "</svg>"; return el;
}
function prochainMatch(fid, g) {
  const c = g === "U19" ? S.champ : null, ME = c && (c.equipe || "USM ENDOUME CATALANS");
  const m = c && Array.isArray(c.matchs) ? c.matchs.filter(x => !x.score && x.date && x.date.slice(0, 10) >= today()).sort((a, b) => a.date < b.date ? -1 : 1)[0] : null;
  const compo = ((S.equipes[g] || {}).compos || []).filter(x => x.date >= today()).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  if (!m && !compo) return null;
  const date = m ? m.date.slice(0, 10) : compo.date;
  const cp = compo && (!m || compo.date === date) ? compo : null;
  const dom = m ? m.h === ME : null, sh = t => (c && c.noms && c.noms[t]) || t;
  const titre = m ? `Endoume – ${sh(dom ? m.a : m.h)}` : cp.titre.replace(/^J\d+\s*·\s*/, "");
  const jour = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }).toUpperCase();
  const conv = cp ? [...(cp.xi || []), ...(cp.rempl || [])].includes(fid) : null, tit = cp && (cp.xi || []).includes(fid);
  const etat = cp == null ? "Convocation à venir" : conv ? (tit ? "Convoqué · titulaire" : "Convoqué") : "Pas convoqué";
  return h("button", { class: "acc-match", onclick: () => { S.psub = "equipe"; render(); } },
    h("span", { class: "acc-mt" }, h("span", { class: "acc-mj" }, `${m ? "J" + m.j + " · " : ""}${jour}`), h("span", { class: "acc-mn" }, titre),
      h("span", { class: "acc-ml" }, m ? `${dom ? "Stade Francis Di Giovanni" : "À l'extérieur"}${m.heure ? " · " + m.heure.replace(":", "h") : ""}` : "Voir la compo")),
    h("span", { class: "acc-conv" + (conv ? " oui" : "") }, etat));
}
function signature() { return h("div", { class: "acc-sign" }, h("div", {}, "Endoume · Catalans · Marseille"), h("i", { "aria-hidden": "true" })); }

/* l'accueil du joueur, dans l'ordre demandé : carte, indice, objectif, profil, analyse, prochain match */
function accueilJoueur(fid, fPlein) {
  const f = masquerNotes(fid, fPlein), g = groupOf(f), box = h("div", { class: "acc" });
  watchAutos(fid);
  const { todo } = autoAFaire(fPlein, S.autos[fid] || []);
  if (todo.length) box.append(h("div", { class: "acc-alerte" }, h("div", {}, h("b", {}, "🔒 Ta note t'attend"), h("span", {}, "Fais ton auto-évaluation pour la découvrir.")),
    h("button", { class: "btn small", onclick: () => { S.psub = "fiche"; render(); setTimeout(() => { const el = document.getElementById("auto-card"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); } }, "Faire")));
  // 1. la carte, telle qu'elle est sur le site
  box.append(h("section", { class: "acc-hero" }, fcard(f, false, fid)));
  // 2. Indice Endoume
  const l0 = lundiDe(today()), serie = serieIndice(f, 8), cur = serie[serie.length - 1].v, prem = serie.find(p => p.v != null);
  const st = statsGroupe(g), rang = cur != null && st && st.dist && st.dist.length >= 4 ? st.dist.filter(v => v > cur).length + 1 : null;
  const ind = h("section", { class: "acc-sec" }, secT("Indice Endoume", `Semaine ${numSemaine(today())} · ${libSemaine(l0)}`));
  if (cur == null) ind.append(h("p", { class: "note" }, "Ton indice apparaîtra après ta première évaluation."));
  else {
    const evo = prem && prem !== serie[serie.length - 1] ? cur - prem.v : null, nbS = prem ? serie.length - serie.indexOf(prem) : 0;
    ind.append(h("div", { class: "acc-ind" }, h("div", { class: "acc-big" }, String(cur), h("small", {}, "/100")),
      h("div", { class: "acc-ind-d" }, rang && rang <= 3 ? h("span", { class: "acc-top" }, "TOP 3 DU GROUPE") : rang ? h("span", { class: "acc-rang" }, `${rang}e du groupe`) : null,
        evo != null ? h("span", { class: evo >= 0 ? "acc-up" : "acc-down" }, `${evo >= 0 ? "+" : "−"}${Math.abs(evo)} en ${nbS} semaines`) : null)),
      courbeIndice(serie), h("div", { class: "acc-axe" }, h("span", {}, "S" + numSemaine(serie[0].l)), h("span", {}, "S" + numSemaine(l0))),
      h("p", { class: "acc-exp" }, "C'est la note de ta carte : la moyenne de tes 5 dernières évaluations, sur 100."));
  }
  box.append(ind);
  // 3. objectif de la semaine (automatique)
  const o = objectifSemaine(fid, f), ob = h("section", { class: "acc-obj" }, h("div", { class: "acc-ol" }, "Ton objectif cette semaine"));
  if (o.vide) ob.append(h("div", { class: "acc-ot" }, "Pose les bases."), h("p", {}, o.perso || "Ton objectif se choisira tout seul chaque lundi, dès que le coach aura noté tes entraînements."));
  else {
    const t = o.titre; ob.append(h("div", { class: "acc-ot" }, `${t[0]} ${t[1]} `, h("span", {}, t[2])), h("p", {}, o.perso || o.phrase),
      h("div", { class: "acc-conds" }, o.conds.map(([ok, txt]) => coche(ok, txt))));
  }
  box.append(ob);
  // 4. profil de jeu : lui contre la moyenne du groupe
  const mes = moyCrit(notesEnt(f, g).slice(-5), critsEnt(g));
  if (Object.keys(mes).length >= 3) {
    const grp = st && st.moyE && Object.keys(st.moyE).length >= 3 ? st.moyE : null;
    box.append(h("section", { class: "acc-sec" }, secT("Profil de jeu", grp ? `Toi vs moyenne du groupe` : "Tes 5 derniers entraînements"),
      h("div", { class: "acc-boite" }, radarAcc(g, mes, grp), h("div", { class: "acc-leg" }, h("span", {}, h("i", { class: "l-toi" }), "Toi"), grp ? h("span", {}, h("i", { class: "l-grp" }), `Groupe ${GROUPS[g].label}`) : null))));
  }
  // 5. analyse du staff
  const ent5 = notesEnt(f, g).slice(-5), mat5 = sortedNotes(f).filter(n => n.type === "Match" && !isOldNote(n, g)).slice(-5);
  const tous = [...critsEnt(g).map(([k, l]) => [k, l, critAvg(ent5, k)]), ...(GRILLES[g] ? mGrid(g, f).map(([k, l]) => [k, l, critAvg(mat5, k)]) : [])].filter(x => x[2] != null);
  const lignes = [];
  if (tous.length >= 2) {
    const fort = tous.reduce((a, b) => b[2] > a[2] ? b : a), axe = tous.reduce((a, b) => b[2] < a[2] ? b : a);
    lignes.push(["Point fort", `${fort[1]} (${n1(fort[2])}/5). ${DESC[fort[0]] || ""}`]);
    if (axe[2] < fort[2]) lignes.push(["Axe de progression", `${axe[1]} (${n1(axe[2])}/5). ${DESC[axe[0]] || ""}`]);
  }
  if (f.consigne && f.consigne.txt) lignes.push(["Consigne pour le prochain match", f.consigne.txt]);
  else { const dc = [...sortedNotes(f)].reverse().find(n => n.com && n.com.trim()); if (dc) lignes.push([`Le mot du coach · ${dc.type === "Match" ? "match" : "séance"} du ${fmtDate(dc.date)}`, dc.com]); }
  if (lignes.length) box.append(h("section", { class: "acc-sec" }, secT("Analyse du staff"),
    h("div", { class: "acc-boite acc-ana" }, lignes.map(([t, x], i) => h("div", { class: "acc-al" }, h("span", { class: "acc-an" }, String(i + 1).padStart(2, "0")), h("div", {}, h("span", { class: "acc-alt" }, t), h("p", {}, x.trim()))))),
    h("div", { class: "acc-staff" }, h("i", { "aria-hidden": "true" }), `Le staff technique ${GROUPS[g].label}`)));
  // 6. prochain match et convocation
  const pm = prochainMatch(fid, g); if (pm) box.append(pm);
  // le reste de la semaine (nouvelles notes, votes, badges, appli)
  box.append(semaineCard());
  box.append(signature());
  return box;
}

/* côté coach, sur la fiche du joueur : l'objectif automatique, la phrase à remplacer et la consigne de match */
function objectifCoachCard(fid, f) {
  const g = groupOf(f); if (g === "U10") return null;
  const o = objectifSemaine(fid, masquerNotes(fid, f)), card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Objectif de la semaine (automatique)"));
  if (o.vide) card.append(h("p", { class: "note", style: "margin:0" }, "Pas encore assez de notes d'entraînement pour le choisir."));
  else card.append(h("div", { class: "obj" }, o.titre.join(" ")), h("p", { style: "margin:0" }, o.phrase), h("p", { class: "note", style: "margin:0" }, `Critère le plus faible des 2 dernières semaines : ${o.lab} (${n1(o.v)}). Conditions : ${o.conds.map(([ok, t]) => (ok ? "✓ " : "○ ") + t).join(" · ")}`));
  if (S.scope || S.demo && !S.admin) return card;
  const ta = h("textarea", { rows: "2", maxlength: "220", placeholder: "Laisse vide pour garder la phrase automatique" }); ta.value = o.perso || "";
  const ct = h("textarea", { rows: "2", maxlength: "200", placeholder: "Ex. Décroche entre les lignes et oriente-toi vers l'avant." }); ct.value = (f.consigne && f.consigne.txt) || "";
  const m = h("span", { class: "note" });
  card.append(h("label", { class: "field" }, "Ta phrase pour cette semaine (remplace la phrase automatique, jusqu'à dimanche)", ta),
    h("label", { class: "field" }, "Consigne pour le prochain match (dans « Analyse du staff »)", ct),
    h("div", { class: "row" }, h("button", { class: "btn small", onclick: async () => {
      const txt = ta.value.trim().slice(0, 220), c = ct.value.trim().slice(0, 200);
      try { await writeFiche(fid, { objSem: txt ? { txt, sem: o.lundi } : null, consigne: c ? { txt: c, at: today() } : null }); m.textContent = "Enregistré."; } catch (e) { m.textContent = "Échec : réessaie."; }
    } }, "Enregistrer"), m));
  return card;
}

/* accueil coach : la semaine d'un groupe, en haut du tableau de bord */
function accueilCoach() {
  publierStatsGroupes();
  const gs = visG(), g = gs.includes(S.accG) ? S.accG : (gs.includes("U19") ? "U19" : gs[0]);
  const l0 = lundiDe(today()), fin = finSem(l0), lp = plusJours(l0, -7);
  const box = h("div", { class: "acc acc-coach" });
  const fs = dFiches(g).filter(([, f]) => S.demo || !f.exemple), nom = fid => nomCourt((S.fiches[fid] || {}).nom);
  const seS = Object.values(S.seances).filter(x => x && x.groupe === g && x.date >= l0 && x.date <= fin);
  const c = g === "U19" ? S.champ : null, ME = c && (c.equipe || "USM ENDOUME CATALANS");
  const mj = c && Array.isArray(c.matchs) ? c.matchs.filter(x => x.date && x.date.slice(0, 10) >= l0 && x.date.slice(0, 10) <= fin) : [];
  const resume = [libSemaine(l0), seS.filter(x => x.type !== "Match").length ? `${seS.filter(x => x.type !== "Match").length} séance${seS.filter(x => x.type !== "Match").length > 1 ? "s" : ""}` : null,
    ...mj.map(m => { const dom = m.h === ME, sc = m.score ? String(m.score).split(/[-–:]/).map(Number) : null; if (!sc || sc.length < 2) return `J${m.j} à venir`; const nous = dom ? sc[0] : sc[1], eux = dom ? sc[1] : sc[0]; return `J${m.j}, ${nous > eux ? "victoire" : nous < eux ? "défaite" : "nul"} ${nous}-${eux}`; })].filter(Boolean);
  box.append(h("section", { class: "acc-ch" }, h("div", { class: "acc-ch-l" }, `Espace staff · ${GROUPS[g].label}`),
    gs.length > 1 ? h("div", { class: "acc-gs", role: "group", "aria-label": "Groupe" }, gs.map(x => h("button", { class: "opt", "aria-pressed": String(x === g), onclick: () => { S.accG = x; render(); } }, GROUPS[x].label))) : null,
    h("div", { class: "acc-ch-t" }, `Semaine ${numSemaine(today())}`), h("div", { class: "acc-ch-s" }, resume.join(" · "))));
  if (S.flash) { box.append(h("p", { class: "ok" }, S.flash)); S.flash = ""; }
  // chiffres
  const p = presRange(g, l0, fin), pp = presRange(g, lp, plusJours(lp, 6));
  const ind = fs.map(([, f]) => indiceA(f, today())).filter(v => v != null), indP = fs.map(([, f]) => indiceA(f, plusJours(l0, -1))).filter(v => v != null);
  const im = ind.length ? Math.round(mean(ind)) : null, imP = indP.length ? Math.round(mean(indP)) : null;
  const ouiAbs = [];
  for (const se of seS) for (const [fid, oui] of Object.entries(ditOf(se))) { if (!oui || !S.fiches[fid] || groupOf(S.fiches[fid]) !== g) continue; const pr = (S.fiches[fid].presences || []).find(x => x && x.date === se.date && x.type === se.type); if (pr && !pr.p) ouiAbs.push([fid, se]); }
  const delta = (a, b, u) => a == null || b == null ? h("span", { class: "acc-k-s" }, "–") : h("span", { class: "acc-k-s " + (a - b >= 0 ? "acc-up" : "acc-down") }, `${a - b >= 0 ? "+" : "−"}${Math.abs(a - b)} ${u}`);
  box.append(h("section", { class: "acc-kpis" },
    h("div", { class: "acc-k" }, h("span", { class: "acc-k-l" }, "Présence"), h("span", { class: "acc-k-v" }, p == null ? "–" : String(Math.round(p * 100)), p == null ? null : h("small", {}, "%")), delta(p == null ? null : Math.round(p * 100), pp == null ? null : Math.round(pp * 100), "pts")),
    h("div", { class: "acc-k" }, h("span", { class: "acc-k-l" }, "Indice moyen"), h("span", { class: "acc-k-v or" }, im == null ? "–" : String(im)), delta(im, imP, "pts")),
    h("div", { class: "acc-k" }, h("span", { class: "acc-k-l" }, "Écart sondage"), h("span", { class: "acc-k-v" + (ouiAbs.length ? " rouge" : "") }, ouiAbs.length ? "−" + ouiAbs.length : "0"), h("span", { class: "acc-k-s" }, "oui sans venir"))));
  // à traiter
  const items = [];
  const go = fid => () => { S.dash = false; S.tab = g; S.view = "fiche"; S.sel = fid; render(); };
  if (g !== "U10") {
    const manq = fs.filter(([fid, f]) => !isTemp(fid) && !f.exemple && (watchAutos(fid), autoAFaire(f, S.autos[fid] || []).todo.length > 0)).map(([fid]) => fid);
    if (manq.length) items.push({ c: "or", t: `${manq.length} auto-évaluation${manq.length > 1 ? "s" : ""} manquante${manq.length > 1 ? "s" : ""}`, d: manq.map(nom).join(", "), lab: MAIL_URL ? "Relancer" : "Voir",
      go: MAIL_URL ? async () => { const r = await envoyerMails("auto", manq); S.flash = r && r.ok ? `Rappel envoyé par mail à ${r.sent} joueur${r.sent > 1 ? "s" : ""}.` : "L'envoi du rappel a échoué. Réessaie plus tard."; render(); } : () => { S.dash = false; S.tab = g; S.view = "list"; S.sub = "joueurs"; render(); } });
  }
  for (const [fid, f] of fs) {
    const se = serieIndice(f, 4).map(x => x.v);
    if (se.every(v => v != null) && se[0] > se[1] && se[1] > se[2] && se[2] > se[3]) {
      const gg = groupOf(f), avant = notesEnt(f, gg).filter(n => n.date < plusJours(l0, -21)).slice(-5), apres = notesEnt(f, gg).slice(-3);
      const chute = critsEnt(gg).map(([k, l]) => [l, (critAvg(avant, k) || 0) - (critAvg(apres, k) || 0)]).sort((a, b) => b[1] - a[1])[0];
      items.push({ c: "rouge", t: `${nom(fid)} en baisse depuis 3 semaines`, d: `Indice ${se[3]} · −${se[0] - se[3]}${chute && chute[1] > 0.2 ? " · surtout en " + chute[0].toLowerCase() : ""}`, lab: "Échanger", go: go(fid) });
    }
  }
  if (ouiAbs.length) {
    const parJour = {}; for (const [fid, se] of ouiAbs) { const j = jourLong(se.date).split(" ")[0]; (parJour[j] = parJour[j] || []).push(nom(fid)); }
    items.push({ c: "rouge", t: `${ouiAbs.length} « oui » au sondage, absent${ouiAbs.length > 1 ? "s" : ""}`, d: Object.entries(parJour).map(([j, n]) => `${j} : ${n.join(", ")}`).join(" · "), lab: "Voir", go: () => { S.dash = false; S.tab = g; S.view = "list"; S.sub = "presences"; render(); } });
  }
  const at = h("section", { class: "acc-sec" }, secT("À traiter cette semaine"));
  if (!items.length) at.append(h("div", { class: "acc-boite acc-rien" }, "✓ Rien à traiter pour l'instant."));
  else at.append(h("div", { class: "acc-boite acc-list" }, items.map(it => h("div", { class: "acc-li" }, h("i", { class: "acc-pt " + it.c, "aria-hidden": "true" }),
    h("div", { class: "acc-li-t" }, h("b", {}, it.t), h("span", {}, it.d)), h("button", { class: "linkbtn acc-act", onclick: it.go }, it.lab)))));
  box.append(at);
  // classement de l'indice
  const cl = fs.map(([fid, f]) => [fid, indiceA(f, today())]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
  if (cl.length) {
    const vus = S.accTout ? cl : cl.slice(0, 5);
    box.append(h("section", { class: "acc-sec" }, h("div", { class: "acc-st" }, h("h2", { class: "acc-h" }, "Classement indice"), cl.length > 5 ? h("button", { class: "linkbtn", onclick: () => { S.accTout = !S.accTout; render(); } }, S.accTout ? "Voir le top 5" : `Voir les ${cl.length}`) : null),
      h("div", { class: "acc-boite acc-cl" }, vus.map(([fid, v], i) => h("button", { class: "acc-cr", onclick: go(fid) }, h("span", { class: "acc-cn" + (i < 3 ? " or" : "") }, String(i + 1)), h("span", { class: "acc-cnom" }, nom(fid)),
        h("span", { class: "acc-cb" }, h("i", { class: i === 0 ? "or" : "", style: `width:${v}%` })), h("span", { class: "acc-cv" }, String(v)))))));
  }
  box.append(h("button", { class: "acc-saisir", onclick: () => { S.dash = false; S.bmf = false; S.tab = g; startSaisie(); const se = seS.find(x => x.date === today()); if (se) { S.saisie.date = se.date; S.saisie.type = se.type; render(); } } }, h("span", { "aria-hidden": "true" }, "+"), "Saisir les notes de la séance"));
  box.append(signature());
  return box;
}
