/* ---------- championnat U19 ---------- */
function champView() {
  const c = S.champ, box = h("div", { class: "stack" });
  if (!c || !Array.isArray(c.classement)) { box.append(h("div", { class: "card" }, h("h3", {}, "Championnat"), h("p", { class: "note" }, "Le classement et le calendrier ne sont pas encore chargés."))); return box; }
  const ME = c.equipe || "USM ENDOUME CATALANS";
  const short = t => (c.noms && c.noms[t]) || t;
  const logo = (t, sz) => { const src = (c.logos && c.logos[t]) || LOGOS[t]; return src && /^data:image\/(jpeg|png);base64,/.test(src) ? h("img", { src, alt: "", width: sz || 22, height: sz || 22, style: "border-radius:4px;vertical-align:middle;margin-right:8px;background:#fff;object-fit:contain" }) : null; };
  const team = (t, sz) => h("span", { style: "display:inline-flex;align-items:center;white-space:nowrap" }, logo(t, sz), t === ME ? h("strong", {}, short(t)) : short(t));
  const maj = c.majAt ? new Date(c.majAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
  const matchs = (c.matchs || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const next = matchs.find(m => !m.score);
  if (next) {
    const dom = next.h === ME, opp = dom ? next.a : next.h, r = c.classement.find(x => x.t === opp);
    box.append(h("div", { class: "card", "data-k": "next", style: "border-color:var(--rouge)" }, h("h3", {}, "Prochain match"),
      h("div", { class: "hero-eq", style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" }, team(next.h, 40), h("span", { style: "color:var(--muted)" }, "contre"), team(next.a, 40)),
      h("p", { class: "note", style: "margin:4px 0 0" }, `J${next.j} · ${fmtLong(next.date)}${next.heure ? " à " + next.heure : ""} · ${dom ? "à domicile" : "à l'extérieur"}${r ? ` · adversaire ${r.rang}e avec ${r.pts} pts` : ""}`)));
  }
  const tb = h("tbody");
  for (const r of c.classement) tb.append(h("tr", { style: r.t === ME ? "background:rgba(208,24,47,.15)" : null },
    h("td", {}, r.rang), h("td", {}, team(r.t)), h("td", {}, h("b", {}, r.pts)), h("td", {}, r.j), h("td", {}, `${r.v}-${r.n}-${r.d}`), h("td", {}, `${r.bp}-${r.bc}`), h("td", {}, (r.bp - r.bc > 0 ? "+" : "") + (r.bp - r.bc))));
  box.append(h("div", { class: "card", "data-k": "cl" }, h("h3", {}, `${c.titre || "Classement"}`),
    h("div", { class: "tablebox" }, h("table", { class: "stats" }, h("thead", {}, h("tr", {}, ["#", "Équipe", "Pts", "J", "V-N-D", "Buts", "Diff"].map(x => h("th", {}, x)))), tb)),
    h("p", { class: "note" }, `Classement FFF au ${maj}, sous réserve des procédures en cours.${c.remarque ? " " + c.remarque : ""}`)));
  const tb2 = h("tbody");
  for (const m of matchs) {
    const dom = m.h === ME, opp = dom ? m.a : m.h;
    let res = "";
    if (m.score) { const [x, y] = dom ? m.score : [m.score[1], m.score[0]]; res = (x > y ? "V " : x < y ? "D " : "N ") + x + "-" + y + (m.forfait ? " (forfait)" : ""); }
    tb2.append(h("tr", { style: next && m === next ? "background:rgba(214,172,78,.12)" : null }, h("td", {}, "J" + m.j), h("td", {}, fmtDate(m.date)), h("td", {}, dom ? "Dom." : "Ext."), h("td", {}, team(opp)),
      h("td", { style: res.startsWith("V") ? "color:#9fe0b1;font-weight:600" : res.startsWith("D") ? "color:#ff9aa6;font-weight:600" : null }, res || (m.heure || "–"))));
  }
  box.append(h("div", { class: "card", "data-k": "cal" }, h("h3", {}, "Calendrier et résultats d'Endoume"), h("div", { class: "tablebox" }, h("table", { class: "stats" }, h("thead", {}, h("tr", {}, ["J", "Date", "Lieu", "Adversaire", "Résultat"].map(x => h("th", {}, x)))), tb2))));
  return box;
}

