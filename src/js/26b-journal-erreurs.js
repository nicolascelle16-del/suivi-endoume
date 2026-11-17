/* ---------- journal des erreurs du site ----------
   Quand le site plante chez quelqu'un, l'erreur est enregistrée dans erreurs/{id}, SANS nom, adresse ni identifiant :
   le message technique, l'écran, le rôle (coach, adjoint, joueur, parent), la version du site et le navigateur.
   Seul le coach les lit (accueil coach, « À traiter »). Effacées au bout de 30 jours. */
const VERSION_SITE = "__VERSION__";
const JOURNAL = { n: 0, vus: new Set() };
function roleActuel() {
  if (S.admin) return S.scope ? "adjoint" : "coach";
  if (S.myFiche) return groupOf(S.myFiche) === "U10" ? "parent" : "joueur";
  return "visiteur";
}
function ecranActuel() { return S.conf ? "confidentialite" : S.admin ? (S.bmf ? "bmf" : S.dash ? "accueil" : (S.view || "liste") + (S.sub ? "/" + S.sub : "")) : S.me ? "joueur/" + (S.psub || "") : "connexion"; }
function journaliser(err, ou) {
  try {
    if (S.demo || !auth.currentUser || JOURNAL.n >= 5) return;
    const msg = String((err && (err.message || err.reason || err)) || "erreur inconnue").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[mail]").slice(0, 300);
    const cle = msg + "|" + ou; if (JOURNAL.vus.has(cle)) return; JOURNAL.vus.add(cle); JOURNAL.n++;
    DB.doc("erreurs/" + nid()).set({ msg, ou: String(ou || "").slice(0, 200), ecran: ecranActuel().slice(0, 60), role: roleActuel(), at: new Date().toISOString(), version: VERSION_SITE, nav: navigator.userAgent.replace(/\s+/g, " ").slice(0, 160) }).catch(() => {});
  } catch (e) {}
}
window.addEventListener("error", e => journaliser(e.error || e.message, `${(e.filename || "").split("/").pop()}:${e.lineno || 0}:${e.colno || 0}`));
window.addEventListener("unhandledrejection", e => journaliser(e.reason, "promesse"));
/* lecture côté coach : une seule fois par ouverture (pas d'écoute permanente), et ménage au-delà de 30 jours */
async function chargerErreurs() {
  if (!S.admin || S.scope || S.demo || S.erreursCharge) return; S.erreursCharge = true;
  try {
    const q = await DB.collection("erreurs").get(), limite = new Date(Date.now() - 30 * 864e5).toISOString(), garde = [];
    for (const d of q.docs) { const x = { id: d.id, ...d.data() }; if (!x.at || x.at < limite) DB.doc("erreurs/" + d.id).delete().catch(() => {}); else garde.push(x); }
    S.erreurs = garde.sort((a, b) => a.at < b.at ? 1 : -1); softRender();
  } catch (e) { S.erreursCharge = false; }
}
function erreursItem() {
  chargerErreurs();
  const es = (S.erreurs || []).filter(x => x.at >= new Date(Date.now() - 7 * 864e5).toISOString());
  if (!es.length) return null;
  const parMsg = {}; for (const x of es) (parMsg[x.msg] = parMsg[x.msg] || []).push(x);
  return { c: "rouge", t: `${es.length} erreur${es.length > 1 ? "s" : ""} du site cette semaine`, d: `${Object.keys(parMsg).length} problème${Object.keys(parMsg).length > 1 ? "s" : ""} différent${Object.keys(parMsg).length > 1 ? "s" : ""} · ${[...new Set(es.map(x => x.role))].join(", ")}`, lab: S.voirErreurs ? "Masquer" : "Voir", go: () => { S.voirErreurs = !S.voirErreurs; render(); },
    detail: S.voirErreurs ? h("div", { class: "acc-err" }, Object.entries(parMsg).map(([m, l]) => h("div", { class: "acc-err-l" }, h("b", {}, `${l.length} × ${m}`), h("span", {}, `${l[0].ecran} · ${[...new Set(l.map(x => x.role))].join(", ")} · dernière : ${fmtDate(l[0].at.slice(0, 10))} · version ${l[0].version}${l[0].ou ? " · " + l[0].ou : ""}`))),
      h("button", { class: "btn ghost small", onclick: async () => { for (const x of S.erreurs || []) await DB.doc("erreurs/" + x.id).delete().catch(() => {}); S.erreurs = []; S.voirErreurs = false; render(); } }, "Tout effacer (c'est corrigé)")) : null };
}
