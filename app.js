/* =====================================================================
   CLIMAT — app.js
   Globe 3D + frise chronologique + pilotage gestuel par la caméra.
   ===================================================================== */

import * as THREE from "three";

/* Version de publication, lue depuis le « ?v= » de la balise <script> qui charge
   ce fichier, puis propagée à data.js et paleo.js. Une seule valeur à changer
   dans index.html, et plus aucun fichier ne peut rester coincé dans le cache
   du navigateur après une mise en ligne. */
const V = new URL(import.meta.url).search;

const {
  META, CHAPITRES, pVersAnnee, anneeVersP, formatAnnee,
  CO2_PHANEROZOIQUE, CYCLES_GLACIAIRES, KEELING, TEMPERATURE_MODERNE, EMISSIONS,
  SCENARIOS, SCENARIO_SOURCE, CONSEQUENCES, REGIONS,
  CADRE_PHYSIQUE, LEVIERS, LEVIERS_SOURCE, FOCUS_CIMENT, IDEES_RECUES, METHODE,
  NARRATIONS, NARRATIONS_EN, NARRATION_PARCOURS, PARCOURS, AGIR, SURFACES, EVENEMENTS,
  CONFIG, courrielAuteur,
} = await import("./data.js" + V);

/* =====================================================================
   ÉTAT GLOBAL
   ===================================================================== */
const S = {
  p: anneeVersP(CHAPITRES[0].annee),   // position sur la frise, 0..1
  chapitre: CHAPITRES[0],
  mode: "parcours",
  station: 0,
  lecture: false,
  gestes: false,
  geste: "aucun",
  gesteConf: 0,
  autoRotation: true,
  scenario: "ssp245",
  leviers: Object.fromEntries(LEVIERS.map(l => [l.id, l.defaut])),
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fr = (n, d = 1) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

/* =====================================================================
   1. DÉMARRAGE
   ===================================================================== */
const bootBar = $("#bootBar"), bootStatus = $("#bootStatus");
function boot(pct, txt) { bootBar.style.width = pct + "%"; bootStatus.textContent = txt; }

(async function demarrer() {
  try {
    boot(8, "Chargement de la géographie actuelle…");
    await chargerTerres();
    boot(28, "Chargement des reconstructions paléogéographiques…");
    await chargerPaleo();
    boot(46, "Construction du globe…");
    initScene();
    boot(72, "Préparation de l'interface…");
    initUI();
    boot(90, "Mise en place de la chronologie…");
    initAudience();
    allerStation(0);
    boot(100, "Prêt");
    await new Promise(r => setTimeout(r, 380));
    $("#boot").classList.add("out");
    $("#app").classList.remove("hidden");
    redimensionner();
    // la frise est construite pendant que l'app est masquée : ses largeurs
    // valent alors zéro, il faut répartir les étiquettes une fois visible
    disposerEtiquettesFrise();
    setTimeout(() => $("#boot").remove(), 700);
    animer();
  } catch (e) {
    console.error(e);
    bootStatus.innerHTML = "Erreur au démarrage :<br>" + e.message +
      "<br><br>Vérifiez la connexion (les bibliothèques sont chargées depuis un CDN).";
  }
})();

/* =====================================================================
   2. GÉOGRAPHIE — décodage TopoJSON minimal
   Source du fichier : world-atlas (Natural Earth 110m), domaine public.
   ===================================================================== */
let ANNEAUX = [];   // tableau de polygones [[lon,lat], ...]
let geoOK = false;

async function chargerTerres() {
  const urls = [
    "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json",
    "https://unpkg.com/world-atlas@2.0.2/land-110m.json",
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: "force-cache" });
      if (!r.ok) continue;
      const topo = await r.json();
      ANNEAUX = decoderTopo(topo, "land");
      geoOK = ANNEAUX.length > 0;
      if (geoOK) return;
    } catch (e) { /* on essaie l'URL suivante */ }
  }
  console.warn("Géographie indisponible : le globe sera rendu sans continents.");
}

/* --- Paléogéographie : positions reconstituées des continents ---------
   Fichier généré par outils/recuperer_paleogeographie.py à partir du
   GPlates Web Service. Import dynamique : si le fichier est absent,
   l'application fonctionne, en géographie actuelle uniquement.        */
let PALEO = null, PALEO_AGES = [], PALEO_SOURCE = null;

async function chargerPaleo() {
  try {
    const m = await import("./paleo.js" + V);
    PALEO = m.PALEO; PALEO_AGES = m.PALEO_AGES; PALEO_SOURCE = m.PALEO_SOURCE;
  } catch (e) {
    console.warn("Paléogéographie indisponible — géographie actuelle utilisée partout.", e.message);
  }
}

/** Âge de reconstruction à afficher, en Ma. `null` = géographie actuelle. */
const AGE_MODERNE_MAX = 2.5;                 // sous ce seuil, la carte actuelle suffit
function ageReconstruction(ageMa) {
  if (!PALEO || !PALEO_AGES.length) return null;
  if (ageMa <= AGE_MODERNE_MAX) return null;
  if (ageMa > PALEO_AGES[PALEO_AGES.length - 1]) return null;   // au-delà du modèle
  let best = PALEO_AGES[0], d = Infinity;
  for (const a of PALEO_AGES) {
    const dd = Math.abs(a - ageMa);
    if (dd < d) { d = dd; best = a; }
  }
  return best;
}

function decoderTopo(topo, nom) {
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(d => { x += d[0]; y += d[1]; return [x * sx + tx, y * sy + ty]; });
  });
  const anneau = idx => {
    const pts = [];
    for (const i of idx) {
      let a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      if (pts.length) a = a.slice(1);
      pts.push(...a);
    }
    return pts;
  };
  const obj = topo.objects[nom];
  const out = [];
  const pousser = poly => poly.forEach(ring => out.push(anneau(ring)));
  if (obj.type === "MultiPolygon") obj.arcs.forEach(pousser);
  else if (obj.type === "Polygon") pousser(obj.arcs);
  else if (obj.type === "GeometryCollection") obj.geometries.forEach(g => {
    if (g.type === "MultiPolygon") g.arcs.forEach(pousser);
    else if (g.type === "Polygon") pousser(g.arcs);
  });
  return out;
}

/* =====================================================================
   3. TEXTURE DU GLOBE
   ATTENTION : rendu illustratif. Voir METHODE.modeleZonal — le champ de
   couleur est un modèle zonal simplifié, pas une carte de données.
   ===================================================================== */
const TW = 2048, TH = 1024;
const texCanvas = document.createElement("canvas");
texCanvas.width = TW; texCanvas.height = TH;
const tctx = texCanvas.getContext("2d");
let cheminTerres = null;
const cacheChemins = new Map();               // clé : "moderne" ou l'âge en Ma

function construireChemin(anneaux) {
  const p = new Path2D();
  for (const ring of anneaux) {
    if (ring.length < 3) continue;
    let precX = null;
    ring.forEach(([lon, lat], i) => {
      const x = (lon + 180) / 360 * TW, y = (90 - lat) / 180 * TH;
      // coupe à l'antiméridien pour éviter les traits horizontaux parasites
      if (i === 0 || (precX !== null && Math.abs(x - precX) > TW * 0.5)) p.moveTo(x, y);
      else p.lineTo(x, y);
      precX = x;
    });
    p.closePath();
  }
  return p;
}

/** Chemin des terres pour un âge donné (null = géographie actuelle). */
function cheminPourAge(age) {
  const cle = age === null ? "moderne" : age;
  if (cacheChemins.has(cle)) return cacheChemins.get(cle);
  const anneaux = age === null ? ANNEAUX : (PALEO && PALEO[age]) || [];
  const p = anneaux.length ? construireChemin(anneaux) : null;
  cacheChemins.set(cle, p);
  return p;
}

/** Facteur d'amplification zonal — GIEC AR6 WG1 (structure, pas donnée). */
function facteurLatitude(lat) {
  const a = Math.abs(lat);
  if (lat > 66) return lerp(2.0, 3.0, clamp((lat - 66) / 24, 0, 1));   // Arctique
  if (lat > 40) return lerp(1.25, 2.0, (lat - 40) / 26);
  if (a <= 25) return 0.85;                                             // tropiques
  if (lat < -55) return lerp(0.9, 0.6, clamp((-lat - 55) / 25, 0, 1));  // océan Austral
  return lerp(0.85, 1.25, (a - 25) / 15);
}

/* Sur un monde entièrement océanique, l'amplification zonale n'a plus de
   justification physique : elle repose sur le contraste terre-mer et sur la
   rétroaction de la banquise. On l'y neutralise plutôt que de peindre un
   gradient qui n'aurait aucun fondement. */
function couleurCase(lat, terre, anom, zonal = true) {
  const a = anom * (zonal ? facteurLatitude(lat) : 1) * (terre ? 1.4 : 1.0);
  let base = terre ? [50, 66, 48] : [14, 34, 62];
  let cible, t;
  if (a >= 0) { cible = [196, 62, 40]; t = clamp(a / 11, 0, 1) * 0.78; }
  else { cible = [150, 200, 238]; t = clamp(-a / 11, 0, 1) * 0.72; }
  return `rgb(${Math.round(lerp(base[0], cible[0], t))},${Math.round(lerp(base[1], cible[1], t))},${Math.round(lerp(base[2], cible[2], t))})`;
}

/** Générateur pseudo-aléatoire à graine : le magma ne doit pas scintiller. */
function graine(s) {
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Hadéen : océan de magma. Aucun continent — il n'y en avait pas. */
function dessinerMagma(intensite = 1) {
  const r = graine(20260728);
  const fond = tctx.createLinearGradient(0, 0, 0, TH);
  fond.addColorStop(0, "#1a0803"); fond.addColorStop(0.5, "#2b1006"); fond.addColorStop(1, "#1a0803");
  tctx.fillStyle = fond; tctx.fillRect(0, 0, TW, TH);

  // plaques de croûte refroidie
  for (let i = 0; i < 160; i++) {
    const x = r() * TW, y = r() * TH, w = 60 + r() * 260, h = 40 + r() * 150;
    tctx.fillStyle = `rgba(12,6,4,${0.25 + r() * 0.4})`;
    tctx.beginPath(); tctx.ellipse(x, y, w, h, r() * 3, 0, 7); tctx.fill();
  }
  // fractures incandescentes entre les plaques
  tctx.lineCap = "round";
  for (let i = 0; i < 520; i++) {
    const x0 = r() * TW, y0 = r() * TH;
    const n = 3 + Math.floor(r() * 5);
    let x = x0, y = y0;
    const chaleur = r();
    tctx.beginPath(); tctx.moveTo(x, y);
    for (let k = 0; k < n; k++) {
      x += (r() - 0.5) * 190; y += (r() - 0.5) * 110;
      tctx.lineTo(x, y);
    }
    const a = (0.22 + chaleur * 0.7) * intensite;
    tctx.strokeStyle = chaleur > 0.72
      ? `rgba(255,236,170,${a})` : chaleur > 0.4
      ? `rgba(255,146,42,${a})` : `rgba(196,58,14,${a})`;
    tctx.lineWidth = 1 + chaleur * 5;
    tctx.stroke();
  }
  // lacs de lave
  for (let i = 0; i < 42; i++) {
    const x = r() * TW, y = r() * TH, rr = 12 + r() * 46;
    const g = tctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(255,244,205,${0.85 * intensite})`);
    g.addColorStop(0.4, `rgba(255,140,36,${0.6 * intensite})`);
    g.addColorStop(1, "rgba(255,110,20,0)");
    tctx.fillStyle = g; tctx.beginPath(); tctx.arc(x, y, rr, 0, 7); tctx.fill();
  }
  if (texture) texture.needsUpdate = true;
}

function dessinerTexture(anom, age = null, surface = null, latGlaceForcee = null) {
  if (surface === "magma") { dessinerMagma(); return; }
  // « ocean » : monde océanique, aucune terre représentée — leur position est inconnue
  cheminTerres = surface === "ocean" ? null : cheminPourAge(age);
  const pas = 4;

  const zonal = surface !== "ocean";
  // océan
  for (let y = 0; y < TH; y += pas) {
    const lat = 90 - (y / TH) * 180;
    tctx.fillStyle = couleurCase(lat, false, anom, zonal);
    tctx.fillRect(0, y, TW, pas);
  }
  // terres
  if (cheminTerres) {
    tctx.save(); tctx.clip(cheminTerres);
    for (let y = 0; y < TH; y += pas) {
      const lat = 90 - (y / TH) * 180;
      tctx.fillStyle = couleurCase(lat, true, anom, zonal);
      tctx.fillRect(0, y, TW, pas);
    }
    tctx.restore();
    tctx.save();
    tctx.strokeStyle = "rgba(255,255,255,.18)"; tctx.lineWidth = 1.1;
    tctx.stroke(cheminTerres);
    tctx.restore();
  }

  // glace — limite illustrative : latLimite = 70 + 4 × anomalie globale
  const latLim = latGlaceForcee !== null ? latGlaceForcee : clamp(70 + 4 * anom, 24, 93);
  if (latLim < 90) {
    for (const signe of [1, -1]) {
      const marge = signe > 0 ? 0 : 6;      // l'hémisphère sud englace un peu moins tôt
      const lim = clamp(latLim + marge, 24, 93);
      for (let y = 0; y < TH; y += 2) {
        const lat = 90 - (y / TH) * 180;
        if (signe > 0 ? lat < lim : lat > -lim) continue;
        const inten = clamp((Math.abs(lat) - lim) / 14, 0, 1);
        tctx.fillStyle = `rgba(238,246,255,${0.18 + inten * 0.7})`;
        tctx.fillRect(0, y, TW, 2);
      }
    }
  }

  // grille discrète
  tctx.strokeStyle = "rgba(255,255,255,.055)"; tctx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = (90 - lat) / 180 * TH;
    tctx.beginPath(); tctx.moveTo(0, y); tctx.lineTo(TW, y); tctx.stroke();
  }
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = (lon + 180) / 360 * TW;
    tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x, TH); tctx.stroke();
  }
  tctx.strokeStyle = "rgba(255,255,255,.11)";
  const yeq = TH / 2;
  tctx.beginPath(); tctx.moveTo(0, yeq); tctx.lineTo(TW, yeq); tctx.stroke();

  if (texture) texture.needsUpdate = true;
}

/* =====================================================================
   4. SCÈNE THREE.JS
   ===================================================================== */
let renderer, scene, camera, globe, texture, atmos, groupeMarqueurs, etoiles, soleil;
const cam = { azim: 0.6, polar: 1.35, dist: 3.2, cibleDist: 3.2 };
let raycaster, souris = new THREE.Vector2(-10, -10), tip;

function initScene() {
  const canvas = $("#scene");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);

  // étoiles
  const N = 2600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 45 + Math.random() * 45, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  etoiles = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fc0e8, size: 0.32, sizeAttenuation: true, transparent: true, opacity: .75 }));
  scene.add(etoiles);

  // globe
  dessinerTexture(0);
  texture = new THREE.CanvasTexture(texCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: .92, metalness: .02 })
  );
  scene.add(globe);

  // halo atmosphérique
  atmos = new THREE.Mesh(
    new THREE.SphereGeometry(1.055, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { teinte: { value: new THREE.Color(0x4fa8ff) } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix*normal);
        vec4 mv = modelViewMatrix*vec4(position,1.0); vP = mv.xyz;
        gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vP; uniform vec3 teinte;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 2.4);
        gl_FragColor = vec4(teinte, f*0.75); }`,
    })
  );
  scene.add(atmos);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  soleil = new THREE.DirectionalLight(0xfff2e0, 1.45);
  soleil.position.set(4, 1.6, 2.4);
  scene.add(soleil);
  const contre = new THREE.DirectionalLight(0x4a7fd0, 0.35);
  contre.position.set(-3, -1, -2);
  scene.add(contre);

  groupeMarqueurs = new THREE.Group();
  scene.add(groupeMarqueurs);
  initEvenements();

  raycaster = new THREE.Raycaster();
  tip = document.createElement("div");
  Object.assign(tip.style, {
    position: "fixed", zIndex: 40, pointerEvents: "none", display: "none",
    background: "rgba(8,13,26,.95)", border: "1px solid rgba(140,190,255,.34)",
    borderRadius: "9px", padding: "7px 10px", fontSize: "11.5px", maxWidth: "230px",
    boxShadow: "0 12px 32px rgba(0,0,0,.6)", lineHeight: "1.45",
  });
  document.body.appendChild(tip);

  addEventListener("resize", redimensionner);
  // le panneau peut être masqué au démarrage : on suit sa taille réelle
  new ResizeObserver(redimensionner).observe(document.body);
  initControlesSouris(canvas);
}

let lRendu = 0, hRendu = 0;
function redimensionner() {
  const w = Math.max(innerWidth || document.body.clientWidth, 1);
  const h = Math.max(innerHeight || document.body.clientHeight, 1);
  if (w === lRendu && h === hRendu) return;
  lRendu = w; hRendu = h;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // les graphiques du panneau se redessinent à la nouvelle largeur
  clearTimeout(redimensionner._t);
  redimensionner._t = setTimeout(() => { rendreContenu(true); disposerEtiquettesFrise(); }, 220);
}

function latLonVersVec3(lat, lon, r = 1) {
  const ph = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
}

