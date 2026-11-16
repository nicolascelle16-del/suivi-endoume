/* ---------- connexion ---------- */
const AUTH_ERR = { "auth/invalid-credential": "Email ou mot de passe incorrect.", "auth/wrong-password": "Email ou mot de passe incorrect.", "auth/user-not-found": "Aucun compte avec cet email.", "auth/email-already-in-use": "Un compte existe déjà avec cet email : connecte-toi.", "auth/weak-password": "Le mot de passe doit faire au moins 6 caractères.", "auth/invalid-email": "Cet email n'est pas valide.", "auth/too-many-requests": "Trop d'essais : attends quelques minutes." };
function loginView() {
  if (S.conf) { showConf(); return; }
  const app = document.getElementById("app"); app.textContent = "";
  document.getElementById("role").textContent = "Connexion";
  let mode = S.loginMode || "in";
  const email = h("input", { id: "l-email", type: "email", autocomplete: "email" }), pass = h("input", { id: "l-pass", type: "password", autocomplete: mode === "in" ? "current-password" : "new-password" });
  const nom = h("input", { id: "l-nom", maxlength: "60", placeholder: "Prénom et nom (de l'enfant pour les U10)" });
  const msg = h("p", { class: "note", style: "margin:0" });
  const go = h("button", { class: "btn" }, mode === "in" ? "Se connecter" : "Créer mon compte");
  const submit = async e => {
    e.preventDefault(); msg.className = "note"; msg.textContent = "…"; go.disabled = true;
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, email.value.trim(), pass.value);
      else {
        const n = nom.value.trim(); if (!n) { msg.className = "err"; msg.textContent = "Indique ton prénom et ton nom."; go.disabled = false; return; }
        if (!S.signGroupe) { msg.className = "err"; msg.textContent = "Indique si tu es un joueur U19, un parent U10, un gardien ou un coach adjoint."; go.disabled = false; return; }
        if (S.signGroupe === "U19" && !S.signPoste) { msg.className = "err"; msg.textContent = "Choisis ton poste sur le terrain."; go.disabled = false; return; }
        if (!S.signAccord) { msg.className = "err"; msg.textContent = S.signGroupe === "U10" ? "Coche la case d'accord du parent." : "Coche la case d'accord pour continuer."; go.disabled = false; return; }
        S.pendingAccord = true;
        S.pendingSignup = S.signGroupe === "ADJ" ? { nom: n.slice(0, 60), avatar: S.avDraft || AV_DEF, groupe: "U19", role: "adjoint", poste: "" }
          : { nom: n.slice(0, 60), avatar: S.avDraft || AV_DEF, groupe: S.signGroupe, poste: S.signGroupe === "U19" ? S.signPoste : (S.signGroupe === "GB" ? "Gardien" : "") };
        await createUserWithEmailAndPassword(auth, email.value.trim(), pass.value);
      }
    } catch (err) { S.pendingSignup = null; go.disabled = false; msg.className = "err"; msg.textContent = AUTH_ERR[err && err.code] || "Échec : vérifie ta connexion et réessaie."; }
  };
  app.append(h("div", { class: "login-hero" }, h("img", { src: document.querySelector(".crest").src, alt: "" }), h("div", { class: "t" }, "Suivi des joueurs"), h("div", { class: "s" }, "Endoume · Catalans")));
  const form = h("form", { class: "card stack login-form" },
    h("div", { class: "subtabs", role: "tablist" },
      h("button", { type: "button", class: "subtab", "aria-selected": String(mode === "in"), onclick: () => { S.loginMode = "in"; loginView(); } }, "Connexion"),
      h("button", { type: "button", class: "subtab", "aria-selected": String(mode === "up"), onclick: () => { S.loginMode = "up"; loginView(); } }, "Créer mon compte")),
    mode === "up" ? h("label", { class: "field" }, "Prénom et nom", nom) : null,
    mode === "up" ? (() => {
      const posteBox = h("div", { class: "stack", style: "gap:6px", hidden: S.signGroupe !== "U19" }, h("h3", { style: "margin:0" }, "Ton poste"), h("p", { class: "note", style: "margin:0" }, "Touche ton poste sur le terrain (système en 4-3-3)."), postePicker(S.signPoste, v => { S.signPoste = v; }));
      const gb = [["U19", "Joueur U19"], ["U10", "Parent d'un U10"], ["GB", "Gardien (pôle gardiens)"], ["ADJ", "Coach adjoint U19"]].map(([v, l]) => h("button", { type: "button", class: "opt", "data-g": v, "aria-pressed": String(S.signGroupe === v), onclick: e => { S.signGroupe = v; if (S.majAccord) S.majAccord(); e.currentTarget.parentNode.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.g === v))); posteBox.hidden = v !== "U19"; } }, l));
      return h("div", { class: "stack", style: "gap:10px" }, h("div", { class: "field" }, "Je suis", h("div", { class: "row", style: "gap:6px" }, gb)), posteBox);
    })() : null,
    mode === "up" ? h("div", { class: "stack", style: "gap:8px" }, h("h3", { style: "margin:0" }, "Crée ton avatar"), avatarEditor(S.avDraft, a => { S.avDraft = a; }), h("p", { class: "note", style: "margin:0" }, "Il apparaîtra sur ta carte de joueur. Tu pourras le modifier plus tard.")) : null,
    h("label", { class: "field" }, "Email", email), h("label", { class: "field" }, "Mot de passe", pass),
    mode === "up" ? (() => {
      const c = h("input", { type: "checkbox", id: "accord" }); c.checked = !!S.signAccord; c.onchange = () => { S.signAccord = c.checked; };
      const txt = h("span", { id: "accord-txt" }), suf = h("span");
      const maj = () => {
        txt.textContent = S.signGroupe === "U10" ? "Je suis le parent ou le représentant légal de l'enfant, et j'accepte les règles de la page " : "J'accepte les règles de la page ";
        suf.textContent = S.signGroupe === "U10" || S.signGroupe === "ADJ" ? "." : ". Si j'ai moins de 18 ans, mon parent ou représentant légal est d'accord.";
      };
      maj(); S.majAccord = maj;
      return h("label", { class: "check accord" }, c, h("span", {}, txt, h("button", { type: "button", class: "linkbtn", style: "display:inline;padding:0", onclick: showConf }, "Confidentialité"), suf));
    })() : null,
    go, msg,
    mode === "in" ? h("button", { type: "button", class: "linkbtn", onclick: async () => { const e = email.value.trim(); if (!e) { msg.className = "err"; msg.textContent = "Écris ton email, puis clique à nouveau ici."; return; } try { await sendPasswordResetEmail(auth, e); msg.className = "ok"; msg.textContent = "Email de réinitialisation envoyé."; } catch (err) { msg.className = "err"; msg.textContent = AUTH_ERR[err && err.code] || "Échec : réessaie."; } } }, "Mot de passe oublié ?") : h("p", { class: "note", style: "margin:0" }, "Ton coach reliera ensuite ton compte à ta fiche. Tu ne verras que tes propres notes."));
  form.addEventListener("submit", submit);
  app.append(form);
}
let renderTimer = null;
function softRender() {
  const ae = document.activeElement;
  if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "SELECT" || (ae.tagName === "INPUT" && ae.type !== "button"))) return;
  if (S.view === "saisie" || S.view === "ajout" || (S.bmf && S.bmfEdit)) return;
  clearTimeout(renderTimer); renderTimer = setTimeout(render, 30);
}

