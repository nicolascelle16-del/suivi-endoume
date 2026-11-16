/* ---------- tableau de bord visuel ---------- */
/* mails restants aujourd'hui (limite Gmail d'environ 100 envois par 24 h, partagée avec le coach adjoint) */
function quotaCard() {
  lireQuota();
  const q = S.quota, n = q ? q.n : null, MAX = 100, coul = n == null ? "#7c6f4f" : n >= 40 ? "#3fae6a" : n >= 15 ? "#cdbd8f" : "#e0182d";
  return h("div", { class: "dk span2" }, h("div", { class: "dk-l" }, "Mails du jour"),
    h("div", { class: "dk-row" }, ringSVG(n == null ? null : Math.min(1, n / MAX), coul, n == null ? "…" : String(n), "restants"),
      h("div", { class: "dk-main" },
        h("div", {}, n == null ? "Lecture du compteur…" : n >= 40 ? "Large marge pour aujourd'hui." : n >= 15 ? "Attention : il en reste peu aujourd'hui." : "Presque plus de mails possibles aujourd'hui."),
        h("div", { class: "d-sub" }, "Limite Gmail : environ 100 mails par 24 h, pour toi et Seb ensemble. Le compteur repart tout seul."),
        q ? h("div", { class: "d-sub" }, `Mis à jour à ${new Date(q.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`) : null)));
}
/* cohérence des notes entre Nico et le coach adjoint (mêmes joueurs, mêmes séances) */
function accordStaff() {
  const paires = [];
  for (const [fid, f] of dFiches("U19")) for (const n of sortedNotes(f)) {
    if (!n.detail || !n.detail.coach || !n.detail.adj.length) continue;
    for (const a of n.detail.adj) for (const [k, lab] of critsForNote(n, "U19")) {
      const c = n.detail.coach[k], v = a.crit && a.crit[k];
      if (typeof c === "number" && typeof v === "number") paires.push({ fid, nom: f.nom, date: n.date, type: n.type, k, lab, c, a: v, adj: a.nom });
    }
  }
  return paires;
}
function accordCard() {
  const P = accordStaff(), card = h("div", { class: "dk span4 accord" }, h("div", { class: "dk-l" }, "Nico et le coach adjoint : même avis ?"));
  if (!P.length) { card.append(h("p", { class: "note", style: "margin:4px 0 0" }, "Pas encore de séance U19 notée par vous deux.")); return card; }
  card.firstChild.textContent = `Nico et ${P[0].adj} : même avis ?`;
  const adj = P[0].adj, d = P.map(p => p.a - p.c), proche = d.filter(x => Math.abs(x) <= 1).length / d.length, ident = d.filter(x => x === 0).length / d.length, biais = mean(d);
  const seances = new Set(P.map(p => p.date + p.type)).size, joueurs = new Set(P.map(p => p.fid)).size;
  const parCrit = {}; for (const p of P) (parCrit[p.lab] = parCrit[p.lab] || []).push(Math.abs(p.a - p.c));
  const pire = Object.entries(parCrit).filter(([, v]) => v.length >= 5).map(([l, v]) => [l, mean(v)]).sort((a, b) => b[1] - a[1])[0];
  const biaisTxt = Math.abs(biais) < .2 ? "Vous notez au même niveau." : `${adj} note en moyenne ${biais > 0 ? "plus large" : "plus sévère"} que toi (${biais > 0 ? "+" : "−"}${n1(Math.abs(biais))}).`;
  card.append(h("div", { class: "dk-row" }, ringSVG(proche, proche >= .8 ? "#3fae6a" : proche >= .6 ? "#cdbd8f" : "#e0182d", Math.round(proche * 100) + "%", "d'accord"),
    h("div", { class: "dk-main" },
      h("div", {}, h("b", {}, `${Math.round(ident * 100)}% de notes identiques`), `, ${Math.round(proche * 100)}% à 1 point près.`),
      h("div", { class: "d-sub" }, `${seances} séance${seances > 1 ? "s" : ""} notée${seances > 1 ? "s" : ""} à deux, ${joueurs} joueurs, ${P.length} critères comparés.`),
      h("div", { style: "margin-top:4px" }, biaisTxt),
      pire && pire[1] >= .5 ? h("div", { class: "d-sub" }, `Critère où vous divergez le plus : ${pire[0]} (écart moyen ${n1(pire[1])}).`) : null)));
  const gros = P.filter(p => Math.abs(p.a - p.c) >= 2).sort((a, b) => a.date < b.date ? 1 : -1);
  if (gros.length) {
    const det = h("details", { class: "acc-det" }, h("summary", {}, `${gros.length} désaccord${gros.length > 1 ? "s" : ""} de 2 points ou plus`));
    for (const p of gros.slice(0, 12)) det.append(h("button", { class: "acc-l", onclick: () => { S.dash = false; S.tab = "U19"; S.view = "fiche"; S.sel = p.fid; render(); } },
      h("span", {}, `${p.nom} · ${fmtDate(p.date)} ${p.type === "Match" ? "(match)" : ""}`), h("span", { class: "d-sub" }, `${p.lab} : toi ${p.c}, ${p.adj} ${p.a}`)));
    card.append(det);
  } else card.append(h("p", { class: "d-sub", style: "margin:6px 0 0" }, "Aucun désaccord de 2 points ou plus. 👍"));
  return card;
}
function ringSVG(pct, color, big, small) {
  const r = 34, C = 2 * Math.PI * r, p = pct == null ? 0 : Math.max(0, Math.min(1, pct));
  const el = h("div", { class: "ring" });
  el.innerHTML = `<svg viewBox="0 0 84 84" role="img" aria-label="${esc(big)}"><circle cx="42" cy="42" r="${r}" fill="none" stroke="#2c2728" stroke-width="8"/>` +
    (pct == null ? "" : `<circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 42 42)"/>`) +
    `<text x="42" y="${small ? 44 : 48}" text-anchor="middle" fill="#f5f2ec" font-size="${String(big).length > 4 ? 15 : 19}" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800">${esc(big)}</text>` +
    (small ? `<text x="42" y="58" text-anchor="middle" fill="#aaa294" font-size="9">${esc(small)}</text>` : "") + `</svg>`;
  return el;
}
function sparkSVG(vals, color) {
  const v = vals.map(x => x == null ? null : x), pts = v.map((x, i) => x == null ? null : [i, x]).filter(Boolean);
  const el = h("div", { class: "spark" });
  if (pts.length < 2) return el;
  const W = 120, H = 34, mn = Math.min(...pts.map(p => p[1])) - .2, mx = Math.max(...pts.map(p => p[1])) + .2, X = i => 3 + i * (W - 6) / (v.length - 1), Y = y => H - 3 - (y - mn) / ((mx - mn) || 1) * (H - 6);
  const d = pts.map(p => `${X(p[0])},${Y(p[1])}`).join(" "), l = pts[pts.length - 1];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(l[0])}" cy="${Y(l[1])}" r="3" fill="${color}"/></svg>`;
  return el;
}
function donutSondage(oui, non, sr) {
  const tot = oui + non + sr || 1, r = 30, C = 2 * Math.PI * r; let off = 0;
  const seg = (n, col) => { const len = C * n / tot, s = `<circle cx="38" cy="38" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 38 38)"/>`; off += len; return n ? s : ""; };
  const el = h("div", { class: "ring sm" });
  el.innerHTML = `<svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="${r}" fill="none" stroke="#2c2728" stroke-width="10"/>${seg(oui, "#3fae6a")}${seg(non, "#e0182d")}${seg(sr, "#5a5455")}<text x="38" y="43" text-anchor="middle" fill="#f5f2ec" font-size="17" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800">${oui}</text></svg>`;
  return el;
}
const CAT_AL = [["auto", "Auto-évals", /auto-évaluation/i], ["comptes", "Comptes", /compte/i], ["oui", "Oui sans venir", /a dit oui/i], ["baisse", "En baisse", /en baisse|baisse 3 fois/i], ["rotation", "À observer", /pas notés depuis/i], ["double", "Doublons", /en double/i], ["absent", "Absents", /pas venu/i], ["bmf", "Analyses BMF", /analyse réflexive/i], ["save", "Sauvegarde", /sauvegarde/i]];
const catOf = a => (CAT_AL.find(c => c[2].test(a.t)) || ["autre"])[0];

