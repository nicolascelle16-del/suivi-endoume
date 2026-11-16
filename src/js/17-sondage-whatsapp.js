/* ---------- réponses au sondage WhatsApp (saisies par le coach) ---------- */
const jourLong = d => { try { const t = new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); } catch (e) { return d; } };
const seanceTitre = s => [jourLong(s.date), s.type, s.heure ? s.heure.replace(":", "h") : ""].filter(Boolean).join(" · ");
const ilYa = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const seancesOf = (g, recent) => Object.entries(S.seances).filter(([, s]) => s && s.groupe === g && (!recent || s.date >= ilYa(7))).sort((a, b) => (a[1].date + (a[1].heure || "")) < (b[1].date + (b[1].heure || "")) ? -1 : 1);
const ditOf = s => (s && s.dit && typeof s.dit === "object") ? s.dit : {};
function seancesCoachCard(g) {
  const card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Sondage WhatsApp : qui a dit oui ?"),
    h("p", { class: "note", style: "margin:0" }, "Crée la séance, puis reporte ce que chaque joueur a répondu au sondage. Au moment de l'appel (« Noter une séance »), tu verras s'il est venu ou pas."));
  const date = h("input", { type: "date", id: "sc-date", value: today() }), heure = h("input", { type: "time", id: "sc-heure" });
  const type = h("select", { id: "sc-type" }, h("option", { value: "Entraînement" }, "Entraînement"), h("option", { value: "Match" }, "Match"));
  const msg = h("span", { class: "note" });
  const go = h("button", { class: "btn small" }, "Créer la séance");
  go.onclick = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) { msg.className = "err"; msg.textContent = "Choisis une date."; return; }
    if (seancesOf(g).some(([, s]) => s.date === date.value && s.type === type.value)) { msg.className = "err"; msg.textContent = "Cette séance existe déjà."; return; }
    go.disabled = true; const id = nid();
    try { await S.db.doc("seances/" + id).set({ groupe: g, date: date.value, type: type.value, heure: heure.value || "", dit: {}, at: new Date().toISOString() }); S.waOpen = id; msg.className = "ok"; msg.textContent = "Séance créée : coche les réponses ci-dessous."; }
    catch (e) { msg.className = "err"; msg.textContent = "Échec : réessaie."; }
    go.disabled = false;
  };
  card.append(h("div", { class: "row", style: "align-items:flex-end" }, h("label", { class: "field" }, "Date", date), h("label", { class: "field" }, "Heure", heure), h("label", { class: "field" }, "Type", type), go), msg);
  const list = seancesOf(g, true);
  if (!list.length) { card.append(h("p", { class: "note", style: "margin:0" }, "Aucune séance cette semaine.")); return card; }
  const players = Object.entries(S.fiches).filter(([, f]) => groupOf(f) === g).sort((a, b) => (a[1].nom || "").localeCompare(b[1].nom || "", "fr"));
  if (!S.waOpen || !list.some(([sid]) => sid === S.waOpen)) S.waOpen = (list.find(([, s]) => s.date >= today()) || list[list.length - 1])[0];
  for (const [sid, s] of list.slice().reverse()) {
    const dit = ditOf(s), oui = players.filter(([fid]) => dit[fid] === true).length, non = players.filter(([fid]) => dit[fid] === false).length, open = S.waOpen === sid;
    const head = h("button", { type: "button", class: "wa-head", "aria-expanded": String(open), onclick: () => { S.waOpen = open ? "" : sid; render(); } },
      h("strong", {}, seanceTitre(s)), h("span", { class: "row", style: "gap:6px;flex-wrap:nowrap" }, h("span", { class: "pill ok" }, `Oui ${oui}`), h("span", { class: "pill no" }, `Non ${non}`), h("span", { class: "pill" }, `? ${players.length - oui - non}`)));
    const item = h("div", { class: "hitem stack", style: "gap:8px" }, head);
    if (open) {
      const setDit = async (fid, v) => { const n = { ...ditOf(S.seances[sid]) }; if (v === null) delete n[fid]; else n[fid] = v; S.seances[sid] = { ...S.seances[sid], dit: n }; render();
        try { await S.db.doc("seances/" + sid).update({ dit: n }); } catch (e) { S.flashWa = "Échec de l'enregistrement : vérifie ta connexion."; render(); } };
      const rows = h("div", { class: "wa-list" });
      for (const [fid, f] of players) {
        const v = dit[fid];
        rows.append(h("div", { class: "wa-row" }, h("span", { class: "wa-nom" }, f.nom || "Sans nom"),
          h("span", { class: "wa-btns" }, h("button", { type: "button", class: "toggle wa-oui", "aria-pressed": String(v === true), onclick: () => setDit(fid, v === true ? null : true) }, "Oui"),
            h("button", { type: "button", class: "toggle wa-non", "aria-pressed": String(v === false), onclick: () => setDit(fid, v === false ? null : false) }, "Non"))));
      }
      const del = h("button", { class: "linkbtn danger" }, "Supprimer la séance");
      del.onclick = async () => { if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmer la suppression"; return; } try { await S.db.doc("seances/" + sid).delete(); } catch (e) { del.textContent = "Échec"; } };
      item.append(h("div", { class: "row", style: "gap:10px" }, h("button", { class: "linkbtn", onclick: async () => { const n = { ...dit }; players.forEach(([fid]) => { if (n[fid] === undefined) n[fid] = true; }); S.seances[sid] = { ...S.seances[sid], dit: n }; render(); try { await S.db.doc("seances/" + sid).update({ dit: n }); } catch (e) { S.flashWa = "Échec de l'enregistrement : vérifie ta connexion."; render(); } } }, "Mettre « oui » à ceux sans réponse")), rows, del);
      if (S.flashWa) { item.append(h("p", { class: "err", style: "margin:0" }, S.flashWa)); S.flashWa = ""; }
    }
    card.append(item);
  }
  return card;
}