let texMarqueur = null;
function textureMarqueur() {
  if (texMarqueur) return texMarqueur;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d");
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(.28, "rgba(255,200,110,.95)");
  gr.addColorStop(.55, "rgba(255,150,60,.45)");
  gr.addColorStop(1, "rgba(255,150,60,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  texMarqueur = new THREE.CanvasTexture(c);
  return texMarqueur;
}

/* Au doigt, une cible de 0,1 unité est intouchable. On agrandit les marqueurs
   sur les écrans tactiles, et surtout on ne vise plus par lancer de rayon mais
   par proximité à l'écran : c'est nettement plus indulgent. */
const TACTILE = matchMedia("(pointer: coarse)").matches;

function poserMarqueurs(liste) {
  groupeMarqueurs.clear();
  masquerMarqueur();
  for (const m of liste) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureMarqueur(), transparent: true, depthTest: true, sizeAttenuation: true,
    }));
    sp.position.copy(latLonVersVec3(m.lat, m.lon, 1.012));
    sp.scale.setScalar(TACTILE ? 0.15 : 0.1);
    sp.userData = m;
    groupeMarqueurs.add(sp);
  }
}

/** Marqueur le plus proche du point (x, y) à l'écran, face visible uniquement. */
function marqueurPres(x, y, tolerance = TACTILE ? 44 : 26) {
  let best = null, dmin = tolerance;
  const vue = new THREE.Vector3();
  for (const sp of groupeMarqueurs.children) {
    // un marqueur de l'autre côté du globe ne doit pas être cliquable
    const versCamera = camera.position.clone().sub(sp.position).normalize();
    if (sp.position.clone().normalize().dot(versCamera) < 0.02) continue;
    vue.copy(sp.position).project(camera);
    if (vue.z > 1) continue;
    const sx = (vue.x + 1) / 2 * innerWidth, sy = (-vue.y + 1) / 2 * innerHeight;
    const d = Math.hypot(sx - x, sy - y);
    if (d < dmin) { dmin = d; best = sp; }
  }
  return best;
}

let marqueurEpingle = null;

function montrerMarqueur(sp, x, y, epingle = false) {
  const m = sp.userData;
  tip.innerHTML = `<b>${m.nom}</b><br><span style="color:#91a3bd">${m.note}</span>` +
    (epingle ? `<br><span style="color:#61748f;font-size:10px">${TACTILE ? "Touchez" : "Cliquez"} ailleurs pour fermer</span>` : "");
  tip.style.display = "block";
  const large = Math.min(230, innerWidth - 24);
  tip.style.left = Math.max(10, Math.min(x + 16, innerWidth - large - 12)) + "px";
  tip.style.top = Math.max(10, Math.min(y + 14, innerHeight - 96)) + "px";
  marqueurEpingle = epingle ? sp : null;
}

function masquerMarqueur() {
  if (!tip) return;
  tip.style.display = "none";
  marqueurEpingle = null;
}

/* ---------- Contrôles souris et tactile ---------------------------------
   Un seul chemin de code pour la souris, le stylet et le doigt : les Pointer
   Events couvrent les trois. On suit tous les pointeurs actifs, ce qui donne
   la rotation à un doigt et le zoom à deux, sans traitement séparé. */
function initControlesSouris(canvas) {
  const pointeurs = new Map();
  let ecartPincement = null;

  const ecart = () => {
    const [a, b] = [...pointeurs.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  canvas.addEventListener("pointerdown", e => {
    // on enregistre le pointeur AVANT de tenter la capture : celle-ci peut
    // échouer, et le glissement ne doit pas en dépendre
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sans capture, ça marche quand même */ }
    S.autoRotation = false;
    if (pointeurs.size === 2) ecartPincement = ecart();
    // sur mobile, toucher le globe replie la feuille pour qu'on le voie
    if (e.pointerType === "touch") replierFeuille(true);
  });

  const relacher = e => {
    const p = pointeurs.get(e.pointerId);
    // un appui bref et immobile n'est pas un glissement : c'est un clic
    if (p && e.type === "pointerup") {
      const bouge = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
      if (bouge < 9 && performance.now() - p.t0 < 500 && pointeurs.size === 1) {
        const m = marqueurPres(e.clientX, e.clientY);
        // à la souris le survol suffit ; au doigt il n'existe pas, donc on épingle
        const epingler = e.pointerType !== "mouse";
        if (m) montrerMarqueur(m, e.clientX, e.clientY, epingler);
        else if (marqueurEpingle) masquerMarqueur();
      }
    }
    pointeurs.delete(e.pointerId);
    if (pointeurs.size < 2) ecartPincement = null;
  };
  canvas.addEventListener("pointerup", relacher);
  canvas.addEventListener("pointercancel", relacher);
  canvas.addEventListener("pointerleave", relacher);

  canvas.addEventListener("pointermove", e => {
    souris.x = (e.clientX / innerWidth) * 2 - 1;
    souris.y = -(e.clientY / innerHeight) * 2 + 1;
    tip.style.left = (e.clientX + 16) + "px";
    tip.style.top = (e.clientY + 14) + "px";

    const p = pointeurs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (pointeurs.size === 1) {
      // manipulation directe : le globe suit le doigt, il n'est pas poussé
      cam.azim += dx * 0.0055;
      cam.polar = clamp(cam.polar - dy * 0.0055, 0.22, Math.PI - 0.22);
    } else if (pointeurs.size === 2) {
      const d = ecart();
      if (ecartPincement && d > 0) {
        cam.cibleDist = clamp(cam.cibleDist * (ecartPincement / d), 1.35, 7);
      }
      ecartPincement = d;
    }
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    cam.cibleDist = clamp(cam.cibleDist * (1 + Math.sign(e.deltaY) * 0.09), 1.35, 7);
  }, { passive: false });
}

/* ---------- Boucle ---------- */
let dernier = performance.now(), images = 0;
function animer() {
  requestAnimationFrame(animer);
  const now = performance.now(), dt = Math.min((now - dernier) / 1000, 0.1);
  dernier = now; images++;

  if (S.autoRotation && !S.lecture) cam.azim += dt * 0.045;
  cam.dist += (cam.cibleDist - cam.dist) * Math.min(dt * 5, 1);

  if (EVT) animerEvenement(now);
  else if (lune && lune.visible) {
    const a = now / 9000;
    lune.position.set(Math.cos(a) * 4.2, 0.32, Math.sin(a) * 4.2);
  }

  camera.position.set(
    cam.dist * Math.sin(cam.polar) * Math.cos(cam.azim),
    cam.dist * Math.cos(cam.polar),
    cam.dist * Math.sin(cam.polar) * Math.sin(cam.azim)
  );
  camera.lookAt(0, 0, 0);
  etoiles.rotation.y += dt * 0.004;

  // lecture automatique
  if (S.lecture) {
    S.p += dt / 105;
    if (S.p >= 1) { S.p = 1; basculerLecture(false); }
    allerA(S.p);
  }

  // survol des marqueurs à la souris ; au doigt, c'est le clic qui les épingle
  if (groupeMarqueurs.children.length && !marqueurEpingle && !TACTILE) {
    const sx = (souris.x + 1) / 2 * innerWidth, sy = (-souris.y + 1) / 2 * innerHeight;
    const sp = marqueurPres(sx, sy);
    if (sp) montrerMarqueur(sp, sx, sy);
    else tip.style.display = "none";
  }

  renderer.render(scene, camera);
}

// point d'inspection pour le débogage (console du navigateur)
window.__CLIMAT = { S, cam, get images() { return images; },
  get geo() { return { charge: geoOK, anneaux: ANNEAUX.length }; },
  texture: texCanvas, scene: () => scene,
  main: (lm, prec) => analyserMain(lm, prec), zoom: e => niveauZoom(e), narration: () => N,
  camera: () => camera, marqueurs: () => groupeMarqueurs, marqueurPres, tactile: TACTILE,
  /** replace la caméra hors boucle de rendu (utile pour les tests) */
  recadrer() {
    camera.position.set(
      cam.dist * Math.sin(cam.polar) * Math.cos(cam.azim),
      cam.dist * Math.cos(cam.polar),
      cam.dist * Math.sin(cam.polar) * Math.sin(cam.azim));
    camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  } };

/* =====================================================================
   4 bis. ÉVÉNEMENTS ANIMÉS
   Reconstitutions schématiques : trajectoires, vitesses et durées sont
   illustratives. L'avertissement reste affiché pendant toute l'animation.
   ===================================================================== */
let lune, theia, debris, flash, anneauChoc, patchLave, impacteur;
let EVT = null;                                   // { def, t0, tTexture }

function spriteLueur(couleurs, taille = 128) {
  const c = document.createElement("canvas"); c.width = c.height = taille;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(taille / 2, taille / 2, 0, taille / 2, taille / 2, taille / 2);
  couleurs.forEach(([p, col]) => g.addColorStop(p, col));
  x.fillStyle = g; x.fillRect(0, 0, taille, taille);
  return new THREE.CanvasTexture(c);
}

function initEvenements() {
  // Lune — taille réelle relative (0,273 rayon terrestre), distance NON à l'échelle
  const texLune = document.createElement("canvas");
  texLune.width = texLune.height = 256;
  const lx = texLune.getContext("2d");
  lx.fillStyle = "#9a9690"; lx.fillRect(0, 0, 256, 256);
  const rl = graine(4510);
  for (let i = 0; i < 300; i++) {
    const x = rl() * 256, y = rl() * 256, r = 1 + rl() * 11;
    lx.fillStyle = `rgba(${rl() > .5 ? 120 : 175},${rl() > .5 ? 118 : 172},${115 + rl() * 55},${.25 + rl() * .5})`;
    lx.beginPath(); lx.arc(x, y, r, 0, 7); lx.fill();
  }
  lune = new THREE.Mesh(
    new THREE.SphereGeometry(0.273, 40, 28),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(texLune), roughness: 1 })
  );
  lune.userData = { nom: "La Lune", note: "Taille relative réelle, distance très réduite pour l'affichage (en réalité 60 rayons terrestres)" };
  scene.add(lune);

  theia = new THREE.Mesh(
    new THREE.SphereGeometry(0.53, 40, 28),
    new THREE.MeshStandardMaterial({ color: 0x6b3a24, emissive: 0x3a1206, roughness: .95 })
  );
  theia.visible = false; scene.add(theia);

  const N = 1800, pos = new Float32Array(N * 3);
  debris = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xffb066, size: .035, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  debris.visible = false; scene.add(debris);

  flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteLueur([[0, "rgba(255,255,245,1)"], [.25, "rgba(255,226,150,.9)"], [.6, "rgba(255,140,50,.35)"], [1, "rgba(255,120,40,0)"]]),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  flash.visible = false; scene.add(flash);

  anneauChoc = new THREE.Mesh(
    new THREE.RingGeometry(0.98, 1, 96),
    new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false })
  );
  anneauChoc.visible = false; scene.add(anneauChoc);

  patchLave = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteLueur([[0, "rgba(255,240,190,.95)"], [.35, "rgba(255,110,30,.7)"], [1, "rgba(190,40,10,0)"]]),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  patchLave.visible = false; scene.add(patchLave);

  impacteur = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
  );
  impacteur.visible = false; scene.add(impacteur);
}

function evenementDe(chapitreId) { return EVENEMENTS.find(e => e.chapitre === chapitreId) || null; }

/** Toutes les animations au même endroit : rattachées à un chapitre, elles
    étaient invisibles pour qui ne parcourait pas les 17 chapitres. */
function ouvrirMenuAnimations() {
  const carte = e => `
    <div class="anim-carte" data-anim="${e.id}">
      <div class="anim-head">
        <span class="anim-nom">${e.nom}</span>
        <span class="anim-quand">${e.quand}</span>
      </div>
      <div class="anim-resume">${e.resume}</div>
      <div class="anim-avert">⚠ ${e.avertissement}</div>
      <span class="anim-jouer">▶ Lancer</span>
    </div>`;
  const globales = EVENEMENTS.filter(e => e.global);
  const locales = EVENEMENTS.filter(e => !e.global);
  ouvrirModale(`
    <h2>Animations</h2>
    <p>Des reconstitutions destinées à rendre visible ce que les chiffres décrivent.
    Chacune indique ce qui repose sur des données publiées et ce qui relève du schéma.</p>

    <h3>Traverser le temps</h3>
    ${globales.map(carte).join("")}

    <h3>Événements</h3>
    ${locales.map(carte).join("")}
  `);
  $$(".anim-carte").forEach(el => el.onclick = () => {
    $("#modale").classList.add("hidden");
    lancerEvenement(el.dataset.anim);
  });
}

function lancerEvenement(id) {
  const def = EVENEMENTS.find(e => e.id === id);
  if (!def) return;
  const ch = CHAPITRES.find(c => c.id === def.chapitre);
  if (ch && S.chapitre !== ch) allerA(anneeVersP(ch.annee), true);
  S.autoRotation = false;
  S.lecture && basculerLecture(false);
  cam.cibleDist = id === "lune" ? 6.2 : def.global ? 3.4 : 3.1;
  EVT = { def, t0: performance.now(), tTexture: 0, dernierAge: null };
  tracer("animation-" + id, "Animation : " + def.nom);
  $("#evQuand").textContent = def.quand;
  $("#evNom").textContent = def.nom;
  $("#evAvert").textContent = def.avertissement;
  $("#evenement").classList.remove("hidden");
}

function arreterEvenement() {
  EVT = null;
  [theia, debris, flash, anneauChoc, patchLave, impacteur].forEach(o => { if (o) o.visible = false; });
  if (lune) lune.visible = true;
  soleil.intensity = 1.45;
  $("#evenement").classList.add("hidden");
  dernierAnom = null; dernierAge = undefined; dernierSurface = undefined;
  allerA(S.p, true);
}

function phaseEvenement(txt, p) {
  $("#evPhase").textContent = txt;
  $("#evProgres").style.width = Math.round(p * 100) + "%";
}

function pointSurface(lat, lon, r) { return latLonVersVec3(lat, lon, r); }

