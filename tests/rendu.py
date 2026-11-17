#!/usr/bin/env python3
"""Test de rendu : ouvre chaque écran du site avec des données d'exemple (sans Firebase)
et échoue si une erreur JavaScript apparaît ou si un écran reste vide.

Utilise Playwright + Chrome. Lancé par : python3 outils/build.py --tests
"""
import asyncio, os, re, shutil, sys, tempfile

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ECRANS = ["login", "dash", "dash10", "list", "fiche", "saisie", "saisiem", "saisie10", "smatch", "pres",
          "eq", "jacc", "jgb", "jeq", "jradar", "jauto", "p10", "acces", "adj", "adjdash", "adjfiche", "bmfs", "bmfm", "bmfnew", "conf"]

# contraste du texte (WCAG AA : 4,5:1, ou 3:1 pour le gros texte) ; la carte joueur, les icônes et les dessins sont exclus
CONTRASTE = r"""() => {
 const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
 const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
 const mix = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
 const fond = el => { const pile = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && !e.closest('.fcard')) return null; const c = rgb(cs.backgroundColor); if (c && c.a > 0) { pile.push(c); if (c.a >= 1) break; } } let r = { r: 11, g: 10, b: 10, a: 1 }; for (const c of pile.reverse()) r = mix(c, r); return r; };
 const out = [];
 const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
 const vus = new Set();
 while (w.nextNode()) { const t = w.currentNode; if (!t.textContent.trim()) continue; const el = t.parentElement; if (!el || vus.has(el) || el.closest('.fcard, svg, [hidden], .sr, .ico') || !/[A-Za-zÀ-ÿ0-9]/.test(t.textContent)) continue; vus.add(el);
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
  let fg = rgb(cs.color); const bg = fond(el); if (!fg || !bg) continue; let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; fg = mix({ ...fg, a: fg.a * op }, bg);
  const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
  const px = parseFloat(cs.fontSize), gras = +cs.fontWeight >= 700, grand = px >= 24 || (gras && px >= 18.66);
  const seuil = grand ? 3 : 4.5; if (ratio < seuil) out.push(`${ratio.toFixed(2)} (${Math.round(px)}px${gras ? ' gras' : ''}) « ${t.textContent.trim().slice(0, 40)} » ${el.className || el.tagName}`); }
 return out; }"""


def harnais(source=None):
    html = open(source or os.path.join(RACINE, "index.html"), encoding="utf-8").read()
    lignes = html.split("\n")
    a = next(i for i, l in enumerate(lignes) if l.startswith("import { initializeApp }"))
    b = next(i for i, l in enumerate(lignes) if l.startswith("const FIREBASE_CONFIG = "))
    stubs = open(os.path.join(RACINE, "tests", "stubs.js"), encoding="utf-8").read().rstrip("\n").split("\n")
    lignes = lignes[:a] + stubs + lignes[b + 1:]
    fin = max(i for i, l in enumerate(lignes) if l.strip() == "</script>")
    modes = open(os.path.join(RACINE, "tests", "modes.js"), encoding="utf-8").read().rstrip("\n").split("\n")
    lignes = lignes[:fin] + modes + lignes[fin:]
    d = tempfile.mkdtemp()
    p = os.path.join(d, "harnais.html")
    open(p, "w", encoding="utf-8").write("\n".join(lignes))
    return p


async def tester(chemin):
    from playwright.async_api import async_playwright
    chrome = os.environ.get("CHROME") or shutil.which("google-chrome") or shutil.which("chromium")
    problemes = []
    async with async_playwright() as p:
        nav = await p.chromium.launch(**({"executable_path": chrome} if chrome else {}))
        for e in ECRANS:
            for largeur in (390, 1200):
                page = await nav.new_page(viewport={"width": largeur, "height": 900})
                errs = []
                page.on("pageerror", lambda x: errs.append(str(x)))
                await page.goto("file://" + chemin + "#" + e)
                await page.wait_for_timeout(700)
                n = await page.evaluate("document.querySelectorAll('main *, #app *').length")
                if errs: problemes.append(f"{e} ({largeur}px) : {errs[0][:200]}")
                elif n < 5: problemes.append(f"{e} ({largeur}px) : écran vide")
                elif largeur == 390:
                    faibles = await page.evaluate(CONTRASTE)
                    if faibles: problemes.append(f"{e} : texte pas assez contrasté : " + " ; ".join(faibles[:3]))
                await page.close()
        await nav.close()
    return problemes


def main():
    probs = asyncio.run(tester(harnais(sys.argv[1] if len(sys.argv) > 1 else None)))
    if probs:
        print("Test de rendu : ÉCHEC\n- " + "\n- ".join(probs)); sys.exit(1)
    print(f"Test de rendu : OK ({len(ECRANS)} écrans × 2 largeurs, aucune erreur, contraste vérifié)")


if __name__ == "__main__":
    main()