function dashView() {
  const box = h("div", { class: "dash dash2" });
  const mk = today().slice(0, 7), prevMk = moisDe(mk, -1), debMois = mk + "-01";
  const goG = (g, sub) => () => { S.dash = false; S.tab = g; S.view = "list"; S.sub = sub || "joueurs"; render(); };
  box.append(accueilCoach());
  box.append(h("div", { class: "d-head" }, h("h2", {}, "Vue d'ensemble du club"), h("span", { class: "note" }, jourLong(today()))));
  const grid = h("div", { class: "dz" }), kpis = h("div", { class: "dz" }), grps = h("div", { class: "dz dz-g", style: `--n:${visG().length}` }), bas = h("div", { class: "dz" });

  // prochaine séance (sondage) et prochain match
  const prochaines = Object.entries(S.seances).filter(([, x]) => x && GROUPS[x.groupe] && visG().includes(x.groupe) && x.date >= today()).sort((a, b) => (a[1].date + (a[1].heure || "")) < (b[1].date + (b[1].heure || "")) ? -1 : 1);
  const ps = prochaines[0];
  if (ps) {
    const [, se] = ps, d = ditOf(se), eff = dFiches(se.groupe).length, oui = Object.values(d).filter(v => v === true).length, non = Object.values(d).filter(v => v === false).length, sr = Math.max(0, eff - oui - non);
    grid.append(h("div", { class: "dk span2 dk-next", style: `--gc:${GCOL[se.groupe]}` },
      h("div", { class: "dk-l" }, "Prochaine séance"),
      h("div", { class: "dk-row" }, donutSondage(oui, non, sr), h("div", { class: "dk-main" },
        h("div", { class: "dk-big" }, jourLong(se.date).split(" ")[0]), h("div", {}, h("span", { class: "d-g", style: `--gc:${GCOL[se.groupe]}` }, GROUPS[se.groupe].label), " ", seanceTitre(se).replace(/^[^·]*·\s*/, "")),
        h("div", { class: "dk-leg" }, h("i", { style: "background:#3fae6a" }), `${oui} oui`, h("i", { style: "background:#e0182d" }), `${non} non`, h("i", { style: "background:#5a5455" }), `${sr} ?`))),
      h("div", { class: "row", style: "gap:8px" }, h("button", { class: "btn small", onclick: () => { S.dash = false; S.tab = se.groupe; startSaisie(); S.saisie.date = se.date; S.saisie.type = se.type; render(); } }, "Faire l'appel"),
        prochaines.length > 1 ? h("button", { class: "linkbtn", onclick: goG(se.groupe, "presences") }, `+${prochaines.length - 1} autre${prochaines.length > 2 ? "s" : ""}`) : null)));
  } else grid.append(h("div", { class: "dk span2" }, h("div", { class: "dk-l" }, "Prochaine séance"), h("p", { class: "note", style: "margin:6px 0 0" }, "Aucune séance créée. Ajoute-la dans Présences avec le sondage.")));
  const c = S.champ, ME = c && (c.equipe || "USM ENDOUME CATALANS");
  const nextM = visG().includes("U19") && c && Array.isArray(c.matchs) ? c.matchs.slice().sort((a, b) => a.date < b.date ? -1 : 1).find(m => !m.score) : null;
  if (nextM) {
    const dom = nextM.h === ME, opp = dom ? nextM.a : nextM.h, sh = t => (c.noms && c.noms[t]) || t, r = (c.classement || []).find(x => x.t === opp), moi = (c.classement || []).find(x => x.t === ME);
    grid.append(h("button", { class: "dk span2 dk-match", onclick: goG("U19", "equipe") },
      h("div", { class: "dk-l" }, `Prochain match U19 · J${nextM.j}`),
      h("div", { class: "dk-vs" }, h("div", { class: "vs-t" }, h("span", { class: "vs-r" }, moi ? `${moi.rang}e` : "–"), h("b", {}, "Endoume")), h("span", { class: "vs-x" }, dom ? "vs" : "@"), h("div", { class: "vs-t" }, h("span", { class: "vs-r" }, r ? `${r.rang}e` : "–"), h("b", {}, sh(opp)))),
      h("div", { class: "d-sub" }, `${fmtLong(nextM.date)}${nextM.heure ? " · " + nextM.heure : ""} · ${dom ? "domicile" : "extérieur"}`)));
  }

  // chiffres du mois
  const moyM = mean(visG().map(g => groupMonth(g, mk)).filter(v => v != null)), moyP = mean(visG().map(g => groupMonth(g, prevMk)).filter(v => v != null));
  const delta = moyM != null && moyP != null ? moyM - moyP : null;
  const six = [-5, -4, -3, -2, -1, 0].map(dm => moisDe(mk, dm)), moySix = six.map(m => mean(visG().map(g => groupMonth(g, m)).filter(v => v != null)));
  const pres = presRange(null, debMois), fi = fiabilite(null);
  const nbS = new Set(dFiches().flatMap(([, f]) => sortedNotes(f).filter(n => n.date >= debMois).map(n => groupOf(f) + n.date + n.type))).size;
  kpis.append(
    h("div", { class: "dk" }, h("div", { class: "dk-l" }, `Moyenne · ${monthLab(mk)}`), h("div", { class: "dk-kpi" }, moyM == null ? "–" : n1(moyM), h("small", {}, "/5")),
      delta == null ? h("div", { class: "d-sub" }, "pas de mois précédent") : h("span", { class: "chip-evo " + (delta >= 0 ? "up" : "down") }, `${delta >= 0 ? "▲ +" : "▼ −"}${n1(Math.abs(delta))}`), sparkSVG(moySix, "#e0182d")),
    h("div", { class: "dk dk-c" }, h("div", { class: "dk-l" }, "Présence"), ringSVG(pres, "#3fae6a", pres == null ? "–" : Math.round(pres * 100) + "%"), h("div", { class: "d-sub" }, "entraînements du mois")),
    h("div", { class: "dk dk-c" }, h("div", { class: "dk-l" }, "Sondage fiable"), ringSVG(fi.rate, "#cdbd8f", fi.rate == null ? "–" : Math.round(fi.rate * 100) + "%"), h("div", { class: "d-sub" }, fi.total ? "des « oui » venus" : "pas encore de données")),
    h("div", { class: "dk" }, h("div", { class: "dk-l" }, "Séances notées"), h("div", { class: "dk-kpi" }, String(nbS)), h("div", { class: "d-sub" }, `en ${monthLab(mk)}`)));

  // à traiter : pastilles par catégorie
  const al = dashAlertes(), parCat = {};
  for (const a of al) (parCat[catOf(a)] = parCat[catOf(a)] || []).push(a);
  const cats = CAT_AL.map(c => [c[0], c[1]]).concat([["autre", "Autres"]]).filter(([k]) => parCat[k]);
  const at = h("div", { class: "dk span4" }, h("div", { class: "dk-l" }, al.length ? `À traiter · ${al.length}` : "À traiter"));
  if (!al.length) at.append(h("div", { class: "dk-ok" }, "✓ Tout est à jour"));
  else {
    const sel = parCat[S.dashCat] ? S.dashCat : null;
    at.append(h("div", { class: "dk-cats" }, cats.map(([k, l]) => h("button", { class: "dk-cat" + (k === sel ? " on" : ""), "aria-pressed": String(k === sel), onclick: () => { S.dashCat = k === sel ? null : k; render(); } }, h("b", {}, String(parCat[k].length)), h("span", {}, l)))));
    if (sel) at.append(h("div", { class: "dk-list" }, parCat[sel].map(a => h("div", { class: "d-row" }, a.g ? h("span", { class: "d-g", style: `--gc:${GCOL[a.g]}` }, GROUPS[a.g].label) : h("span", { class: "d-g" }, "Club"),
      h("div", { class: "d-main" }, h("b", {}, a.t), a.d ? h("span", { class: "d-sub" }, a.d) : null), h("button", { class: "btn small ghost", onclick: a.go }, a.lab || "Voir")))));
    else at.append(h("p", { class: "d-sub", style: "margin:8px 0 0" }, "Touche une pastille pour voir le détail."));
  }
  grid.append(at);

  // les groupes
  for (const g of visG()) {
    const n = dFiches(g).length, m = groupMonth(g, mk), p = presRange(g, debMois), a = al.filter(x => x.g === g).length;
    grps.append(h("button", { class: "dk dk-grp", style: `--gc:${GCOL[g]}`, onclick: goG(g) },
      h("div", { class: "dk-gh" }, h("span", { class: "dk-gn" }, GROUPS[g].label), a ? h("span", { class: "dk-badge" }, String(a)) : null),
      h("div", { class: "dk-row" }, ringSVG(p, GCOL[g], p == null ? "–" : Math.round(p * 100) + "%", "présence"),
        h("div", { class: "dk-main" }, h("div", { class: "dk-kpi sm" }, m == null ? "–" : n1(m), h("small", {}, "/5")), h("div", { class: "d-sub" }, `moyenne · ${n} joueur${n > 1 ? "s" : ""}`), sparkSVG(six.map(x => groupMonth(g, x)), GCOL[g])))));
  }

  // carnet BMF et récap
  if (!S.scope) {
    const bc = bmfCompteur(), tot = bc.U10.s + bc.U10.m + bc.U19.s + Math.min(1, bc.U19.m) + bc.GB.s + Math.min(1, bc.GB.m) + bc.np, max = 15 + 10 + 5 + 5 + 5;
    bas.append(h("button", { class: "dk span2", onclick: () => { S.dash = false; S.bmf = true; render(); } }, h("div", { class: "dk-l" }, "Carnet BMF"),
      h("div", { class: "dk-row" }, ringSVG(tot / max, "#cdbd8f", `${Math.round(tot / max * 100)}%`, `${tot}/${max}`),
        h("div", { class: "dk-main bmf-mini" }, [["U10 séances", bc.U10.s, 15], ["U10 matchs", bc.U10.m, 10], ["U19", bc.U19.s + Math.min(1, bc.U19.m), 5], ["Gardiens", bc.GB.s + Math.min(1, bc.GB.m), 5]].map(([l, v, mx]) =>
          h("div", { class: "bm" }, h("span", {}, l), h("div", { class: "track" }, h("div", { class: "fill" + (v >= mx ? " done" : ""), style: `width:${Math.min(100, v / mx * 100)}%` })), h("b", {}, `${v}/${mx}`)))))));
  }
  if (!S.scope) { bas.append(accordCard()); bas.append(quotaCard()); }
  const rc = h("div", { class: "dk " + (S.scope ? "span4" : "span2") }, h("div", { class: "dk-l" }, "Récap du mois par mail"));
  if (S.dashRecap) rc.append(recapCard(), h("button", { class: "linkbtn", onclick: () => { S.dashRecap = false; render(); } }, "Fermer"));
  else rc.append(h("div", { class: "dk-row" }, h("div", { class: "dk-big", style: "font-size:30px" }, "✉"), h("div", { class: "dk-main" }, h("div", {}, "Envoie à chaque joueur son récap aux couleurs du club."), h("button", { class: "btn small", style: "margin-top:8px;align-self:flex-start", onclick: () => { S.dashRecap = true; render(); } }, "Préparer le récap"))));
  bas.append(rc);
  if (!nextM && grid.firstChild) grid.firstChild.classList.replace("span2", "span4");
  box.append(kpis, grid, grps, bas);

  // saison
  const allMk = [...new Set(dFiches().flatMap(([, f]) => sortedNotes(f).map(n => monthKey(n.date))))].sort();
  if (allMk.length) box.append(h("div", { class: "dk" }, h("div", { class: "dk-l" }, S.scope ? "La saison" : "La saison des groupes"), dashLineChart(visG().map(g => ({ n: GROUPS[g].label, c: GCOL[g], v: allMk.map(k => groupMonth(g, k)) })), allMk)));

  // zoom
  box.append(dashZoom(mk, prevMk));
  return box;
}