function animerEvenement(now) {
  const { def, t0 } = EVT;
  const p = clamp((now - t0) / def.duree, 0, 1);

  if (def.id === "lune") {
    lune.visible = p > 0.62;
    if (p < 0.38) {
      // approche de Théia
      const f = p / 0.38;
      theia.visible = true;
      theia.position.set(lerp(-7.5, -1.05, f * f), lerp(2.6, 0.28, f * f), lerp(4.2, 0.5, f * f));
      phaseEvenement("Un corps de la taille de Mars approche", p);
    } else if (p < 0.46) {
      // impact
      theia.visible = false;
      flash.visible = true;
      const f = (p - 0.38) / 0.08;
      flash.scale.setScalar(1.2 + f * 9);
      flash.material.opacity = 1 - f;
      soleil.intensity = 1.45 + (1 - f) * 3.5;
      phaseEvenement("Impact — la Terre est refondue", p);
    } else if (p < 0.78) {
      // disque de débris en orbite
      flash.visible = false;
      soleil.intensity = 1.45;
      debris.visible = true;
      const f = (p - 0.46) / 0.32;
      const pos = debris.geometry.attributes.position.array;
      const r = graine(777);
      for (let i = 0; i < pos.length / 3; i++) {
        const a = (i / (pos.length / 3)) * Math.PI * 2 * 7 + f * 5.5;
        const rad = lerp(1.25, 2.4, ((i * 37) % 100) / 100) * (0.65 + f * 0.5);
        const h = (((i * 61) % 100) / 100 - 0.5) * 0.55 * (1 - f * 0.75);
        pos[i * 3] = Math.cos(a) * rad;
        pos[i * 3 + 1] = h;
        pos[i * 3 + 2] = Math.sin(a) * rad;
      }
      debris.geometry.attributes.position.needsUpdate = true;
      debris.material.opacity = 0.9;
      phaseEvenement("Un disque de débris se met en orbite", p);
    } else {
      // accrétion de la Lune
      const f = (p - 0.78) / 0.22;
      debris.material.opacity = 0.9 * (1 - f);
      debris.visible = f < 0.98;
      phaseEvenement("Les débris s'accrètent : la Lune se forme", p);
    }
    if (lune.visible) {
      const a = now / 2600;
      lune.position.set(Math.cos(a) * 4.2, 0.32, Math.sin(a) * 4.2);
    }

  } else if (def.id === "chicxulub") {
    const cible = pointSurface(def.lat, def.lon, 1);
    if (p < 0.34) {
      const f = p / 0.34;
      impacteur.visible = true;
      const depart = cible.clone().multiplyScalar(4.2).add(new THREE.Vector3(1.6, 2.2, 0));
      impacteur.position.lerpVectors(depart, cible.clone().multiplyScalar(1.02), f * f);
      phaseEvenement("Un astéroïde de 10 km, à 20 km par seconde", p);
    } else if (p < 0.44) {
      const f = (p - 0.34) / 0.10;
      impacteur.visible = false;
      flash.visible = true;
      flash.position.copy(cible.clone().multiplyScalar(1.05));
      flash.scale.setScalar(0.4 + f * 3.2);
      flash.material.opacity = 1 - f;
      soleil.intensity = 1.45 + (1 - f) * 2.6;
      phaseEvenement("Impact au large du Yucatán", p);
    } else {
      const f = (p - 0.44) / 0.56;
      flash.visible = false;
      anneauChoc.visible = true;
      anneauChoc.position.copy(cible.clone().multiplyScalar(1.005));
      anneauChoc.lookAt(0, 0, 0);
      anneauChoc.scale.setScalar(0.05 + f * 2.6);
      anneauChoc.material.opacity = 0.85 * (1 - f);
      // hiver d'impact : la lumière s'effondre puis remonte lentement
      soleil.intensity = f < 0.45 ? lerp(1.45, 0.22, f / 0.45) : lerp(0.22, 0.75, (f - 0.45) / 0.55);
      phaseEvenement(f < 0.5 ? "Poussières et aérosols voilent le Soleil" : "Hiver d'impact : la photosynthèse s'effondre", p);
    }

  } else if (def.id === "trapps") {
    const cible = pointSurface(def.lat, def.lon, 1);
    patchLave.visible = true;
    patchLave.position.copy(cible.clone().multiplyScalar(1.03));
    patchLave.scale.setScalar(0.25 + p * 1.65 + Math.sin(now / 190) * 0.06);
    patchLave.material.opacity = 0.55 + Math.sin(now / 250) * 0.2;
    atmos.material.uniforms.teinte.value.setHex(0xff7a3a);
    soleil.intensity = 1.45 - p * 0.5;
    phaseEvenement(p < 0.5 ? "La province magmatique s'ouvre en Sibérie"
                           : "Le magma traverse d'anciens bassins de charbon et les brûle", p);

  } else if (def.id === "boule") {
    // l'englacement descend des pôles vers les tropiques
    const lat = lerp(72, 8, p);
    if (now - EVT.tTexture > 130) {
      EVT.tTexture = now;
      dessinerTexture(lerp(-4, -35, p), ageReconstruction(700), null, lat);
    }
    atmos.material.uniforms.teinte.value.setHex(0xbfe4ff);
    phaseEvenement(p < 0.45 ? `La glace descend — limite vers ${Math.round(lat)}° de latitude`
                            : "L'albédo s'emballe : la Terre bascule", p);

  } else if (def.id === "derive") {
    // enchaînement des 30 reconstructions publiées, de la plus ancienne à aujourd'hui
    const ages = PALEO_AGES.slice().sort((a, b) => b - a);
    const i = Math.min(Math.floor(p * ages.length), ages.length - 1);
    const age = ages[i];
    const annee = 2025 - age * 1e6;
    if (age !== EVT.dernierAge) {
      EVT.dernierAge = age;
      const ch = chapitrePour(annee);
      dessinerTexture(ch.tAnom, age === 0 ? null : age, null);
      atmos.material.uniforms.teinte.value.setHex(
        ch.tAnom > 3 ? 0xff8a5c : ch.tAnom < -3 ? 0x9fd8ff : 0x4fa8ff);
    }
    allerA(anneeVersP(annee));       // la frise et le panneau suivent la dérive
    phaseEvenement(age === 0 ? "Aujourd'hui" : `Il y a ${age} millions d'années`, p);

  } else if (def.id === "deglaciation") {
    const anom = lerp(-6, -0.2, p);
    const annee = lerp(2025 - 21000, 2025 - 6000, p);
    if (now - EVT.tTexture > 120) {
      EVT.tTexture = now;
      dessinerTexture(anom, null, null);
      atmos.material.uniforms.teinte.value.setHex(anom < -3 ? 0x9fd8ff : 0x4fa8ff);
    }
    allerA(anneeVersP(annee));
    phaseEvenement(
      `Il y a ${Math.round((2025 - annee) / 1000)} 000 ans · ${fr(anom, 1)} °C par rapport au préindustriel`, p);

  } else if (def.id === "futurs") {
    const n = SCENARIOS.length;
    const i = Math.min(Math.floor(p * n), n - 1);
    const sc = SCENARIOS[i];
    const f = clamp((p * n) - i, 0, 1);
    const anom = lerp(CADRE_PHYSIQUE.rechauffementActuel, sc.t2100, Math.min(f * 1.4, 1));
    if (now - EVT.tTexture > 120) {
      EVT.tTexture = now;
      dessinerTexture(anom, null, null);
      atmos.material.uniforms.teinte.value.setHex(anom > 3 ? 0xff8a5c : 0x4fa8ff);
    }
    const avancement = Math.min(f * 1.4, 1);
    const annee = Math.round(lerp(2025, 2100, avancement));
    allerA(anneeVersP(annee));
    // ne jamais afficher la valeur en cours comme si c'était celle de 2100
    phaseEvenement(avancement >= 1
      ? `${sc.nom} — ${fr(sc.t2100, 1)} °C en 2100`
      : `${sc.nom} — ${annee} : ${fr(anom, 1)} °C, en route vers ${fr(sc.t2100, 1)} °C`, p);

  } else if (def.id === "oxydation") {
    const c = new THREE.Color(0xd98a3a).lerp(new THREE.Color(0x6fa8d8), p);
    atmos.material.uniforms.teinte.value.copy(c);
    if (now - EVT.tTexture > 150) {
      EVT.tTexture = now;
      dessinerTexture(lerp(2, -8, p), null, "ocean");
    }
    phaseEvenement(p < 0.5 ? "L'oxygène monte : la brume de méthane se dissipe"
                           : "L'effet de serre s'effondre, la glace gagne", p);
  }

  if (p >= 1) setTimeout(arreterEvenement, 900);
}

/* =====================================================================
   5. NAVIGATION TEMPORELLE
   ===================================================================== */
/* Les plages se recouvrent aux bornes : le Crétacé finit à 66 Ma, précisément
   l'année du K-Pg. Renvoyer le premier chapitre trouvé rendait les chapitres
   courts (K-Pg, PETM, Permien-Trias) inatteignables, masqués par le long
   chapitre qui les encadre. On retient donc le plus SPÉCIFIQUE : à égalité de
   couverture, la plage la plus étroite gagne. */
function chapitrePour(annee) {
  let contenant = null, span = Infinity;
  for (const c of CHAPITRES) {
    if (annee >= c.plage[0] && annee <= c.plage[1]) {
      const s = c.plage[1] - c.plage[0];
      if (s < span) { span = s; contenant = c; }
    }
  }
  if (contenant) return contenant;
  let best = CHAPITRES[0], d = Infinity;
  for (const c of CHAPITRES) {
    const dd = Math.min(Math.abs(annee - c.plage[0]), Math.abs(annee - c.plage[1]));
    if (dd < d) { d = dd; best = c; }
  }
  return best;
}

let dernierAnom = null, dernierAge = undefined, dernierSurface = undefined, tRedessin = 0;

/** Le badge sous le globe dit toujours ce qu'on regarde et ce qu'on ignore. */
function majBadgeGlobe(ageGeo, ageMa, surf = null) {
  const el = $("#globeBadge");
  if (!el) return;
  const modele = PALEO_SOURCE ? PALEO_SOURCE.modele : "—";
  if (surf) {
    el.innerHTML =
      `<b>${surf.titre}</b> — aucun continent n'est représenté, et c'est volontaire : ` +
      `aucun modèle publié ne reconstitue leur position au-delà de 1 milliard d'années. ` +
      `<span class="badge-alerte">Afficher la géographie actuelle ici serait faux.</span> ` +
      `${META.avertissementChamp}`;
  } else if (ageGeo === null) {
    const horsModele = PALEO_AGES.length && ageMa > PALEO_AGES[PALEO_AGES.length - 1];
    el.innerHTML = horsModele
      ? `<b>Géographie actuelle affichée par défaut</b> — aucune reconstruction publiée ne remonte au-delà de ` +
        `${PALEO_AGES[PALEO_AGES.length - 1]} millions d'années. ${META.avertissementChamp}`
      : `Géographie actuelle. ${META.avertissementChamp}`;
  } else {
    const longitudeIncertaine = ageGeo > 200;
    el.innerHTML =
      `<b>Continents reconstitués à ${ageGeo} millions d'années</b> — modèle ${modele} ` +
      `(Merdith et al. 2021, via GPlates). ` +
      (longitudeIncertaine
        ? `<span class="badge-alerte">La longitude n'est pas contrainte par les données à cet âge : latitude et forme fiables, position est-ouest dépendante du modèle.</span> `
        : "") +
      `Les repères posés sur le globe utilisent les coordonnées actuelles des sites. ${META.avertissementChamp}`;
  }
}
function allerA(p, force = false) {
  S.p = clamp(p, 0, 1);
  const annee = pVersAnnee(S.p);
  const ch = chapitrePour(annee);
  const change = ch !== S.chapitre;
  S.chapitre = ch;

  // frise
  $("#friseCurseur").style.left = (S.p * 100) + "%";
  $("#friseFill").style.width = (S.p * 100) + "%";
  $("#fiEpoque").textContent = ch.ere;
  $("#fiDate").textContent = formatAnnee(annee);
  $("#fiCo2").textContent = ch.co2 >= 10000
    ? "≈ " + Math.round(ch.co2 / 1000) + " 000 ppm"
    : "≈ " + Math.round(ch.co2) + " ppm";
  $("#fiTemp").textContent = (ch.tAnom > 0 ? "+" : "") + fr(ch.tAnom, 1) + " °C";
  $("#fiMer").textContent = ch.mer === null ? "—" : (ch.mer > 0 ? "+" : "") + Math.round(ch.mer) + " m";
  const st = $("#fiStatut");
  st.innerHTML = `<span class="badge ${ch.statut}">${libelleStatut(ch.statut)}</span>`;

  // globe : on ne redessine que si température, géographie OU surface ont changé
  const ageMa = (2025 - annee) / 1e6;
  const ageGeo = ageReconstruction(ageMa);
  const surf = SURFACES[ch.id] || null;
  const typeSurf = surf ? surf.type : null;
  if (!EVT && (force || dernierAnom === null || ageGeo !== dernierAge ||
      typeSurf !== dernierSurface || Math.abs(ch.tAnom - dernierAnom) > 0.01)) {
    const maintenant = performance.now();
    if (force || ageGeo !== dernierAge || typeSurf !== dernierSurface || maintenant - tRedessin > 90) {
      tRedessin = maintenant; dernierAnom = ch.tAnom; dernierAge = ageGeo; dernierSurface = typeSurf;
      const anomAff = surf && surf.anomAffichee !== undefined ? surf.anomAffichee : ch.tAnom;
      dessinerTexture(anomAff, ageGeo, typeSurf);
      atmos.material.uniforms.teinte.value.setHex(
        surf ? surf.hazeCouleur
             : ch.tAnom > 3 ? 0xff8a5c : ch.tAnom < -3 ? 0x9fd8ff : 0x4fa8ff);
      majBadgeGlobe(ageGeo, ageMa, surf);
    }
  }

  if (change || force) {
    poserMarqueurs(ch.marqueurs || []);
    $$(".chap").forEach(el => el.classList.toggle("actif", el.dataset.id === ch.id));
    const actif = $(".chap.actif");
    if (actif) actif.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (S.mode === "histoire") rendreContenu();
    majTitreFeuille();
    if (change) narrationSuit();
  }
}

function libelleStatut(s) {
  return { mesure: "Mesure directe", carotte: "Carotte de glace", proxy: "Proxy · reconstruction",
    modele: "Projection de modèle", schema: "Schéma simplifié" }[s] || s;
}

function allerChapitre(ch) {
  S.lecture && basculerLecture(false);
  allerA(anneeVersP(ch.annee), true);
  if (S.mode !== "histoire") { S.mode = "histoire"; majModes(); }
  rendreContenu();
}

/* =====================================================================
   6. INTERFACE
   ===================================================================== */
function initUI() {
  // liste des chapitres
  $("#chapList").innerHTML = CHAPITRES.map(c => `
    <div class="chap" data-id="${c.id}">
      <div class="chap-puce" style="background:${c.couleur};color:${c.couleur}"></div>
      <div class="chap-txt">
        <div class="chap-ere">${c.ere}</div>
        <div class="chap-titre">${c.titre}</div>
      </div>
    </div>`).join("");
  $$(".chap").forEach(el => el.onclick = () => allerChapitre(CHAPITRES.find(c => c.id === el.dataset.id)));

  construireFrise();

  // modes
  $$(".mode-btn").forEach(b => b.onclick = () => {
    S.mode = b.dataset.mode; majModes(); rendreContenu(); narrationSuit();
  });

  // frise interactive
  const piste = $("#frisePiste");
  let glisse = false;
  const set = e => {
    const r = piste.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    S.lecture && basculerLecture(false);
    allerA(clamp(x / r.width, 0, 1));
  };
  piste.addEventListener("pointerdown", e => { glisse = true; piste.setPointerCapture(e.pointerId); set(e); });
  piste.addEventListener("pointermove", e => { if (glisse) set(e); });
  piste.addEventListener("pointerup", () => { glisse = false; });

  // la frise peut changer de largeur sans que la fenêtre bouge (panneaux,
  // barre d'onglets qui passe à la ligne) : on suit sa taille réelle
  new ResizeObserver(() => disposerEtiquettesFrise()).observe($("#frise"));

  $("#btnPlay").onclick = () => basculerLecture(!S.lecture);
  $("#btnGestes").onclick = () => basculerGestes(!S.gestes);
  initNarration();
  $("#btnAide").onclick = ouvrirAide;
  $("#btnRetour").onclick = ouvrirRetour;
  $("#btnAnim").onclick = ouvrirMenuAnimations;
  $("#evStop").onclick = arreterEvenement;
  $("#feuillePoignee").onclick = basculerFeuille;

  // changer d'onglet ou d'étape rouvre la feuille : le texte vient d'être demandé
  $$(".mode-btn").forEach(b => b.addEventListener("click", () => replierFeuille(false)));
  $("#camClose").onclick = () => basculerGestes(false);
  $("#modaleClose").onclick = () => $("#modale").classList.add("hidden");
  $("#modale").onclick = e => { if (e.target.id === "modale") $("#modale").classList.add("hidden"); };

  addEventListener("keydown", e => {
    if (e.key === "Escape") $("#modale").classList.add("hidden");
    // en parcours, les flèches enchaînent les étapes ; ailleurs, les chapitres
    if (e.key === "ArrowRight") {
      if (S.mode === "parcours") allerStation(S.station + 1);
      else { const i = CHAPITRES.indexOf(S.chapitre); allerChapitre(CHAPITRES[Math.min(i + 1, CHAPITRES.length - 1)]); }
    }
    if (e.key === "ArrowLeft") {
      if (S.mode === "parcours") allerStation(S.station - 1);
      else { const i = CHAPITRES.indexOf(S.chapitre); allerChapitre(CHAPITRES[Math.max(i - 1, 0)]); }
    }
    if (e.code === "Space") { e.preventDefault(); basculerLecture(!S.lecture); }
    if (e.key.toLowerCase() === "g") basculerGestes(!S.gestes);
    if (e.key.toLowerCase() === "n") basculerNarration(!N.actif);
    if (e.key === "+" || e.key === "=") cam.cibleDist = clamp(cam.cibleDist * 0.88, 1.35, 7);
    if (e.key === "-") cam.cibleDist = clamp(cam.cibleDist * 1.14, 1.35, 7);
    if (e.key === "?" || e.key === "h") ouvrirAide();
    const n = parseInt(e.key);
    if (n >= 1 && n <= 6) {
      S.mode = ["parcours", "histoire", "consequences", "solutions", "idees", "methode"][n - 1];
      majModes(); rendreContenu();
    }
  });

  majModes();
  rendreContenu();
}

function majModes() {
  $$(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === S.mode));
  majTitreFeuille();
}

/* ---------- Feuille repliable (petits écrans) ----------
   Sur téléphone, le texte et le globe se disputent le même écran. La feuille
   permet d'arbitrer d'un geste, et se replie automatiquement dès qu'on touche
   la Terre : on ne devrait jamais avoir à choisir entre lire et manipuler. */
function feuilleActive() {
  return getComputedStyle($("#feuillePoignee")).display !== "none";
}

function replierFeuille(replier) {
  if (!feuilleActive()) return;
  $("#contenu").classList.toggle("reduit", replier);
}

function basculerFeuille() {
  $("#contenu").classList.toggle("reduit");
}

function majTitreFeuille() {
  const el = $("#feuilleTitre");
  if (!el) return;
  const btn = $(`.mode-btn[data-mode="${S.mode}"]`);
  let t = btn ? btn.textContent.trim() : "";
  if (S.mode === "parcours") t += ` · étape ${S.station + 1}/${PARCOURS.length}`;
  else if (S.mode === "histoire") t += ` · ${S.chapitre.ere}`;
  el.textContent = t;
}

function basculerLecture(v) {
  S.lecture = v;
  const b = $("#btnPlay");
  b.textContent = v ? "❚❚" : "▶";
  b.classList.toggle("actif", v);
  if (v && S.p >= 0.999) S.p = 0;
}

function construireFrise() {
  // bandes d'ères
  const eres = $("#friseEres");
  eres.innerHTML = CHAPITRES.map(c => {
    const a = anneeVersP(c.plage[0]), b = anneeVersP(c.plage[1]);
    const w = Math.max(b - a, 0.004) * 100;
    const court = c.ere.length > 13 && w < 8 ? "" : c.ere;
    return `<div class="ere-seg" data-id="${c.id}" style="flex:0 0 ${w}%;background:${c.couleur}" title="${c.ere} — ${c.titre}">${court}</div>`;
  }).join("");
  $$(".ere-seg").forEach(el => el.onclick = () => allerChapitre(CHAPITRES.find(c => c.id === el.dataset.id)));

  // graduations
  const reperes = [
    { a: 2025 - 4.0e9, l: "4 Ga" }, { a: 2025 - 1e9, l: "1 Ga" },
    { a: 2025 - 5.41e8, l: "541 Ma" }, { a: 2025 - 2.52e8, l: "252 Ma" },
    { a: 2025 - 6.6e7, l: "66 Ma" }, { a: 2025 - 2.58e6, l: "2,6 Ma" },
    { a: 2025 - 11700, l: "11 700 ans" }, { a: 1750, l: "1750" },
    { a: 1950, l: "1950" }, { a: 2025, l: "2025" },
  ];
  $("#friseTicks").innerHTML = reperes.map(r =>
    `<div class="tick" style="left:${anneeVersP(r.a) * 100}%"><span>${r.l}</span></div>`).join("");

  // marqueurs d'événements
  const evts = [
    { a: 2025 - 2.4e9, l: "Grande Oxydation", c: "#5fbf9b" },
    { a: 2025 - 7.0e8, l: "Boule de neige", c: "#8fd3f4" },
    { a: 2025 - 2.52e8, l: "Permien-Trias", c: "#c0392b" },
    { a: 2025 - 6.6e7, l: "K-Pg", c: "#9b59b6" },
    { a: 2025 - 5.6e7, l: "PETM", c: "#e74c3c" },
    { a: 2025 - 21000, l: "Dernier max. glaciaire", c: "#85c1e9" },
    { a: 1850, l: "Ère industrielle", c: "#d68910" },
    { a: 2024, l: "+1,55 °C", c: "#e74c3c" },
  ];
  $("#friseMarqueurs").innerHTML = evts.map(e => {
    const p = anneeVersP(e.a) * 100;
    return `<div class="fm" style="left:${p}%;background:${e.c};box-shadow:0 0 8px ${e.c}"></div>
            <div class="fm-lab" style="left:${p}%;color:${e.c}">${e.l}</div>`;
  }).join("");
  disposerEtiquettesFrise();
}

