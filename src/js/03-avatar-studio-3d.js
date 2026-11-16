/* ---------- Endoume Avatar Studio (3D, chargé à la demande) ---------- */
const STUDIO_OPTS = {
  visage: [["ovale", "Ovale"], ["rond", "Rond"], ["fin", "Fin"]],
  formeYeux: [["amande", "Amande"], ["rond", "Ronds"]],
  sourcils: [["epais", "Épais"], ["fins", "Fins"]],
  nez: [["moyen", "Moyen"], ["fin", "Fin"], ["large", "Large"]],
  corps: [["athletique", "Athlétique"], ["fine", "Fine"], ["puissante", "Puissante"]],
  coupe: [["court", "Court"], ["ras", "Rasé"], ["degrade", "Dégradé"], ["flattop", "Flat-top"], ["boucle", "Bouclé"], ["afro", "Afro"], ["tresses", "Locks"], ["nattes", "Tresses"], ["long", "Long"], ["crete", "Crête"], ["chauve", "Chauve"]],
  barbe: [["non", "Aucune"], ["legere", "Légère"], ["moustache", "Moustache"], ["bouc", "Bouc"], ["oui", "Barbe"]],
  expr: [["sourire", "Sourire"], ["dents", "Grand sourire"], ["serieux", "Sérieux"]],
  maillot: [["dom", "Domicile"], ["ext", "Extérieur"], ["third", "Third"], ["gb", "Gardien"]],
  acc: [["non", "Aucun"], ["bandeau", "Bandeau"], ["lunettes", "Lunettes"], ["boucles", "Boucles d'oreilles"]]
};
const ST_COLORS = { yeux: ["#3a2316", "#6b4423", "#2f6a96", "#3f7a48", "#6f6f6f"], tissu: ["#0c0b0b", "#f3f0ea", "#d9172e", "#b08c40"], crampons: ["#111111", "#f3f0ea", "#d9172e", "#c9a85a", "#2e4f9a", "#ff4f8b"] };
let studioMod = null;
async function loadStudio() { if (!studioMod) studioMod = await import("./studio3d.js?v=3"); return studioMod; }
function closeStudio() { const o = document.getElementById("studio"); if (o) { if (o._eng) o._eng.dispose(); o.remove(); } document.body.style.overflow = ""; }
async function openStudio(uid) {
  closeStudio();
  let cfg = avClean(S.avatars[uid] || AV_DEF);
  if (!cfg.nomDos && S.myFiche && S.myFiche.nom) cfg.nomDos = shortNom(S.myFiche.nom).replace(/\s.*$/, "").toUpperCase().replace(/[^A-Z0-9 .-]/g, "").slice(0, 12);
  const ov = h("div", { id: "studio", class: "studio", role: "dialog", "aria-modal": "true", "aria-label": "Mon avatar 3D" });
  const stage = h("div", { class: "st-stage" }), load = h("div", { class: "st-load" }, h("div", { class: "kicker" }, "Endoume Avatar Studio"), h("p", { style: "margin:6px 0 0" }, "Chargement du studio 3D…"));
  stage.append(load);
  const panel = h("div", { class: "st-panel" });
  const tools = h("div", { class: "st-tools" });
  const msg = h("span", { class: "note", role: "status" });
  ov.append(h("div", { class: "st-head" }, h("div", {}, h("div", { class: "kicker" }, "Endoume Avatar Studio"), h("h2", { style: "font-size:26px" }, "Mon avatar 3D")), h("button", { class: "btn ghost small", onclick: closeStudio }, "Fermer")),
    h("div", { class: "st-body" }, h("div", { class: "st-left" }, stage, tools), panel));
  document.body.append(ov); document.body.style.overflow = "hidden";
  ov.addEventListener("keydown", e => { if (e.key === "Escape") closeStudio(); });
  let eng = null, tab = "visage", timer = null, auto = false, dirty = false;
  const push = () => { dirty = true; msg.className = "note"; msg.textContent = ""; clearTimeout(timer); timer = setTimeout(() => eng && eng.set(cfg), 90); };
  const setK = (k, v) => { cfg = avClean({ ...cfg, [k]: v }); push(); drawPanel(); };
  const chips = (k, list) => h("div", { class: "row", style: "gap:6px" }, list.map(([v, l]) => h("button", { type: "button", class: "opt", "aria-pressed": String(cfg[k] === v), onclick: () => setK(k, v) }, l)));
  const sw = (k, colors, label) => h("div", { class: "row", style: "gap:6px" }, colors.map((c, i) => h("button", { type: "button", class: "sw", style: `background:${c}`, "aria-label": `${label} ${i + 1}`, "aria-pressed": String(cfg[k] === i), onclick: () => setK(k, i) })));
  const grp = (lab, el) => h("div", { class: "st-grp" }, h("div", { class: "lab-s" }, lab), el);
  const drawPanel = () => {
    panel.textContent = "";
    const tabs = [["visage", "Visage"], ["cheveux", "Cheveux"], ["corps", "Corps"], ["tenue", "Tenue"], ["acc", "Accessoires"]];
    panel.append(h("div", { class: "st-tabs", role: "tablist" }, tabs.map(([k, l]) => h("button", { type: "button", role: "tab", class: "subtab", "aria-selected": String(tab === k), onclick: () => { tab = k; drawPanel(); } }, l))));
    const box = h("div", { class: "st-opts" });
    if (tab === "visage") box.append(grp("Teinte de peau", sw("peau", AV.peau, "Peau")), grp("Forme du visage", chips("visage", STUDIO_OPTS.visage)), grp("Couleur des yeux", sw("yeux", ST_COLORS.yeux, "Yeux")),
      grp("Forme des yeux", chips("formeYeux", STUDIO_OPTS.formeYeux)), grp("Sourcils", chips("sourcils", STUDIO_OPTS.sourcils)), grp("Nez", chips("nez", STUDIO_OPTS.nez)), grp("Expression", chips("expr", STUDIO_OPTS.expr)), grp("Barbe", chips("barbe", STUDIO_OPTS.barbe)));
    if (tab === "cheveux") box.append(grp("Coupe", chips("coupe", STUDIO_OPTS.coupe)), grp("Couleur", sw("cheveux", AV.cheveux, "Cheveux")));
    if (tab === "corps") {
      const r = h("input", { type: "range", min: "94", max: "106", step: "1", value: String(cfg.taille), "aria-label": "Taille" }); r.addEventListener("input", () => { cfg = avClean({ ...cfg, taille: +r.value }); push(); });
      box.append(grp("Morphologie", chips("corps", STUDIO_OPTS.corps)), grp("Taille", h("div", { class: "row", style: "align-items:center;gap:10px" }, h("span", { class: "note" }, "Plus petit"), r, h("span", { class: "note" }, "Plus grand"))));
    }
    if (tab === "tenue") {
      const num = h("input", { type: "text", inputmode: "numeric", maxlength: "2", value: cfg.num, style: "width:80px", "aria-label": "Numéro (1 à 99)" });
      num.addEventListener("input", () => { const v = num.value.replace(/\D/g, "").slice(0, 2); num.value = v; cfg = avClean({ ...cfg, num: v === "0" || v === "00" ? "" : v }); push(); });
      const nm = h("input", { type: "text", maxlength: "12", value: cfg.nomDos, style: "width:180px;text-transform:uppercase", "aria-label": "Nom au dos" });
      nm.addEventListener("input", () => { cfg = avClean({ ...cfg, nomDos: nm.value }); push(); });
      box.append(grp("Maillot", chips("maillot", STUDIO_OPTS.maillot)), h("div", { class: "row" }, grp("Numéro (1 à 99)", num), grp("Nom au dos", nm)),
        grp("Short", sw("short", ST_COLORS.tissu, "Short")), grp("Chaussettes", sw("chaussettes", ST_COLORS.tissu, "Chaussettes")), grp("Crampons", sw("chaussures", ST_COLORS.crampons, "Crampons")));
    }
    if (tab === "acc") box.append(grp("Accessoire", chips("acc", STUDIO_OPTS.acc)));
    panel.append(box);
    const save = h("button", { class: "btn", onclick: async () => {
      save.disabled = true; msg.className = "note"; msg.textContent = "Enregistrement…";
      try { if (eng) { clearTimeout(timer); eng.set(cfg); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); cfg.img = eng.snapshot(200); }
        await saveAvatar(uid, cfg); dirty = false; msg.className = "ok"; msg.textContent = "Avatar enregistré : il apparaît sur ta carte."; render(); }
      catch (e) { msg.className = "err"; msg.textContent = "Échec de l'enregistrement : vérifie ta connexion et réessaie."; }
      save.disabled = false;
    } }, "Enregistrer mon avatar");
    panel.append(h("div", { class: "st-save" }, save, msg));
  };
  drawPanel();
  const fallback = why => { stage.textContent = ""; stage.append(h("div", { class: "st-load" }, h("p", { style: "margin:0 0 10px" }, why), avatarEditor(cfg, a => { cfg = avClean({ ...cfg, ...a }); delete cfg.img; }))); tools.textContent = ""; };
  try {
    const mod = await loadStudio();
    if (!mod.webglOK()) { fallback("Ton appareil ne gère pas la 3D : voici l'éditeur simplifié."); return; }
    load.remove();
    eng = mod.createStudio(stage, cfg, { crestUrl: "assets/endoume-logo.png" }); ov._eng = eng;
    const hidePanel = () => { ov.classList.toggle("nopanel"); };
    tools.append(h("button", { class: "btn ghost small", onclick: () => eng.reset() }, "Recentrer"),
      h("button", { class: "btn ghost small", "aria-pressed": "false", onclick: e => { auto = !auto; eng.autoRotate(auto); e.currentTarget.setAttribute("aria-pressed", String(auto)); e.currentTarget.textContent = auto ? "Arrêter la rotation" : "Rotation auto"; } }, "Rotation auto"),
      h("button", { class: "btn ghost small", onclick: e => { hidePanel(); e.currentTarget.textContent = ov.classList.contains("nopanel") ? "Afficher les réglages" : "Masquer les réglages"; } }, "Masquer les réglages"),
      h("span", { class: "note" }, "Fais glisser pour tourner, pince ou molette pour zoomer"));
  } catch (e) { fallback("Le studio 3D n'a pas pu se charger (connexion ?). Voici l'éditeur simplifié."); }
}

async function saveAvatar(uid, a) {
  const d = { ...avClean(a), at: new Date().toISOString() };
  await setDoc(fsDoc(fs, "avatars/" + uid), d);
  S.avatars[uid] = d;
}