function dashZoom(mk, prevMk) {
  const box = h("div", { class: "dash" });
  const sec = (titre, ...kids) => h("section", { class: "d-sec" }, h("h3", { class: "d-t" }, titre), ...kids);
  // 6. zoom sur un groupe
  const zg = visG().includes(S.dashG) ? S.dashG : visG()[0];
  const chips = visG().length < 2 ? null : h("div", { class: "d-chips", role: "tablist" }, visG().map(g => [g, GROUPS[g]]).map(([g, G]) => h("button", { class: "opt", role: "tab", "aria-pressed": String(zg === g), onclick: () => { S.dashG = g; render(); } }, G.label)));
  const z = h("div", { class: "d-zoom" });
  // point faible du moment
  const recent = dFiches(zg).flatMap(([, f]) => sortedNotes(f).filter(n => n.date >= ilYa(30)));
  const blocs = GRILLES[zg] ? [["À l'entraînement", GRILLES[zg].E, recent.filter(n => n.type !== "Match" && !isOldNote(n, zg))], ["En match", GRILLES[zg].M, recent.filter(n => n.type === "Match" && !isOldNote(n, zg))]] : [["Toutes séances", GROUPS[zg].crit, recent]];
  const pf = h("div", { class: "d-card" }, h("h4", {}, "Point faible du moment"), h("p", { class: "d-sub", style: "margin:0 0 6px" }, "Moyenne par critère sur les 30 derniers jours."));
  let vide = true;
  for (const [lab, crits, ns] of blocs) {
    const vals = crits.map(([k, l]) => [k, l, critAvg(ns, k)]).filter(x => x[2] != null);
    if (!vals.length) continue; vide = false;
    const min = Math.min(...vals.map(v => v[2]));
    pf.append(h("div", { class: "bars-t" }, lab));
    for (const [k, l, a] of vals) pf.append(h("div", { class: "d-bar" + (a === min ? " low" : "") }, critLabel(k, l), h("div", { class: "track" }, h("div", { class: "fill", style: `width:${a / 5 * 100}%` })), h("span", { class: "val" }, n1(a))));
  }
  if (vide) pf.append(h("p", { class: "note", style: "margin:0" }, "Pas de note ces 30 derniers jours."));
  // présence semaine par semaine
  const wk = h("div", { class: "d-card" }, h("h4", {}, "Présence, 8 dernières semaines"));
  const lundi = d => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
  const sems = []; for (let i = 7; i >= 0; i--) { const deb = lundi(ilYa(i * 7)), fin = new Date(deb + "T12:00:00"); fin.setDate(fin.getDate() + 6); sems.push([deb, fin.toISOString().slice(0, 10)]); }
  const wb = h("div", { class: "d-weeks" });
  for (const [deb, fin] of sems) { const r = presRange(zg, deb, fin); wb.append(h("div", { class: "d-wk", title: `Semaine du ${fmtDate(deb)} : ${r == null ? "pas d'appel" : Math.round(r * 100) + " %"}` }, h("span", { class: "d-wv" }, r == null ? "" : Math.round(r * 100)), h("div", { class: "d-wt" }, h("div", { class: "d-wf" + (r == null ? " none" : ""), style: `height:${r == null ? 4 : Math.max(4, r * 100)}%;background:${GCOL[zg]}` })), h("span", { class: "d-wl" }, fmtDate(deb)))); }
  wk.append(wb, h("p", { class: "d-sub", style: "margin:6px 0 0" }, "En % de présents aux appels de la semaine."));
  // top et progressions
  const parJ = dFiches(zg).map(([fid, f]) => { const ns = sortedNotes(f); return { fid, nom: f.nom || "?", m: avgNotes(ns.filter(n => monthKey(n.date) === mk), zg), nm: ns.filter(n => monthKey(n.date) === mk).length, p: avgNotes(ns.filter(n => monthKey(n.date) === prevMk), zg) }; });
  const ouvrir = fid => () => { S.dash = false; S.tab = zg; S.view = "fiche"; S.sel = fid; render(); };
  const top = parJ.filter(j => j.m != null && j.nm >= 2).sort((a, b) => b.m - a.m).slice(0, 3);
  const prog = parJ.filter(j => j.m != null && j.p != null && j.m - j.p > 0).sort((a, b) => (b.m - b.p) - (a.m - a.p)).slice(0, 3);
  const liste = (arr, val) => arr.length ? h("ol", { class: "d-list" }, arr.map(j => h("li", {}, h("button", { class: "linkbtn", onclick: ouvrir(j.fid) }, j.nom), h("b", {}, val(j))))) : h("p", { class: "note", style: "margin:0" }, "Pas encore assez de notes ce mois-ci.");
  const joueurs = h("div", { class: "d-card" }, h("h4", {}, `Top 3 de ${monthLab(mk)}`), liste(top, j => n1(j.m)), h("h4", { style: "margin-top:14px" }, "Plus fortes progressions"), h("p", { class: "d-sub", style: "margin:0 0 4px" }, `Ce mois-ci par rapport à ${monthLab(prevMk)}.`), liste(prog, j => "+" + n1(j.m - j.p)));
  z.append(pf, wk, joueurs);
  if (zg === "U19") {
    const st = dFiches("U19").map(([fid, f]) => { const ms = sortedNotes(f).filter(n => n.type === "Match" && n.stats); return { fid, nom: f.nom || "?", b: ms.reduce((a, n) => a + (n.stats.buts || 0), 0), pd: ms.reduce((a, n) => a + (n.stats.pd || 0), 0) }; });
    const bt = st.filter(j => j.b).sort((a, b) => b.b - a.b).slice(0, 3), ps = st.filter(j => j.pd).sort((a, b) => b.pd - a.pd).slice(0, 3);
    const hom = ((S.equipes.U19 && S.equipes.U19.hommes) || []).slice().sort((a, b) => a.date < b.date ? 1 : -1)[0];
    const lst = (arr, k) => arr.length ? h("ol", { class: "d-list" }, arr.map(j => h("li", {}, h("button", { class: "linkbtn", onclick: ouvrir(j.fid) }, j.nom), h("b", {}, String(j[k]))))) : h("p", { class: "note", style: "margin:0" }, "Rien de saisi pour l'instant.");
    z.append(h("div", { class: "d-card" }, h("h4", {}, "Buteurs"), lst(bt, "b"), h("h4", { style: "margin-top:14px" }, "Passeurs"), lst(ps, "pd"),
      h("h4", { style: "margin-top:14px" }, "Dernier homme du match"), hom ? h("p", { style: "margin:0" }, h("b", {}, hom.nom), h("span", { class: "d-sub" }, ` · ${fmtLong(hom.date)}`)) : h("p", { class: "note", style: "margin:0" }, "Pas encore désigné.")));
  }
  box.append(sec(visG().length < 2 ? `Zoom ${GROUPS[zg].label}` : "Zoom sur un groupe", chips, z));
  return box;
}