/* Sur une échelle logarithmique, des événements séparés de 10 millions
   d'années — K-Pg à 66 Ma, PETM à 56 Ma — tombent à moins d'un pour cent
   l'un de l'autre. Les étiquettes se chevauchaient. On les répartit sur deux
   rangées, et on rentre celles qui débordent des bords. */
function disposerEtiquettesFrise() {
  const labs = $$("#friseMarqueurs .fm-lab");
  if (!labs.length) return;
  const piste = $("#frisePiste").getBoundingClientRect();
  if (!piste.width) return;
  // sur petit écran les étiquettes sont masquées : rien à répartir
  if (getComputedStyle(labs[0]).display === "none") return;

  labs.forEach(l => {
    l.classList.remove("haut");
    l.style.transform = "translateX(-50%)";
    l.style.visibility = "";
  });

  const boites = labs.map(el => {
    const r = el.getBoundingClientRect();
    return { el, g: r.left - piste.left, d: r.right - piste.left };
  }).sort((a, b) => a.g - b.g);

  const finRangee = [-1e9, -1e9];
  for (const b of boites) {
    // on ramène dans la piste ce qui dépasse à gauche ou à droite
    let dec = 0;
    if (b.g < 2) dec = 2 - b.g;
    else if (b.d > piste.width - 2) dec = piste.width - 2 - b.d;
    const g = b.g + dec, d = b.d + dec;

    let rangee = -1;
    if (g > finRangee[0] + 8) rangee = 0;
    else if (g > finRangee[1] + 8) rangee = 1;

    if (rangee < 0) {
      // aucune place : mieux vaut masquer que superposer deux textes illisibles
      b.el.style.visibility = "hidden";
      continue;
    }
    finRangee[rangee] = d;
    if (rangee === 1) b.el.classList.add("haut");
    if (dec) b.el.style.transform = `translateX(calc(-50% + ${Math.round(dec)}px))`;
  }
}

/* =====================================================================
   7. CONTENU DU PANNEAU DROIT
   ===================================================================== */
function rendreContenu(garderScroll = false) {
  const el = $("#contenuInner");
  const sc = el.scrollTop;
  if (S.mode === "parcours") el.innerHTML = vueParcours();
  else if (S.mode === "histoire") el.innerHTML = vueHistoire();
  else if (S.mode === "consequences") el.innerHTML = barreEcoute() + vueConsequences();
  else if (S.mode === "solutions") el.innerHTML = barreEcoute() + vueSolutions();
  else if (S.mode === "idees") el.innerHTML = barreEcoute() + vueIdees();
  else el.innerHTML = barreEcoute() + vueMethode();
  el.scrollTop = garderScroll ? sc : 0;
  brancherContenu();
  tracerVue();
}

/** Bouton d'écoute générique, en tête des onglets sans narration dédiée. */
function barreEcoute() {
  return `<button class="btn-ecouter barre-ecoute" id="btnEcouter">🎙 Écouter cet onglet</button>`;
}

/* ---------- Parcours guidé ---------- */
function vueParcours() {
  const st = PARCOURS[S.station];
  const n = PARCOURS.length;
  const points = st.points.map(p =>
    `<div class="fait"><div class="fait-t">${p.t}</div><div class="fait-s">${p.s}</div></div>`).join("");

  const finale = !st.final ? "" : `
    <div class="conclusion">
      ${st.conclusion.split("\n\n").map(p => `<p>${p}</p>`).join("")}
    </div>

    <div class="c-h">${AGIR.intro}</div>

    <div class="c-h" style="color:var(--vert);border-color:rgba(69,214,154,.25)">Ce qui pèse dans vos choix personnels</div>
    ${AGIR.personnels.map(a => `
      <div class="agir"><div class="agir-t">${a.t}</div>
        <div class="agir-d">${a.d}</div><div class="pt-s">${a.s}</div></div>`).join("")}

    <div class="c-h" style="color:var(--accent-2);border-color:rgba(255,180,84,.25)">Ce qui pèse davantage, et dont on parle peu</div>
    ${AGIR.leviers.map(a => `
      <div class="agir fort"><div class="agir-t">${a.t}</div>
        <div class="agir-d">${a.d}</div><div class="pt-s">${a.s}</div></div>`).join("")}

    <div class="c-geo" style="background:rgba(231,76,60,.07);border-color:rgba(231,76,60,.2)">
      ${AGIR.avertissement}<div class="pt-s" style="margin-top:6px">${AGIR.avertissementSource}</div>
    </div>

    <div class="parcours-sorties">
      <button class="btn-ecouter" data-va="solutions">Chiffrer les leviers dans le simulateur →</button>
      <button class="btn-ecouter" data-va="histoire">Reprendre l'histoire complète, 17 chapitres →</button>
      <button class="btn-ecouter" data-va="idees">Répondre aux objections fréquentes →</button>
    </div>`;

  return `
    <div class="parcours-fil">
      ${PARCOURS.map((s, i) =>
        `<span class="pf-point ${i === S.station ? "actif" : ""} ${i < S.station ? "vu" : ""}"
               data-station="${i}" title="${s.numero}"></span>`).join("")}
    </div>
    <div class="c-ere">Étape ${S.station + 1} sur ${n} · ${st.numero}</div>
    <div class="c-titre">${st.titre}</div>
    <div class="c-accroche">${st.phrase}</div>
    ${points}
    ${finale}
    <button class="btn-ecouter barre-ecoute" id="btnEcouter">🎙 Écouter cette étape</button>
    <div class="parcours-nav">
      <button class="pn-btn" id="pnPrec" ${S.station === 0 ? "disabled" : ""}>← Précédent</button>
      <button class="pn-btn primaire" id="pnSuiv" ${S.station === n - 1 ? "disabled" : ""}>
        ${S.station === n - 2 ? "Et maintenant ?" : "Suivant →"}
      </button>
    </div>`;
}

function allerStation(i) {
  S.station = clamp(i, 0, PARCOURS.length - 1);
  const st = PARCOURS[S.station];
  const ch = CHAPITRES.find(c => c.id === st.chapitre);
  if (ch) allerA(anneeVersP(ch.annee), true);
  rendreContenu();
  majTitreFeuille();
  replierFeuille(false);
  narrationSuit();
}

/* ---------- Histoire ---------- */
function vueHistoire() {
  const c = S.chapitre;
  const plage = (v, p, u, d = 0) => p ? `<div class="mesure-plage">${fr(p[0], d)} – ${fr(p[1], d)}</div>` : "";
  return `
    <div class="c-ere">${c.ere} · ${formatAnnee(c.annee)}</div>
    <div class="c-titre">${c.titre}</div>
    <div class="c-accroche">${c.accroche}</div>

    <div class="c-mesures">
      <div class="mesure"><div class="mesure-lab">CO₂</div>
        <div class="mesure-val">${c.co2 >= 10000 ? Math.round(c.co2 / 1000) + "k" : Math.round(c.co2)}</div>
        <div class="mesure-plage">ppm${c.co2Plage ? "<br>" + (c.co2Plage[0] >= 1000 ? Math.round(c.co2Plage[0] / 1000) + "k" : c.co2Plage[0]) + "–" + (c.co2Plage[1] >= 1000 ? Math.round(c.co2Plage[1] / 1000) + "k" : c.co2Plage[1]) : ""}</div></div>
      <div class="mesure"><div class="mesure-lab">Température</div>
        <div class="mesure-val" style="color:${c.tAnom > 1 ? "#ff8a6b" : c.tAnom < -1 ? "#8fd3f4" : "#dfe8f5"}">${c.tAnom > 0 ? "+" : ""}${fr(c.tAnom, 1)}</div>
        ${plage(c.tAnom, c.tAnomPlage, "°C", 1)}</div>
      <div class="mesure"><div class="mesure-lab">Niveau marin</div>
        <div class="mesure-val">${c.mer === null ? "—" : (c.mer > 0 ? "+" : "") + Math.round(c.mer)}</div>
        <div class="mesure-plage">${c.mer === null ? "inconnu" : "m vs actuel"}</div></div>
    </div>
    <div style="text-align:center;margin-bottom:14px">
      <span class="badge ${c.statut}">${libelleStatut(c.statut)}</span>
      <span style="font-size:10px;color:var(--texte-faible);margin-left:6px">écarts vs 1850-1900</span>
    </div>

    ${blocSurface(c)}
    ${blocEvenement(c)}

    <div class="c-recit">${c.recit.map(p => `<p>${p}</p>`).join("")}</div>

    <div class="c-h">Le récit, à voix haute ${N.langue === "en" ? "· English" : "· français"}</div>
    <div class="narration-bloc">
      <button class="btn-ecouter" id="btnEcouter">🎙 Écouter ce chapitre</button>
      <div class="narration-texte">${narrationDuChapitre(c).map(p => `<p>${p}</p>`).join("")}</div>
      <div class="narration-bascule">
        <button class="nb-btn ${N.langue === "fr" ? "actif" : ""}" data-langue="fr">Français</button>
        <button class="nb-btn ${N.langue === "en" ? "actif" : ""}" data-langue="en">English</button>
      </div>
    </div>

    ${grapheDuChapitre(c)}

    <div class="c-h">Ce qu'on sait, et d'où ça vient</div>
    ${c.faits.map(f => `<div class="fait"><div class="fait-t">${f.t}</div><div class="fait-s">${f.s}</div></div>`).join("")}

    <div class="c-h">Géographie de l'époque</div>
    <div class="c-geo">${c.geo}</div>

    ${c.marqueurs && c.marqueurs.length ? `
      <div class="c-h">Sur le globe</div>
      ${c.marqueurs.map(m => `<div class="region" data-lat="${m.lat}" data-lon="${m.lon}">
          <div class="region-head"><div class="region-nom">${m.nom}</div>
          <div class="region-delta">${m.lat.toFixed(1)}°, ${m.lon.toFixed(1)}°</div></div>
          <div style="font-size:11.4px;color:var(--texte-faible);margin-top:3px">${m.note}</div>
        </div>`).join("")}` : ""}
  `;
}

/** Explique ce que le globe montre — et ne montre pas — en temps profond. */
function blocSurface(c) {
  const s = SURFACES[c.id];
  if (!s) return "";
  return `
    <div class="surface-bloc">
      <div class="surface-head"><span class="surface-pastille"></span>
        <b>Ce que montre le globe : ${s.titre.toLowerCase()}</b></div>
      <div class="surface-quoi">${s.quoi}</div>
      ${s.faits.map(f => `<div class="pt"><div class="pt-t">${f.t}</div><div class="pt-s">${f.s}</div></div>`).join("")}
    </div>`;
}

function blocEvenement(c) {
  const e = evenementDe(c.id);
  if (!e) return "";
  return `
    <div class="evt-bloc">
      <button class="btn-evt" data-evt="${e.id}">▶ Voir l'événement : ${e.nom}</button>
      <div class="evt-quand">${e.quand}</div>
      <div class="evt-resume">${e.resume}</div>
      ${e.faits.map(f => `<div class="pt"><div class="pt-t">${f.t}</div><div class="pt-s">${f.s}</div></div>`).join("")}
      <div class="evt-avert">⚠ ${e.avertissement}</div>
    </div>`;
}

function grapheDuChapitre(c) {
  const g = (id, titre, statut, note, src) => `
    <div class="graph">
      <div class="graph-titre"><span>${titre}</span><span class="badge ${statut}">${libelleStatut(statut)}</span></div>
      <canvas id="${id}" height="150"></canvas>
      <div class="graph-note">${note}</div>
      <div class="graph-src">Source : ${src}</div>
    </div>`;
  const deepTime = ["paleozoique", "carbonifere", "permien", "cretace", "kpg", "petm", "cenozoique"];
  if (deepTime.includes(c.id))
    return g("gPhan", CO2_PHANEROZOIQUE.titre, CO2_PHANEROZOIQUE.statut, CO2_PHANEROZOIQUE.note, CO2_PHANEROZOIQUE.source);
  if (c.id === "quaternaire" || c.id === "holocene")
    return g("gCycles", CYCLES_GLACIAIRES.titre, CYCLES_GLACIAIRES.statut, CYCLES_GLACIAIRES.note, CYCLES_GLACIAIRES.source);
  if (["industrie", "acceleration", "moderne", "futur"].includes(c.id))
    return g("gKeeling", KEELING.titre, KEELING.statut, KEELING.note, KEELING.source);
  return "";
}

/* ---------- Conséquences ---------- */
function vueConsequences() {
  return `
    <div class="c-ere">Où cela nous mène</div>
    <div class="c-titre">Conséquences observées et projetées</div>
    <div class="c-accroche">Ce qui suit est déjà mesuré, sauf mention explicite de projection.</div>

    <div class="graph">
      <div class="graph-titre"><span>${TEMPERATURE_MODERNE.titre}</span><span class="badge mesure">Mesure directe</span></div>
      <canvas id="gTemp" height="165"></canvas>
      <div class="graph-note">${TEMPERATURE_MODERNE.note}</div>
      <div class="graph-src">Source : ${TEMPERATURE_MODERNE.source}</div>
    </div>

    ${CONSEQUENCES.map(c => `
      <div class="carte">
        <div class="carte-head">
          <span class="carte-icone">${c.icone}</span>
          <span class="carte-titre">${c.titre}</span>
          <span><div class="carte-chiffre">${c.chiffre}</div><div class="carte-chiffre-lab">${c.chiffreLabel}</div></span>
        </div>
        ${c.points.map(p => `<div class="pt"><div class="pt-t">${p.t}</div><div class="pt-s">${p.s}</div></div>`).join("")}
      </div>`).join("")}

    <div class="c-h">Impacts par région — cliquez pour y aller sur le globe</div>
    ${REGIONS.map(r => `
      <div class="region" data-lat="${r.lat}" data-lon="${r.lon}">
        <div class="region-head"><div class="region-nom">${r.nom}</div><div class="region-delta">${r.delta}</div></div>
        <ul>${r.points.map(p => `<li>${p}</li>`).join("")}</ul>
      </div>`).join("")}

    <div class="c-h">Émissions mondiales — la cause</div>
    <div class="graph">
      <div class="graph-titre"><span>${EMISSIONS.titre}</span><span class="badge mesure">Mesure directe</span></div>
      <canvas id="gEmis" height="140"></canvas>
      <div class="graph-note">${EMISSIONS.note}</div>
      <div class="graph-src">Source : ${EMISSIONS.source}</div>
    </div>
  `;
}

