"use strict";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc as fsDoc, collection as fsCol, onSnapshot as fsSnap, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query as fsQuery, where as fsWhere } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const FIREBASE_CONFIG = __CONFIG__;
const fbApp = initializeApp(FIREBASE_CONFIG), auth = getAuth(fbApp), fs = getFirestore(fbApp);
const wrapDoc = x => ({ id: x.id, exists: x.exists(), data: () => x.data() });
function docRef(path) { const r = fsDoc(fs, path); return { id: r.id, path, get: async () => wrapDoc(await getDoc(r)), set: (d, o) => o ? setDoc(r, d, o) : setDoc(r, d), update: d => updateDoc(r, d), delete: () => deleteDoc(r), onSnapshot: (n, e) => fsSnap(r, x => n(wrapDoc(x)), e) }; }
function colRef(path) { const r = fsCol(fs, path); return { path, get: async () => { const q = await getDocs(r); return { docs: q.docs.map(wrapDoc) }; }, onSnapshot: (n, e) => fsSnap(r, q => n({ docs: q.docs.map(wrapDoc), size: q.size, empty: q.empty }), e), doc: id => docRef(path + "/" + id) }; }
function whereRef(path, field, val) { const q = fsQuery(fsCol(fs, path), fsWhere(field, "==", val)); return { onSnapshot: (n, e) => fsSnap(q, x => n({ docs: x.docs.map(wrapDoc), size: x.size, empty: x.empty }), e) }; }
const DB = { doc: docRef, collection: colRef, where: whereRef };
const GROUPS = {
  U19: { label: "U19", crit: [["eng","Engagement"],["tech","Technique"],["intel","Intelligence de jeu"],["comp","Comportement"]] },
  U10: { label: "U10", parent: true, crit: [["plaisir","Plaisir et engagement"],["tech","Technique balle au pied"],["jeu","Compréhension du jeu"],["respect","Respect et écoute"]] },
  GB:  { label: "Gardiens", crit: [["prise","Prise de balle"],["plac","Placement"],["pied","Jeu au pied"],["comm","Communication"],["cour","Courage"]] }
};
/* grilles d'évaluation : entraînement (E) et match (M) ; GROUPS[g].crit = ancienne grille (U19/U10) ou grille unique (Gardiens) */
const GRILLES = {
  U19: {
    E: [["int","Intensité","Répète les efforts, va au duel, ne marche pas dans les exercices."],
        ["app","Application des consignes","Respecte le thème et les exigences de la séance."],
        ["qtec","Qualité technique","Justesse des passes et des contrôles, même sous pression."],
        ["info","Prise d'information","Regarde avant de recevoir et fait le bon choix."],
        ["att","Attitude","Ponctualité, écoute, communication avec les partenaires."]],
    M: [["role","Rôle à son poste","Tient ce qu'on attend de son poste dans le 4-3-3."],
        ["tac","Discipline tactique","Placement, bloc équipe, replis et transitions."],
        ["imp","Impact","Duels gagnés, ballons récupérés, actions décisives."],
        ["ment","Mental","Réagit après une erreur, reste concentré tout le match, se maîtrise face à l'arbitre."],
        ["vol","Volume athlétique","Tient l'intensité jusqu'au bout."]]
  },
  U10: {
    E: [["envie","Envie","Participe à fond, n'abandonne pas."],
        ["ballon","Maîtrise du ballon","Conduite, contrôle, utilise ses deux pieds."],
        ["ecoute","Écoute","Comprend et applique la consigne."],
        ["partage","Jouer avec les autres","Fait des passes, partage le ballon."],
        ["resp","Respect","Envers ses partenaires, les éducateurs et le matériel."]],
    M: [["ose","Ose","Tente le dribble ou la frappe, n'a pas peur de se tromper."],
        ["collectif","Joue collectif","Cherche un partenaire démarqué."],
        ["attdef","Attaque et défense","Se replace et aide quand on perd le ballon."],
        ["fair","Fair-play","Envers l'adversaire et l'arbitre, qu'on gagne ou qu'on perde."]]
  }
};
/* gardiens de but : grille de match spécifique (U19 au poste de gardien et groupe Gardiens) */
const GK_M = [["arr","Arrêts","Sort les ballons qu'il doit sortir : réflexes, parades, un contre un."],
  ["sort","Sorties et jeu aérien","Bon timing sur les centres et la profondeur, capte ou repousse proprement."],
  ["plg","Placement","Ferme son angle sur les frappes, gère la profondeur derrière sa défense."],
  ["rel","Relance","Jeu au pied et à la main juste, court ou long au bon moment."],
  ["lead","Leadership et mental","Parle, organise sa défense, réagit après une erreur ou un but encaissé."]];
GRILLES.GB = { E: GROUPS.GB.crit, M: GK_M };
const GKK = new Set(GK_M.map(c => c[0]));
const isGK = f => !!f && (groupOf(f) === "GB" || /gardien/i.test(f.poste || ""));
const mGrid = (g, f) => isGK(f) ? GK_M : GRILLES[g].M;
const critsJ = (g, type, f) => type === "Match" && isGK(f) ? GK_M : critsOf(g, type);
const DESC = {}, LABEL = {}, NEWK = {}, OLDK = {};
for (const [g, G] of Object.entries(GROUPS)) { OLDK[g] = new Set(G.crit.map(c => c[0])); for (const [k, l] of G.crit) LABEL[k] = LABEL[k] || l; }
for (const [g, R] of Object.entries(GRILLES)) { NEWK[g] = new Set(); for (const c of [...R.E, ...R.M]) { NEWK[g].add(c[0]); LABEL[c[0]] = c[1]; DESC[c[0]] = c[2]; } }
const critsOf = (g, type) => GRILLES[g] ? (type === "Match" ? GRILLES[g].M : GRILLES[g].E) : GROUPS[g].crit;
const isOldNote = (n, g) => !!GRILLES[g] && !!n && !!n.crit && Object.keys(n.crit).some(k => OLDK[g].has(k) && !NEWK[g].has(k));
const critsForNote = (n, g) => {
  const ks = n && n.crit ? Object.keys(n.crit) : [];
  if (ks.some(k => GKK.has(k))) return GK_M;
  if (isOldNote(n, g)) return GROUPS[g].crit;
  const c = critsOf(g, n && n.type);
  return ks.length && !ks.some(k => c.some(x => x[0] === k)) ? GROUPS[g].crit : c;
};
function critLabel(k, lab) {
  const d = DESC[k];
  if (!d) return h("span", {}, lab);
  return h("details", { class: "crit-d" }, h("summary", {}, lab, h("span", { class: "crit-i", "aria-hidden": "true" }, "i")), h("p", {}, d));
}
const LEVELS = ["", "À travailler", "En progrès", "Correct", "Bien", "Très bien"];
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const isTemp = fid => typeof fid === "string" && fid.startsWith("j-");

const S = { db: null, user: null, me: null, admin: false, demo: false, demoAs: "coach",
  fiches: {}, loaded: false, slow: false, tab: "U19", view: "list", sel: null, saisie: null,
  myFiche: undefined, prive: {}, fichesRaw: {}, myRaw: null, flash: "", avatars: {}, objectifs: {}, avDraft: null, avEdit: false, inscriptions: {}, coachs: {}, votes: {}, bulletins: {}, myBallots: {}, votants: {}, seances: {}, reponses: {}, convoc: {}, compoDraft: {}, compoSel: {}, voteDraft: {}, autos: {}, subs: {}, equipes: {}, champ: null, champSub: null, sub: "joueurs", psub: "fiche", eqSub: null };