function coachView() {
  const app = h("div");
  if (S.scope) { S.bmf = false; if (!S.scope.includes(S.tab)) S.tab = S.scope[0]; }
  if (S.dash === undefined) S.dash = true;
  app.append(h("div", { class: "tabs", role: "tablist" },
    h("button", { class: "tab", role: "tab", "aria-selected": String(!!S.dash && !S.bmf), onclick: () => { S.dash = true; S.bmf = false; S.view = "list"; S.sel = null; render(); } }, "Accueil"),
    Object.entries(GROUPS).filter(([k]) => !S.scope || S.scope.includes(k)).map(([k, G]) =>
    h("button", { class: "tab", role: "tab", "aria-selected": String(!S.dash && !S.bmf && S.tab === k), onclick: () => { S.dash = false; S.bmf = false; S.tab = k; S.view = "list"; S.sel = null; render(); } }, G.label)),
    S.scope ? null : h("button", { class: "tab", role: "tab", "aria-selected": String(!!S.bmf), onclick: () => { S.dash = false; S.bmf = true; S.view = "list"; S.sel = null; render(); } }, "BMF")));
  if (S.scope) app.append(h("p", { class: "note", style: "margin:-6px 0 10px" }, `Accès adjoint ${S.scope.map(g => GROUPS[g].label).join(", ")}. Tes notes comptent pour 1/3 de la note finale.`));
  if (S.bmf) { app.append(carnetView()); return app; }
  if (S.dash) { app.append(dashView()); return app; }
  if (S.view === "list" && S.sub === "joueurs") { /* liste */ }

  if (S.view === "fiche" && S.fiches[S.sel]) { app.append(ficheView(S.sel, S.fiches[S.sel], true)); return app; }
  if (S.view === "list") app.append(h("div", { class: "subtabs", role: "tablist" },
    h("button", { class: "subtab", role: "tab", "aria-selected": String(S.sub === "joueurs"), onclick: () => { S.sub = "joueurs"; render(); } }, "Joueurs"),
    h("button", { class: "subtab", role: "tab", "aria-selected": String(S.sub === "equipe"), onclick: () => { S.sub = "equipe"; render(); } }, "Équipe"),
    h("button", { class: "subtab", role: "tab", "aria-selected": String(S.sub === "presences"), onclick: () => { S.sub = "presences"; render(); } }, "Présences"),
    S.scope ? null : h("button", { class: "subtab", role: "tab", "aria-selected": String(S.sub === "acces"), onclick: () => { S.sub = "acces"; render(); } }, `Accès${Object.keys(S.inscriptions).filter(u => !S.fiches[u] && !S.coachs[u]).length ? " (" + Object.keys(S.inscriptions).filter(u => !S.fiches[u] && !S.coachs[u]).length + ")" : ""}`)));
  if (S.view === "list" && S.sub === "acces" && !S.scope) { app.append(accesView()); return app; }
  if (S.view === "list" && S.sub === "equipe") { app.append(equipeView(S.tab, true)); return app; }
  if (S.view === "list" && S.sub === "presences") { app.append(presencesView(S.tab)); return app; }
  if (S.view === "saisie") { app.append(saisieView()); return app; }
  if (S.view === "ajout") { app.append(ajoutView()); return app; }

  const list = Object.entries(S.fiches).filter(([, f]) => groupOf(f) === S.tab).sort((a, b) => (a[1].nom || "").localeCompare(b[1].nom || "", "fr"));
  app.append(h("div", { class: "bar" },
    h("h2", {}, `${GROUPS[S.tab].label} · ${list.length} joueur${list.length > 1 ? "s" : ""}`),
    h("div", { class: "row" },
      S.scope ? null : h("button", { class: "btn ghost", onclick: () => { S.view = "ajout"; render(); } }, "Ajouter un joueur"),
      h("button", { class: "btn", disabled: !list.length, onclick: () => startSaisie() }, "Noter une séance"))));
  if (S.flash) { app.append(h("p", { class: "ok" }, S.flash)); S.flash = ""; }
  if (S.postSaisie && S.postSaisie.g === S.tab && !S.scope) {
    const ps = S.postSaisie, kind = ps.type === "Match" ? "match" : "seance";
    const ex = carnetList().find(e => e.groupe === ps.g && e.kind === kind && e.date === ps.date);
    app.append(h("div", { class: "card row", style: "align-items:center;border-color:var(--or)" },
      h("span", { style: "flex:1;min-width:200px" }, ex ? (reflexFaite(ex) ? "L'analyse réflexive de cette séance est déjà faite." : `Ton carnet BMF : l'analyse réflexive ${kind === "match" ? "de ce match" : "de cette séance"} t'attend.`) : `Carnet BMF : fais ${kind === "match" ? "la fiche de match" : "l'analyse réflexive"} maintenant, à chaud.`),
      h("button", { class: "btn small", onclick: () => { S.postSaisie = null; openCarnet(ex ? ex.id : nid(), ex || (kind === "match" ? newMatch(ps.g, ps.date) : newSeance(ps.g, ps.date))); } }, ex ? "Ouvrir" : (kind === "match" ? "Faire la fiche de match" : "Faire l'analyse")),
      h("button", { class: "linkbtn", onclick: () => { S.postSaisie = null; render(); } }, "Plus tard")));
  }
  if (!S.loaded && !S.demo) app.append(h("p", { class: "note" }, S.slow ? "Les données ne répondent pas encore. Vérifie ta connexion, la page se mettra à jour seule." : "Chargement des fiches…"));
  if (S.loaded && !list.length) app.append(h("div", { class: "empty" }, `Aucun joueur ${GROUPS[S.tab].label} pour l'instant. Commence par « Ajouter un joueur ».`));
  const grid = h("div", { class: "grid" });
  for (const [fid, f] of list) {
    const all = overall(f), last = overall(f, 5), ns = sortedNotes(f);
    const trend = (all != null && last != null && ns.length >= 6) ? (last - all > 0.15 ? "En hausse" : last - all < -0.15 ? "En baisse" : "Stable") : null;
    grid.append(h("button", { class: "card", onclick: () => { S.view = "fiche"; S.sel = fid; render(); } },
      h("div", { class: "pname" }, h("span", { class: "row", style: "gap:8px;align-items:center;flex-wrap:nowrap" }, avatarNode(fid, f.nom, "av-mini"), f.nom || "Sans nom"), f.exemple ? h("span", { class: "pill ex" }, "Exemple") : (isTemp(fid) ? h("span", { class: "pill" }, "Compte non lié") : (watchAutos(fid), autoMissing(fid, f) ? h("span", { class: "pill match" }, "Auto-éval manquante") : null))),
      h("div", { class: "pmeta" }, [f.age, f.sousCat, f.poste].filter(Boolean).join(" · ") || GROUPS[groupOf(f)].label),
      h("div", { class: "row", style: "justify-content:space-between;align-items:baseline" },
        h("span", { class: "avg" }, n1(last), h("small", {}, " /5 sur les 5 dernières")),
        trend ? h("span", { class: "pill" }, trend) : null),
      h("div", { class: "pmeta" }, ns.length ? `Dernière évaluation : ${fmtDate(ns[ns.length - 1].date)} · ${ns.length} au total` : "Pas encore évalué")));
  }
  app.append(grid);
  return app;
}

