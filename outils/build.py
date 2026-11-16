#!/usr/bin/env python3
"""Reconstruit index.html à partir de src/ puis le vérifie.

  python3 outils/build.py            -> écrit index.html et lance les contrôles
  python3 outils/build.py --verifier -> ne réécrit rien : échoue si index.html n'est pas à jour
  python3 outils/build.py --tests    -> ajoute le test de rendu (Chrome + Playwright)

Organisation :
  src/page.html            squelette HTML (marqueurs /*@STYLE@*/ et //@JS@)
  src/style.css            toute la feuille de style
  src/js/ORDRE.txt         ordre des morceaux de code (un seul module à l'arrivée)
  src/js/NN-theme.js       le code, rangé par thème
  src/firebase-config.js   configuration publique Firebase (injectée à la place de __CONFIG__)
"""
import os, subprocess, sys, tempfile

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda *p: os.path.join(RACINE, *p)


def assembler():
    page = open(S("src", "page.html"), encoding="utf-8").read()
    css = open(S("src", "style.css"), encoding="utf-8").read().rstrip("\n")
    ordre = [l.strip() for l in open(S("src", "js", "ORDRE.txt"), encoding="utf-8") if l.strip()]
    absents = [f for f in ordre if not os.path.exists(S("src", "js", f))]
    orphelins = sorted(set(f for f in os.listdir(S("src", "js")) if f.endswith(".js")) - set(ordre))
    if absents or orphelins:
        sys.exit(f"ORDRE.txt incohérent. Absents : {absents} ; non listés : {orphelins}")
    js = "".join(open(S("src", "js", f), encoding="utf-8").read() for f in ordre).rstrip("\n")
    conf = open(S("src", "firebase-config.js"), encoding="utf-8").read().strip()
    assert page.count("/*@STYLE@*/") == 1 and page.count("//@JS@") == 1, "marqueurs manquants dans page.html"
    html = page.replace("/*@STYLE@*/", css).replace("//@JS@", js)
    assert html.count("__CONFIG__") == 1, "__CONFIG__ doit apparaître une fois dans le code"
    return html.replace("__CONFIG__", conf)


def controler(html):
    erreurs = []
    if "__CONFIG__" in html: erreurs.append("configuration Firebase non injectée")
    a = html.find('<script type="module">'); b = html.find("</script>", a)
    if a < 0 or b < 0: erreurs.append("script principal introuvable")
    else:
        with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as t:
            t.write(html[a + len('<script type="module">'):b]); chemin = t.name
        r = subprocess.run(["node", "--check", chemin], capture_output=True, text=True)
        if r.returncode: erreurs.append("erreur de syntaxe JavaScript :\n" + (r.stderr or r.stdout)[-1500:])
    if len(html) > 2_000_000: erreurs.append("index.html anormalement lourd")
    return erreurs


def main():
    html = assembler()
    erreurs = controler(html)
    if "--verifier" in sys.argv:
        actuel = open(S("index.html"), encoding="utf-8").read()
        if actuel != html: erreurs.append("index.html n'est pas à jour : lance python3 outils/build.py")
    if not erreurs and "--tests" in sys.argv:
        with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as t:
            t.write(html); candidat = t.name
        r = subprocess.run([sys.executable, S("tests", "rendu.py"), candidat])
        if r.returncode: erreurs.append("le test de rendu a échoué : index.html n'a pas été modifié")
    if not erreurs and "--verifier" not in sys.argv:
        open(S("index.html"), "w", encoding="utf-8").write(html)
    if erreurs:
        print("ÉCHEC :\n- " + "\n- ".join(erreurs)); sys.exit(1)
    print(f"OK : index.html ({len(html)//1024} Ko) vérifié.")


if __name__ == "__main__":
    main()
