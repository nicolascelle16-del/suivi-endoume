/* ---------- tableau de bord coach ---------- */
const GCOL = { U19: "#e0182d", U10: "#cdbd8f", GB: "#9a8f78" };
const visG = () => Object.keys(GROUPS).filter(g => !S.scope || S.scope.includes(g));
const dFiches = g => Object.entries(S.fiches).filter(([, f]) => (!g || groupOf(f) === g) && (S.demo || !f.exemple));
const moisDe = (k, delta) => { const [y, m] = k.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const avgNotes = (list, g) => mean(list.map(n => noteAvg(n, g)).filter(v => v != null));
function groupMonth(g, mk) { const v = []; for (const [, f] of dFiches(g)) for (const n of sortedNotes(f)) if (monthKey(n.date) === mk) { const a = noteAvg(n, g); if (a != null) v.push(a); } return mean(v); }
function presRange(g, from, to) { let ok = 0, n = 0; for (const [, f] of dFiches(g)) for (const p of (Array.isArray(f.presences) ? f.presences : []).filter(compteAssid)) if (p && typeof p.date === "string" && p.date >= from && (!to || p.date <= to)) { n++; if (p.p) ok++; } return n ? ok / n : null; }
function fiabilite(g) {
  let venu = 0, total = 0;
  for (const [, se] of Object.entries(S.seances)) {
    if (!se || (g && se.groupe !== g)) continue;
    for (const [fid, oui] of Object.entries(ditOf(se))) {
      if (!oui || !S.fiches[fid]) continue;
      const pr = (S.fiches[fid].presences || []).find(p => p && p.date === se.date && p.type === se.type);
      if (!pr) continue; total++; if (pr.p) venu++;
    }
  }
  return { rate: total ? venu / total : null, total };
}
function ouiAbsents() {
  const c = {};
  for (const [, se] of Object.entries(S.seances)) for (const [fid, oui] of Object.entries(ditOf(se))) {
    if (!oui || !S.fiches[fid]) continue;
    const pr = (S.fiches[fid].presences || []).find(p => p && p.date === se.date && p.type === se.type);
    if (pr && !pr.p) c[fid] = (c[fid] || 0) + 1;
  }
  return c;
}
function dashAlertes() {
  const out = [], nom = fid => (S.fiches[fid] && S.fiches[fid].nom) || "?";
  const go = (g, fid) => () => { S.dash = false; S.tab = g; if (fid) { S.view = "fiche"; S.sel = fid; } else { S.view = "list"; S.sub = "joueurs"; } render(); };
  // auto-évaluations du dernier match (U19, comptes reliés)
  const manq = dFiches("U19").filter(([fid, f]) => !isTemp(fid) && !f.exemple && (watchAutos(fid), autoMissing(fid, f)));
  if (manq.length) out.push({ g: "U19", t: `${manq.length} auto-évaluation${manq.length > 1 ? "s" : ""} du dernier match manquante${manq.length > 1 ? "s" : ""}`, d: manq.map(([fid]) => nom(fid)).join(", "),
    go: MAIL_URL ? async () => { const r = await envoyerMails("auto", manq.map(([fid]) => fid)); S.flash = r && r.ok ? `Rappel envoyé par mail à ${r.sent} joueur${r.sent > 1 ? "s" : ""}.` : "L'envoi du rappel a échoué. Réessaie plus tard."; render(); } : go("U19"), lab: MAIL_URL ? "Relancer par mail" : "Voir" });
  // comptes en attente
  const att = Object.keys(S.inscriptions).filter(u => !S.fiches[u] && !S.coachs[u]);
  if (att.length) out.push({ g: null, t: `${att.length} compte${att.length > 1 ? "s" : ""} en attente de liaison`, d: att.map(u => (S.inscriptions[u].nom || "") + (S.inscriptions[u].role === "adjoint" ? " (adjoint U19, à valider)" : "")).filter(Boolean).join(", "), go: () => { S.dash = false; S.view = "list"; S.sub = "acces"; render(); }, lab: "Relier" });
  // a dit oui mais pas venu (2 fois ou plus)
  for (const [fid, n] of Object.entries(ouiAbsents())) if (n >= 2) { const g = groupOf(S.fiches[fid]); out.push({ g, t: `${nom(fid)} a dit oui sans venir ${n} fois`, d: "D'après le sondage WhatsApp et ton appel.", go: go(g, fid) }); }
  const ds = derniereSauvegarde();
  if (!S.scope && (!ds || ds < ilYa(30))) out.push({ g: null, t: "Sauvegarde du mois à faire", d: ds ? `Dernière sauvegarde le ${fmtLong(ds)}.` : "Aucune sauvegarde faite sur cet appareil.", go: () => { exporterTout(); render(); }, lab: "Exporter" });
  for (const e of carnetList().filter(x => x.date && x.date <= today() && !reflexFaite(x)).sort((a, b) => a.date < b.date ? -1 : 1))
    out.push({ g: e.groupe, t: `Analyse réflexive à faire : ${e.kind === "match" ? "match" : "séance"} du ${fmtLong(e.date)}`, d: "Carnet BMF", go: () => openCarnet(e.id, e), lab: "Ouvrir" });
  // comptes non reliés : message d'invitation à copier
  for (const g of Object.keys(GROUPS)) {
    const nl = dFiches(g).filter(([fid, f]) => isTemp(fid) && !f.exemple);
    if (nl.length) out.push({ g, t: `${nl.length} joueur${nl.length > 1 ? "s" : ""} ${GROUPS[g].label} sans compte relié`, d: nl.map(([, f]) => f.nom).join(", "),
      go: async () => { const txt = invitationTexte(g, nl.map(([, f]) => f.nom)); try { await navigator.clipboard.writeText(txt); S.flash = "Message d'invitation copié : colle-le dans le groupe WhatsApp."; } catch (e) { S.flash = txt; } render(); }, lab: "Copier l'invitation" });
  }
  // pas notés depuis 2 semaines (rotation)
  for (const g of Object.keys(GROUPS)) {
    const pn = dFiches(g).filter(([fid, f]) => !f.exemple && sortedNotes(f).length && (joursDepuisNote(f) || 0) >= 14);
    if (pn.length >= 2) out.push({ g, t: `${pn.length} joueurs ${GROUPS[g].label} pas notés depuis 2 semaines`, d: pn.map(([, f]) => f.nom.split(" ")[0]).join(", ") + ". À observer en priorité à la prochaine séance.", go: go(g) });
  }
  // fiches en double possibles dans un même groupe (même nom ou même mail) ; un gardien U19 a normalement une fiche U19 et une fiche Gardiens
  const cle = f => (f.nom || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  const vus = {};
  for (const [fid, f] of dFiches()) { if (f.exemple) continue; for (const k of [cle(f) && "n:" + groupOf(f) + cle(f), f.email && "m:" + groupOf(f) + String(f.email).toLowerCase()]) if (k) (vus[k] = vus[k] || new Set()).add(fid); }
  const dbl = new Set(); for (const set of Object.values(vus)) if (set.size > 1) dbl.add([...set].sort().join("|"));
  for (const k of dbl) { const fids = k.split("|"); out.push({ g: null, t: `Fiche en double : ${nom(fids[0])}`, d: fids.map(fid => `${GROUPS[groupOf(S.fiches[fid])].label}${isTemp(fid) ? " (sans compte)" : ""}`).join(" et ") + ". Vérifie avant de supprimer celle en trop.", go: go(groupOf(S.fiches[fids[0]]), fids[0]) }); }
  for (const [fid, f] of dFiches()) {
    const g = groupOf(f), ns = sortedNotes(f).map(n => noteAvg(n, g)).filter(v => v != null);
    // 3 baisses de suite
    if (ns.length >= 4 && ns.length < 6) { const l = ns.slice(-4); if (l[0] > l[1] && l[1] > l[2] && l[2] > l[3]) out.push({ g, t: `${nom(fid)} baisse 3 fois de suite`, d: `De ${n1(l[0])} à ${n1(l[3])} sur ses dernières notes.`, go: go(g, fid) }); }
    // en baisse
    if (ns.length >= 6) { const r = mean(ns.slice(-3)), a = mean(ns.slice(0, -3)); if (a - r >= 0.6) out.push({ g, t: `${nom(fid)} est en baisse`, d: `${n1(r)} sur ses 3 dernières notes, contre ${n1(a)} avant.`, go: go(g, fid) }); }
    // absent depuis 2 semaines
    const pr = (Array.isArray(f.presences) ? f.presences : []).filter(compteAssid).sort((a, b) => a.date < b.date ? -1 : 1);
    const lastOk = pr.filter(p => p.p).pop(), depuis = pr.filter(p => !lastOk || p.date > lastOk.date);
    if (pr.length && depuis.length >= 2 && (!lastOk || lastOk.date < ilYa(14))) out.push({ g, t: `${nom(fid)} n'est pas venu depuis ${lastOk ? "le " + fmtLong(lastOk.date) : "le début"}`, d: `${depuis.length} absence${depuis.length > 1 ? "s" : ""} de suite.`, go: go(g, fid) });
  }
  return out.filter(a => !S.scope || (a.g && S.scope.includes(a.g)));
}
function dashLineChart(series, keys) {
  const W = 560, H = 210, L = 28, R = 74, T = 14, B = 28;
  const x = i => keys.length < 2 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (keys.length - 1), y = v => T + (5 - v) / 4 * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Moyenne des trois groupes, mois par mois">`;
  for (const v of [1, 2, 3, 4, 5]) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#3b3536" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" fill="#aaa294" font-size="11" text-anchor="end">${v}</text>`;
  keys.forEach((k, i) => s += `<text x="${x(i)}" y="${H - 8}" fill="#aaa294" font-size="11" text-anchor="middle">${esc(monthLab(k))}</text>`);
  const ends = [];
  for (const se of series) {
    const pts = se.v.map((v, i) => v == null ? null : [x(i), y(v), v, keys[i]]).filter(Boolean);
    if (!pts.length) continue;
    s += `<polyline fill="none" stroke="${se.c}" stroke-width="2" stroke-linejoin="round" points="${pts.map(p => p[0] + "," + p[1]).join(" ")}"/>`;
    for (const p of pts) s += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${se.c}" stroke="#1b1819" stroke-width="2"><title>${esc(se.n)} · ${esc(monthLab(p[3]))} : ${n1(p[2])} sur 5</title></circle>`;
    const l = pts[pts.length - 1]; ends.push({ x: l[0], y: l[1] + 4, n: se.n, c: se.c });
  }
  ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  for (const e of ends) s += `<text x="${e.x + 9}" y="${e.y}" fill="${e.c}" font-size="12" font-weight="600">${esc(e.n)}</text>`;
  const el = h("div", { class: "chart" }); el.innerHTML = s + "</svg>"; return el;
}