/* séance du carnet BMF liée à une date */
function carnetDu(g, date, type) {
  const e = carnetList().find(x => x.groupe === g && x.date === date && x.kind === (type === "Match" ? "match" : "seance"));
  if (!e) return null;
  const ph = PHASES.find(p => p.k === e.phase), pr = ph && ph.p.find(x => String(x[0]) === String(e.principe));
  return { id: e.id, num: e.num || null, phase: ph ? ph.l : "", principe: pr ? `${pr[0]}. ${pr[1]}` : "", objectif: e.objectif || e.objOffDef || "", adversaire: e.adversaire || "" };
}
const joursDepuisNote = f => { const ns = sortedNotes(f); if (!ns.length) return null; return Math.floor((new Date(today()) - new Date(ns[ns.length - 1].date)) / 864e5); };
function invitationTexte(g, noms) {
  const url = location.origin + location.pathname;
  return `Salut à tous ! Il manque encore ${noms.length > 1 ? "quelques comptes" : "un compte"} sur le suivi joueurs US Endoume (${noms.join(", ")}).\n\n1. Ouvre ${url}\n2. Crée ton compte${g === "U10" ? " (parents : avec votre adresse mail)" : ""} et choisis ${GROUPS[g].label}\n3. Je relie ton compte à ta fiche et tu vois tes notes, tes badges et ta carte.\n\nSportivement, Nico`;
}
function startSaisie() {
  const rows = {};
  for (const [fid, f] of Object.entries(S.fiches)) if (groupOf(f) === S.tab) rows[fid] = { st: "p", crit: {}, com: "", stats: {} };
  S.saisie = { date: today(), type: "Entraînement", rows, msg: "" };
  S.view = "saisie"; render();
}