/* ---------- Solutions ---------- */
function vueSolutions() {
  const C = CADRE_PHYSIQUE;
  return `
    <div class="c-ere">Ce qui dépend encore de nous</div>
    <div class="c-titre">Solutions : le cadre physique, puis les leviers</div>
    <div class="c-accroche">Une seule règle gouverne tout le reste : le réchauffement est proportionnel au CO₂ cumulé.</div>

    <div class="carte">
      <div class="carte-head"><span class="carte-icone">📐</span><span class="carte-titre">La relation qui commande tout</span></div>
      <div class="pt"><div class="pt-t">Le réchauffement est approximativement proportionnel au CO₂ <b>cumulé</b> émis depuis l'ère préindustrielle : environ <b>${fr(C.tcre, 2)} °C par 1000 milliards de tonnes de CO₂</b> (fourchette ${fr(C.tcrePlage[0], 2)}–${fr(C.tcrePlage[1], 2)}).</div>
        <div class="pt-s">${C.tcreSource}</div></div>
      <div class="pt"><div class="pt-t">Trois conséquences directes. <b>1)</b> Stabiliser la température exige d'atteindre le net zéro CO₂ — réduire les émissions ne suffit pas, il faut les annuler. <b>2)</b> Chaque tonne compte, indépendamment de la date à laquelle elle est émise. <b>3)</b> Il existe un budget carbone fini.</div>
        <div class="pt-s">GIEC AR6 WG1, SPM D.1</div></div>
    </div>

    <div class="c-h">Budget carbone restant au 1ᵉʳ janvier 2025</div>
    ${C.budgets.map(b => `
      <div class="scen">
        <div class="scen-pastille" style="background:${b.cible === "1,5 °C" ? "#2ecc71" : b.cible === "2 °C" ? "#e67e22" : "#f1c40f"};color:${b.cible === "1,5 °C" ? "#2ecc71" : "#e67e22"}"></div>
        <div class="scen-nom">${b.cible}</div>
        <div class="scen-t">${b.gt} Gt</div>
        <div class="scen-desc">${b.annees} · probabilité ${b.proba}</div>
      </div>`).join("")}
    <div class="graph-src" style="margin-bottom:16px">Source : ${C.budgetsSource}. Émissions 2024 de référence : ${fr(C.emissions2024, 1)} GtCO₂ (${C.emissionsSource}).</div>

    <div class="c-h">Simulateur — que produisent les leviers ?</div>
    <div class="resultat">
      <div class="res-lab">Réchauffement estimé en 2100</div>
      <div class="res-grande" id="simT">—</div>
      <div class="res-barre"><div class="res-curseur" id="simCurseur" style="left:50%"></div></div>
      <div class="res-echelle"><span>1 °C</span><span>2 °C</span><span>3 °C</span><span>4 °C</span><span>5 °C</span></div>
      <div class="res-detail" id="simDetail"></div>
    </div>

    <div class="graph">
      <div class="graph-titre"><span>Trajectoire d'émissions résultante</span><span class="badge modele">Projection de modèle</span></div>
      <canvas id="gSim" height="150"></canvas>
      <div class="graph-note" id="simNote"></div>
    </div>

    ${LEVIERS.map(l => `
      <div class="levier">
        <div class="levier-head">
          <span class="levier-nom">${l.nom}</span>
          <span class="levier-cat">${l.cat}</span>
          <span class="levier-val" id="v-${l.id}">—</span>
        </div>
        <input type="range" min="0" max="100" step="5" value="${S.leviers[l.id]}" data-levier="${l.id}">
        <div class="levier-note">Potentiel maximal 2030 : <b>${fr(l.potentiel, 1)} GtCO₂-eq/an</b> · ${l.cout}<br>${l.note}</div>
      </div>`).join("")}

    <div class="graph-src" style="margin-bottom:16px">${LEVIERS_SOURCE}</div>

    <div class="c-h">Méthode du simulateur</div>
    <div class="c-geo" style="background:rgba(79,195,247,.07);border-color:rgba(79,195,247,.2)">
      <b>Ce que fait le calcul, exactement.</b><br>
      1. Trajectoire de référence sans effort supplémentaire, en GtCO₂/an : ${fr(C.emissions2024, 1)} en 2025, 43 en 2030, 48 en 2050, 52 en 2100. Curseurs à zéro, c'est cette trajectoire qui s'applique.<br>
      2. Réduction obtenue en 2030 = somme des (potentiel du levier × curseur), multipliée par 0,85 pour tenir compte des recouvrements entre leviers.<br>
      3. L'effort se poursuit et s'amplifie : la réduction vaut 1,8 fois sa valeur de 2030 en 2050, et 2,2 fois en 2100. Les émissions nettes sont bornées à −8 Gt en 2050 et −12 Gt en 2100.<br>
      4. Les émissions sont cumulées sur 2025-2100 (méthode des trapèzes), puis converties en réchauffement via le TCRE : ΔT = 1,3 °C + cumul × ${fr(C.tcre, 2)} / 1000.<br><br>
      <b>Les limites, honnêtement.</b> Les points 1, 2 et 3 sont des hypothèses de cette application, pas des résultats du GIEC — seuls les potentiels des leviers et le TCRE en proviennent. Le TCRE vaut pour des émissions positives ; en émissions nettes négatives, la réponse réelle est asymétrique et le refroidissement serait plus lent qu'affiché. Les gaz autres que le CO₂ ne sont pas traités séparément.<br><br>
      <b>Point de calibration.</b> Les positions par défaut des curseurs donnent environ +2,5 °C, ce qui correspond à l'ordre de grandeur des estimations « politiques actuellement mises en œuvre » (+2,6 à +3,1 °C, PNUE 2024). Curseurs à zéro : environ +2,9 °C. Ce simulateur donne une hiérarchie des leviers et un ordre de grandeur, pas une projection.
    </div>

    <div class="c-h">Trajectoires de référence du GIEC</div>
    ${SCENARIOS.map(s => `
      <div class="scen ${S.scenario === s.id ? "actif" : ""}" data-scen="${s.id}">
        <div class="scen-pastille" style="background:${s.couleur};color:${s.couleur}"></div>
        <div class="scen-nom">${s.nom}</div>
        <div class="scen-t" style="color:${s.couleur}">+${fr(s.t2100, 1)}</div>
        <div class="scen-desc">${s.desc}<br><span style="opacity:.7">Fourchette ${fr(s.plage[0], 1)}–${fr(s.plage[1], 1)} °C · mer +${fr(s.mer[0], 2)} à +${fr(s.mer[1], 2)} m</span></div>
      </div>`).join("")}
    <div class="graph-src" style="margin-bottom:16px">Source : ${SCENARIO_SOURCE}</div>

    <div class="c-h">${FOCUS_CIMENT.titre}</div>
    <div class="carte">
      <div class="pt"><div class="pt-t"><i>${FOCUS_CIMENT.intro}</i></div></div>
      ${FOCUS_CIMENT.points.map(p => `<div class="pt"><div class="pt-t">${p.t}</div><div class="pt-s">${p.s}</div></div>`).join("")}
    </div>
  `;
}

/* ---------- Idées reçues ---------- */
function vueIdees() {
  return `
    <div class="c-ere">Objections fréquentes</div>
    <div class="c-titre">Idées reçues, traitées sérieusement</div>
    <div class="c-accroche">Chacune de ces objections contient une part de vrai. C'est ce qui les rend efficaces — et ce qui rend la réponse intéressante.</div>
    ${IDEES_RECUES.map((i, n) => `
      <div class="idee" data-idee="${n}">
        <div class="idee-q"><span class="idee-fleche">▶</span><b>${i.q}</b></div>
        <div class="idee-r">${i.r}<div class="idee-s">Source : ${i.s}</div></div>
      </div>`).join("")}
  `;
}

/* ---------- Méthode ---------- */
function vueMethode() {
  return `
    <div class="c-ere">Transparence</div>
    <div class="c-titre">Méthode &amp; sources</div>
    <div class="c-accroche">Une application sur le climat qui ne dit pas d'où viennent ses chiffres ne vaut rien. Voici les règles.</div>

    <div class="c-h">Principes</div>
    ${METHODE.principes.map(p => `<div class="principe"><span>◆</span><div>${p}</div></div>`).join("")}

    <div class="c-h">Le modèle de couleur du globe</div>
    <div class="c-geo">${METHODE.modeleZonal}</div>

    <div class="c-h">Ouvrages de référence</div>
    ${METHODE.ouvrages.map(o => `
      <div class="ouvrage">
        <div class="ouvrage-t">${o.u ? `<a href="${o.u}" target="_blank" rel="noopener">${o.t}</a>` : o.t}</div>
        <div class="ouvrage-n">${o.n}</div>
      </div>`).join("")}

    <div class="c-h">Jeux de données publics</div>
    <ul class="liste-simple">
      ${METHODE.jeuxDonnees.map(d => `<li><a href="${d.u}" target="_blank" rel="noopener">${d.t}</a></li>`).join("")}
    </ul>

    <div class="c-h">Articles clés cités</div>
    <ul class="liste-simple">${METHODE.articlesCles.map(a => `<li>${a}</li>`).join("")}</ul>

    <div class="c-h">Ce que cette application ne fait pas</div>
    <div class="c-geo" style="background:rgba(231,76,60,.07);border-color:rgba(231,76,60,.2)">
      Elle ne reconstitue pas les continents au-delà de 900 millions d'années : aucun modèle publié ne remonte plus loin. Les trois premiers chapitres sont donc affichés en géographie actuelle, et le globe le dit.<br><br>
      Elle ne garantit pas la longitude des continents avant 200 millions d'années — voir l'avertissement ci-dessus. C'est une limite des données, pas de l'application.<br><br>
      Elle n'affiche aucune carte régionale de température issue d'un modèle climatique : le champ coloré est une aide à la lecture, décrite ci-dessus.<br><br>
      Elle ne prédit pas l'avenir. Les scénarios sont des explorations conditionnelles, et le simulateur repose sur des hypothèses explicitement listées dans l'onglet Solutions.<br><br>
      ${META.majDonnees}.
    </div>

    <div class="c-h">Droits</div>
    <div class="c-geo">
      <b>© 2026 GeoGeoLeCuisto. Tous droits réservés.</b><br><br>
      Le code, les textes, le parcours guidé et les narrations de cette application ne sont placés
      sous aucune licence libre et ne sont pas réutilisables.<br><br>
      Cette réserve ne s'étend pas aux éléments tiers, qui restent régis par leurs licences propres :
      reconstructions paléogéographiques MERDITH2021 (CC-BY, Merdith et al. 2021 / EarthByte),
      traits de côte Natural Earth (domaine public), three.js (MIT), MediaPipe (Apache 2.0).
    </div>
  `;
}

/* ---------- Branchements après rendu ---------- */
function brancherContenu() {
  // graphiques
  if ($("#gPhan")) grapheCO2Phanerozoique($("#gPhan"));
  if ($("#gCycles")) grapheCycles($("#gCycles"));
  if ($("#gKeeling")) grapheKeeling($("#gKeeling"));
  if ($("#gTemp")) grapheTemperature($("#gTemp"));
  if ($("#gEmis")) grapheEmissions($("#gEmis"));

  // aller à une région sur le globe
  $$(".region[data-lat]").forEach(el => el.onclick = () => {
    const lat = parseFloat(el.dataset.lat), lon = parseFloat(el.dataset.lon);
    S.autoRotation = false;
    cam.azim = -(lon + 180) * Math.PI / 180 - Math.PI / 2;
    cam.polar = clamp((90 - lat) * Math.PI / 180, 0.22, Math.PI - 0.22);
    cam.cibleDist = 2.35;
  });

  // parcours guidé
  if ($("#pnSuiv")) {
    $("#pnSuiv").onclick = () => allerStation(S.station + 1);
    $("#pnPrec").onclick = () => allerStation(S.station - 1);
    $$(".pf-point").forEach(el => el.onclick = () => allerStation(+el.dataset.station));
    $$("[data-va]").forEach(el => el.onclick = () => {
      S.mode = el.dataset.va; majModes(); rendreContenu();
    });
  }

  // lancer un événement animé
  $$("[data-evt]").forEach(el => el.onclick = () => lancerEvenement(el.dataset.evt));

  // bascule de langue depuis le panneau
  $$(".nb-btn").forEach(el => el.onclick = () => changerLangue(el.dataset.langue));

  // écouter le chapitre courant
  const ecouter = $("#btnEcouter");
  if (ecouter) ecouter.onclick = () => {
    if (!N.actif) basculerNarration(true);
    else demarrerNarration();
  };

  // idées reçues
  $$(".idee").forEach(el => el.querySelector(".idee-q").onclick = () => el.classList.toggle("ouvert"));

  // scénarios
  $$(".scen[data-scen]").forEach(el => el.onclick = () => {
    S.scenario = el.dataset.scen;
    $$(".scen[data-scen]").forEach(x => x.classList.toggle("actif", x.dataset.scen === S.scenario));
  });

  // simulateur
  const sliders = $$("input[data-levier]");
  if (sliders.length) {
    sliders.forEach(s => {
      s.oninput = () => { S.leviers[s.dataset.levier] = +s.value; majSimulateur(); };
    });
    majSimulateur();
  }
}

/* =====================================================================
   8. SIMULATEUR
   ===================================================================== */
/* Référence « aucun effort supplémentaire » : hypothèse de l'application.
   Ordre de grandeur cohérent avec les scénarios sans politiques additionnelles. */
const REFERENCE = { 2030: 43, 2050: 48, 2100: 52 };

function calculerSimulation() {
  const C = CADRE_PHYSIQUE;
  let reduction2030 = 0;
  for (const l of LEVIERS) reduction2030 += l.potentiel * (S.leviers[l.id] / 100);
  reduction2030 *= 0.85;                                  // recouvrement (hypothèse de l'app)

  const E2025 = C.emissions2024;
  const E2030 = REFERENCE[2030] - reduction2030;
  // l'effort se poursuit et s'amplifie : ×1,8 en 2050, ×2,2 en 2100
  const E2050 = Math.max(REFERENCE[2050] - reduction2030 * 1.8, -8);
  const E2100 = Math.max(REFERENCE[2100] - reduction2030 * 2.2, -12);

  const pts = [[2025, E2025], [2030, E2030], [2050, E2050], [2100, E2100]];
  let cumul = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [a1, e1] = pts[i], [a2, e2] = pts[i + 1];
    cumul += (e1 + e2) / 2 * (a2 - a1);
  }

  // année de franchissement du net zéro
  let netZero = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [a1, e1] = pts[i], [a2, e2] = pts[i + 1];
    if (e1 > 0 && e2 <= 0) { netZero = Math.round(a1 + (a2 - a1) * (e1 / (e1 - e2))); break; }
  }

  const dT = C.rechauffementActuel + cumul * C.tcre / 1000;
  const dTmin = C.rechauffementActuel + cumul * C.tcrePlage[0] / 1000;
  const dTmax = C.rechauffementActuel + cumul * C.tcrePlage[1] / 1000;
  return { reduction2030, E2030, E2050, E2100, cumul, netZero, dT, dTmin, dTmax, pts };
}

function majSimulateur() {
  const r = calculerSimulation();
  for (const l of LEVIERS) {
    const el = $("#v-" + l.id);
    if (el) el.textContent = S.leviers[l.id] + " % · " + fr(l.potentiel * S.leviers[l.id] / 100, 2) + " Gt";
  }
  const T = $("#simT");
  if (!T) return;
  const t = clamp(r.dT, 0.9, 5.2);
  const coul = t < 1.6 ? "#2ecc71" : t < 2.1 ? "#a3d977" : t < 2.8 ? "#f1c40f" : t < 3.6 ? "#e67e22" : "#c0392b";
  T.textContent = "+" + fr(r.dT, 2) + " °C";
  T.style.color = coul;
  $("#simCurseur").style.left = clamp((t - 1) / 4 * 100, 0, 100) + "%";

  $("#simDetail").innerHTML = `
    Réduction atteinte en 2030 : <b>${fr(r.reduction2030, 1)} GtCO₂/an</b> (émissions ${fr(r.E2030, 1)} Gt).<br>
    Émissions 2050 : <b>${fr(r.E2050, 1)} Gt</b> · 2100 : <b>${fr(r.E2100, 1)} Gt</b>.<br>
    CO₂ cumulé 2025-2100 : <b>${Math.round(r.cumul)} GtCO₂</b>.<br>
    Net zéro CO₂ : <b>${r.netZero ? "vers " + r.netZero : "non atteint avant 2100"}</b>.<br>
    Fourchette liée à l'incertitude du TCRE : +${fr(r.dTmin, 2)} à +${fr(r.dTmax, 2)} °C.
    ${r.dT <= 1.6 ? "<br><span style='color:#7fe8bd'>Compatible avec l'objectif de 1,5 °C.</span>" :
      r.dT <= 2.1 ? "<br><span style='color:#f1c40f'>Sous 2 °C, mais au-dessus de 1,5 °C.</span>" :
      "<br><span style='color:#ff8a6b'>Au-dessus de la limite haute de l'accord de Paris.</span>"}`;

  $("#simNote").textContent =
    `Trajectoire construite à partir de quatre points (2025, 2030, 2050, 2100) selon la méthode décrite ci-dessous. ` +
    `La zone grisée rappelle le budget carbone compatible avec 1,5 °C (${CADRE_PHYSIQUE.budgets[0].gt} GtCO₂).`;

  if ($("#gSim")) grapheSimulation($("#gSim"), r);
}

/* =====================================================================
   9. GRAPHIQUES (canvas 2D maison)
   ===================================================================== */
function prepCanvas(cv) {
  const dpr = Math.min(devicePixelRatio, 2);
  const w = cv.clientWidth || cv.parentElement.clientWidth - 24;
  const h = +cv.getAttribute("height");
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.height = h + "px";
  const x = cv.getContext("2d");
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  return { x, w, h };
}
function axes(x, w, h, m, ylabs, xlabs) {
  x.strokeStyle = "rgba(255,255,255,.09)"; x.lineWidth = 1;
  x.fillStyle = "#61748f"; x.font = "9px ui-monospace, monospace";
  for (const [ty, lab] of ylabs) {
    x.beginPath(); x.moveTo(m.l, ty); x.lineTo(w - m.r, ty); x.stroke();
    x.textAlign = "right"; x.textBaseline = "middle";
    x.fillText(lab, m.l - 5, ty);
  }
  for (const [tx, lab] of xlabs) {
    x.textAlign = "center"; x.textBaseline = "top";
    x.fillText(lab, tx, h - m.b + 4);
  }
}

