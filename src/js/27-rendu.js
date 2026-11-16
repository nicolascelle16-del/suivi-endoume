/* ---------- rendu ---------- */
function render() {
  if (S.conf) { showConf(); return; }
  const app = document.getElementById("app"); app.textContent = "";
  const role = document.getElementById("role");
  role.textContent = S.admin ? "Espace coach" : "Mon espace";
  app.append(S.admin ? coachView() : joueurView());
}

document.getElementById("lien-conf").onclick = showConf;
if (location.hash === "#confidentialite") S.conf = true;
