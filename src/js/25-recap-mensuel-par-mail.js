/* ---------- récap mensuel par mail ---------- */
function recapJoueur(fid, f, mk) {
  const g = groupOf(f), parent = !!GROUPS[g].parent, ns = sortedNotes(f).filter(n => monthKey(n.date) === mk);
  if (!ns.length) return null;
  const prev = sortedNotes(f).filter(n => monthKey(n.date) === moisDe(mk, -1));
  const moy = avgNotes(ns, g), moyP = avgNotes(prev, g);
  const ne = ns.filter(n => n.type !== "Match"), nm = ns.filter(n => n.type === "Match");
  const crits = GRILLES[g] ? [...GRILLES[g].E.map(c => [c, ne]), ...mGrid(g, f).map(c => [c, nm])] : GROUPS[g].crit.map(c => [c, ns]);
  const vals = crits.map(([[k, lab], list]) => [lab, critAvg(list.filter(n => !isOldNote(n, g)), k)]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
  const fmt = v => parent ? LEVELS[Math.round(v)] : `${n1(v)}/5`;
  const pres = (f.presences || []).filter(x => compteAssid(x) && monthKey(x.date) === mk), presOk = pres.filter(x => x.p).length;
  const mt = (f.presences || []).filter(x => x && x.type === "Match" && monthKey(x.date) === mk);
  const lignes = [["Évaluations", `${ne.length} entraînement${ne.length > 1 ? "s" : ""}${nm.length ? `, ${nm.length} match${nm.length > 1 ? "s" : ""}` : ""}`]];
  if (moy != null) lignes.push(["Moyenne du mois", fmt(moy) + (moyP != null && !parent ? ` (${moy - moyP >= 0 ? "+" : "−"}${n1(Math.abs(moy - moyP))} par rapport au mois d'avant)` : "")]);
  if (pres.length) lignes.push(["Présence aux entraînements", `${presOk} sur ${pres.length}`]);
  if (mt.length) lignes.push(["Matchs", `${mt.filter(x => x.p).length} joué${mt.filter(x => x.p).length > 1 ? "s" : ""} sur ${mt.length} convocation${mt.length > 1 ? "s" : ""}`]);
  const st = nm.filter(n => n.stats); if (st.length && g === "U19") { const sum = k => st.reduce((a, n) => a + (n.stats[k] || 0), 0); lignes.push(["Temps de jeu, buts, passes déc.", `${sum("min")} min · ${sum("buts")} but${sum("buts") > 1 ? "s" : ""} · ${sum("pd")} passe${sum("pd") > 1 ? "s" : ""} déc.`]); }
  const autosM = (S.autos[fid] || []).filter(a => monthKey(a.date) === mk).length;
  if (!parent) lignes.push(["Auto-évaluations faites", String(autosM)]);
  const fort = vals[0], axe = vals.length > 1 ? vals[vals.length - 1] : null;
  const tiles = [];
  if (pres.length) tiles.push(["Présence", `${presOk}/${pres.length}`, "entraînements"]);
  if (mt.length) tiles.push(["Matchs", `${mt.filter(x => x.p).length}/${mt.length}`, "joués sur convocations"]);
  if (st.length && g === "U19") { const sum = k => st.reduce((a, n) => a + (n.stats[k] || 0), 0); tiles.push(["Temps de jeu", `${sum("min")}'`, `${sum("buts")} but${sum("buts") > 1 ? "s" : ""} · ${sum("pd")} passe${sum("pd") > 1 ? "s" : ""} déc.`]); }
  if (!parent) tiles.push(["Auto-évaluations", String(autosM), "faites ce mois-ci"]);
  else tiles.push(["Évaluations", String(ns.length), `${ne.length} entraînement${ne.length > 1 ? "s" : ""}${nm.length ? ` · ${nm.length} match${nm.length > 1 ? "s" : ""}` : ""}`]);
  const extra = { moy: moy == null ? "" : parent ? LEVELS[Math.round(moy)] : n1(moy), moyUnite: moy == null || parent ? "" : "sur 5",
    evo: moy != null && moyP != null && !parent ? `${moy - moyP >= 0 ? "+" : "−"}${n1(Math.abs(moy - moyP))}` : "",
    tiles, crits: vals.map(([lab, v]) => [lab, Math.round(v * 10) / 10, fmt(v)]) };
  return { ...extra, mois: new Date(mk + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), lignes, fort: fort ? `${fort[0]} (${fmt(fort[1])})` : "", axe: axe && axe[1] < fort[1] ? `${axe[0]} (${fmt(axe[1])})` : "" };
}
function recapCard() {
  const gs = visG(), g = gs.includes(S.recapG) ? S.recapG : gs[0];
  const auj = today(), mkDef = +auj.slice(8, 10) >= 20 ? auj.slice(0, 7) : moisDe(auj.slice(0, 7), -1), mk = S.recapM || mkDef;
  const box = h("div", { class: "d-card stack" });
  box.append(h("div", { class: "row", style: "gap:6px;align-items:center" }, gs.length > 1 ? gs.map(x => h("button", { class: "opt", "aria-pressed": String(x === g), onclick: () => { S.recapG = x; render(); } }, GROUPS[x].label)) : null,
    h("select", { "aria-label": "Mois", onchange: e => { S.recapM = e.target.value; render(); } }, [0, -1, -2].map(d => { const m = moisDe(auj.slice(0, 7), d); return h("option", { value: m, selected: m === mk }, monthLab(m)); }))));
  const liste = dFiches(g).filter(([fid, f]) => !isTemp(fid) && !f.exemple).map(([fid, f]) => { watchAutos(fid); return [fid, f, recapJoueur(fid, f, mk)]; }).filter(x => x[2]);
  const avecMail = liste.filter(([, f]) => f.email), sansMail = liste.length - avecMail.length;
  box.append(h("p", { style: "margin:0" }, liste.length ? `${avecMail.length} ${GROUPS[g].parent ? "parent" : "joueur"}${avecMail.length > 1 ? "s" : ""} recevront le récap de ${monthLab(mk)}${sansMail ? ` (${sansMail} sans adresse mail sur la fiche)` : ""}.` : `Personne n'a été noté en ${monthLab(mk)} dans ce groupe.`));
  if (liste.length) {
    const [, f0, r0] = liste[0];
    const det = h("details", { class: "recap-ex" }, h("summary", {}, `Voir l'exemple de ${f0.nom || "joueur"}`),
      h("table", { class: "stats" }, h("tbody", {}, r0.lignes.map(([a, b]) => h("tr", {}, h("td", {}, a), h("td", {}, b))),
        r0.fort ? h("tr", {}, h("td", {}, "Point fort"), h("td", {}, r0.fort)) : null, r0.axe ? h("tr", {}, h("td", {}, "À travailler"), h("td", {}, r0.axe)) : null)));
    box.append(det);
  }
  const msg = h("span", { class: "note" }); let arme = false;
  const go = h("button", { class: "btn small", disabled: !avecMail.length || !MAIL_URL }, `Envoyer le récap de ${monthLab(mk)}`);
  go.onclick = async () => {
    if (!arme) { arme = true; go.textContent = `Confirmer l'envoi à ${avecMail.length} adresse${avecMail.length > 1 ? "s" : ""}`; return; }
    go.disabled = true; msg.className = "note"; msg.textContent = "Envoi en cours…";
    let sent = 0, ko = 0;
    for (let i = 0; i < avecMail.length; i += 15) {
      const lot = avecMail.slice(i, i + 15), recaps = Object.fromEntries(lot.map(([fid, , r]) => [fid, r]));
      const r = await envoyerMails("recap", lot.map(([fid]) => fid), { recaps });
      if (r && r.ok) sent += r.sent; else ko += lot.length;
    }
    msg.className = ko ? "err" : "ok"; msg.textContent = ko ? `${sent} envoyé${sent > 1 ? "s" : ""}, ${ko} en échec.` : `Récap envoyé à ${sent} adresse${sent > 1 ? "s" : ""}.`;
    try { localStorage.setItem(`recap-${g}-${mk}`, today()); } catch (e) {}
  };
  let deja = null; try { deja = localStorage.getItem(`recap-${g}-${mk}`); } catch (e) {}
  box.append(h("div", { class: "row", style: "align-items:center" }, go, msg), deja ? h("p", { class: "note", style: "margin:0" }, `Déjà envoyé le ${fmtLong(deja)} depuis cet appareil.`) : null);
  return box;
}