function saisieView() {
  const s = S.saisie, G = GROUPS[S.tab];
  const box = h("div", { class: "stack" });
  box.append(h("div", { class: "bar" }, h("h2", {}, `Noter une séance ${G.label}`),
    h("button", { class: "btn ghost small", onclick: () => { S.view = "list"; S.saisie = null; render(); } }, "Annuler")));
  const date = h("input", { type: "date", id: "s-date", value: s.date, oninput: e => s.date = e.target.value });
  const type = h("select", { id: "s-type", onchange: e => s.type = e.target.value },
    h("option", { value: "Entraînement", selected: s.type === "Entraînement" }, "Entraînement"),
    h("option", { value: "Match", selected: s.type === "Match" }, "Match"));
  date.addEventListener("change", () => render()); type.addEventListener("change", () => render());
  const annS = seancesOf(S.tab).find(([, x]) => x.date === s.date && x.type === s.type), ann = annS ? Object.fromEntries(Object.entries(ditOf(annS[1])).map(([k, v]) => [k, { p: v }])) : null;
  box.append(h("div", { class: "card row" }, h("label", { class: "field" }, "Date", date), h("label", { class: "field" }, "Type", type),
    h("p", { class: "note", style: "margin:0;flex:1;min-width:200px" }, "Touche une note de 1 à 5 par critère. Seuls les joueurs présents sont notés. « Excusé » (blessé, prévenu) ne compte pas comme une absence.")));
  for (const r of Object.values(s.rows)) if (!r.st) r.st = r.present === false ? "a" : "p";
  const isM = s.type === "Match";
  if (!isM) for (const r of Object.values(s.rows)) if (r.st === "nc") r.st = "p";
  let ids = Object.keys(s.rows).sort((a, b) => (S.fiches[a].nom || "").localeCompare(S.fiches[b].nom || "", "fr"));
  const exist = fid => (S.fiches[fid].presences || []).find(p => p && p.date === s.date && p.type === s.type);
  const deja = ids.filter(fid => exist(fid));
  const compo = isM ? ((S.equipes[S.tab] || {}).compos || []).find(c => c.date === s.date) : null;
  const convoq = compo ? new Set([...(compo.xi || []), ...(compo.rempl || [])].filter(Boolean)) : null;
  const kk = s.date + "|" + s.type;
  if (s.prefill !== kk) {
    s.prefill = kk;
    if (deja.length) ids.forEach(fid => { const e = exist(fid); s.rows[fid].st = e ? (e.p ? "p" : e.ex ? "e" : "a") : (isM ? "nc" : "p"); });
    else if (convoq) ids.forEach(fid => { s.rows[fid].st = convoq.has(fid) ? "p" : "nc"; });
  }
  if (isM) {
    const nNc = ids.filter(fid => s.rows[fid].st === "nc").length;
    box.append(h("div", { class: "card", style: "border-color:var(--or)" }, h("p", { style: "margin:0" }, compo
      ? `Convocation reprise de la compo « ${compo.titre || "match"} » : ${ids.length - nNc} convoqués. Les autres sont en « Non convoqué » : ils ne sont ni notés ni comptés absents.`
      : "Pas de compo pour cette date. Mets « Non convoqué » aux joueurs que tu n'as pas pris : ils ne seront ni notés ni comptés absents. Astuce : publie la compo dans l'onglet Équipe, la convocation sera reprise toute seule.")));
    ids = [...ids.filter(fid => s.rows[fid].st !== "nc"), ...ids.filter(fid => s.rows[fid].st === "nc")];
  }
  // lien avec le carnet BMF
  const th = carnetDu(S.tab, s.date, s.type);
  if (th) box.append(h("div", { class: "card theme-c" }, h("div", { class: "eq-tl" }, s.type === "Match" ? "Match du carnet BMF" : `Séance du carnet BMF${th.num ? " n°" + th.num : ""}`),
    h("p", { style: "margin:4px 0 0" }, [th.phase, th.principe].filter(Boolean).join(" · ") || (th.adversaire ? "contre " + th.adversaire : "")),
    th.objectif ? h("p", { class: "note", style: "margin:4px 0 0" }, "Objectif : " + th.objectif) : null,
    h("p", { class: "note", style: "margin:4px 0 0" }, "Le thème est enregistré avec les notes de cette séance.")));
  // rotation : joueurs à observer en priorité
  const aObs = ids.filter(fid => s.rows[fid].st === "p" && (() => { const j = joursDepuisNote(S.fiches[fid]); return j == null || j >= 14; })());
  // mode rapide
  const critsDe = fid => critsJ(S.tab, s.type, S.fiches[fid]);
  const rapide = h("div", { class: "card rapide-c" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:center;gap:8px" },
      h("div", { style: "flex:1;min-width:200px" }, h("strong", {}, "Mode rapide"), h("p", { class: "note", style: "margin:2px 0 0" }, "Tous les présents partent à 3 sur chaque critère. Tu ne touches que ceux qui sortent du lot.")),
      h("div", { class: "row", style: "gap:6px" },
        h("button", { class: "btn small", type: "button", onclick: () => { ids.forEach(fid => { const r = s.rows[fid]; if (r.st !== "p") return; for (const [k] of critsDe(fid)) if (r.crit[k] == null) r.crit[k] = 3; }); s.rapide = true; render(); } }, "Mettre tout le monde à 3"),
        s.rapide ? h("button", { class: "btn ghost small", type: "button", onclick: () => { ids.forEach(fid => { s.rows[fid].crit = {}; }); s.rapide = false; render(); } }, "Tout effacer") : null)),
    aObs.length ? h("p", { style: "margin:8px 0 0" }, h("span", { class: "pill obs" }, `À observer en priorité : ${aObs.length}`), " ", h("span", { class: "note" }, aObs.slice(0, 8).map(fid => (S.fiches[fid].nom || "").split(" ")[0]).join(", ") + (aObs.length > 8 ? "…" : "") + " (pas notés depuis 2 semaines ou plus)")) : null);
  box.append(rapide);
  if (deja.length) {
    const auteurs = [...new Set(deja.map(fid => exist(fid).parNom).filter(Boolean))];
    box.append(h("div", { class: "card", style: "border-color:var(--or)" }, h("p", { style: "margin:0" }, `L'appel de cette séance a déjà été fait${auteurs.length ? " par " + auteurs.join(" et ") : ""} : ${deja.filter(fid => exist(fid).p).length} présents sur ${deja.length}. Il est repris ci-dessous. En enregistrant, tu le mets à jour joueur par joueur, sans doublon.`)));
  }
  if (ann) {
    const nNo = ids.filter(fid => ann[fid] && ann[fid].p === false).length, nYes = ids.filter(fid => ann[fid] && ann[fid].p === true).length;
    box.append(h("div", { class: "card row", style: "align-items:center" }, h("span", { style: "flex:1;min-width:200px" }, `Sondage WhatsApp : ${nYes} oui, ${nNo} non, ${ids.length - nYes - nNo} sans réponse.`),
      h("button", { class: "btn ghost small", onclick: () => { ids.forEach(fid => { if (ann[fid] && s.rows[fid].st !== "nc") s.rows[fid].st = ann[fid].p !== false ? "p" : "a"; }); render(); } }, "Pré-cocher selon le sondage")));
  }
  for (const fid of ids) {
    const r = s.rows[fid], f = S.fiches[fid];
    const card = h("div", { class: "card saisie-p" + (r.st === "p" ? "" : " absent") + (r.st === "nc" ? " nc" : "") });
    const opts = [["p", "Présent"], ["a", "Absent"], ["e", "Excusé"], ...(isM ? [["nc", "Non convoqué"]] : [])];
    const tog = h("div", { class: "stbar", role: "group", "aria-label": "Statut" });
    const majSt = () => { tog.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.st === r.st))); card.classList.toggle("absent", r.st !== "p"); card.classList.toggle("nc", r.st === "nc"); };
    for (const [k, l] of opts) { const b = h("button", { type: "button", class: "stb st-" + k, "data-st": k, title: k === "e" ? "Excusé ou blessé : ne compte pas comme une absence" : null }, l); b.onclick = () => { r.st = k; majSt(); }; tog.append(b); }
    majSt();
    const a = ann && ann[fid];
    card.append(h("div", { class: "saisie-head" }, h("span", { class: "row", style: "gap:8px;align-items:center" }, h("strong", {}, f.nom || "Sans nom"),
      ann ? (a ? h("span", { class: "pill " + (a.p ? "ok" : "no") }, a.p ? "A dit oui" : "A dit non") : h("span", { class: "pill" }, "Pas répondu")) : null,
      aObs.includes(fid) ? h("span", { class: "pill obs" }, (() => { const j = joursDepuisNote(f); return j == null ? "Jamais noté" : `Pas noté depuis ${j} j`; })()) : null), tog));
    const crits = h("div", { class: "crits" });
    for (const [k, lab] of critsJ(S.tab, s.type, f)) {
      const sc = h("div", { class: "scale", role: "group", "aria-label": lab });
      for (let v = 1; v <= 5; v++) {
        const b = h("button", { class: "sc", "aria-pressed": String(r.crit[k] === v), title: LEVELS[v] }, v);
        b.onclick = () => {
          if (r.crit[k] === v) delete r.crit[k]; else r.crit[k] = v;
          sc.querySelectorAll(".sc").forEach((x, i) => x.setAttribute("aria-pressed", String(r.crit[k] === i + 1)));
        };
        sc.append(b);
      }
      crits.append(h("div", { class: "crit-row" }, critLabel(k, lab), sc));
    }
    if (s.type === "Match" && (S.tab === "U19" || isGK(f))) {
      r.stats = r.stats || {};
      const num = (key, lab, max) => { const i = h("input", { type: "number", inputmode: "numeric", min: "0", max: String(max), id: `st-${key}-${fid}`, placeholder: "–" }); if (typeof r.stats[key] === "number") i.value = r.stats[key];
        i.oninput = () => { const v = parseInt(i.value, 10); if (isNaN(v)) delete r.stats[key]; else r.stats[key] = Math.max(0, Math.min(max, v)); }; return h("label", { class: "field stat-in" }, lab, i); };
      if (isGK(f)) {
        const cs = h("span", { class: "pill" + (r.stats.be === 0 ? " ok" : ""), style: r.stats.be === 0 ? "" : "display:none" }, "Clean sheet");
        const be = num("be", "Buts encaissés", 30), bi = be.querySelector("input"), oi = bi.oninput;
        bi.oninput = () => { oi(); cs.style.display = r.stats.be === 0 ? "" : "none"; cs.className = "pill ok"; };
        crits.append(h("div", { class: "gk-zone" }, h("div", { class: "gk-t" }, "Gardien : buts encaissés"), h("div", { class: "row stats-in", style: "align-items:flex-end" }, num("min", "Temps de jeu (min)", 130), be, cs)));
      } else crits.append(h("div", { class: "row stats-in" }, num("min", "Temps de jeu (min)", 130), num("buts", "Buts", 20), num("pd", "Passes déc.", 20)));
    }
    const com = h("input", { class: "com", type: "text", maxlength: "500", id: "com-" + fid, placeholder: G.parent ? "Un mot pour les parents (facultatif)" : "Commentaire (facultatif)", oninput: e => r.com = e.target.value });
    com.value = r.com;
    card.append(crits, h("label", { class: "field com" }, com));
    box.append(card);
  }
  const msg = h("p", { class: "note" }, s.msg || "");
  const save = h("button", { class: "btn" }, "Enregistrer la séance");
  save.onclick = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) { msg.className = "err"; msg.textContent = "Choisis une date."; return; }
    save.disabled = true; msg.className = "note"; msg.textContent = "Enregistrement…";
    let ok = 0, ko = 0;
    let rated = 0; const notifies = [];
    for (const fid of ids) {
      const r = s.rows[fid], f = S.fiches[fid];
      const pres = (Array.isArray(f.presences) ? f.presences : []).filter(p => !(p.date === s.date && p.type === s.type));
      const st = r.st || "p", qui = { par: S.me, parNom: ((S.coachs[S.me] || {}).nom || "Coach").split(" ")[0] };
      const patch = { presences: st === "nc" ? pres : [...pres, { date: s.date, type: s.type, p: st === "p", ...(st === "e" ? { ex: true } : {}), ...qui }] };
      const keys = new Set(critsJ(S.tab, s.type, f).map(c => c[0])), crit = Object.fromEntries(Object.entries(r.crit).filter(([k]) => keys.has(k)));
      const stats = (s.type === "Match" && (S.tab === "U19" || isGK(f)) && r.stats && Object.keys(r.stats).length) ? { ...r.stats } : null;
      if (st === "p" && (Object.keys(crit).length || r.com.trim() || stats)) {
        const nn = { id: nid(), date: s.date, type: s.type, crit, com: r.com.trim().slice(0, 500), at: new Date().toISOString(), ...(stats ? { stats } : {}), ...(th ? { theme: { phase: th.phase, principe: th.principe, objectif: String(th.objectif || "").slice(0, 200) } } : {}) };
        if (S.scope) patch.notesAdj = [...adjNotes(f).filter(x => !(x.par === S.me && x.date === s.date && x.type === s.type)), { ...nn, par: S.me, parNom: ((S.coachs[S.me] || {}).nom || "Adjoint").split(" ")[0] }];
        else patch.notes = [...rawNotes(f).filter(x => !(x.date === s.date && x.type === s.type)), nn];
        rated++;
      }
      try { await writeFicheQuiet(fid, patch); ok++; if (patch.notes || patch.notesAdj) notifies.push(fid); } catch (e) { ko++; }
    }
    if (!rated && !ko) { /* présences seules */ }
    if (!ok && !ko) { save.disabled = false; msg.className = "err"; msg.textContent = "Aucun joueur dans ce groupe."; return; }
    if (ko) { save.disabled = false; msg.className = "err"; msg.textContent = `${ok} fiche${ok > 1 ? "s" : ""} enregistrée${ok > 1 ? "s" : ""}, ${ko} en échec. Réessaie pour celles-là.`; return; }
    S.postSaisie = { g: S.tab, date: s.date, type: s.type };
    const aMail = notifies.filter(fid => !isTemp(fid) && !(S.fiches[fid] || {}).exemple);
    const auteur = S.scope ? `${((S.coachs[S.me] || {}).nom || "Ton coach").split(" ")[0]}, coach adjoint` : "Coach Nico";
    if (aMail.length) envoyerMails(s.type === "Match" && S.tab !== "U10" ? "match" : "note", aMail, { par: auteur });
    const peu = S.quota && S.quota.n < aMail.length ? ` ⚠️ Il ne reste qu'environ ${S.quota.n} mails aujourd'hui : certains joueurs ne seront peut-être pas prévenus.` : "";
    S.flash = `Séance du ${fmtDate(s.date)} enregistrée : ${rated} joueur${rated > 1 ? "s" : ""} noté${rated > 1 ? "s" : ""}, présences à jour.${aMail.length && MAIL_URL ? " Les joueurs concernés sont prévenus par mail." : ""}${peu}`;
    S.view = "list"; S.saisie = null; render();
  };
  box.append(h("div", { class: "row save-bar" }, save, msg));
  return box;
}
async function writeFicheQuiet(fid, patch) {
  if (S.demo) { S.fiches[fid] = { ...S.fiches[fid], ...patch }; return; }
  await ecrireFiche(fid, patch);
}

