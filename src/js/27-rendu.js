/* ---------- rendu ---------- */
function render() {
  if (S.conf) { showConf(); return; }
  const app = document.getElementById("app"); app.textContent = "";
  const role = document.getElementById("role");
  role.textContent = S.admin ? "Espace coach" : "Mon espace";
  try { app.append(S.admin ? coachView() : joueurView()); }
  catch (e) {
    // un écran qui plante ne laisse plus une page vide : message simple, et l'erreur part dans le journal du coach
    journaliser(e, "affichage"); app.textContent = "";
    app.append(h("div", { class: "card stack", role: "alert", style: "margin-top:20px" }, h("h3", { style: "margin:0" }, "Oups, cet écran a un problème"),
      h("p", { style: "margin:0" }, S.admin ? "L'erreur est enregistrée dans « À traiter ». Recharge la page pour réessayer." : "Le coach est prévenu automatiquement. Recharge la page pour réessayer."),
      h("button", { class: "btn small", onclick: () => location.reload() }, "Recharger")));
    if (S.demo || window.__TEST_RENDU) throw e;
  }
}

document.getElementById("lien-conf").onclick = showConf;
if (location.hash === "#confidentialite") S.conf = true;