function grapheCO2Phanerozoique(cv) {
  const { x, w, h } = prepCanvas(cv);
  const m = { l: 36, r: 8, t: 8, b: 18 };
  const P = CO2_PHANEROZOIQUE.points;
  const X = ma => m.l + (1 - ma / 540) * (w - m.l - m.r);
  const Y = v => h - m.b - (Math.log10(Math.max(v, 100)) - 2) / (Math.log10(8000) - 2) * (h - m.t - m.b);
  axes(x, w, h, m, [[Y(200), "200"], [Y(1000), "1k"], [Y(4000), "4k"]],
    [[X(540), "540 Ma"], [X(300), "300"], [X(150), "150"], [X(0), "auj."]]);

  // enveloppe
  x.beginPath();
  P.forEach((p, i) => i ? x.lineTo(X(p.ma), Y(p.max)) : x.moveTo(X(p.ma), Y(p.max)));
  for (let i = P.length - 1; i >= 0; i--) x.lineTo(X(P[i].ma), Y(P[i].min));
  x.closePath();
  const gr = x.createLinearGradient(0, m.t, 0, h - m.b);
  gr.addColorStop(0, "rgba(231,126,34,.35)"); gr.addColorStop(1, "rgba(93,173,226,.25)");
  x.fillStyle = gr; x.fill();
  x.strokeStyle = "rgba(255,180,84,.5)"; x.lineWidth = 1; x.stroke();

  // médiane
  x.beginPath();
  P.forEach((p, i) => { const y = Y((p.min + p.max) / 2); i ? x.lineTo(X(p.ma), y) : x.moveTo(X(p.ma), y); });
  x.strokeStyle = "#ffb454"; x.lineWidth = 1.6; x.stroke();

  // repères
  const rep = [[252, "P-T", "#c0392b"], [66, "K-Pg", "#9b59b6"], [56, "PETM", "#e74c3c"]];
  for (const [ma, lab, c] of rep) {
    x.strokeStyle = c; x.setLineDash([2, 3]); x.beginPath();
    x.moveTo(X(ma), m.t); x.lineTo(X(ma), h - m.b); x.stroke(); x.setLineDash([]);
    x.fillStyle = c; x.textAlign = "center"; x.textBaseline = "top";
    x.font = "8.5px ui-monospace, monospace"; x.fillText(lab, X(ma), m.t);
  }
  // niveau actuel
  x.strokeStyle = "#fff"; x.setLineDash([3, 3]); x.beginPath();
  x.moveTo(m.l, Y(424)); x.lineTo(w - m.r, Y(424)); x.stroke(); x.setLineDash([]);
  x.fillStyle = "#fff"; x.textAlign = "left"; x.textBaseline = "bottom";
  x.fillText("427 ppm (2025)", m.l + 3, Y(424) - 2);
}

function grapheCycles(cv) {
  const { x, w, h } = prepCanvas(cv);
  const m = { l: 32, r: 8, t: 10, b: 18 };
  const P = CYCLES_GLACIAIRES.points.filter(p => p.ka > 0.05).slice().sort((a, b) => b.ka - a.ka);
  const X = ka => m.l + (1 - ka / 800) * (w - m.l - m.r);
  const Y = v => h - m.b - (v - 160) / (300 - 160) * (h - m.t - m.b);
  axes(x, w, h, m, [[Y(180), "180"], [Y(240), "240"], [Y(300), "300"]],
    [[X(800), "800 ka"], [X(400), "400"], [X(125), "125"], [X(0), "0"]]);

  // bande glaciaire / interglaciaire
  x.fillStyle = "rgba(93,173,226,.1)"; x.fillRect(m.l, Y(200), w - m.l - m.r, Y(180) - Y(200));
  x.fillStyle = "rgba(69,214,154,.09)"; x.fillRect(m.l, Y(300), w - m.l - m.r, Y(270) - Y(300));

  x.beginPath();
  P.forEach((p, i) => { const px = X(p.ka), py = Y(p.co2); i ? x.lineTo(px, py) : x.moveTo(px, py); });
  x.strokeStyle = "#8fd3f4"; x.lineWidth = 1.7; x.stroke();

  // pics étiquetés
  x.font = "8px ui-monospace, monospace"; x.textAlign = "center"; x.textBaseline = "bottom";
  for (const p of P) {
    if (!p.label || p.co2 < 275) continue;
    x.fillStyle = "#a3d5f5"; x.beginPath(); x.arc(X(p.ka), Y(p.co2), 2.2, 0, 7); x.fill();
    if (["MIS 5e — Eémien", "MIS 11 — long interglaciaire", "Dernier Maximum Glaciaire"].includes(p.label))
      x.fillText(p.label.split(" —")[0], X(p.ka), Y(p.co2) - 4);
  }
  // aujourd'hui
  x.strokeStyle = "#e74c3c"; x.lineWidth = 2; x.beginPath();
  x.moveTo(X(0), Y(300)); x.lineTo(X(0), m.t); x.stroke();
  x.fillStyle = "#e74c3c"; x.textAlign = "right"; x.textBaseline = "top";
  x.fillText("427 ppm →", X(0) - 3, m.t);
  x.fillStyle = "#61748f"; x.textAlign = "left"; x.textBaseline = "top";
  x.fillText("Plafond des 800 000 dernières années : 300 ppm", m.l + 4, m.t + 1);
}

function grapheKeeling(cv) {
  const { x, w, h } = prepCanvas(cv);
  const m = { l: 34, r: 8, t: 10, b: 18 };
  const X = an => m.l + (an - 1750) / (2030 - 1750) * (w - m.l - m.r);
  const Y = v => h - m.b - (v - 260) / (440 - 260) * (h - m.t - m.b);
  axes(x, w, h, m, [[Y(280), "280"], [Y(350), "350"], [Y(425), "425"]],
    [[X(1750), "1750"], [X(1850), "1850"], [X(1950), "1950"], [X(2020), "2020"]]);

  x.beginPath();
  KEELING.glace.forEach((p, i) => i ? x.lineTo(X(p.an), Y(p.ppm)) : x.moveTo(X(p.an), Y(p.ppm)));
  x.lineTo(X(KEELING.mesure[0].an), Y(KEELING.mesure[0].ppm));
  x.strokeStyle = "#a3d5f5"; x.lineWidth = 1.5; x.setLineDash([4, 3]); x.stroke(); x.setLineDash([]);

  x.beginPath();
  KEELING.mesure.forEach((p, i) => i ? x.lineTo(X(p.an), Y(p.ppm)) : x.moveTo(X(p.an), Y(p.ppm)));
  x.strokeStyle = "#e74c3c"; x.lineWidth = 2.1; x.stroke();
  x.fillStyle = "#e74c3c";
  KEELING.mesure.forEach(p => { x.beginPath(); x.arc(X(p.an), Y(p.ppm), 1.9, 0, 7); x.fill(); });

  x.font = "8.5px ui-monospace, monospace"; x.fillStyle = "#a3d5f5";
  x.textAlign = "left"; x.textBaseline = "bottom";
  x.fillText("carottes de glace", m.l + 3, Y(272));
  x.fillStyle = "#e74c3c"; x.textAlign = "right";
  x.fillText("Mauna Loa (mesure) 427,4 ppm", w - m.r - 2, Y(424) - 5);

  // plafond holocène
  x.strokeStyle = "rgba(255,255,255,.28)"; x.setLineDash([2, 3]); x.beginPath();
  x.moveTo(m.l, Y(285)); x.lineTo(w - m.r, Y(285)); x.stroke(); x.setLineDash([]);
  x.fillStyle = "#61748f"; x.textAlign = "left"; x.textBaseline = "top";
  x.fillText("niveau préindustriel 285 ppm", m.l + 3, Y(285) + 2);
}

function grapheTemperature(cv) {
  const { x, w, h } = prepCanvas(cv);
  const m = { l: 30, r: 10, t: 10, b: 18 };
  const D = TEMPERATURE_MODERNE.decennies;
  const X = an => m.l + (an - 1850) / (2030 - 1850) * (w - m.l - m.r);
  const Y = v => h - m.b - (v + 0.35) / (2.0 + 0.35) * (h - m.t - m.b);
  axes(x, w, h, m, [[Y(0), "0"], [Y(0.5), "+0,5"], [Y(1.0), "+1,0"], [Y(1.5), "+1,5"]],
    [[X(1850), "1850"], [X(1920), "1920"], [X(1980), "1980"], [X(2024), "2024"]]);

  for (const r of TEMPERATURE_MODERNE.reperes) {
    x.strokeStyle = r.t === 1.5 ? "rgba(241,196,15,.5)" : "rgba(192,57,43,.5)";
    x.setLineDash([4, 3]); x.beginPath();
    x.moveTo(m.l, Y(r.t)); x.lineTo(w - m.r, Y(r.t)); x.stroke(); x.setLineDash([]);
    x.fillStyle = r.t === 1.5 ? "#f1c40f" : "#e57373";
    x.font = "8.5px ui-monospace, monospace"; x.textAlign = "left"; x.textBaseline = "bottom";
    x.fillText(r.label, m.l + 3, Y(r.t) - 2);
  }

  // aire sous la courbe
  x.beginPath(); x.moveTo(X(D[0].d), Y(0));
  D.forEach(p => x.lineTo(X(p.d), Y(p.t)));
  x.lineTo(X(D[D.length - 1].d), Y(0)); x.closePath();
  const gr = x.createLinearGradient(0, m.t, 0, Y(0));
  gr.addColorStop(0, "rgba(231,76,60,.4)"); gr.addColorStop(1, "rgba(231,76,60,0)");
  x.fillStyle = gr; x.fill();

  x.beginPath();
  D.forEach((p, i) => i ? x.lineTo(X(p.d), Y(p.t)) : x.moveTo(X(p.d), Y(p.t)));
  x.strokeStyle = "#ff7a5c"; x.lineWidth = 2.1; x.stroke();

  for (const a of TEMPERATURE_MODERNE.annees) {
    x.fillStyle = "#fff"; x.beginPath(); x.arc(X(a.an), Y(a.t), 2.4, 0, 7); x.fill();
  }
  const d24 = TEMPERATURE_MODERNE.annees.find(a => a.an === 2024);
  x.fillStyle = "#fff"; x.font = "9px ui-monospace, monospace";
  x.textAlign = "right"; x.textBaseline = "bottom";
  x.fillText("2024 : +1,55 °C", w - m.r, Y(d24.t) - 5);
}

function grapheEmissions(cv) {
  const { x, w, h } = prepCanvas(cv);
  const m = { l: 30, r: 8, t: 10, b: 18 };
  const P = EMISSIONS.points;
  const X = an => m.l + (an - 1850) / (2030 - 1850) * (w - m.l - m.r);
  const Y = v => h - m.b - v / 42 * (h - m.t - m.b);
  axes(x, w, h, m, [[Y(0), "0"], [Y(20), "20"], [Y(37), "37"]],
    [[X(1850), "1850"], [X(1950), "1950"], [X(2024), "2024"]]);
  x.beginPath(); x.moveTo(X(1850), Y(0));
  P.forEach(p => x.lineTo(X(p.an), Y(p.v)));
  x.lineTo(X(2024), Y(0)); x.closePath();
  const gr = x.createLinearGradient(0, m.t, 0, Y(0));
  gr.addColorStop(0, "rgba(230,126,34,.45)"); gr.addColorStop(1, "rgba(230,126,34,0)");
  x.fillStyle = gr; x.fill();
  x.beginPath();
  P.forEach((p, i) => i ? x.lineTo(X(p.an), Y(p.v)) : x.moveTo(X(p.an), Y(p.v)));
  x.strokeStyle = "#e67e22"; x.lineWidth = 2; x.stroke();
  x.fillStyle = "#e67e22"; x.font = "9px ui-monospace, monospace";
  x.textAlign = "right"; x.textBaseline = "bottom";
  x.fillText("37,4 GtCO₂ (2024)", w - m.r, Y(37.4) - 5);
}

function grapheSimulation(cv, r) {
  const { x, w, h } = prepCanvas(cv);
  const m = { l: 34, r: 10, t: 10, b: 18 };
  const vmin = Math.min(-6, r.E2100 - 2), vmax = 46;
  const X = an => m.l + (an - 2025) / 75 * (w - m.l - m.r);
  const Y = v => h - m.b - (v - vmin) / (vmax - vmin) * (h - m.t - m.b);
  axes(x, w, h, m, [[Y(0), "0"], [Y(20), "20"], [Y(40), "40"]],
    [[X(2025), "2025"], [X(2050), "2050"], [X(2075), "2075"], [X(2100), "2100"]]);

  // budget 1,5 °C : surface équivalente sous la courbe
  x.fillStyle = "rgba(46,204,113,.12)";
  const budget = CADRE_PHYSIQUE.budgets[0].gt;
  const annesEq = budget / CADRE_PHYSIQUE.emissions2024;
  x.fillRect(m.l, Y(CADRE_PHYSIQUE.emissions2024), X(2025 + annesEq) - m.l, Y(0) - Y(CADRE_PHYSIQUE.emissions2024));
  x.fillStyle = "#45d69a"; x.font = "8.5px ui-monospace, monospace";
  x.textAlign = "left"; x.textBaseline = "top";
  x.fillText("budget 1,5 °C", m.l + 3, Y(CADRE_PHYSIQUE.emissions2024) + 3);

  // zéro
  x.strokeStyle = "rgba(255,255,255,.3)"; x.lineWidth = 1;
  x.beginPath(); x.moveTo(m.l, Y(0)); x.lineTo(w - m.r, Y(0)); x.stroke();

  // trajectoire
  x.beginPath();
  r.pts.forEach((p, i) => i ? x.lineTo(X(p[0]), Y(p[1])) : x.moveTo(X(p[0]), Y(p[1])));
  const coul = r.dT < 1.6 ? "#2ecc71" : r.dT < 2.1 ? "#a3d977" : r.dT < 2.8 ? "#f1c40f" : r.dT < 3.6 ? "#e67e22" : "#c0392b";
  x.strokeStyle = coul; x.lineWidth = 2.3; x.stroke();
  x.fillStyle = coul;
  r.pts.forEach(p => { x.beginPath(); x.arc(X(p[0]), Y(p[1]), 2.6, 0, 7); x.fill(); });

  if (r.netZero) {
    x.strokeStyle = "#fff"; x.setLineDash([3, 3]); x.beginPath();
    x.moveTo(X(r.netZero), m.t); x.lineTo(X(r.netZero), h - m.b); x.stroke(); x.setLineDash([]);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "top";
    x.fillText("net zéro " + r.netZero, X(r.netZero), m.t);
  }
}

/* =====================================================================
   10. PILOTAGE GESTUEL — MediaPipe Hand Landmarker
   Tout le traitement est local (WebAssembly dans le navigateur).
   ===================================================================== */
let handLandmarker = null, flux = null, boucleGestes = null;

async function basculerGestes(actif) {
  if (actif === S.gestes) return;
  if (!actif) {
    S.gestes = false;
    if (boucleGestes) cancelAnimationFrame(boucleGestes);
    if (flux) flux.getTracks().forEach(t => t.stop());
    flux = null;
    $("#camWrap").classList.add("hidden");
    $("#hudGestes").classList.add("hidden");
    $("#handCursor").classList.add("hidden");
    $("#btnGestes").classList.remove("actif");
    $("#btnGestes").textContent = "✋ Gestes";
    return;
  }
  const btn = $("#btnGestes");
  btn.textContent = "Chargement…";
  const etape = t => { btn.textContent = t; $("#chargeGeste") && ($("#chargeGeste").textContent = t); };
  try {
    if (!handLandmarker) {
      ouvrirModale(`<h2>Préparation du pilotage gestuel</h2>
        <p>Le modèle de détection de main (environ 8 Mo) est téléchargé une seule fois, puis mis en cache
        par le navigateur. Comptez une dizaine de secondes au premier lancement, puis c'est instantané.</p>
        <p style="font-family:var(--mono);font-size:12px;color:var(--vert)" id="chargeGeste">Téléchargement…</p>
        <p style="font-size:11.5px;color:#61748f">Le modèle s'exécute entièrement dans votre navigateur (WebAssembly).
        Aucune image de la caméra ne quitte votre machine.</p>`);
      etape("Téléchargement du moteur…");
      const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
      etape("Initialisation WebAssembly…");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      etape("Chargement du modèle de main…");
      const options = delegate => ({
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate,
        },
        numHands: 1, runningMode: "VIDEO",
        minHandDetectionConfidence: 0.55, minTrackingConfidence: 0.5,
      });
      try {
        handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, options("GPU"));
      } catch (e) {
        etape("GPU indisponible, bascule sur le processeur…");
        handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, options("CPU"));
      }
    }
    etape("Ouverture de la caméra…");
    flux = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
    const v = $("#cam");
    v.srcObject = flux;
    await v.play();
    $("#camWrap").classList.remove("hidden");
    $("#hudGestes").classList.remove("hidden");
    btn.classList.add("actif"); btn.textContent = "✋ Gestes actifs";
    S.gestes = true;
    S.autoRotation = false;
    boucleGeste();
    ouvrirAide("gestes");
  } catch (e) {
    console.error(e);
    btn.textContent = "✋ Gestes";
    ouvrirModale(`<h2>Caméra indisponible</h2>
      <p>${e.name === "NotAllowedError"
        ? "L'accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur pour ce site, puis réessayez."
        : "Impossible d'initialiser la détection de main : " + e.message}</p>
      <p>Le pilotage gestuel nécessite une connexion (le modèle est chargé depuis un CDN) et une page servie
      en <b>http://localhost</b> ou en HTTPS — les navigateurs bloquent la caméra sur <code>file://</code>.</p>
      <p>Toute l'application reste utilisable à la souris, au clavier et au doigt.</p>`);
  }
}

/* --- Analyse des 21 points de la main ---
   Principe : le geste est identifié par la FORME des doigts (lesquels sont tendus),
   jamais par la grandeur qui sert ensuite à piloter. Sans quoi, dès qu'on bouge pour
   agir, la détection décroche — c'était le défaut de la première version du zoom. */
