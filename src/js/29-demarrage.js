/* ---------- démarrage ---------- */
document.getElementById("logout").onclick = async () => { await signOut(auth); location.reload(); };
let started = false;
onAuthStateChanged(auth, async u => {
  if (!u) { if (started) location.reload(); document.getElementById("logout").hidden = true; loginView(); return; }
  if (started) { if (u.uid !== S.me) location.reload(); return; }
  started = true;
  document.getElementById("logout").hidden = false;
  const db = DB; S.db = db; S.me = u.uid; S.email = u.email || "";
  if (S.pendingSignup) {
    const ps = S.pendingSignup; S.pendingSignup = null;
    try { const ins = { nom: ps.nom, email: u.email || "", at: new Date().toISOString() }; if (ps.groupe) ins.groupe = ps.groupe; if (ps.poste) ins.poste = ps.poste; if (ps.role) ins.role = ps.role; if (S.pendingAccord) { ins.accord = true; ins.accordAt = ins.at; } await setDoc(fsDoc(fs, "inscriptions/" + u.uid), ins); } catch (e) {}
    try { await saveAvatar(u.uid, ps.avatar); } catch (e) {}
  }
  let coachData = null;
  try { const cs = await getDoc(fsDoc(fs, "coachs/" + u.uid)); S.admin = cs.exists(); coachData = S.admin ? cs.data() : null; } catch (e) { S.admin = false; }
  S.scope = coachData && Array.isArray(coachData.groupes) && coachData.groupes.length ? coachData.groupes.filter(g => GROUPS[g]) : null;
  const slowT = setTimeout(() => { S.slow = true; render(); }, 10000);
  render();
  const watchVotes = g => (g ? DB.where("votes", "groupe", g) : db.collection("votes")).onSnapshot(q => {
    const n = {}; q.docs.forEach(d => n[d.id] = d.data());
    if (!S.admin && S.votesVus) for (const [vid, v] of Object.entries(n)) if (v.ouvert && !(S.votes[vid] && S.votes[vid].ouvert)) notifier("Vote ouvert", `${voteLabel(v.type, v.groupe)} : c'est le moment de voter.`);
    S.votes = n; S.votesVus = true; softRender();
  }, () => {});
  if (S.admin && S.scope) {
    S.coachs = { [S.me]: coachData }; S.dash = true; S.tab = S.scope[0];
    const parG = { fiches: {}, seances: {}, votes: {} };
    const merge = k => Object.assign({}, ...Object.values(parG[k]));
    for (const g of S.scope) {
      DB.where("fiches", "groupe", g).onSnapshot(snap => {
        clearTimeout(slowT); S.slow = false;
        const next = {}; snap.docs.forEach(d => { if (d.exists) next[d.id] = d.data(); });
        parG.fiches[g] = next; poserFiches(merge("fiches")); S.loaded = true;
        for (const fid of Object.keys(next)) if (!S.subs["o-" + fid]) S.subs["o-" + fid] = db.doc("objectifs/" + fid).onSnapshot(os => { if (os.exists) S.objectifs[fid] = os.data(); softRender(); }, () => {});
        if (S.view === "saisie" || S.view === "ajout") return;
        if (S.view === "fiche" && !S.fiches[S.sel]) { S.view = "list"; S.sel = null; }
        softRender();
      }, err => { clearTimeout(slowT); S.loaded = true; render(); document.getElementById("app").append(h("p", { class: "err" }, "Impossible de lire les fiches pour l'instant.")); });
      DB.where("seances", "groupe", g).onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); parG.seances[g] = n; S.seances = merge("seances"); softRender(); }, () => {});
      DB.where("votes", "groupe", g).onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); parG.votes[g] = n; S.votes = merge("votes"); softRender(); }, () => {});
      db.doc("equipe/" + g).onSnapshot(es => { if (es.exists) S.equipes[g] = es.data(); else delete S.equipes[g]; softRender(); }, () => {});
    }
    db.collection("avatars").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.avatars = n; softRender(); }, () => {});
    if (S.scope.includes("U19")) db.doc("championnat/u19").onSnapshot(cs => { S.champ = cs.exists ? cs.data() : null; softRender(); }, () => {});
  } else if (S.admin) {
    db.collection("fiches").onSnapshot(snap => {
      clearTimeout(slowT); S.slow = false;
      const next = {}; snap.docs.forEach(d => { if (d.exists) next[d.id] = d.data(); });
      poserFiches(next); S.loaded = true;
      if (S.view === "saisie" || S.view === "ajout") return;
      if (S.view === "fiche" && !S.fiches[S.sel]) { S.view = "list"; S.sel = null; }
      softRender();
    }, err => { clearTimeout(slowT); S.loaded = true; render(); document.getElementById("app").append(h("p", { class: "err" }, "Impossible de lire les fiches pour l'instant.")); });
    db.collection("inscriptions").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.inscriptions = n; softRender(); }, () => {});
    db.collection("objectifs").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.objectifs = n; softRender(); }, () => {});
    db.collection("avatars").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.avatars = n; softRender(); }, () => {});
    db.collection("coachs").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.coachs = n; softRender(); }, () => {});
    db.doc("championnat/u19").onSnapshot(cs => { S.champ = cs.exists ? cs.data() : null; softRender(); }, () => {});
    db.collection("equipe").onSnapshot(snap => { const next = {}; snap.docs.forEach(d => { if (d.exists) next[d.id] = d.data(); }); S.equipes = next; softRender(); }, () => {});
    watchVotes();
    db.collection("seances").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.seances = n; softRender(); }, () => {});
    db.collection("carnet").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.carnet = n; softRender(); }, () => {});
  } else {
    try { S.blocked = (await getDoc(fsDoc(fs, "bloques/" + u.uid))).exists(); } catch (e) { S.blocked = false; }
    if (S.blocked) { clearTimeout(slowT); render(); return; }
    try { const ins = await getDoc(fsDoc(fs, "inscriptions/" + u.uid)); S.myInscription = ins.exists() ? ins.data() : null; } catch (e) {}
    db.doc("objectifs/" + S.me).onSnapshot(os => { if (os.exists) S.objectifs[S.me] = os.data(); softRender(); }, () => {});
    db.doc("avatars/" + S.me).onSnapshot(as => { if (as.exists) S.avatars = { ...S.avatars, [S.me]: as.data() }; softRender(); }, () => {});
    db.doc("fiches/" + S.me).onSnapshot(snap => {
      clearTimeout(slowT); S.slow = false;
      const avant = S.myFiche ? sortedNotes(S.myFiche).length : null;
      S.myRaw = snap.exists ? snap.data() : null;
      S.myFiche = S.myRaw ? avecPrive(S.me, S.myRaw) : null;
      chargerPrive();
      if (avant != null && S.myFiche && sortedNotes(S.myFiche).length > avant) notifier("Nouvelle note", "Ton coach vient de te noter. Ouvre ta fiche pour voir.");
      if (S.myFiche && !S.eqSub) {
        const g = groupOf(S.myFiche);
        S.eqSub = db.doc("equipe/" + g).onSnapshot(es => { if (es.exists) S.equipes[g] = es.data(); else delete S.equipes[g]; softRender(); }, () => {});
        if (g === "U19") db.doc("championnat/u19").onSnapshot(cs => { S.champ = cs.exists ? cs.data() : null; softRender(); }, () => {});
        watchVotes(g);
        db.collection("avatars").onSnapshot(q => { const n = {}; q.docs.forEach(d => n[d.id] = d.data()); S.avatars = n; softRender(); }, () => {});
      }
      softRender();
    }, err => { clearTimeout(slowT); S.myFiche = null; render(); });
  }
});