function ajoutView() {
  const box = h("div", { class: "stack" });
  box.append(h("div", { class: "bar" }, h("h2", {}, "Ajouter un joueur"),
    h("button", { class: "btn ghost small", onclick: () => { S.view = "list"; render(); } }, "Annuler")));
  box.append(h("div", { class: "card" }, h("h3", {}, "Comment ça marche"),
    h("p", { class: "note", style: "margin:0" }, "Crée la fiche tout de suite. Quand le joueur (ou un parent pour les U10) a créé son compte sur ce site, choisis-le ici ou plus tard depuis sa fiche : il ne verra que la sienne.")));
  const pendA = Object.entries(S.inscriptions).filter(([uid]) => !S.fiches[uid] && !S.coachs[uid]);
  const code = h("select", { id: "a-code" }, h("option", { value: "" }, "Pas encore de compte : je le relierai plus tard"), pendA.map(([uid, x]) => h("option", { value: uid }, `${x.nom || "Sans nom"}${x.email ? " · " + x.email : ""}`)));
  const nom = h("input", { id: "a-nom", maxlength: "60", placeholder: "Prénom et nom" });
  const grp = h("select", { id: "a-grp" }, Object.entries(GROUPS).map(([k, G]) => h("option", { value: k, selected: k === S.tab }, G.label)));
  const sous = h("select", { id: "a-sous" }, ["U14", "U16", "U19"].map(x => h("option", { value: x }, x)));
  const sousF = h("label", { class: "field" }, "Catégorie du gardien", sous);
  const poste = h("input", { id: "a-poste", maxlength: "40", placeholder: "Ex. milieu axial" });
  const syncSous = () => { sousF.style.display = grp.value === "GB" ? "" : "none"; };
  grp.onchange = syncSous; syncSous();
  const msg = h("p", { class: "note" });
  const go = h("button", { class: "btn" }, "Créer la fiche");
  go.onclick = async () => {
    const c = code.value.trim(), n = nom.value.trim();
    const cid = c || ("j-" + nid());
    if (c && (!SEG.test(c) || c === "." || c === ".." || isTemp(c))) { msg.className = "err"; msg.textContent = "Ce code n'est pas valide : copie-le tel quel depuis la page du joueur."; return; }
    if (!n) { msg.className = "err"; msg.textContent = "Indique le prénom et le nom."; return; }
    const data = { nom: n.slice(0, 60), groupe: grp.value, sousCat: grp.value === "GB" ? sous.value : "", poste: poste.value.trim().slice(0, 40), objectif: "", notes: [], createdAt: new Date().toISOString() };
    go.disabled = true;
    try {
      if (S.demo) { if (S.fiches[cid]) throw new Error("exists"); S.fiches[cid] = data; }
      else { const ref = S.db.doc("fiches/" + cid); const snap = await ref.get(); if (snap.exists) throw new Error("exists"); await ref.set(data); if (c) await S.db.doc("inscriptions/" + c).delete(); }
      S.tab = grp.value; S.flash = `Fiche de ${n} créée.`; S.view = "list"; render();
    } catch (e) {
      go.disabled = false; msg.className = "err";
      msg.textContent = e && e.message === "exists" ? "Ce code a déjà une fiche." : "Échec de la création : réessaie.";
    }
  };
  box.append(h("div", { class: "card stack" },
    h("label", { class: "field" }, "Compte du joueur (facultatif)", code),
    h("div", { class: "row" }, h("label", { class: "field", style: "flex:1;min-width:200px" }, "Nom", nom), h("label", { class: "field" }, "Groupe", grp), sousF),
    h("label", { class: "field" }, "Poste (facultatif)", poste),
    h("div", { class: "row" }, go, msg)));
  return box;
}