function analyserMain(lm, gestePrecedent = "aucun") {
  const d = (a, b) => Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
  const taille = d(0, 9) || 0.001;                       // paume, pour normaliser
  const tendu = (tip, pip) => d(0, tip) > d(0, pip) * 1.12;
  const doigts = {
    index: tendu(8, 6), majeur: tendu(12, 10),
    annulaire: tendu(16, 14), auriculaire: tendu(20, 18),
  };
  const n = Object.values(doigts).filter(Boolean).length;
  const ecart = d(4, 8) / taille;                        // écartement pouce ↔ index
  const troisReplies = !doigts.majeur && !doigts.annulaire && !doigts.auriculaire;

  let geste = "aucun", conf = 0.5;
  if (n >= 4) { geste = "paume"; conf = 0.9; }
  else if (doigts.index && doigts.majeur && !doigts.annulaire && !doigts.auriculaire) { geste = "deux"; conf = 0.9; }
  else if (doigts.index && troisReplies) { geste = "pince"; conf = 0.85; }
  // Hystérésis : doigts complètement joints, l'index se replie et la main ressemble
  // à un poing. Tant qu'on venait du zoom et que le pouce reste collé à l'index,
  // on reste en zoom — sinon le geste décrocherait pile en butée basse.
  else if (gestePrecedent === "pince" && troisReplies && ecart < 0.6) { geste = "pince"; conf = 0.7; }
  else if (n === 0) { geste = "poing"; conf = 0.85; }

  return { geste, conf: clamp(conf, 0, 1), ecart, taille, paume: lm[9], index: lm[8], pouce: lm[4] };
}

/* Zoom en correspondance ABSOLUE : l'écartement pouce-index EST le niveau de zoom.
   Doigts joints = vue lointaine, doigts grands ouverts = vue rapprochée.
   Aucune dérive possible, aucun ancrage à perdre, aucune inversion. */
const ZOOM = { ecartMin: 0.22, ecartMax: 1.30, distLoin: 6.0, distPres: 1.6 };
function niveauZoom(ecart) { return clamp((ecart - ZOOM.ecartMin) / (ZOOM.ecartMax - ZOOM.ecartMin), 0, 1); }

const ARETES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

let hist = [], derniere = null, dernierTemps = 0;

function boucleGeste() {
  const v = $("#cam"), ov = $("#camOverlay");
  if (!S.gestes) return;
  boucleGestes = requestAnimationFrame(boucleGeste);
  if (v.readyState < 2) return;

  const t = performance.now();
  if (t - dernierTemps < 33) return;                    // ~30 fps suffisent
  dernierTemps = t;

  let res;
  try { res = handLandmarker.detectForVideo(v, t); } catch { return; }

  ov.width = v.videoWidth || 320; ov.height = v.videoHeight || 240;
  const c = ov.getContext("2d");
  c.clearRect(0, 0, ov.width, ov.height);

  if (!res.landmarks || !res.landmarks.length) {
    hist = []; derniere = null;
    majHUD("aucun", 0);
    $("#handCursor").classList.add("hidden");
    return;
  }

  const lm = res.landmarks[0];
  const a = analyserMain(lm, S.geste);

  // squelette
  c.strokeStyle = "rgba(69,214,154,.85)"; c.lineWidth = 2;
  for (const [i, j] of ARETES) {
    c.beginPath();
    c.moveTo(lm[i].x * ov.width, lm[i].y * ov.height);
    c.lineTo(lm[j].x * ov.width, lm[j].y * ov.height);
    c.stroke();
  }
  c.fillStyle = "#fff";
  lm.forEach(p => { c.beginPath(); c.arc(p.x * ov.width, p.y * ov.height, 2.6, 0, 7); c.fill(); });

  // hystérésis : 3 images cohérentes avant de changer de geste
  hist.push(a.geste); if (hist.length > 4) hist.shift();
  const stable = hist.length >= 3 && hist.slice(-3).every(g => g === a.geste);
  if (stable) S.geste = a.geste;
  majHUD(S.geste, a.conf);

  // curseur à l'écran (coordonnées miroir pour un ressenti naturel)
  const cx = (1 - a.index.x) * innerWidth, cy = a.index.y * innerHeight;
  const hc = $("#handCursor");
  hc.classList.remove("hidden");
  hc.style.left = cx + "px"; hc.style.top = cy + "px";
  hc.querySelector(".hc-label").textContent = LIBELLE_GESTE[S.geste] || "";

  const paumeX = 1 - a.paume.x, paumeY = a.paume.y;

  if (S.geste === "paume") {
    if (derniere) {
      // même convention qu'à la souris : la Terre suit la main
      cam.azim += (paumeX - derniere.x) * 5.2;
      cam.polar = clamp(cam.polar + (paumeY - derniere.y) * 4.4, 0.22, Math.PI - 0.22);
    }
    S.autoRotation = false;
    majZoomHUD(null);
  } else if (S.geste === "pince") {
    const f = niveauZoom(a.ecart);
    const cible = ZOOM.distLoin + f * (ZOOM.distPres - ZOOM.distLoin);
    cam.cibleDist += (cible - cam.cibleDist) * 0.18;     // lissage
    S.autoRotation = false;
    majZoomHUD(f);
  } else if (S.geste === "deux") {
    const p = clamp((paumeX - 0.15) / 0.7, 0, 1);
    if (S.lecture) basculerLecture(false);
    allerA(p);
    majZoomHUD(null);
  } else if (S.geste === "poing") {
    S.autoRotation = false;
    if (stable && hist.filter(g => g === "poing").length === 3) {
      // premier verrouillage : on cale sur le chapitre le plus proche
      allerA(anneeVersP(S.chapitre.annee), true);
    }
    majZoomHUD(null);
  } else majZoomHUD(null);

  derniere = { x: paumeX, y: paumeY };
}

const LIBELLE_GESTE = { paume: "rotation", pince: "zoom", deux: "temps", poing: "figé", aucun: "" };
const NOM_GESTE = { paume: "🖐 Main ouverte", pince: "🤏 Pouce + index", deux: "✌️ Deux doigts", poing: "✊ Poing", aucun: "— aucune main" };

function majHUD(g, conf) {
  $("#hudGeste").textContent = NOM_GESTE[g] || "—";
  $("#hudJauge").style.width = Math.round(conf * 100) + "%";
  $$("#hudGestes .hud-liste li").forEach(li => li.classList.toggle("on", li.dataset.g === g));
}

/** Règle de zoom affichée en direct : on voit où l'on est sur l'échelle. */
function majZoomHUD(f) {
  const bloc = $("#hudZoom");
  if (!bloc) return;
  if (f === null) { bloc.classList.add("hidden"); return; }
  bloc.classList.remove("hidden");
  $("#hudZoomCurseur").style.left = (f * 100) + "%";
  $("#hudZoomVal").textContent = f < 0.2 ? "vue lointaine" : f > 0.8 ? "vue rapprochée" : Math.round(f * 100) + " %";
}

/* =====================================================================
   11. NARRATION — synthèse vocale du navigateur (Web Speech API)
   Tout est local : aucune requête réseau, aucun texte envoyé nulle part.
   ===================================================================== */
const N = {
  actif: false, enPause: false, file: [], index: 0,
  chapitre: null, voix: null, vitesse: 0.84, gravite: 0.7, enchainer: false,
  veille: null, gen: 0,          // `gen` invalide les échos des énoncés annulés
  langue: "fr",
};

function voixDisponibles(langue = N.langue) {
  const p = langue === "en" ? /^en/i : /^fr/i;
  return speechSynthesis.getVoices().filter(v => p.test(v.lang));
}

/* Toutes les voix du navigateur ne se valent pas, et l'écart est énorme :
   - « Natural » / « Online » : voix neuronales de Microsoft Edge, gratuites,
     de très loin les meilleures. Elles n'existent que dans Edge.
   - « Google … » : voix réseau de Chrome, correctes, au-dessus du système.
   - le reste : voix locales du système, robotiques.
   On classe, on choisit la meilleure, et on affiche le niveau à l'utilisateur. */
function niveauVoix(v) {
  if (/natural|neural|online/i.test(v.name)) return 3;
  if (/^google/i.test(v.name)) return 2;
  return 1;
}
const NIVEAU_LIBELLE = { 3: "neuronale", 2: "réseau", 1: "système" };

/** Prénoms masculins des voix courantes : le registre voix off passe mieux. */
const VOIX_MASCULINES = /henri|paul|thierry|claude|guillaume|nicolas|rémy|remy|alain|yves|guy|christopher|brian|eric|davis|roger|steffan|tony|andrew|george|ryan|daniel|male\b/i;

function scoreVoix(v) {
  return niveauVoix(v) * 10
    + (VOIX_MASCULINES.test(v.name) ? 4 : 0)
    + (/fr-FR|en-GB|en-US/i.test(v.lang) ? 1 : 0);
}

function meilleureVoix(liste) {
  if (!liste.length) return null;
  return liste.slice().sort((a, b) => scoreVoix(b) - scoreVoix(a))[0];
}

function nomLisible(v) {
  return v.name
    .replace(/^Microsoft\s+/i, "").replace(/^Google\s+/i, "")
    .replace(/\s*Online\s*\(Natural\)\s*/i, " ").replace(/\s*-\s*(French|English).*$/i, "")
    .trim();
}

function remplirVoix() {
  const sel = $("#narVoix");
  if (!sel) return;
  const liste = voixDisponibles().sort((a, b) => scoreVoix(b) - scoreVoix(a));
  if (!liste.length) {
    sel.innerHTML = `<option>aucune voix ${N.langue === "en" ? "anglaise" : "française"}</option>`;
    $("#narConseil").innerHTML =
      `<span class="alerte">Aucune voix ${N.langue === "en" ? "anglaise" : "française"} dans ce navigateur.</span> ` +
      `Ouvrez la page dans <b>Microsoft Edge</b> : il fournit gratuitement des voix neuronales dans les deux langues, ` +
      `sans rien installer.`;
    return;
  }
  if (!N.voix || !liste.includes(N.voix)) N.voix = meilleureVoix(liste);
  sel.innerHTML = liste.map((v, i) =>
    `<option value="${i}" ${v === N.voix ? "selected" : ""}>${nomLisible(v)} · ${NIVEAU_LIBELLE[niveauVoix(v)]}</option>`).join("");
  sel.onchange = () => {
    N.voix = voixDisponibles().sort((a, b) => scoreVoix(b) - scoreVoix(a))[+sel.value];
    majConseilVoix(N.voix);
    if (N.actif) relancerDepuisIndex();
  };
  majConseilVoix(N.voix);
}

/** Dit honnêtement à l'utilisateur s'il peut faire mieux, et comment. */
function majConseilVoix(v) {
  const el = $("#narConseil");
  if (!el) return;
  if (!v) { el.textContent = ""; return; }
  const n = niveauVoix(v);
  if (n === 3) { el.innerHTML = `<span class="ok">Voix neuronale — la meilleure qualité gratuite disponible.</span>`; return; }
  const meilleuresAilleurs = /edg/i.test(navigator.userAgent)
    ? "" : " Microsoft Edge propose des voix neuronales gratuites nettement supérieures (Henri, Denise en français).";
  el.innerHTML = `Voix ${NIVEAU_LIBELLE[n]}.` + meilleuresAilleurs;
}

function narrationDuChapitre(ch, langue = N.langue) {
  if (langue === "en") return NARRATIONS_EN[ch.id] || NARRATIONS[ch.id] || ch.recit || [];
  return NARRATIONS[ch.id] || ch.recit || [];
}

/* --- Mise en bouche : le texte écrit n'est pas dit comme il est lu ---------
   « 37,4 GtCO₂ » se prononce « trente-sept virgule quatre G-t-C-O-deux » si on
   ne fait rien. On normalise les unités et les symboles avant de les envoyer
   à la synthèse, et on retire les références bibliographiques : elles restent
   à l'écran, mais les entendre épelées serait insupportable. */
const REMPLACEMENTS = [
  [/\s*\([^)]*(?:GIEC|IPCC|AR6|SPM|et al\.|Nature|Science|PNAS|ESSD)[^)]*\)/g, ""],
  [/<[^>]+>/g, " "],
  [/&nbsp;|&#160;/g, " "],
  [/CO₂-eq/g, "équivalent CO2"], [/CO₂/g, "CO2"], [/N₂O/g, "protoxyde d'azote"],
  [/CH₄/g, "méthane"], [/O₂/g, "oxygène"], [/¹³C|¹⁴C/g, "carbone"],
  [/GtCO2\b/g, " milliards de tonnes de CO2"], [/\bGtCO₂\b/g, " milliards de tonnes de CO2"],
  [/\bGt\b/g, " milliards de tonnes"], [/\bGt C\b/g, " milliards de tonnes de carbone"],
  [/\bppm\b/g, " parties par million"],
  [/\bGa\b/g, " milliards d'années"], [/\bMa\b/g, " millions d'années"], [/\bka\b/g, " milliers d'années"],
  [/°C/g, " degrés"], [/W\/m²/g, " watts par mètre carré"], [/km³/g, " kilomètres cubes"],
  [/km²/g, " kilomètres carrés"], [/\bkm\b/g, " kilomètres"], [/\bm\b(?=\s|$|\.)/g, " mètres"],
  [/≈|~/g, " environ "], [/±/g, " plus ou moins "], [/→/g, " vers "], [/×/g, " fois "],
  [/\s*%/g, " pour cent"], [/\$\/t/g, " dollars la tonne"], [/€/g, " euros"],
  [/[«»""]/g, ""], [/ /g, " "], [/—/g, ", "], [/·/g, ". "],
  [/\s{2,}/g, " "],
];
const REMPLACEMENTS_EN = [
  [/\s*\([^)]*(?:IPCC|AR6|SPM|et al\.|Nature|Science|PNAS|ESSD)[^)]*\)/g, ""],
  [/<[^>]+>/g, " "], [/&nbsp;/g, " "],
  [/CO₂-eq/g, "CO2 equivalent"], [/CO₂/g, "CO2"], [/CH₄/g, "methane"], [/O₂/g, "oxygen"],
  [/\bGtCO₂?\b/g, " billion tonnes of CO2"], [/\bGt\b/g, " billion tonnes"],
  [/\bppm\b/g, " parts per million"],
  [/\bGa\b/g, " billion years"], [/\bMa\b/g, " million years"], [/\bka\b/g, " thousand years"],
  [/°C/g, " degrees"], [/≈|~/g, " about "], [/±/g, " plus or minus "], [/×/g, " times "],
  [/\s*%/g, " percent"], [/[«»""]/g, ""], [/—/g, ", "], [/·/g, ". "], [/\s{2,}/g, " "],
];

function pourLaVoix(txt, langue = N.langue) {
  let t = String(txt);
  for (const [de, vers] of (langue === "en" ? REMPLACEMENTS_EN : REMPLACEMENTS)) t = t.replace(de, vers);
  return t.trim();
}

/* --- Construction de la file selon l'onglet actif ------------------------
   Les onglets Conséquences, Solutions et Idées reçues sont narrés à partir
   du contenu réellement affiché : la voix dit exactement ce qui est écrit,
   et rien ne peut se désynchroniser lors d'une mise à jour du contenu. */
function narrationStation(i) {
  const st = PARCOURS[i];
  const dediee = (NARRATION_PARCOURS[N.langue] || {})[st.id];
  if (dediee) return dediee;
  return [st.titre, st.phrase, ...st.points.map(p => p.t)].map(t => pourLaVoix(t));
}

function narrationConsequences() {
  const f = ["Conséquences observées et projetées du réchauffement."];
  for (const c of CONSEQUENCES) {
    f.push(`${c.titre}. ${c.chiffre} ${c.chiffreLabel}.`);
    c.points.forEach(p => f.push(p.t));
  }
  f.push("Impacts par région.");
  for (const r of REGIONS) { f.push(`${r.nom}.`); r.points.forEach(p => f.push(p)); }
  return f.map(t => pourLaVoix(t, "fr"));
}

function narrationSolutions() {
  const C = CADRE_PHYSIQUE;
  const f = [
    "Solutions. D'abord le cadre physique, ensuite les leviers.",
    "Une seule règle gouverne tout le reste : le réchauffement est proportionnel au CO2 cumulé émis depuis l'ère préindustrielle. Environ zéro virgule quarante-cinq degré par mille milliards de tonnes.",
    "Trois conséquences. Stabiliser la température exige d'atteindre le net zéro : réduire les émissions ne suffit pas, il faut les annuler. Chaque tonne compte, quelle que soit la date à laquelle elle est émise. Et il existe un budget carbone fini.",
    "Budget carbone restant au premier janvier deux mille vingt-cinq.",
  ];
  C.budgets.forEach(b => f.push(`Pour ${b.cible} : ${b.gt} milliards de tonnes, soit ${b.annees}.`));
  f.push("Les leviers, par ordre de potentiel.");
  LEVIERS.slice().sort((a, b) => b.potentiel - a.potentiel).forEach(l =>
    f.push(`${l.nom}. Potentiel de ${String(l.potentiel).replace(".", ",")} milliards de tonnes par an. ${l.note}`));
  f.push(FOCUS_CIMENT.intro);
  FOCUS_CIMENT.points.forEach(p => f.push(p.t));
  return f.map(t => pourLaVoix(t, "fr"));
}

function narrationIdees() {
  const f = ["Idées reçues, traitées sérieusement."];
  IDEES_RECUES.forEach(i => { f.push(i.q.replace(/[«»]/g, "")); f.push(i.r); });
  return f.map(t => pourLaVoix(t, "fr"));
}

function narrationMethode() {
  const f = ["Méthode et sources.", ...METHODE.principes];
  f.push("Ce que cette application ne fait pas.");
  f.push("Elle ne reconstitue pas les continents au-delà de neuf cents millions d'années : aucun modèle publié ne remonte plus loin.");
  f.push("Elle ne prédit pas l'avenir. Les scénarios sont des explorations conditionnelles.");
  return f.map(t => pourLaVoix(t, "fr"));
}

