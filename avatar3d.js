/* Endoume Avatar Studio v2 — vrai personnage riggé (base Quaternius, CC0), habillé aux couleurs du club.
   Aperçu de validation : le configurateur complet viendra se brancher sur buildAvatar(). */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const A = "assets/avatar/";
export const SKINS = [["#ffffff", "light"], ["#f0d9c8", "light"], ["#d9b08c", "light"], ["#ffffff", "dark"], ["#c9a184", "dark"], ["#9a7459", "dark"], ["#6e4f3c", "dark"]];
export const HAIRS = ["#17110f", "#3b2416", "#6b4423", "#a8763a", "#dcb769", "#9a9a9a", "#2e4f9a", "#b3202f"];
const tl = new THREE.TextureLoader();
const tex = (f, srgb = true) => { const t = tl.load(A + f); t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const XW = 0.46, YT = 1.62, YB = 0.86;
function jerseyTexture(cfg, crest) {
  return canvasTex(2048, 1024, (x, W, H) => {
    const fx = m => 512 + m / (2 * XW) * 1024, bx = m => 1536 - m / (2 * XW) * 1024, vy = m => (YT - m) / (YT - YB) * H, px = m => m / (2 * XW) * 1024;
    const kit = cfg.maillot || "dom", RED = "#d9172e", BLK = "#0d0c0c", GOLD = "#c9a85a";
    const base = kit === "ext" ? "#f3f0ea" : kit === "gb" ? "#f2c230" : RED;
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    for (const cx of [512, 1536]) {
      if (kit === "dom") {
        const sw = px(0.062); x.fillStyle = BLK;
        for (let i = -3; i <= 3; i += 2) x.fillRect(cx + i * sw - sw / 2, 0, sw, H);
        x.globalAlpha = .6; x.fillStyle = GOLD; for (let m = -0.25; m <= 0.25; m += 0.0155) x.fillRect(cx + px(m), 0, 1.6, H); x.globalAlpha = 1;
        // manches : rouges, revers noir liseré or
        for (const s of [-1, 1]) { x.fillStyle = RED; x.fillRect(s > 0 ? cx + px(0.218) : 0 + (cx - 512), 0, s > 0 ? 512 - px(0.218) : px(0.46 - 0.218), H); }
      } else if (kit === "ext") { for (const s of [-1, 1]) { x.fillStyle = RED; x.fillRect(cx + s * px(0.17) - 10, 0, 20, H); x.fillStyle = BLK; x.fillRect(cx + s * px(0.17) + (s > 0 ? 12 : -20), 0, 8, H); } }
      else { x.fillStyle = BLK; for (const s of [-1, 1]) x.fillRect(cx + s * px(0.17) - 9, 0, 18, H); }
      for (const s of [-1, 1]) { const e = cx + s * px(0.395); x.fillStyle = BLK; x.fillRect(Math.min(e, e - s * px(0.03)), 0, px(0.03), H); x.fillStyle = GOLD; x.fillRect(Math.min(e - s * px(0.03), e - s * px(0.036)), 0, px(0.006), H); }
      // ourlet
      x.fillStyle = BLK; x.fillRect(cx - 512, vy(0.955), 1024, H); x.fillStyle = GOLD; x.fillRect(cx - 512, vy(0.96), 1024, 4);
    }
    // col (devant en V, dos arrondi)
    x.fillStyle = BLK; x.beginPath(); x.moveTo(fx(-0.1), 0); x.lineTo(fx(-0.1), vy(1.5)); x.lineTo(fx(0), vy(1.4)); x.lineTo(fx(0.1), vy(1.5)); x.lineTo(fx(0.1), 0); x.fill();
    x.strokeStyle = GOLD; x.lineWidth = 5; x.beginPath(); x.moveTo(fx(-0.1), vy(1.5)); x.lineTo(fx(0), vy(1.4)); x.lineTo(fx(0.1), vy(1.5)); x.stroke();
    x.fillStyle = BLK; x.beginPath(); x.ellipse(1536, 0, px(0.11), vy(1.5), 0, 0, 7); x.fill(); x.strokeStyle = GOLD; x.beginPath(); x.ellipse(1536, 0, px(0.11), vy(1.5), 0, 0, 7); x.stroke();
    // blason sur le cœur (côté gauche du joueur)
    if (crest) { const w = px(0.07), h = w * crest.height / crest.width; x.drawImage(crest, fx(0.085) - w / 2, vy(1.375) - h / 2, w, h); }
    // dos : nom + numéro
    const ink = kit === "dom" ? "#ffffff" : BLK, edge = kit === "dom" ? BLK : null; x.textAlign = "center"; x.textBaseline = "middle";
    const nom = String(cfg.nomDos || "").toUpperCase().slice(0, 12), num = String(cfg.num || "").slice(0, 2);
    if (nom) { x.font = "600 46px 'Barlow Condensed','Arial Narrow',Arial,sans-serif"; if (edge) { x.lineWidth = 9; x.strokeStyle = edge; x.strokeText(nom, 1536, vy(1.415)); } x.fillStyle = ink; x.fillText(nom, 1536, vy(1.415)); }
    if (num) { x.font = "270px Oranienbaum,Georgia,serif"; if (edge) { x.lineWidth = 18; x.strokeStyle = edge; x.strokeText(num, 1536, vy(1.215)); } x.fillStyle = ink; x.fillText(num, 1536, vy(1.215)); }
    if (num) { x.font = "70px Oranienbaum,Georgia,serif"; if (edge) { x.lineWidth = 8; x.strokeStyle = edge; x.strokeText(num, fx(-0.085), vy(1.37)); } x.fillStyle = ink; x.fillText(num, fx(-0.085), vy(1.37)); }
  });
}
const shortsTexture = () => canvasTex(512, 512, (x, W, H) => { x.fillStyle = "#0d0c0c"; x.fillRect(0, 0, W, H); x.fillStyle = "#c9a85a"; x.fillRect(0, H - 14, W, 5); x.fillStyle = "#d9172e"; x.fillRect(0, H - 9, W, 9); });
const socksTexture = () => canvasTex(256, 512, (x, W, H) => { x.fillStyle = "#0d0c0c"; x.fillRect(0, 0, W, H); x.fillStyle = "#d9172e"; x.fillRect(0, 30, W, 34); x.fillStyle = "#c9a85a"; x.fillRect(0, 70, W, 8); });
function rotW(bone, axis, angle) {
  bone.parent.updateWorldMatrix(true, false); bone.updateWorldMatrix(true, false);
  const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()), wq = bone.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pq.invert().multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle).multiply(wq)));
}
let basePromise = null;
const loadBase = () => basePromise || (basePromise = new Promise((ok, ko) => new GLTFLoader().load(A + "endoume-base.glb", ok, undefined, ko)));
const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
export async function createViewer(container, cfg0) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement); renderer.domElement.style.cssText = "display:block;touch-action:none";
  const scene = new THREE.Scene();
  scene.background = canvasTex(1024, 1024, (x, W, H) => { const g = x.createRadialGradient(W * .5, H * .4, 40, W * .5, H * .5, W * .75); g.addColorStop(0, "#3a1418"); g.addColorStop(.45, "#1c0f11"); g.addColorStop(1, "#090808"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalAlpha = .18; x.fillStyle = "#d9172e"; x.beginPath(); x.moveTo(W * .62, 0); x.lineTo(W * .78, 0); x.lineTo(W * .38, H); x.lineTo(W * .22, H); x.fill(); x.globalAlpha = .1; x.fillStyle = "#c9a85a"; x.beginPath(); x.moveTo(W * .82, 0); x.lineTo(W * .86, 0); x.lineTo(W * .46, H); x.lineTo(W * .42, H); x.fill(); }); scene.background.flipY = true;
  const cam = new THREE.PerspectiveCamera(26, 1, .05, 40), HOME = [new THREE.Vector3(0.9, 1.25, 4.3), new THREE.Vector3(0, 0.95, 0)]; cam.position.copy(HOME[0]);
  const ctl = new OrbitControls(cam, renderer.domElement); ctl.target.copy(HOME[1]); ctl.enableDamping = true; ctl.enablePan = false; ctl.minDistance = 0.8; ctl.maxDistance = 7; ctl.minPolarAngle = .4; ctl.maxPolarAngle = 1.7; ctl.autoRotateSpeed = 1.6; ctl.update();
  scene.add(new THREE.HemisphereLight("#fff3e6", "#2a1616", 1.0));
  const key = new THREE.DirectionalLight("#fff1e0", 2.6); key.position.set(2, 4, 3.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2.2, bottom: -.3 }); key.shadow.bias = -.0005; key.shadow.normalBias = .02; scene.add(key);
  const rim = new THREE.DirectionalLight("#ff3b4f", 1.8); rim.position.set(-3, 2.5, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight("#e8c879", 1.0); rim2.position.set(3, 2, -3); scene.add(rim2);
  const fill = new THREE.DirectionalLight("#cfe0ff", .5); fill.position.set(-3, 1.5, 3); scene.add(fill);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.ShadowMaterial({ opacity: .5 })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; scene.add(sh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.74, 64), new THREE.MeshBasicMaterial({ color: "#c9a85a", transparent: true, opacity: .55 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .002; scene.add(ring);
  const [gltf, crest] = await Promise.all([loadBase(), loadImg("assets/endoume-logo.png")]);
  const root = gltf.scene; scene.add(root);
  const M = {}, B = {}; root.traverse(o => { if (o.isSkinnedMesh) { M[o.name] = o; o.castShadow = true; o.frustumCulled = false; } if (o.isBone) B[o.name] = o; });
  const skinN = tex("skin_n.jpg", false), skinT = { light: tex("skin_light.jpg"), dark: tex("skin_dark.jpg") };
  const mat = {
    skin: new THREE.MeshStandardMaterial({ map: skinT.dark, normalMap: skinN, roughness: .62 }),
    eyes: new THREE.MeshStandardMaterial({ map: tex("eye.jpg"), roughness: .15 }),
    hair: new THREE.MeshStandardMaterial({ map: tex("hair1.jpg"), normalMap: tex("hair1_n.jpg", false), roughness: .75, side: THREE.DoubleSide }),
    hair2: new THREE.MeshStandardMaterial({ map: tex("hair2.jpg"), normalMap: tex("hair2_n.jpg", false), roughness: .75, side: THREE.DoubleSide }),
    jersey: new THREE.MeshStandardMaterial({ roughness: .78, side: THREE.DoubleSide }),
    shorts: new THREE.MeshStandardMaterial({ map: shortsTexture(), roughness: .8, side: THREE.DoubleSide }),
    socks: new THREE.MeshStandardMaterial({ map: socksTexture(), roughness: .9, side: THREE.DoubleSide }),
    boots: new THREE.MeshPhysicalMaterial({ color: "#111", roughness: .35, clearcoat: .6, side: THREE.DoubleSide })
  };
  M.Body.material = mat.skin; M.Eyes.material = mat.eyes; M.Eyebrows.material = mat.hair; M.Jersey.material = mat.jersey; M.Shorts.material = mat.shorts; M.Socks.material = mat.socks; M.Boots.material = mat.boots;
  for (const k of ["Hair_Buzzed", "Hair_Parted", "Beard"]) M[k].material = mat.hair; for (const k of ["Hair_Long", "Hair_Buns"]) M[k].material = mat.hair2;
  // pose naturelle : bras le long du corps
  const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  rotW(B.upperarm_l, Z, -1.2); rotW(B.upperarm_r, Z, 1.2); rotW(B.clavicle_l, Z, -.06); rotW(B.clavicle_r, Z, .06);
  rotW(B.lowerarm_l, X, -.28); rotW(B.lowerarm_r, X, -.28); rotW(B.lowerarm_l, Z, -.12); rotW(B.lowerarm_r, Z, .12);
  for (const s of ["l", "r"]) for (const f of ["index", "middle", "ring", "pinky"]) for (const n of ["01", "02", "03"]) { const b = B[`${f}_${n}_${s}`]; if (b) rotW(b, new THREE.Vector3(0, 0, 1).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion())), 0); }
  const rest = {}; for (const k of ["spine_02", "spine_03", "Head", "neck_01", "upperarm_l", "upperarm_r"]) rest[k] = B[k].quaternion.clone();
  const scaleBones = (w, hgt) => { root.scale.set(w * hgt, hgt, w * hgt); };
  let cur = {};
  const set = cfg => {
    cur = { ...cfg };
    const sk = SKINS[cfg.peau ?? 4] || SKINS[4]; mat.skin.map = skinT[sk[1]]; mat.skin.color.set(sk[0]); mat.skin.needsUpdate = true;
    const hc = HAIRS[cfg.cheveux ?? 0] || HAIRS[0]; mat.hair.color.set(hc); mat.hair2.color.set(hc);
    const hs = { ras: "Hair_Buzzed", court: "Hair_Parted", long: "Hair_Long", chignons: "Hair_Buns", chauve: "" }[cfg.coupe || "court"];
    for (const k of ["Hair_Buzzed", "Hair_Parted", "Hair_Long", "Hair_Buns"]) M[k].visible = k === hs;
    M.Beard.visible = cfg.barbe === "oui";
    if (mat.jersey.map) mat.jersey.map.dispose(); mat.jersey.map = jerseyTexture(cfg, crest); mat.jersey.needsUpdate = true;
    mat.boots.color.set(cfg.crampons || "#111111");
    scaleBones(cfg.corps === "fine" ? .93 : cfg.corps === "puissante" ? 1.06 : 1, (cfg.taille || 100) / 100);
  };
  set(cfg0);
  const resize = () => { const w = container.clientWidth || 300, h = container.clientHeight || 300; renderer.setSize(w, h, false); renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px"; cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(container); resize();
  const q = new THREE.Quaternion(), e = new THREE.Euler(); const t0 = performance.now();
  (function loop(now) { requestAnimationFrame(loop); const t = (now - t0) / 1000;
    B.spine_02.quaternion.copy(rest.spine_02).multiply(q.setFromEuler(e.set(Math.sin(t * 1.5) * .012, 0, 0)));
    B.Head.quaternion.copy(rest.Head).multiply(q.setFromEuler(e.set(Math.sin(t * .8) * .03, Math.sin(t * .5) * .1, 0)));
    ctl.update(); renderer.render(scene, cam); })(t0);
  return { set, reset() { cam.position.copy(HOME[0]); ctl.target.copy(HOME[1]); ctl.update(); }, face() { cam.position.set(0.25, 1.72, 1.05); ctl.target.set(0, 1.66, 0); ctl.update(); }, back() { cam.position.set(-0.6, 1.3, -4.2); ctl.target.copy(HOME[1]); ctl.update(); }, autoRotate(on) { ctl.autoRotate = !!on; } };
}
