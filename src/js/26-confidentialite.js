/* ---------- confidentialité ---------- */
const CONSERVATION = "pour suivre la progression du joueur d'une saison à l'autre. Il n'y a pas de suppression automatique";
function confView() {
  const box = h("div", { class: "stack conf", style: "margin-top:20px" });
  const sec = (t, ...k) => h("section", { class: "card stack" }, h("h3", { style: "margin:0" }, t), ...k);
  const ul = items => h("ul", {}, items.map(x => h("li", {}, x)));
  box.append(h("div", { class: "bar" }, h("h2", {}, "Confidentialité et mentions légales"), h("button", { class: "btn ghost small", onclick: () => { S.conf = false; if (location.hash === "#confidentialite") history.replaceState(null, "", location.pathname + location.search); S.me ? render() : loginView(); } }, "Retour")));
  box.append(h("p", { style: "margin:0" }, "Ce site sert à suivre la progression des joueurs de l'US Endoume Marseille Catalans (U19, U10 et pôle gardiens). Il est géré par le coach Nicolas Celle, éducateur au club. Voici, simplement, ce qu'il enregistre, qui le voit et combien de temps."));
  box.append(sec("Ce qui est enregistré", ul([
    "Le compte : l'adresse mail et le mot de passe (le mot de passe est chiffré par Google, personne ne peut le lire, pas même le coach).",
    "Le prénom et le nom du joueur, sa catégorie, et son poste pour les U19.",
    "L'avatar : un dessin choisi par le joueur, jamais une photo.",
    "Les évaluations des entraînements et des matchs (notes et commentaires de l'encadrement), le temps de jeu, les buts et passes décisives pour les U19.",
    "Les présences aux séances, et les réponses au sondage WhatsApp que le coach reporte lui-même.",
    "Pour les U19 : les auto-évaluations, l'objectif personnel, et le fait d'avoir voté pour l'homme du match. Le vote est anonyme : personne ne peut savoir pour qui un joueur a voté.",
    "Le carnet de formation du coach (diplôme BMF) peut reprendre les noms, temps de jeu et notes d'un match dans ses fiches de match."
  ])));
  box.append(sec("Qui le voit", ul([
    "Le joueur (ou le parent pour les U10) voit uniquement sa propre fiche. Il ne voit jamais les notes des autres.",
    "Les coéquipiers d'une même catégorie voient seulement l'avatar, le nom dans les compositions d'équipe et les résultats des votes.",
    "L'encadrement : le coach Nicolas Celle pour toutes les catégories, et le coach adjoint U19 uniquement pour les U19.",
    "Le carnet de formation du coach peut être remis aux formateurs du BMF (Ligue de Méditerranée de football).",
    "Personne d'autre. Aucune publicité, aucune revente, aucun partage avec d'autres organismes."
  ])));
  box.append(sec("Où et combien de temps", ul([
    "Les données sont stockées chez Google (Firebase), et le site est hébergé par GitHub.",
    `Elles sont conservées ${CONSERVATION} : elles sont supprimées sur simple demande, par exemple quand le joueur quitte le club.`,
    "Le coach fait des sauvegardes régulières, conservées de façon privée.",
    "Les mails d'avis (nouvelle évaluation, rappel d'auto-évaluation) partent de la boîte Gmail du coach, vers l'adresse du compte. Ils ne contiennent pas les notes."
  ])));
  box.append(sec("Les mineurs", h("p", { style: "margin:0" }, "Pour un joueur de moins de 18 ans, le compte est créé avec l'accord d'un parent ou du représentant légal. Pour les U10, c'est le parent qui crée et utilise le compte.")));
  box.append(sec("Vos droits", h("p", { style: "margin:0" }, "Vous pouvez à tout moment demander à voir, corriger ou supprimer les données d'un joueur : il suffit d'en parler au coach ou au club. La suppression du compte efface la fiche.")));
  box.append(sec("Cookies", h("p", { style: "margin:0" }, "Aucun cookie publicitaire ni de mesure d'audience. Le site garde seulement sur votre téléphone ce qui sert à rester connecté.")));
  box.append(sec("Mentions légales", ul([
    "Éditeur et responsable de la publication : Nicolas Celle, éducateur à l'US Endoume Marseille Catalans. Site personnel, non commercial, réalisé à titre bénévole pour le suivi des joueurs du club.",
    "Contact : directement auprès de Nicolas Celle, ou par l'intermédiaire du club US Endoume Marseille Catalans.",
    "Hébergement du site : GitHub Inc. (GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.",
    "Hébergement des données : Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande.",
    "Polices de caractères (Barlow, Barlow Condensed, Inter, Oranienbaum) hébergées sur le site, sous licence SIL Open Font License."
  ])));
  box.append(h("p", { class: "note", style: "margin:0" }, "Dernière mise à jour : 16 novembre 2026."));
  return box;
}
function showConf() { S.conf = true; document.getElementById("role").textContent = "Confidentialité"; const app = document.getElementById("app"); app.textContent = ""; app.append(confView()); window.scrollTo(0, 0); }