/** Onglets narrés uniquement en français, faute de contenu traduit. */
const ONGLETS_FR_SEULEMENT = ["consequences", "solutions", "idees", "methode"];

function fileNarration() {
  switch (S.mode) {
    case "parcours": return narrationStation(S.station);
    case "histoire": return narrationDuChapitre(S.chapitre);
    case "consequences": return narrationConsequences();
    case "solutions": return narrationSolutions();
    case "idees": return narrationIdees();
    default: return narrationMethode();
  }
}

/** Clé de ce qui est narré : sert à détecter qu'il faut relancer la voix. */
function cleNarration() {
  if (S.mode === "parcours") return "parcours:" + S.station;
  if (S.mode === "histoire") return "histoire:" + S.chapitre.id;
  return S.mode;
}

function changerLangue(langue) {
  if (langue === N.langue) return;
  N.langue = langue;
  N.voix = null;                                  // on rechoisit la meilleure voix de la langue
  $$(".nl-btn").forEach(b => b.classList.toggle("actif", b.dataset.langue === langue));
  remplirVoix();
  if (S.mode === "histoire") rendreContenu(true);
  if (N.actif) demarrerNarration();
}

function demarrerNarration() {
  N.cle = cleNarration();
  N.chapitre = S.chapitre;
  N.file = fileNarration();
  N.index = 0;
  N.enPause = false;
  $("#narPlay").textContent = "❚❚";
  majAvertissementLangue();
  dire();
}

/** Prévient quand l'onglet en cours n'existe pas dans la langue choisie. */
function majAvertissementLangue() {
  const el = $("#narConseil");
  if (!el) return;
  if (N.langue === "en" && ONGLETS_FR_SEULEMENT.includes(S.mode)) {
    el.innerHTML = `<span class="alerte">Cet onglet n'est narré qu'en français</span> — son contenu n'est pas encore traduit. ` +
      `Le parcours guidé et les 17 chapitres, eux, existent dans les deux langues.`;
  } else {
    majConseilVoix(N.voix);
  }
}

function dire() {
  const gen = ++N.gen;                       // toute reprise invalide la précédente
  speechSynthesis.cancel();
  if (!N.actif || N.index >= N.file.length) { finChapitre(); return; }
  const texte = N.file[N.index];
  afficherSousTitre(texte);
  const u = new SpeechSynthesisUtterance(texte);
  if (N.voix) { u.voice = N.voix; u.lang = N.voix.lang; }
  else u.lang = N.langue === "en" ? "en-GB" : "fr-FR";
  u.rate = N.vitesse; u.pitch = N.gravite; u.volume = 1;
  const suivant = () => {
    if (gen !== N.gen || !N.actif || N.enPause) return;
    N.index++;
    // une respiration entre les phrases : c'est ce qui fait le ton documentaire
    setTimeout(() => { if (gen === N.gen && N.actif && !N.enPause) dire(); }, 620);
  };
  u.onend = suivant;
  u.onerror = e => { if (e.error !== "interrupted" && e.error !== "canceled") suivant(); };
  // Chrome peut ignorer un speak() émis dans la foulée immédiate d'un cancel()
  setTimeout(() => { if (gen === N.gen && N.actif && !N.enPause) speechSynthesis.speak(u); }, 60);
}

function relancerDepuisIndex() { if (N.actif) dire(); }

function finChapitre() {
  if (!N.actif) return;
  if (N.enchainer) {
    // en parcours, on enchaîne les étapes ; en histoire, les chapitres
    if (S.mode === "parcours" && S.station < PARCOURS.length - 1) {
      afficherSousTitre("…");
      setTimeout(() => { if (N.actif) { allerStation(S.station + 1); demarrerNarration(); } }, 2000);
      return;
    }
    if (S.mode === "histoire") {
      const i = CHAPITRES.indexOf(S.chapitre);
      if (i < CHAPITRES.length - 1) {
        afficherSousTitre("…");
        setTimeout(() => {
          if (!N.actif) return;
          allerA(anneeVersP(CHAPITRES[i + 1].annee), true);
          demarrerNarration();
        }, 2200);
        return;
      }
    }
  }
  afficherSousTitre(S.mode === "parcours"
    ? "Fin de l'étape. Passez à la suivante, ou activez « enchaîner »."
    : "Fin de la lecture. Choisissez un autre onglet ou chapitre.");
  $("#narPlay").textContent = "▶";
  N.enPause = true;
}

function afficherSousTitre(t) {
  const el = $("#narTexte");
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = t; el.style.opacity = 1; }, 130);
}

function basculerNarration(actif) {
  if (actif === N.actif) return;
  const btn = $("#btnNarration");
  if (!actif) {
    N.actif = false;
    speechSynthesis.cancel();
    clearInterval(N.veille);
    $("#narration").classList.add("hidden");
    btn.classList.remove("actif");
    btn.textContent = "🎙 Narration";
    return;
  }
  if (!("speechSynthesis" in window)) {
    ouvrirModale(`<h2>Synthèse vocale indisponible</h2>
      <p>Ce navigateur ne propose pas d'API de synthèse vocale. Les textes de narration restent
      lisibles dans le panneau de droite, sous « Le récit, à voix haute ».</p>`);
    return;
  }
  N.actif = true;
  remplirVoix();
  $("#narration").classList.remove("hidden");
  btn.classList.add("actif");
  btn.textContent = "🎙 En cours";
  // Chrome interrompt les énoncés longs : on relance la file toutes les dix secondes
  clearInterval(N.veille);
  N.veille = setInterval(() => {
    if (N.actif && !N.enPause && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause(); speechSynthesis.resume();
    }
  }, 9000);
  demarrerNarration();
}

function initNarration() {
  $("#btnNarration").onclick = () => basculerNarration(!N.actif);
  $("#narStop").onclick = () => basculerNarration(false);
  $("#narPlay").onclick = () => {
    N.enPause = !N.enPause;
    $("#narPlay").textContent = N.enPause ? "▶" : "❚❚";
    if (N.enPause) { N.gen++; speechSynthesis.cancel(); }
    else { if (N.index >= N.file.length) N.index = 0; dire(); }
  };
  $("#narSuite").onchange = e => { N.enchainer = e.target.checked; };
  $$(".nl-btn").forEach(b => b.onclick = () => changerLangue(b.dataset.langue));
  $("#narVitesse").oninput = e => { N.vitesse = +e.target.value; if (N.actif && !N.enPause) dire(); };
  $("#narGrave").oninput = e => { N.gravite = +e.target.value; if (N.actif && !N.enPause) dire(); };
  if ("speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = remplirVoix;
    remplirVoix();
  }
}

/** La narration suit ce qui est affiché : changement de chapitre, d'étape ou d'onglet. */
function narrationSuit() {
  if (N.actif && cleNarration() !== N.cle) demarrerNarration();
}

/* =====================================================================
   12. MESURE D'AUDIENCE ET RETOURS DES VISITEURS
   Deux services optionnels, désactivés tant que CONFIG n'est pas rempli.
   Le choix de GoatCounter n'est pas anodin : pas de cookie, pas
   d'identifiant persistant, pas de données personnelles collectées. C'est
   ce qui permet de mesurer l'audience sans bandeau de consentement.
   ===================================================================== */
let audienceActive = false;
const filAudience = [];               // les vues précèdent le chargement du script

function initAudience() {
  const code = (CONFIG.audience || "").trim();
  if (!code) return;
  const s = document.createElement("script");
  s.async = true;
  s.dataset.goatcounter = code.replace(/\/$/, "") + "/count";
  s.src = "//gc.zgo.at/count.js";
  s.onload = () => {
    audienceActive = true;
    // on rejoue ce qui s'est produit pendant le chargement, sans quoi la
    // toute première étape du parcours ne serait jamais comptée
    while (filAudience.length) { const e = filAudience.shift(); tracer(e[0], e[1]); }
  };
  s.onerror = () => { filAudience.length = 0; };   // bloqueur de pub : on abandonne sans bruit
  document.head.appendChild(s);
}

/** Enregistre une étape franchie. Sert à voir où les visiteurs décrochent. */
function tracer(chemin, titre) {
  if (!(CONFIG.audience || "").trim()) return;
  if (!audienceActive || !window.goatcounter || !window.goatcounter.count) {
    if (filAudience.length < 30) filAudience.push([chemin, titre]);
    return;
  }
  try { window.goatcounter.count({ path: chemin, title: titre, event: true }); } catch (e) { /* jamais bloquant */ }
}

let dernierTrace = "";
function tracerVue() {
  const cle = cleNarration();
  if (cle === dernierTrace) return;
  dernierTrace = cle;
  if (S.mode === "parcours") tracer("parcours-etape-" + (S.station + 1), "Parcours : " + PARCOURS[S.station].numero);
  else if (S.mode === "histoire") tracer("chapitre-" + S.chapitre.id, "Chapitre : " + S.chapitre.titre);
  else tracer("onglet-" + S.mode, "Onglet : " + S.mode);
}

/* ---------- Formulaire de retour ---------- */
function ouvrirRetour() {
  const sansService = !(CONFIG.retourCle || "").trim();
  ouvrirModale(`
    <h2>Votre avis m'intéresse</h2>
    <p>Cette application est en construction. Ce qui est confus, faux, trop long ou manquant :
    dites-le, c'est exactement ce qui la fera progresser.</p>
    <form id="formRetour" class="retour-form">
      <label class="retour-lab">Votre message</label>
      <textarea id="retourMessage" rows="6" required
        placeholder="Ce que vous avez compris, ce qui vous a perdu, ce qui manque…"></textarea>
      <label class="retour-lab">Votre nom ou votre courriel <span>facultatif, seulement si vous souhaitez une réponse</span></label>
      <input id="retourContact" type="text" placeholder="facultatif" autocomplete="off">
      <div class="retour-ctx" id="retourCtx"></div>
      <button type="submit" class="retour-envoyer" id="retourEnvoyer">Envoyer</button>
      <div class="retour-etat" id="retourEtat"></div>
      <p class="retour-vie-privee">
        ${sansService
          ? "Ce bouton ouvrira votre logiciel de messagerie avec le texte pré-rempli : rien n'est transmis sans que vous validiez l'envoi."
          : "Votre message est transmis directement à l'auteur. Aucun compte, aucun cookie, aucun suivi. Les coordonnées que vous laissez sont facultatives et ne servent qu'à vous répondre."}
      </p>
    </form>`);

  // on joint le contexte de lecture : savoir d'où vient la remarque aide beaucoup
  const ctx = S.mode === "parcours" ? `étape ${S.station + 1} du parcours`
            : S.mode === "histoire" ? `chapitre « ${S.chapitre.titre} »`
            : `onglet ${S.mode}`;
  $("#retourCtx").textContent = `Envoyé depuis : ${ctx}`;

  $("#formRetour").onsubmit = e => { e.preventDefault(); envoyerRetour(ctx); };
}

async function envoyerRetour(contexte) {
  const message = $("#retourMessage").value.trim();
  if (!message) return;
  const contact = $("#retourContact").value.trim();
  const etat = $("#retourEtat"), bouton = $("#retourEnvoyer");
  const cle = (CONFIG.retourCle || "").trim();

  // sans service configuré : on ouvre le logiciel de courriel du visiteur
  if (!cle) {
    const corps = encodeURIComponent(`${message}\n\n— ${contact || "anonyme"}\n(${contexte})`);
    location.href = `mailto:${courrielAuteur()}?subject=${encodeURIComponent("Retour sur CLIMAT")}&body=${corps}`;
    etat.innerHTML = `<span class="ok">Votre logiciel de messagerie devrait s'ouvrir. Merci !</span>`;
    return;
  }

  bouton.disabled = true; bouton.textContent = "Envoi…";
  etat.textContent = "";
  try {
    const web3 = CONFIG.retourType !== "formspree";
    const url = web3 ? "https://api.web3forms.com/submit" : cle;
    const corps = web3
      ? { access_key: cle, subject: "Retour sur CLIMAT", from_name: "CLIMAT",
          message, contact: contact || "non renseigné", contexte }
      : { message, contact: contact || "non renseigné", contexte };
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(corps),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    etat.innerHTML = `<span class="ok">Message envoyé. Merci — c'est précieux.</span>`;
    $("#retourMessage").value = "";
    bouton.textContent = "Envoyé";
    tracer("retour-envoye", "Retour envoyé");
  } catch (err) {
    bouton.disabled = false; bouton.textContent = "Envoyer";
    const corps = encodeURIComponent(`${message}\n\n— ${contact || "anonyme"}\n(${contexte})`);
    etat.innerHTML = `<span class="alerte">L'envoi a échoué (${err.message}).</span> ` +
      `<a href="mailto:${courrielAuteur()}?subject=Retour%20sur%20CLIMAT&body=${corps}">Envoyer par courriel à la place</a>`;
  }
}

/* =====================================================================
   13. AIDE
   ===================================================================== */
function ouvrirModale(html) {
  $("#modaleContenu").innerHTML = html;
  $("#modale").classList.remove("hidden");
}

function ouvrirAide(section) {
  ouvrirModale(`
    <h2>Comment utiliser cette application</h2>
    <p>Tout est pilotable de trois façons : à la souris, au clavier, ou à la main devant la caméra.
    Aucune n'est obligatoire — les gestes sont un supplément, jamais un passage obligé.</p>

    <h3>Les quatre gestes</h3>
    <div class="geste-carte"><div class="geste-emoji">🖐</div><div>
      <div class="geste-nom">Main ouverte — tourner la Terre</div>
      <div class="geste-desc">Ouvrez la paume face à la caméra et déplacez la main. Le globe suit le mouvement.</div></div></div>
    <div class="geste-carte"><div class="geste-emoji">🤏</div><div>
      <div class="geste-nom">Pouce + index seuls — zoomer</div>
      <div class="geste-desc">Tendez l'index et repliez les trois autres doigts. L'écartement entre le pouce et
      l'index <b>est</b> le niveau de zoom : doigts joints = vue lointaine, doigts grands ouverts = vue rapprochée.
      La correspondance est absolue, donc il n'y a jamais d'inversion : votre main indique directement où vous voulez être.
      Une jauge s'affiche pendant le geste.</div></div></div>
    <div class="geste-carte"><div class="geste-emoji">✌️</div><div>
      <div class="geste-nom">Deux doigts — voyager dans le temps</div>
      <div class="geste-desc">Index et majeur tendus : la position horizontale de la main devient la position sur la frise.
      À gauche l'Hadéen, à droite 2100.</div></div></div>
    <div class="geste-carte"><div class="geste-emoji">✊</div><div>
      <div class="geste-nom">Poing fermé — figer</div>
      <div class="geste-desc">Verrouille la vue et cale la frise sur le chapitre le plus proche.</div></div></div>
    <p style="font-size:11.5px;color:#61748f">La détection tourne entièrement dans votre navigateur (WebAssembly).
    Aucune image n'est envoyée nulle part. Bonne lumière + fond dégagé = détection nettement plus stable.</p>

    <h3>La narration</h3>
    <p>Le bouton <b>🎙 Narration</b> lit le chapitre en cours à voix haute, dans un registre de voix off
    documentaire, avec les sous-titres au bas de l'écran. Vous pouvez choisir la voix, la langue
    (<b>français ou anglais</b>), ralentir le débit et baisser la hauteur. Cochez <b>enchaîner</b> pour
    dérouler toute l'histoire, de l'Hadéen à 2100, sans rien toucher.</p>
    <p><b>Pour la meilleure qualité de voix, ouvrez cette page dans Microsoft Edge.</b> Edge donne accès
    gratuitement à des voix neuronales — Henri et Denise en français, une large gamme en anglais — nettement
    supérieures aux voix intégrées à Windows, et sans rien installer. Chrome propose les voix « Google »,
    de qualité intermédiaire. Le sélecteur indique le niveau de chaque voix : <i>neuronale</i>,
    <i>réseau</i> ou <i>système</i>.</p>
    <p>La narration anglaise existe pour une raison simple et assumée : les voix de synthèse anglaises sont
    plus nombreuses et plus abouties que les françaises. Le contenu et les sources sont identiques —
    c'est un choix de qualité sonore, pas de fond.</p>
    <p>Voyager dans le temps pendant la lecture change le chapitre narré : la voix suit le voyage.
    Tout se passe dans le navigateur, aucun texte n'est envoyé nulle part.</p>

    <h3>Souris et tactile</h3>
    <p>Glisser sur le globe pour le tourner · molette ou pincement à deux doigts pour zoomer ·
    cliquer-glisser sur la frise pour voyager dans le temps · cliquer un chapitre à gauche ou une région à droite.</p>

    <h3>Clavier</h3>
    <p><kbd>←</kbd> <kbd>→</kbd> chapitre précédent / suivant · <kbd>Espace</kbd> lecture automatique ·
    <kbd>+</kbd> <kbd>−</kbd> zoom · <kbd>1</kbd>–<kbd>5</kbd> changer d'onglet · <kbd>G</kbd> gestes ·
    <kbd>N</kbd> narration · <kbd>?</kbd> cette aide · <kbd>Échap</kbd> fermer.</p>

    <h3>Lire les données</h3>
    <p>Chaque chiffre porte une source, et chaque série un statut de fiabilité :
    <span class="badge mesure">Mesure directe</span> <span class="badge carotte">Carotte de glace</span>
    <span class="badge proxy">Proxy</span> <span class="badge modele">Projection</span>.
    Les températures sont toujours des écarts par rapport à la période 1850-1900.
    Le détail de la méthode est dans l'onglet <b>Méthode &amp; sources</b>.</p>
  `);
}
