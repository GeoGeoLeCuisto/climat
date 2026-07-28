/* =====================================================================
   CLIMAT — 4,54 milliards d'années
   data.js : toutes les données scientifiques de l'application.

   RÈGLE ABSOLUE DU PROJET : zéro donnée inventée.
   Chaque valeur porte une source. Chaque courbe porte un statut :
     - "mesure"        : instrument (thermomètre, spectromètre, satellite)
     - "carotte"       : mesure directe de l'air piégé dans la glace
     - "proxy"         : reconstruction indirecte (isotopes, paléosols...)
     - "modele"        : sortie de modèle / projection
     - "schema"        : représentation illustrative explicitement simplifiée
   Quand la littérature donne une fourchette, on affiche la fourchette.
   ===================================================================== */

export const META = {
  titre: "CLIMAT",
  sousTitre: "4,54 milliards d'années en un geste",
  version: "1.0",
  majDonnees: "Données arrêtées aux publications disponibles début 2025",
  avertissementChamp:
    "Le champ de couleur reste un modèle zonal simplifié, pas une carte de données — voir « Méthode ».",
};

/* ---------------------------------------------------------------------
   1. AXE DU TEMPS
   Échelle logarithmique par morceaux : on veut voir 4,5 Ga ET 1850-2025.
   `age` = années avant 2025.
   ------------------------------------------------------------------- */
export const ANCRES_TEMPS = [
  { p: 0.00, age: 4.54e9 },
  { p: 0.26, age: 5.41e8 },   // base du Cambrien
  { p: 0.44, age: 6.6e7 },    // limite Crétacé–Paléogène
  { p: 0.57, age: 2.58e6 },   // début du Quaternaire
  { p: 0.69, age: 1.17e4 },   // début de l'Holocène
  { p: 0.82, age: 275 },      // 1750
  { p: 0.95, age: 0 },        // 2025
];
export const FUTUR = { pDebut: 0.95, anneeDebut: 2025, anneeFin: 2100 };

export function pVersAnnee(p) {
  p = Math.max(0, Math.min(1, p));
  if (p >= FUTUR.pDebut) {
    const f = (p - FUTUR.pDebut) / (1 - FUTUR.pDebut);
    return FUTUR.anneeDebut + f * (FUTUR.anneeFin - FUTUR.anneeDebut);
  }
  for (let i = 0; i < ANCRES_TEMPS.length - 1; i++) {
    const a = ANCRES_TEMPS[i], b = ANCRES_TEMPS[i + 1];
    if (p >= a.p && p <= b.p) {
      const f = (p - a.p) / (b.p - a.p);
      const la = Math.log10(a.age + 1), lb = Math.log10(b.age + 1);
      const age = Math.pow(10, la + f * (lb - la)) - 1;
      return 2025 - age;
    }
  }
  return 2025;
}

export function anneeVersP(annee) {
  if (annee >= FUTUR.anneeDebut) {
    const f = (annee - FUTUR.anneeDebut) / (FUTUR.anneeFin - FUTUR.anneeDebut);
    return FUTUR.pDebut + Math.max(0, Math.min(1, f)) * (1 - FUTUR.pDebut);
  }
  const age = 2025 - annee;
  for (let i = 0; i < ANCRES_TEMPS.length - 1; i++) {
    const a = ANCRES_TEMPS[i], b = ANCRES_TEMPS[i + 1];
    if (age <= a.age && age >= b.age) {
      const la = Math.log10(a.age + 1), lb = Math.log10(b.age + 1);
      const f = (Math.log10(age + 1) - la) / (lb - la);
      return a.p + f * (b.p - a.p);
    }
  }
  return 0;
}

export function formatAnnee(annee) {
  const age = 2025 - annee;
  if (age > 1e9) return (age / 1e9).toFixed(2).replace('.', ',') + " milliards d'années";
  if (age > 1e6) return Math.round(age / 1e6) + " millions d'années";
  if (age > 12000) return Math.round(age / 1000) + " 000 ans avant nous";
  if (age > 200) {
    if (annee < 0) return Math.abs(Math.round(annee)) + " av. J.-C.";
    return "an " + Math.round(annee);
  }
  return String(Math.round(annee));
}

/* ---------------------------------------------------------------------
   2. LES CHAPITRES — le récit
   co2      : ppm (valeur centrale) + fourchette [min,max] quand connue
   tAnom    : température globale, écart au niveau préindustriel (1850-1900), °C
   mer      : niveau marin relatif à aujourd'hui, mètres
   statut   : qualité de la donnée
   ------------------------------------------------------------------- */
export const CHAPITRES = [
  {
    id: "hadeen",
    ere: "Hadéen",
    titre: "La Terre en fusion",
    annee: 2025 - 4.45e9,
    plage: [2025 - 4.54e9, 2025 - 4.0e9],
    couleur: "#ff6b3d",
    co2: 100000, co2Plage: [10000, 300000], tAnom: 60, tAnomPlage: [0, 200], mer: null,
    statut: "proxy",
    accroche: "Pas d'oxygène, pas de continents stables, un Soleil pâle — et pourtant de l'eau liquide.",
    recit: [
      "La Terre se forme il y a 4,54 milliards d'années par accrétion de poussières et de planétésimaux. " +
      "Vers 4,5 Ga, l'impact d'un corps de la taille de Mars (Théia) arrache la matière qui formera la Lune " +
      "et refond la surface : la planète est un océan de magma.",
      "L'atmosphère primitive, dégazée par le volcanisme, est faite de CO₂, d'azote, de vapeur d'eau, " +
      "de méthane et de composés soufrés. Il n'y a pratiquement pas d'oxygène libre. " +
      "La pression de CO₂ se compte peut-être en dizaines de fois la pression atmosphérique actuelle.",
      "Point capital pour la suite de l'histoire : le Soleil ne rayonnait alors qu'environ 70 % de sa " +
      "puissance actuelle. Sans un effet de serre massif, la Terre aurait dû être une boule de glace. " +
      "Les zircons de Jack Hills (Australie), datés jusqu'à 4,4 Ga, montrent pourtant la présence d'eau " +
      "liquide. C'est le « paradoxe du Soleil jeune faible ». La réponse tient en trois lettres : CO₂.",
    ],
    faits: [
      { t: "Âge de la Terre : 4,54 ± 0,05 milliard d'années", s: "Datation Pb-Pb, Patterson 1956 ; révisions ultérieures" },
      { t: "Luminosité solaire à 4 Ga : ≈ 70 % de l'actuelle", s: "Sagan & Mullen 1972, Science ; modèles d'évolution stellaire" },
      { t: "Eau liquide attestée dès 4,4 Ga", s: "Zircons de Jack Hills, Wilde et al. 2001, Nature" },
    ],
    geo: "Pas de continents au sens moderne. Croûte basaltique instable, bombardement météoritique intense.",
    marqueurs: [{ nom: "Zircons de Jack Hills", lat: -26.1, lon: 117.4, note: "Plus vieux minéraux terrestres connus (4,4 Ga)" }],
  },

  {
    id: "archeen",
    ere: "Archéen",
    titre: "La vie apparaît, le thermostat se met en marche",
    annee: 2025 - 3.2e9,
    plage: [2025 - 4.0e9, 2025 - 2.5e9],
    couleur: "#e8913c",
    co2: 10000, co2Plage: [2000, 50000], tAnom: 15, tAnomPlage: [0, 40], mer: null,
    statut: "proxy",
    accroche: "Le premier régulateur climatique de la planète n'est ni un traité ni une technologie : c'est la roche.",
    recit: [
      "Les premières traces de vie remontent à au moins 3,5 milliards d'années (stromatolites de Pilbara, " +
      "Australie). La vie est microbienne, anaérobie, et l'atmosphère reste dépourvue d'oxygène libre.",
      "C'est à cette époque qu'on identifie le mécanisme qui a maintenu la Terre habitable pendant " +
      "4 milliards d'années : le cycle des silicates. Le CO₂ atmosphérique se dissout dans la pluie, " +
      "attaque les roches silicatées, et le carbone finit piégé dans les carbonates au fond des océans. " +
      "Or cette altération s'accélère quand il fait chaud et humide, et ralentit quand il fait froid.",
      "C'est un thermostat à rétroaction négative : plus il fait chaud, plus le CO₂ est retiré ; " +
      "plus il fait froid, plus le CO₂ s'accumule (le volcanisme continue d'en émettre). " +
      "Ce thermostat fonctionne — mais son temps de réponse se compte en centaines de milliers d'années. " +
      "Retenez ce chiffre : c'est la raison pour laquelle il ne nous sauvera pas.",
    ],
    faits: [
      { t: "Traces de vie ≥ 3,5 Ga (stromatolites)", s: "Pilbara, Australie ; Van Kranendonk et al." },
      { t: "Thermostat des silicates : temps de réponse ~10⁵–10⁶ ans", s: "Walker, Hays & Kasting 1981, JGR" },
      { t: "Atmosphère anoxique : O₂ < 0,001 % de l'actuel", s: "Fractionnement isotopique du soufre indépendant de la masse" },
    ],
    geo: "Premiers cratons continentaux. Océans globaux, très peu de terres émergées.",
    marqueurs: [{ nom: "Pilbara", lat: -21.0, lon: 119.5, note: "Stromatolites fossiles, ~3,5 Ga" }],
  },

  {
    id: "goe",
    ere: "Paléoprotérozoïque",
    titre: "La Grande Oxydation — la première crise climatique causée par le vivant",
    annee: 2025 - 2.35e9,
    plage: [2025 - 2.45e9, 2025 - 2.2e9],
    couleur: "#5fbf9b",
    co2: 3000, co2Plage: [1000, 10000], tAnom: -8, tAnomPlage: [-15, 0], mer: null,
    statut: "proxy",
    accroche: "Des bactéries changent la composition de l'atmosphère et gèlent la planète. Ça vous rappelle quelque chose ?",
    recit: [
      "Les cyanobactéries inventent la photosynthèse oxygénique. Pendant des centaines de millions d'années, " +
      "l'oxygène produit est consommé par l'oxydation du fer dissous dans les océans — d'où les gigantesques " +
      "formations de fer rubané (les mines de fer d'aujourd'hui). Puis les puits saturent.",
      "Entre 2,45 et 2,2 Ga, l'oxygène s'accumule dans l'atmosphère : c'est la Grande Oxydation. " +
      "Conséquence climatique brutale : l'oxygène détruit le méthane atmosphérique, qui était un gaz à " +
      "effet de serre majeur. L'effet de serre s'effondre.",
      "Résultat : les glaciations huroniennes, parmi les plus longues et les plus sévères de l'histoire " +
      "terrestre. C'est le premier exemple documenté d'une forme de vie qui modifie l'atmosphère globale " +
      "au point de bouleverser le climat. Ce n'est pas le dernier.",
    ],
    faits: [
      { t: "Grande Oxydation : 2,45–2,20 Ga", s: "Disparition du fractionnement soufre indépendant de la masse ; Farquhar et al. 2000" },
      { t: "Glaciations huroniennes : ~2,45–2,22 Ga, jusqu'aux basses latitudes", s: "Formation de Gowganda, Ontario" },
      { t: "Mécanisme : effondrement de l'effet de serre du CH₄", s: "Kopp et al. 2005, PNAS" },
    ],
    geo: "Supercontinent Kenorland en fragmentation. Dépôts de fer rubané à l'échelle mondiale.",
    marqueurs: [{ nom: "Bassin huronien", lat: 46.5, lon: -81.5, note: "Dépôts glaciaires de 2,4 Ga" }],
  },

  {
    id: "snowball",
    ere: "Cryogénien",
    titre: "Terre boule de neige",
    annee: 2025 - 6.8e8,
    plage: [2025 - 7.2e8, 2025 - 6.35e8],
    couleur: "#8fd3f4",
    co2: 300, co2Plage: [150, 1000], tAnom: -35, tAnomPlage: [-50, -20], mer: -100,
    statut: "proxy",
    accroche: "De la glace jusqu'à l'équateur. Et la sortie de crise : 10 millions d'années d'accumulation de CO₂.",
    recit: [
      "Deux épisodes majeurs : la glaciation sturtienne (≈717–660 Ma) et la glaciation marinoenne " +
      "(≈650–635 Ma). Des dépôts glaciaires sont retrouvés à des paléolatitudes tropicales. " +
      "L'hypothèse « Snowball Earth » propose une Terre englacée d'un pôle à l'autre, ou presque.",
      "Le mécanisme d'emballement est la rétroaction de l'albédo : la glace réfléchit la lumière, " +
      "donc refroidit, donc étend la glace. Une fois passé un seuil, le système bascule tout seul. " +
      "C'est le prototype du point de bascule climatique.",
      "La sortie est encore plus instructive. Sous la glace, l'altération des roches s'arrête : le puits " +
      "de CO₂ est débranché. Mais les volcans, eux, continuent d'émettre. Le CO₂ s'accumule pendant des " +
      "millions d'années jusqu'à atteindre peut-être 10 % de l'atmosphère (~0,1 bar), et l'effet de serre " +
      "finit par faire fondre la glace — en quelques milliers d'années, dans un climat de serre extrême.",
      "Leçon : le thermostat de la Terre fonctionne. Mais il opère sur des durées géologiques, et il " +
      "peut passer par des états que nulle civilisation ne pourrait traverser.",
    ],
    faits: [
      { t: "Sturtien : 717–660 Ma — la plus longue glaciation connue", s: "Rooney et al. 2015, Geology" },
      { t: "Glace à des paléolatitudes < 10°", s: "Hoffman et al. 1998, Science — hypothèse Snowball Earth" },
      { t: "Sortie : accumulation de CO₂ volcanique jusqu'à ~0,1 bar", s: "Hoffman & Schrag 2002, Terra Nova" },
    ],
    geo: "Supercontinent Rodinia en fragmentation, majoritairement en position tropicale — ce qui favorise l'altération et le refroidissement.",
    marqueurs: [{ nom: "Namibie — formation d'Otavi", lat: -19.5, lon: 15.5, note: "Carbonates de cap post-glaciaires" }],
  },

  {
    id: "paleozoique",
    ere: "Cambrien → Dévonien",
    titre: "Les plantes conquièrent les continents et refroidissent la planète",
    annee: 2025 - 4.2e8,
    plage: [2025 - 5.41e8, 2025 - 3.59e8],
    couleur: "#7fbf4f",
    co2: 2500, co2Plage: [1000, 6000], tAnom: 8, tAnomPlage: [4, 14], mer: 100,
    statut: "proxy",
    accroche: "Le vivant redevient un acteur géologique — cette fois en pompant le CO₂.",
    recit: [
      "Au Cambrien (541 Ma), la vie animale explose en diversité. Le CO₂ atmosphérique est très élevé, " +
      "probablement plus de 4000 ppm : le Soleil est encore moins lumineux qu'aujourd'hui, et un fort " +
      "effet de serre est nécessaire.",
      "Puis, au Silurien et surtout au Dévonien (~420–360 Ma), les plantes colonisent les continents et " +
      "développent des racines et du bois. Deux effets se cumulent : les racines accélèrent massivement " +
      "l'altération chimique des roches (le puits de CO₂), et la matière organique commence à s'enfouir " +
      "en grande quantité.",
      "Le CO₂ chute d'un ordre de grandeur en quelques dizaines de millions d'années. La planète se " +
      "refroidit. C'est l'un des plus grands transferts de carbone de l'histoire — et il a duré " +
      "50 millions d'années.",
    ],
    faits: [
      { t: "CO₂ cambrien : plusieurs milliers de ppm", s: "Foster, Royer & Lunt 2017, Nature Communications (compilation 420 Ma)" },
      { t: "Colonisation végétale des continents : Silurien–Dévonien", s: "Registre fossile ; Algeo & Scheckler 1998" },
      { t: "Chute du CO₂ liée à l'altération accélérée par les racines", s: "Modèle GEOCARB, Berner 2006, GCA" },
    ],
    geo: "Gondwana au sud, Laurussia à l'équateur. Vastes mers épicontinentales.",
    marqueurs: [{ nom: "Schistes de Burgess", lat: 51.4, lon: -116.5, note: "Faune cambrienne, 508 Ma" }],
  },

  {
    id: "carbonifere",
    ere: "Carbonifère – Permien",
    titre: "Le charbon se forme. Nous le brûlons aujourd'hui.",
    annee: 2025 - 3.1e8,
    plage: [2025 - 3.59e8, 2025 - 2.52e8],
    couleur: "#3f7d3f",
    co2: 350, co2Plage: [200, 600], tAnom: -2, tAnomPlage: [-5, 2], mer: -50,
    statut: "proxy",
    accroche: "Chaque litre d'essence brûlé aujourd'hui remonte du carbone enfoui il y a 300 millions d'années.",
    recit: [
      "Le Carbonifère porte bien son nom. Des forêts marécageuses immenses enfouissent des quantités " +
      "colossales de carbone organique. L'oxygène atmosphérique grimpe jusqu'à environ 30–35 % " +
      "(contre 21 % aujourd'hui) — d'où les insectes géants.",
      "Le CO₂ atmosphérique tombe à des niveaux comparables aux niveaux préindustriels, autour de " +
      "300 ppm. La planète bascule dans un long épisode glaciaire : la glaciation du Paléozoïque tardif, " +
      "avec des calottes sur le Gondwana (l'actuelle Afrique du Sud, l'Inde, l'Australie, l'Antarctique).",
      "Voici le point central de toute l'histoire moderne du climat : les gisements de charbon, puis " +
      "de pétrole et de gaz que nous exploitons, sont du carbone que la biosphère a mis des dizaines " +
      "de millions d'années à retirer de l'atmosphère. Nous le remettons en circulation en deux siècles. " +
      "Le rapport des vitesses est de l'ordre de 100 000 pour 1.",
    ],
    faits: [
      { t: "O₂ atmosphérique : jusqu'à ~30–35 %", s: "Modèle GEOCARBSULF, Berner 2006 ; charbons fossiles" },
      { t: "Glaciation du Paléozoïque tardif : ~340–290 Ma", s: "Montañez & Poulsen 2013, Annu. Rev. Earth Planet. Sci." },
      { t: "CO₂ descendu au niveau préindustriel (~300 ppm)", s: "Foster et al. 2017" },
    ],
    geo: "Formation de la Pangée. Forêts équatoriales sur la Laurussia — futurs bassins houillers d'Europe et d'Amérique du Nord.",
    marqueurs: [
      { nom: "Bassin houiller belge", lat: 50.4, lon: 4.4, note: "Charbon carbonifère — le socle de la révolution industrielle wallonne" },
      { nom: "Bassin de la Ruhr", lat: 51.5, lon: 7.0, note: "Charbon carbonifère" },
    ],
  },

  {
    id: "permien",
    ere: "Limite Permien – Trias",
    titre: "La Grande Mourrure",
    annee: 2025 - 2.52e8,
    plage: [2025 - 2.53e8, 2025 - 2.5e8],
    couleur: "#c0392b",
    co2: 2000, co2Plage: [800, 4000], tAnom: 10, tAnomPlage: [6, 14], mer: 20,
    statut: "proxy",
    accroche: "81 % des espèces marines disparaissent. La cause : une injection massive de carbone.",
    recit: [
      "Il y a 252 millions d'années, les trapps de Sibérie entrent en éruption : plusieurs millions de " +
      "km³ de basaltes, sur environ un million d'années. Le magma traverse d'immenses bassins de charbon " +
      "et d'évaporites, libérant en plus du CO₂ volcanique un carbone fossile thermogénique.",
      "Le résultat est un enchaînement de mécanismes qu'on retrouve aujourd'hui à une autre échelle : " +
      "réchauffement massif (+8 à +10 °C), acidification des océans, désoxygénation des eaux profondes, " +
      "effondrement des chaînes alimentaires.",
      "C'est la plus grande extinction de masse connue : environ 81 % des espèces marines et une majorité " +
      "des espèces terrestres disparaissent. La récupération de la biodiversité prendra plusieurs millions " +
      "d'années.",
      "Ce n'est pas une prédiction pour notre siècle — l'ampleur du carbone injecté était bien supérieure. " +
      "Mais c'est la démonstration que la chaîne « carbone → chaleur → acidification → anoxie » est un " +
      "mécanisme réel, documenté, et qu'il fonctionne dans ce sens-là.",
    ],
    faits: [
      { t: "≈ 81 % des espèces marines éteintes", s: "Stanley 2016, PNAS (estimation révisée)" },
      { t: "Trapps de Sibérie : ~3 millions de km³ de basaltes", s: "Burgess & Bowring 2015, Science Advances" },
      { t: "Réchauffement des eaux tropicales de ~+8 à +10 °C", s: "Joachimski et al. 2012, Geology (isotopes de conodontes)" },
      { t: "Acidification océanique documentée", s: "Clarkson et al. 2015, Science (isotopes du bore)" },
    ],
    geo: "Pangée assemblée. Un supercontinent, un super-océan (Panthalassa), une circulation océanique peu efficace.",
    marqueurs: [{ nom: "Trapps de Sibérie", lat: 67.0, lon: 95.0, note: "Province magmatique responsable de la crise" }],
  },

  {
    id: "cretace",
    ere: "Crétacé",
    titre: "Une Terre-serre, sans calotte polaire",
    annee: 2025 - 9.0e7,
    plage: [2025 - 1.45e8, 2025 - 6.6e7],
    couleur: "#e0a63c",
    co2: 1200, co2Plage: [700, 1700], tAnom: 8, tAnomPlage: [5, 12], mer: 200,
    statut: "proxy",
    accroche: "Des forêts au pôle, des dinosaures en Alaska, et 200 mètres d'eau en plus.",
    recit: [
      "Au Crétacé moyen, la Terre est dans un état de serre : pas de calotte glaciaire permanente, " +
      "des températures polaires nettement au-dessus de zéro, des forêts tempérées à haute latitude, " +
      "des crocodiliens dans l'Arctique.",
      "Le CO₂ se situe probablement entre 700 et 1700 ppm, entretenu par un volcanisme et une tectonique " +
      "très actifs (expansion océanique rapide). Le gradient de température entre l'équateur et les pôles " +
      "est beaucoup plus faible qu'aujourd'hui.",
      "Sans glace continentale, le niveau des mers est de 100 à 250 mètres au-dessus de l'actuel. " +
      "Des mers épicontinentales couvrent l'intérieur de l'Amérique du Nord, de l'Europe et de l'Afrique " +
      "du Nord — c'est là que se déposent la craie (d'où « Crétacé ») et une grande partie des roches " +
      "mères pétrolières que nous exploitons.",
      "Ce n'est pas un enfer : la biosphère y est florissante. Mais c'est un monde géographiquement " +
      "incompatible avec la carte de nos villes côtières.",
    ],
    faits: [
      { t: "CO₂ : ~700–1700 ppm selon les proxies", s: "Foster et al. 2017 ; Wang et al. 2014" },
      { t: "Pas de calotte permanente ; forêts polaires attestées", s: "Registre paléobotanique, Île d'Axel Heiberg" },
      { t: "Niveau marin : +100 à +250 m par rapport à l'actuel", s: "Miller et al. 2005, Science ; Haq 2014" },
    ],
    geo: "Ouverture de l'Atlantique. Inde en migration vers le nord. Mer intérieure occidentale en Amérique du Nord.",
    marqueurs: [{ nom: "Île d'Axel Heiberg", lat: 79.4, lon: -90.8, note: "Forêts fossiles arctiques" }],
  },

  {
    id: "kpg",
    ere: "Limite Crétacé – Paléogène",
    titre: "Chicxulub : l'hiver puis la fièvre",
    annee: 2025 - 6.6e7,
    plage: [2025 - 6.61e7, 2025 - 6.55e7],
    couleur: "#9b59b6",
    co2: 900, co2Plage: [500, 1500], tAnom: 6, tAnomPlage: [3, 10], mer: 100,
    statut: "proxy",
    accroche: "Un astéroïde de 10 km. Un refroidissement de quelques années, puis un réchauffement de 100 000 ans.",
    recit: [
      "Il y a 66,04 millions d'années, un astéroïde d'environ 10 km percute la péninsule du Yucatán. " +
      "L'impact vaporise des roches riches en sulfates et injecte dans la stratosphère des aérosols " +
      "soufrés et des poussières.",
      "Effet immédiat : un « hiver d'impact » de quelques années, avec effondrement de la photosynthèse. " +
      "Environ 75 % des espèces disparaissent, dont tous les dinosaures non-aviens.",
      "Effet différé : le CO₂ libéré par la vaporisation des carbonates et par les incendies globaux " +
      "provoque ensuite un réchauffement qui dure des dizaines de milliers d'années.",
      "Cette double signature — refroidissement rapide par aérosols, réchauffement lent par CO₂ — est " +
      "exactement celle qu'on observe après les grandes éruptions volcaniques, et celle qui explique " +
      "pourquoi les aérosols de pollution industrielle ont temporairement masqué une partie du " +
      "réchauffement au XX siècle.",
    ],
    faits: [
      { t: "Impact daté à 66,04 ± 0,03 Ma", s: "Renne et al. 2013, Science" },
      { t: "≈ 75 % des espèces éteintes", s: "Registre fossile ; Schulte et al. 2010, Science" },
      { t: "Cratère de Chicxulub : ~180 km de diamètre", s: "Hildebrand et al. 1991 ; forage IODP-ICDP 364" },
    ],
    geo: "Configuration proche du Crétacé tardif. Cratère au nord du Yucatán.",
    marqueurs: [{ nom: "Cratère de Chicxulub", lat: 21.4, lon: -89.5, note: "Point d'impact, 66 Ma" }],
  },

  {
    id: "petm",
    ere: "Maximum thermique Paléocène–Éocène",
    titre: "Le PETM — l'analogue le plus proche de ce que nous faisons",
    annee: 2025 - 5.6e7,
    plage: [2025 - 5.6e7, 2025 - 5.58e7],
    couleur: "#e74c3c",
    co2: 1400, co2Plage: [900, 2000], tAnom: 11, tAnomPlage: [8, 14], mer: 80,
    statut: "proxy",
    accroche: "Le meilleur analogue géologique de la crise actuelle. Nous allons dix fois plus vite.",
    recit: [
      "Il y a 56 millions d'années, entre 3000 et 7000 milliards de tonnes de carbone sont injectées " +
      "dans le système océan-atmosphère. Les sources débattues : volcanisme de la province magmatique " +
      "nord-atlantique, déstabilisation d'hydrates de méthane, combustion de tourbes.",
      "La température globale augmente de 5 à 8 °C. Les océans s'acidifient — on lit dans les sédiments " +
      "une dissolution massive des carbonates. Les espèces migrent vers les pôles. Les foraminifères " +
      "benthiques subissent leur plus grande extinction du Cénozoïque.",
      "Et voici le chiffre qui compte. Cette injection s'est étalée sur environ 3 000 à 20 000 ans, " +
      "soit un taux d'environ 0,3 à 1,5 milliard de tonnes de carbone par an. Nous en émettons " +
      "aujourd'hui plus de 10 milliards de tonnes de carbone par an.",
      "Autrement dit : l'événement que la géologie retient comme un bouleversement climatique majeur, " +
      "nous le reproduisons à une vitesse au moins dix fois supérieure. La biosphère du PETM avait des " +
      "millénaires pour migrer. Les nôtres ont des décennies.",
      "Le retour à l'équilibre du PETM — par le thermostat des silicates — a demandé environ " +
      "150 000 à 200 000 ans.",
    ],
    faits: [
      { t: "Réchauffement global : +5 à +8 °C", s: "Dunkley Jones et al. 2013, Earth-Science Reviews" },
      { t: "Carbone injecté : 3 000 – 7 000 Gt C sur 3–20 ka", s: "Gutjahr et al. 2017, Nature ; Zeebe et al. 2009" },
      { t: "Taux d'injection actuel ≈ 10× celui du PETM", s: "Zeebe, Ridgwell & Zachos 2016, Nature Geoscience" },
      { t: "Retour à l'équilibre : ~150 000 – 200 000 ans", s: "Bowen & Zachos 2010, Nature Geoscience" },
    ],
    geo: "Atlantique Nord en ouverture active. Pas encore de calotte antarctique.",
    marqueurs: [
      { nom: "Province magmatique nord-atlantique", lat: 64.0, lon: -18.0, note: "Source volcanique probable" },
      { nom: "Forage ODP 690 (mer de Weddell)", lat: -65.2, lon: 1.2, note: "Section de référence du PETM" },
    ],
  },

  {
    id: "cenozoique",
    ere: "Éocène → Pliocène",
    titre: "Le grand refroidissement : la Terre fabrique ses calottes",
    annee: 2025 - 2.0e7,
    plage: [2025 - 5.0e7, 2025 - 2.6e6],
    couleur: "#5dade2",
    co2: 400, co2Plage: [300, 700], tAnom: 3, tAnomPlage: [1, 6], mer: 30,
    statut: "proxy",
    accroche: "50 millions d'années de refroidissement — et le monde à 400 ppm existe déjà : c'est le Pliocène.",
    recit: [
      "Depuis l'optimum de l'Éocène (il y a 50 Ma), le CO₂ décline régulièrement. Deux causes " +
      "principales : la surrection de l'Himalaya et du plateau tibétain, qui expose des roches fraîches " +
      "à l'altération, et la baisse du dégazage volcanique.",
      "Vers 34 millions d'années (transition Éocène–Oligocène), le CO₂ passe sous un seuil d'environ " +
      "700–750 ppm : la calotte antarctique se met en place. L'ouverture du passage de Drake, qui isole " +
      "l'Antarctique dans un courant circumpolaire, y contribue.",
      "Le refroidissement se poursuit. Vers 2,7 millions d'années, la calotte du Groenland s'installe " +
      "durablement et les cycles glaciaires de l'hémisphère nord démarrent.",
      "Une étape mérite une attention particulière : le Pliocène moyen, il y a 3,3 à 3,0 millions " +
      "d'années. Le CO₂ y était compris entre 350 et 450 ppm — c'est-à-dire le niveau d'aujourd'hui. " +
      "La température globale était de 2,5 à 4 °C au-dessus du préindustriel et le niveau des mers " +
      "de 10 à 25 mètres plus haut qu'aujourd'hui.",
      "Ce n'est pas une prédiction pour 2100 : les calottes mettent des siècles à des millénaires à " +
      "répondre. C'est une indication de l'état d'équilibre vers lequel nous avons déjà engagé la planète.",
    ],
    faits: [
      { t: "Englacement de l'Antarctique : ~34 Ma, CO₂ sous ~750 ppm", s: "DeConto & Pollard 2003, Nature ; Zachos et al. 2001" },
      { t: "Pliocène moyen : CO₂ 350–450 ppm, T +2,5 à +4 °C, mer +5 à +25 m", s: "GIEC AR6 WG1 chap. 2 ; Dumitru et al. 2019" },
      { t: "Courbe de référence du Cénozoïque (isotopes benthiques)", s: "Westerhold et al. 2020, Science — CENOGRID" },
    ],
    geo: "Fermeture de la Téthys, surrection alpine et himalayenne, isthme de Panama (~3 Ma).",
    marqueurs: [
      { nom: "Passage de Drake", lat: -58.0, lon: -65.0, note: "Ouverture → courant circumpolaire antarctique" },
      { nom: "Plateau tibétain", lat: 32.0, lon: 88.0, note: "Surrection → altération → puits de CO₂" },
    ],
  },

  {
    id: "quaternaire",
    ere: "Quaternaire",
    titre: "Le métronome de Milankovitch",
    annee: 2025 - 21000,
    plage: [2025 - 2.58e6, 2025 - 11700],
    couleur: "#85c1e9",
    co2: 190, co2Plage: [180, 200], tAnom: -5, tAnomPlage: [-6.5, -3.5], mer: -120,
    statut: "carotte",
    accroche: "L'orbite déclenche, le CO₂ amplifie. Sans le second, les cycles glaciaires sont inexplicables.",
    recit: [
      "Depuis 2,6 millions d'années, la Terre alterne périodes glaciaires et interglaciaires. " +
      "Le rythme est donné par les variations de l'orbite terrestre, décrites par Milutin Milanković : " +
      "excentricité (cycle ~100 000 ans), obliquité de l'axe (41 000 ans), précession des équinoxes " +
      "(23 000 et 19 000 ans).",
      "Mais ces variations orbitales ne changent presque pas l'énergie totale reçue par la Terre : " +
      "elles la redistribuent selon la saison et la latitude. Elles sont donc bien trop faibles, à " +
      "elles seules, pour produire des variations de 5 °C. Ce sont des déclencheurs, pas des moteurs.",
      "Le moteur, ce sont les rétroactions : l'albédo de la glace, et surtout le CO₂. Les carottes de " +
      "glace d'Antarctique — EPICA Dome C couvre 800 000 ans — montrent que le CO₂ oscille entre " +
      "environ 180 ppm en période glaciaire et 280–300 ppm en interglaciaire, en phase avec la " +
      "température. Le CO₂ est à la fois conséquence (l'océan froid en absorbe plus) et cause " +
      "(il amplifie le forçage orbital d'environ un facteur 2 à 3).",
      "Au Dernier Maximum Glaciaire, il y a 21 000 ans : la température globale est inférieure de " +
      "4 à 6 °C au préindustriel, le niveau des mers est 120 mètres plus bas, une calotte de 3 km " +
      "d'épaisseur couvre le Canada et la Scandinavie. Autrement dit : 5 °C d'écart, c'est la " +
      "différence entre le monde d'aujourd'hui et un monde où l'on va à pied de France en Angleterre.",
      "C'est l'argument le plus important à retenir : 5 °C de moyenne globale n'est pas « un peu plus " +
      "chaud ». C'est un autre monde.",
    ],
    faits: [
      { t: "CO₂ sur 800 000 ans : 172–300 ppm — jamais au-dessus", s: "EPICA Dome C ; Lüthi et al. 2008, Nature" },
      { t: "Cycles orbitaux : 100 ka (excentricité), 41 ka (obliquité), 23/19 ka (précession)", s: "Milanković 1941 ; Hays, Imbrie & Shackleton 1976, Science" },
      { t: "Dernier Maximum Glaciaire (21 ka) : −4 à −6 °C, mer −120 m", s: "Tierney et al. 2020, Nature ; GIEC AR6 WG1" },
      { t: "Le CO₂ explique ~1/3 à 1/2 de l'amplitude glaciaire-interglaciaire", s: "Köhler et al. 2010 ; GIEC AR6 WG1 §2.2" },
    ],
    geo: "Calottes laurentidienne et fennoscandienne. Manche à sec, Doggerland émergé, Béringie continentale.",
    marqueurs: [
      { nom: "EPICA Dome C", lat: -75.1, lon: 123.4, note: "Carotte de glace de 800 000 ans" },
      { nom: "Vostok", lat: -78.5, lon: 106.8, note: "Carotte de 420 000 ans (1999)" },
      { nom: "Doggerland", lat: 54.5, lon: 3.0, note: "Terres émergées entre Angleterre et Belgique au DMG" },
    ],
  },

  {
    id: "holocene",
    ere: "Holocène",
    titre: "11 700 ans de stabilité — la fenêtre où tout s'est construit",
    annee: -4000,
    plage: [2025 - 11700, 1750],
    couleur: "#f4d03f",
    co2: 270, co2Plage: [260, 285], tAnom: -0.2, tAnomPlage: [-0.5, 0.3], mer: -2,
    statut: "carotte",
    accroche: "Agriculture, villes, écriture, États : tout tient dans une anomalie de ±0,5 °C.",
    recit: [
      "L'Holocène commence il y a 11 700 ans. Pendant toute cette période, la température globale " +
      "varie dans une plage remarquablement étroite — de l'ordre de ±0,5 °C. Le CO₂ reste entre " +
      "260 et 285 ppm.",
      "C'est dans cette fenêtre de stabilité que l'agriculture apparaît indépendamment sur plusieurs " +
      "continents, que les villes se forment, que l'écriture, les États et les civilisations " +
      "émergent. Notre géographie humaine — où l'on cultive, où l'on habite, où sont les ports — " +
      "est calibrée sur ce climat-là.",
      "Deux idées reçues à corriger. L'« optimum médiéval » et le « petit âge glaciaire » ont bien " +
      "existé, mais l'analyse PAGES 2k de 2019 montre qu'ils n'ont jamais été simultanés sur plus " +
      "de la moitié du globe : c'étaient des redistributions régionales. Le réchauffement du " +
      "XX siècle, lui, est cohérent sur plus de 98 % de la surface terrestre. C'est une différence " +
      "de nature, pas seulement de degré.",
    ],
    faits: [
      { t: "Variabilité holocène : de l'ordre de ±0,5 °C", s: "Marcott et al. 2013, Science ; Kaufman et al. 2020" },
      { t: "CO₂ holocène : 260–285 ppm", s: "Carottes de Law Dome et EPICA ; Bereiter et al. 2015" },
      { t: "Optimum médiéval / PAG : phénomènes régionaux non synchrones", s: "PAGES 2k Consortium 2019, Nature Geoscience" },
      { t: "Le XX siècle : réchauffement cohérent sur >98 % du globe", s: "Neukom et al. 2019, Nature" },
    ],
    geo: "Géographie moderne. Niveau marin stabilisé vers −7000 ans.",
    marqueurs: [
      { nom: "Croissant fertile", lat: 33.0, lon: 43.0, note: "Domestication des céréales, ~10 000 ans" },
      { nom: "Çatalhöyük", lat: 37.7, lon: 32.8, note: "Une des premières agglomérations, ~7500 av. J.-C." },
    ],
  },

  {
    id: "industrie",
    ere: "1750 – 1900",
    titre: "On allume la machine — et on comprend pourquoi elle chauffe",
    annee: 1850,
    plage: [1750, 1900],
    couleur: "#d68910",
    co2: 285, co2Plage: [277, 296], tAnom: 0.0, tAnomPlage: [-0.1, 0.1], mer: -0.2,
    statut: "carotte",
    accroche: "La physique du réchauffement était comprise en 1896. Ce n'est pas un savoir récent.",
    recit: [
      "La machine à vapeur, puis la métallurgie au coke, mettent le charbon au cœur de l'économie. " +
      "Le CO₂ atmosphérique quitte sa plage holocène : 277 ppm vers 1750, 285 ppm vers 1850, " +
      "296 ppm vers 1900.",
      "Parallèlement, la physique du problème est établie — et bien plus tôt qu'on ne le croit. " +
      "En 1824, Joseph Fourier montre que l'atmosphère retient une partie de la chaleur de la Terre. " +
      "En 1856, Eunice Newton Foote démontre expérimentalement que l'air chargé en CO₂ chauffe " +
      "davantage au Soleil. En 1859, John Tyndall mesure l'absorption du rayonnement infrarouge par " +
      "le CO₂ et la vapeur d'eau.",
      "En 1896, Svante Arrhenius calcule à la main l'effet d'un doublement du CO₂ et trouve un " +
      "réchauffement de 5 à 6 °C. La fourchette du GIEC en 2021 pour la sensibilité climatique à " +
      "l'équilibre est de 2,5 à 4 °C, avec 3 °C comme meilleure estimation. Arrhenius était haut, " +
      "mais dans le bon ordre de grandeur — avec un crayon et du papier.",
      "Autrement dit : nous savons depuis 130 ans. Le débat n'a jamais porté sur la physique.",
    ],
    faits: [
      { t: "CO₂ 1750 : 277 ppm · 1850 : 285 ppm · 1900 : 296 ppm", s: "Carotte de Law Dome ; Global Carbon Budget 2024" },
      { t: "Fourier 1824 : effet de serre atmosphérique", s: "Annales de Chimie et de Physique" },
      { t: "Foote 1856, Tyndall 1859 : absorption IR mesurée", s: "American Journal of Science ; Phil. Trans. R. Soc." },
      { t: "Arrhenius 1896 : doublement du CO₂ → +5 à 6 °C", s: "Philosophical Magazine" },
      { t: "Sensibilité climatique à l'équilibre (2021) : 3 °C [2,5–4]", s: "GIEC AR6 WG1, SPM A.4.4" },
    ],
    geo: "Industrialisation : Royaume-Uni, Belgique (2ᵉ pays industrialisé au monde), Allemagne, France, États-Unis.",
    marqueurs: [
      { nom: "Manchester", lat: 53.5, lon: -2.24, note: "Cœur de la révolution industrielle" },
      { nom: "Sillon Sambre-et-Meuse", lat: 50.45, lon: 4.45, note: "Charbon et sidérurgie belges" },
    ],
  },

  {
    id: "acceleration",
    ere: "1900 – 1990",
    titre: "La Grande Accélération",
    annee: 1960,
    plage: [1900, 1990],
    couleur: "#e67e22",
    co2: 317, co2Plage: [296, 354], tAnom: 0.3, tAnomPlage: [0.1, 0.5], mer: -0.12,
    statut: "mesure",
    accroche: "1958 : on commence enfin à mesurer. La courbe ne redescendra jamais.",
    recit: [
      "Après 1950, tout s'accélère en même temps : population, PIB, consommation d'énergie, " +
      "production d'engrais, transport. Les géologues appellent cela la « Grande Accélération ». " +
      "L'énergie fossile en est le carburant.",
      "En 1938, l'ingénieur britannique Guy Callendar rassemble les relevés de température et le " +
      "bilan des émissions, et affirme que le réchauffement observé est d'origine humaine. " +
      "Il est peu écouté.",
      "En 1958, Charles David Keeling installe un analyseur au sommet du Mauna Loa, à Hawaï. " +
      "La première moyenne annuelle complète, en 1959, donne 315,98 ppm. La courbe de Keeling " +
      "montre deux choses : une oscillation saisonnière (la respiration de la végétation de " +
      "l'hémisphère nord) et une montée continue. Elle n'a jamais cessé de monter depuis.",
      "En 1979, le rapport Charney de l'Académie des sciences américaine conclut qu'un doublement " +
      "du CO₂ réchaufferait la planète de 3 °C, à 1,5 °C près. Quarante-cinq ans et des millions " +
      "d'heures de calcul plus tard, cette fourchette a à peine bougé.",
      "En 1988, le GIEC est créé. Son premier rapport paraît en 1990.",
    ],
    faits: [
      { t: "Première moyenne annuelle Mauna Loa (1959) : 315,98 ppm", s: "Scripps / NOAA GML" },
      { t: "Callendar 1938 : attribution du réchauffement aux émissions", s: "Quarterly Journal of the Royal Meteorological Society" },
      { t: "Rapport Charney 1979 : doublement CO₂ → 3 °C ± 1,5", s: "NAS, Carbon Dioxide and Climate: A Scientific Assessment" },
      { t: "Création du GIEC : 1988 · Premier rapport : 1990", s: "OMM / PNUE" },
    ],
    geo: "Reconstruction d'après-guerre, motorisation de masse, essor pétrolier du Moyen-Orient.",
    marqueurs: [
      { nom: "Observatoire de Mauna Loa", lat: 19.54, lon: -155.58, note: "Courbe de Keeling depuis 1958" },
      { nom: "Genève — OMM", lat: 46.2, lon: 6.15, note: "Siège du GIEC (1988)" },
    ],
  },

  {
    id: "moderne",
    ere: "1990 – 2025",
    titre: "Nous savons. Les émissions continuent de monter.",
    annee: 2024,
    plage: [1990, 2025],
    couleur: "#e74c3c",
    co2: 425, co2Plage: [354, 425], tAnom: 1.3, tAnomPlage: [1.1, 1.55], mer: 0,
    statut: "mesure",
    accroche: "35 ans de rapports, 30 COP, et un CO₂ qui passe de 354 à 425 ppm.",
    recit: [
      "Le CO₂ atmosphérique passe de 354,4 ppm en 1990 à 424,6 ppm en 2024. Les émissions fossiles " +
      "mondiales passent de 22,7 à 37,4 milliards de tonnes de CO₂ par an. En ajoutant le changement " +
      "d'usage des sols, le total 2024 approche 41,6 GtCO₂.",
      "La diplomatie climatique existe : convention de Rio en 1992, protocole de Kyoto en 1997, " +
      "accord de Paris en 2015, qui fixe l'objectif de contenir le réchauffement « nettement en " +
      "dessous de 2 °C » et de poursuivre les efforts pour 1,5 °C.",
      "Le résultat physique, lui, est sans ambiguïté. 2024 est la première année civile où la " +
      "température globale dépasse 1,5 °C au-dessus de 1850-1900, à environ +1,55 °C. Les dix années " +
      "les plus chaudes jamais mesurées sont les dix dernières. La moyenne 2015-2024 est à +1,24 °C.",
      "Il faut être précis sur un point souvent mal compris : une année à +1,55 °C ne signifie pas " +
      "que la limite de Paris est franchie. L'objectif porte sur une moyenne pluri-décennale. " +
      "Mais la tendance de fond, elle, est bien à environ +1,3 °C et progresse d'environ 0,2 °C " +
      "par décennie.",
      "Un chiffre pour situer notre position : l'océan a absorbé environ 91 % de l'excès de chaleur " +
      "accumulé dans le système climatique. Ce que nous ressentons dans l'air, c'est moins de 3 % " +
      "du déséquilibre énergétique réel.",
    ],
    faits: [
      { t: "CO₂ : 354,4 ppm (1990) → 424,6 ppm (2024), moyennes annuelles", s: "NOAA GML, Mauna Loa" },
      { t: "Émissions fossiles 2024 : 37,4 GtCO₂ (+4,2 land-use ≈ 41,6 total)", s: "Global Carbon Budget 2024, Friedlingstein et al., ESSD" },
      { t: "2024 : +1,55 °C ± 0,13 vs 1850-1900 — année la plus chaude mesurée", s: "OMM, State of the Global Climate 2024" },
      { t: "Réchauffement moyen 2015-2024 : +1,24 °C", s: "OMM 2025" },
      { t: "91 % de l'excès de chaleur est stocké dans l'océan", s: "GIEC AR6 WG1, chap. 7 ; von Schuckmann et al. 2020" },
      { t: "Tendance actuelle : ≈ +0,2 °C par décennie", s: "GIEC AR6 WG1 SPM ; Forster et al. 2024" },
    ],
    geo: "Émissions concentrées : Chine ~31 %, États-Unis ~13 %, Inde ~8 %, UE ~6 % (2023, territoriales).",
    marqueurs: [
      { nom: "Paris — COP21", lat: 48.86, lon: 2.35, note: "Accord de Paris, décembre 2015" },
      { nom: "Mer de Béring", lat: 60.0, lon: -175.0, note: "Amplification arctique : réchauffement 3 à 4× plus rapide" },
    ],
  },

  {
    id: "futur",
    ere: "2025 – 2100",
    titre: "Les futurs possibles",
    annee: 2100,
    plage: [2025, 2100],
    couleur: "#af7ac5",
    co2: 600, co2Plage: [400, 1100], tAnom: 2.7, tAnomPlage: [1.4, 4.4], mer: 0.6,
    statut: "modele",
    accroche: "L'écart entre les scénarios n'est pas de la physique. C'est un choix.",
    recit: [
      "Le GIEC ne prédit pas l'avenir : il explore des trajectoires socio-économiques (SSP). " +
      "Chacune correspond à un monde différent en termes d'énergie, de démographie et de coopération " +
      "internationale. Le réchauffement en 2081-2100, par rapport à 1850-1900, est estimé ainsi :",
      "SSP1-1.9 : +1,4 °C — neutralité carbone atteinte vers 2050, transformation profonde et rapide. " +
      "SSP1-2.6 : +1,8 °C. SSP2-4.5 : +2,7 °C — la trajectoire « milieu de route ». " +
      "SSP3-7.0 : +3,6 °C — rivalités régionales, échec de la coopération. " +
      "SSP5-8.5 : +4,4 °C — développement fondé sur les fossiles.",
      "Où sommes-nous réellement ? Avec les politiques actuellement mises en œuvre, les évaluations " +
      "indépendantes convergent vers environ +2,6 à +3,1 °C en 2100. Avec les engagements pris " +
      "(NDC) intégralement tenus, environ +2,4 à +2,6 °C. L'écart entre les promesses et les actes " +
      "porte un nom dans les rapports : l'« emissions gap ».",
      "Un point souvent mal compris : le réchauffement s'arrête à peu près quand les émissions nettes " +
      "de CO₂ atteignent zéro. Il n'y a pas d'inertie de plusieurs décennies dans la température de " +
      "surface une fois le net zéro atteint — cela a été un changement important entre AR5 et AR6. " +
      "En revanche, le niveau des mers, lui, continuera de monter pendant des siècles.",
      "Ce que cela veut dire concrètement : chaque dixième de degré évité l'est définitivement, " +
      "et chaque tonne non émise compte, à n'importe quel moment de la trajectoire.",
    ],
    faits: [
      { t: "SSP1-1.9 : +1,4 °C [1,0–1,8] en 2081-2100", s: "GIEC AR6 WG1, tableau SPM.1" },
      { t: "SSP2-4.5 : +2,7 °C [2,1–3,5] · SSP5-8.5 : +4,4 °C [3,3–5,7]", s: "GIEC AR6 WG1, tableau SPM.1" },
      { t: "Politiques actuelles : ≈ +2,6 à +3,1 °C en 2100", s: "PNUE Emissions Gap Report 2024 ; Climate Action Tracker" },
      { t: "Le réchauffement s'arrête quasiment au net zéro CO₂", s: "GIEC AR6 WG1 SPM D.1.1 (relation TCRE quasi linéaire)" },
      { t: "Niveau des mers 2100 : +0,28-0,55 m (SSP1-1.9) à +0,63-1,01 m (SSP5-8.5)", s: "GIEC AR6 WG1, SPM B.5.3" },
    ],
    geo: "Impacts très inégaux : amplification arctique, bassin méditerranéen, Sahel, deltas asiatiques.",
    marqueurs: [
      { nom: "Delta du Gange-Brahmapoutre", lat: 22.5, lon: 90.0, note: "Plus de 100 millions de personnes exposées" },
      { nom: "Arctique", lat: 85.0, lon: 0.0, note: "Océan libre de glace en été au moins une fois avant 2050, tous scénarios" },
    ],
  },
];

/* ---------------------------------------------------------------------
   3. SÉRIES DE DONNÉES POUR LES GRAPHIQUES
   ------------------------------------------------------------------- */

// CO2 sur 540 Ma : enveloppe des reconstructions (on affiche une bande, pas une ligne)
export const CO2_PHANEROZOIQUE = {
  titre: "CO₂ atmosphérique sur 540 millions d'années",
  statut: "proxy",
  source: "Foster, Royer & Lunt 2017, Nature Communications ; modèle GEOCARB (Berner) ; compilation CenCO₂PIP 2023",
  note: "Enveloppe des reconstructions par proxies (paléosols, stomates, isotopes du bore, phytoplancton). L'incertitude est réelle et large : c'est pourquoi on affiche une bande et non une courbe.",
  unite: "ppm",
  // {ma: millions d'années avant présent, min, max}
  points: [
    { ma: 540, min: 2000, max: 7000 }, { ma: 500, min: 2000, max: 6000 },
    { ma: 460, min: 2000, max: 5500 }, { ma: 420, min: 1500, max: 5000 },
    { ma: 390, min: 1000, max: 3500 }, { ma: 360, min: 400, max: 1500 },
    { ma: 330, min: 200, max: 700 },   { ma: 300, min: 180, max: 500 },
    { ma: 270, min: 200, max: 800 },   { ma: 252, min: 800, max: 4000 },
    { ma: 220, min: 700, max: 2500 },  { ma: 180, min: 700, max: 2000 },
    { ma: 145, min: 600, max: 1800 },  { ma: 100, min: 700, max: 1700 },
    { ma: 66,  min: 500, max: 1500 },  { ma: 56,  min: 900, max: 2000 },
    { ma: 45,  min: 700, max: 1400 },  { ma: 34,  min: 500, max: 900 },
    { ma: 20,  min: 300, max: 600 },   { ma: 10,  min: 250, max: 450 },
    { ma: 3,   min: 350, max: 450 },   { ma: 1,   min: 180, max: 300 },
    { ma: 0,   min: 424, max: 424 },
  ],
};

// EPICA : structure réelle des cycles, ancrée sur les stades isotopiques marins
export const CYCLES_GLACIAIRES = {
  titre: "CO₂ sur 800 000 ans — carottes de glace d'Antarctique",
  statut: "carotte",
  source: "EPICA Dome C ; Lüthi et al. 2008, Nature ; Bereiter et al. 2015, GRL — données brutes : NOAA Paleoclimatology",
  note: "Reconstruction basse résolution : les valeurs extrêmes (172–300 ppm) et les âges des interglaciaires (stades isotopiques MIS) sont ceux publiés ; la courbe entre ces points est interpolée pour l'affichage. Ce n'est pas la série brute.",
  unite: "ppm",
  // {ka: milliers d'années avant présent, co2, label}
  points: [
    { ka: 800, co2: 250, label: "MIS 19" }, { ka: 780, co2: 275, label: "MIS 19 — interglaciaire" },
    { ka: 750, co2: 200 }, { ka: 710, co2: 260, label: "MIS 17" }, { ka: 670, co2: 190 },
    { ka: 620, co2: 265, label: "MIS 15" }, { ka: 580, co2: 250 }, { ka: 540, co2: 190 },
    { ka: 500, co2: 260, label: "MIS 13" }, { ka: 460, co2: 195 },
    { ka: 405, co2: 285, label: "MIS 11 — long interglaciaire" }, { ka: 370, co2: 230 },
    { ka: 340, co2: 185 }, { ka: 325, co2: 300, label: "MIS 9" }, { ka: 290, co2: 220 },
    { ka: 265, co2: 185 }, { ka: 240, co2: 290, label: "MIS 7" }, { ka: 200, co2: 200 },
    { ka: 160, co2: 190 }, { ka: 135, co2: 190, label: "fin MIS 6" },
    { ka: 125, co2: 287, label: "MIS 5e — Eémien" }, { ka: 100, co2: 240 },
    { ka: 70, co2: 210 }, { ka: 40, co2: 200 },
    { ka: 21, co2: 182, label: "Dernier Maximum Glaciaire" },
    { ka: 11.7, co2: 265, label: "début Holocène" }, { ka: 1, co2: 280 },
    { ka: 0.275, co2: 277, label: "1750" }, { ka: 0.001, co2: 425, label: "2024 — hors échelle historique" },
  ],
};

// Courbe de Keeling — moyennes annuelles mesurées
export const KEELING = {
  titre: "CO₂ atmosphérique mesuré — Mauna Loa",
  statut: "mesure",
  source: "NOAA Global Monitoring Laboratory / Scripps Institution of Oceanography — moyennes annuelles",
  note: "Points de mesure annuels. Avant 1958 : reconstruction par carottes de glace (Law Dome), marquée en pointillés.",
  unite: "ppm",
  glace: [
    { an: 1750, ppm: 277 }, { an: 1800, ppm: 282 }, { an: 1850, ppm: 285 },
    { an: 1900, ppm: 296 }, { an: 1930, ppm: 306 }, { an: 1950, ppm: 311 },
  ],
  mesure: [
    { an: 1959, ppm: 315.98 }, { an: 1965, ppm: 320.04 }, { an: 1970, ppm: 325.68 },
    { an: 1975, ppm: 331.13 }, { an: 1980, ppm: 338.80 }, { an: 1985, ppm: 346.12 },
    { an: 1990, ppm: 354.39 }, { an: 1995, ppm: 360.82 }, { an: 2000, ppm: 369.55 },
    { an: 2005, ppm: 379.80 }, { an: 2010, ppm: 389.90 }, { an: 2015, ppm: 400.83 },
    { an: 2018, ppm: 408.72 }, { an: 2020, ppm: 414.24 }, { an: 2022, ppm: 418.56 },
    { an: 2023, ppm: 421.08 }, { an: 2024, ppm: 424.61 },
  ],
};

// Température globale 1850-2024, moyennes décennales
export const TEMPERATURE_MODERNE = {
  titre: "Température globale — écart à 1850-1900",
  statut: "mesure",
  source: "GIEC AR6 WG1 fig. SPM.1 ; OMM State of the Global Climate 2024 (moyenne de 6 jeux de données)",
  note: "Moyennes décennales, incertitude de l'ordre de ±0,1 °C sur les premières décennies. Les valeurs annuelles récentes sont indiquées séparément.",
  unite: "°C",
  decennies: [
    { d: 1855, t: -0.03 }, { d: 1865, t: -0.06 }, { d: 1875, t: -0.03 }, { d: 1885, t: -0.10 },
    { d: 1895, t: -0.08 }, { d: 1905, t: -0.15 }, { d: 1915, t: -0.13 }, { d: 1925, t: -0.03 },
    { d: 1935, t: 0.10 },  { d: 1945, t: 0.18 },  { d: 1955, t: 0.15 },  { d: 1965, t: 0.16 },
    { d: 1975, t: 0.23 },  { d: 1985, t: 0.45 },  { d: 1995, t: 0.61 },  { d: 2005, t: 0.83 },
    { d: 2015, t: 1.09 },  { d: 2020, t: 1.24 },
  ],
  annees: [
    { an: 1998, t: 0.75 }, { an: 2016, t: 1.29 }, { an: 2020, t: 1.27 },
    { an: 2023, t: 1.45 }, { an: 2024, t: 1.55 },
  ],
  reperes: [
    { t: 1.5, label: "Objectif Paris — 1,5 °C" },
    { t: 2.0, label: "Limite haute de Paris — 2 °C" },
  ],
};

// Émissions
export const EMISSIONS = {
  titre: "Émissions mondiales de CO₂ fossile",
  statut: "mesure",
  source: "Global Carbon Budget 2024 (Friedlingstein et al., Earth System Science Data)",
  note: "CO₂ fossile et procédés industriels (hors changement d'usage des sols, ≈ +4,2 GtCO₂ en 2024).",
  unite: "GtCO₂/an",
  points: [
    { an: 1850, v: 0.2 }, { an: 1900, v: 2.0 }, { an: 1950, v: 6.0 }, { an: 1960, v: 9.4 },
    { an: 1970, v: 14.9 }, { an: 1980, v: 19.5 }, { an: 1990, v: 22.7 }, { an: 2000, v: 25.5 },
    { an: 2010, v: 33.1 }, { an: 2019, v: 36.7 }, { an: 2020, v: 34.8 }, { an: 2022, v: 36.8 },
    { an: 2024, v: 37.4 },
  ],
};

// Scénarios SSP
export const SCENARIOS = [
  { id: "ssp119", nom: "SSP1-1.9", t2100: 1.4, plage: [1.0, 1.8], couleur: "#2ecc71",
    desc: "Neutralité carbone vers 2050. Transformation rapide de l'énergie, de l'industrie et de l'usage des sols.",
    mer: [0.28, 0.55] },
  { id: "ssp126", nom: "SSP1-2.6", t2100: 1.8, plage: [1.3, 2.4], couleur: "#7fd67f",
    desc: "Net zéro peu après 2050. Compatible avec « nettement en dessous de 2 °C ».", mer: [0.32, 0.62] },
  { id: "ssp245", nom: "SSP2-4.5", t2100: 2.7, plage: [2.1, 3.5], couleur: "#f1c40f",
    desc: "Milieu de route. Les émissions plafonnent puis déclinent lentement. Proche des politiques actuelles.",
    mer: [0.44, 0.76] },
  { id: "ssp370", nom: "SSP3-7.0", t2100: 3.6, plage: [2.8, 4.6], couleur: "#e67e22",
    desc: "Rivalités régionales, échec de la coopération, émissions doublées d'ici 2100.", mer: [0.55, 0.90] },
  { id: "ssp585", nom: "SSP5-8.5", t2100: 4.4, plage: [3.3, 5.7], couleur: "#c0392b",
    desc: "Développement fondé sur les énergies fossiles. Peu probable au vu des tendances, utile comme borne haute.",
    mer: [0.63, 1.01] },
];
export const SCENARIO_SOURCE = "GIEC AR6 WG1, tableau SPM.1 (2081-2100 vs 1850-1900) et SPM B.5.3 (niveau marin)";

/* ---------------------------------------------------------------------
   4. CONSÉQUENCES
   ------------------------------------------------------------------- */
export const CONSEQUENCES = [
  {
    id: "chaleur", titre: "Chaleur et vagues de chaleur", icone: "🌡",
    chiffre: "+1,55 °C", chiffreLabel: "en 2024 vs 1850-1900",
    points: [
      { t: "Les vagues de chaleur sont plus fréquentes et plus intenses sur la quasi-totalité des terres émergées. Un événement qui survenait une fois tous les 50 ans au climat préindustriel survient aujourd'hui environ 4,8 fois par 50 ans, et 13,9 fois à +2 °C.", s: "GIEC AR6 WG1, SPM A.3.1 et fig. SPM.6" },
      { t: "L'humidité change tout : au-delà d'une température au thermomètre mouillé de ~35 °C, le corps humain ne peut plus se refroidir par transpiration, même à l'ombre et au repos. Ce seuil a déjà été frôlé ponctuellement dans le Golfe et la vallée de l'Indus.", s: "Sherwood & Huber 2010, PNAS ; Raymond et al. 2020, Science Advances" },
      { t: "L'Europe est le continent qui se réchauffe le plus vite : environ deux fois la moyenne mondiale depuis les années 1980.", s: "Copernicus / OMM, European State of the Climate 2023" },
    ],
  },
  {
    id: "mer", titre: "Niveau des mers", icone: "🌊",
    chiffre: "+21 cm", chiffreLabel: "depuis 1900",
    points: [
      { t: "Le niveau moyen des mers a monté d'environ 0,20 m entre 1901 et 2018. Le rythme s'accélère : 1,3 mm/an entre 1901 et 1971, 1,9 mm/an entre 1971 et 2006, 3,7 mm/an entre 2006 et 2018.", s: "GIEC AR6 WG1, SPM A.1.7" },
      { t: "Deux causes : la dilatation thermique de l'eau (l'océan se réchauffe et prend du volume) et la fonte des glaciers et calottes. Les deux contribuent aujourd'hui à parts comparables.", s: "GIEC AR6 WG1, chap. 9" },
      { t: "Projections 2100 : +0,28 à 0,55 m (SSP1-1.9) jusqu'à +0,63 à 1,01 m (SSP5-8.5). Un scénario d'instabilité rapide de la calotte antarctique ne peut être exclu et porterait le chiffre au-delà de 2 m.", s: "GIEC AR6 WG1, SPM B.5.3" },
      { t: "La montée ne s'arrête pas en 2100. À +1,5 °C stabilisé, l'engagement à 2000 ans est de 2 à 3 m ; à +2 °C, de 2 à 6 m ; à +5 °C, de 19 à 22 m.", s: "GIEC AR6 WG1, SPM B.5.4" },
    ],
  },
  {
    id: "ocean", titre: "Océan : chaleur, acidité, oxygène", icone: "🐚",
    chiffre: "91 %", chiffreLabel: "de l'excès de chaleur absorbé par l'océan",
    points: [
      { t: "L'océan a absorbé environ 91 % de la chaleur excédentaire accumulée depuis 1971. C'est ce qui rend le réchauffement de l'air si « lent » en apparence — et ce qui le rend irréversible à l'échelle humaine.", s: "GIEC AR6 WG1, chap. 7 ; von Schuckmann et al. 2020" },
      { t: "L'océan a également absorbé environ 26 % des émissions anthropiques de CO₂. Le pH de surface a baissé d'environ 0,1 unité depuis l'ère préindustrielle, soit une augmentation de ~26 % de l'acidité.", s: "GIEC AR6 WG1, SPM A.2.4 ; Global Carbon Budget 2024" },
      { t: "Les récifs coralliens tropicaux sont l'écosystème le plus exposé : 70 à 90 % de pertes projetées à +1,5 °C, plus de 99 % à +2 °C.", s: "GIEC SR1.5, SPM B.4.2" },
      { t: "La désoxygénation progresse : les zones à minimum d'oxygène s'étendent. C'est le même mécanisme, à intensité bien moindre, que celui de la crise Permien-Trias.", s: "GIEC AR6 WG1 ; Breitburg et al. 2018, Science" },
    ],
  },
  {
    id: "glace", titre: "Cryosphère", icone: "🧊",
    chiffre: "−13 %", chiffreLabel: "de banquise arctique par décennie (septembre)",
    points: [
      { t: "La banquise arctique de fin d'été recule d'environ 13 % par décennie. Dans tous les scénarios évalués, l'océan Arctique sera pratiquement libre de glace en septembre au moins une fois avant 2050.", s: "GIEC AR6 WG1, SPM B.3.1 ; NSIDC" },
      { t: "L'Arctique se réchauffe 3 à 4 fois plus vite que la moyenne mondiale — c'est l'amplification arctique, due principalement à la rétroaction de l'albédo et à la structure verticale de l'atmosphère polaire.", s: "Rantanen et al. 2022, Communications Earth & Environment" },
      { t: "La quasi-totalité des glaciers de montagne reculent. Cela concerne directement l'approvisionnement en eau de centaines de millions de personnes en Asie du Sud et en Amérique du Sud.", s: "GIEC AR6 WG1, chap. 9 ; WGMS" },
      { t: "Le pergélisol contient environ 1400 à 1600 milliards de tonnes de carbone, soit près du double du carbone atmosphérique actuel. Son dégel libère CO₂ et méthane — une rétroaction positive.", s: "Schuur et al. 2015, Nature ; Hugelius et al. 2014" },
    ],
  },
  {
    id: "bascule", titre: "Points de bascule", icone: "⚠",
    chiffre: "5", chiffreLabel: "éléments basculants possibles dès +1,5 °C",
    points: [
      { t: "Un point de bascule est un seuil au-delà duquel un système change d'état de façon auto-entretenue, même si le forçage cesse. Cinq éléments pourraient être engagés dans la plage +1,5 à +2 °C : calotte du Groenland, calotte antarctique occidentale, récifs coralliens tropicaux, dégel abrupt du pergélisol, circulation des mers du Labrador.", s: "Armstrong McKay et al. 2022, Science" },
      { t: "L'AMOC (circulation méridienne de retournement atlantique, dont le Gulf Stream est une composante) s'est affaiblie. Un effondrement complet au XXI siècle est jugé peu probable (confiance moyenne), mais ne peut être exclu, et ses conséquences pour l'Europe du Nord-Ouest seraient majeures.", s: "GIEC AR6 WG1, SPM B.5.4 et chap. 9" },
      { t: "Important : les points de bascule ne sont pas des dates. Ce sont des plages de température associées à de fortes incertitudes. Leur existence est un argument pour la prudence, pas pour le fatalisme.", s: "GIEC AR6 WG1, Cross-Chapter Box TP" },
    ],
  },
  {
    id: "humain", titre: "Sociétés humaines", icone: "👥",
    chiffre: "3,3–3,6", chiffreLabel: "milliards de personnes en contexte très vulnérable",
    points: [
      { t: "Entre 3,3 et 3,6 milliards de personnes vivent dans des contextes très vulnérables au changement climatique. La mortalité liée aux inondations, sécheresses et tempêtes y a été 15 fois plus élevée que dans les régions à faible vulnérabilité sur 2010-2020.", s: "GIEC AR6 WG2, SPM B.2.4" },
      { t: "Les rendements agricoles sont déjà affectés dans plusieurs régions ; la croissance de la productivité agricole mondiale a été réduite d'environ 21 % depuis 1961 par rapport à ce qu'elle aurait été sans changement climatique.", s: "Ortiz-Bobea et al. 2021, Nature Climate Change" },
      { t: "L'inégalité est structurelle : les 10 % les plus émetteurs de la planète sont responsables d'environ 48 % des émissions liées à la consommation ; les 50 % les moins émetteurs, d'environ 12 %.", s: "GIEC AR6 WG3, SPM B.3.4 ; Chancel 2022, Nature Sustainability" },
      { t: "Le coût de l'inaction dépasse largement celui de l'action dans toutes les évaluations économiques récentes, même en tenant compte des incertitudes sur le taux d'actualisation.", s: "GIEC AR6 WG3, chap. 3 ; Stern 2006 et révisions ultérieures" },
    ],
  },
];

/* Régions — impacts documentés */
export const REGIONS = [
  { id: "arctique", nom: "Arctique", lat: 80, lon: 0, delta: "3 à 4× la moyenne mondiale",
    points: [
      "Réchauffement 3 à 4 fois plus rapide que la moyenne mondiale depuis 1979 (Rantanen et al. 2022).",
      "Banquise de septembre en recul d'environ 13 % par décennie (NSIDC).",
      "Dégel du pergélisol : déstabilisation des infrastructures russes et nord-américaines, libération de carbone.",
    ] },
  { id: "europe", nom: "Europe de l'Ouest", lat: 48, lon: 5, delta: "≈ 2× la moyenne mondiale",
    points: [
      "Continent le plus rapidement réchauffé : environ +2,3 °C depuis l'ère préindustrielle (Copernicus, 2024).",
      "Belgique : environ +2 °C depuis la fin du XIX siècle selon les séries d'Uccle (IRM).",
      "Vagues de chaleur : celle de 2003 a causé environ 70 000 décès en excès en Europe (Robine et al. 2008).",
      "Enjeu énergétique direct : baisse de l'hydraulique et du nucléaire en période de canicule et d'étiage, pointes de demande de climatisation.",
    ] },
  { id: "mediterranee", nom: "Bassin méditerranéen", lat: 38, lon: 15, delta: "≈ +1,5× la moyenne",
    points: [
      "Point chaud identifié par le GIEC : réchauffement ~20 % plus rapide que la moyenne mondiale.",
      "Baisse robuste des précipitations estivales dans tous les scénarios (GIEC AR6 WG1, Atlas).",
      "Sécheresses, incendies, stress hydrique : conflit d'usage croissant entre agriculture, tourisme et énergie.",
    ] },
  { id: "sahel", nom: "Sahel & Afrique de l'Ouest", lat: 14, lon: 0, delta: "forte incertitude sur les pluies",
    points: [
      "Région parmi les plus vulnérables au monde, avec une très faible responsabilité historique dans les émissions.",
      "Les modèles divergent sur l'évolution des pluies de mousson : c'est l'une des plus grandes incertitudes régionales du GIEC.",
      "Chaleur extrême : augmentation robuste et importante du nombre de jours au-dessus des seuils physiologiques.",
    ] },
  { id: "asie-sud", nom: "Asie du Sud", lat: 22, lon: 80, delta: "chaleur humide critique",
    points: [
      "Vallée de l'Indus et plaine du Gange : parmi les premières régions où le seuil de température au thermomètre mouillé de 35 °C pourrait être atteint (Im et al. 2017, Science Advances).",
      "Delta du Gange-Brahmapoutre : plus de 100 millions de personnes exposées à la montée des eaux et à la salinisation.",
      "Fonte des glaciers himalayens : ressource en eau saisonnière pour environ 1,9 milliard de personnes dans les bassins alimentés.",
    ] },
  { id: "amazonie", nom: "Amazonie", lat: -4, lon: -60, delta: "risque de bascule forêt → savane",
    points: [
      "Combinaison déforestation + sécheresse : risque de basculement partiel vers un écosystème de type savane.",
      "Certaines zones du sud-est amazonien sont déjà devenues des sources nettes de carbone (Gatti et al. 2021, Nature).",
      "Le seuil est débattu ; les estimations situent le risque à partir de +2 à +3 °C combinés à 20-25 % de déforestation.",
    ] },
  { id: "antarctique", nom: "Antarctique occidental", lat: -78, lon: -100, delta: "instabilité marine possible",
    points: [
      "La calotte antarctique occidentale repose sur un socle sous le niveau de la mer : configuration potentiellement instable.",
      "Le glacier Thwaites concentre l'attention : sa déstabilisation engagerait à terme plusieurs dizaines de centimètres de montée des eaux.",
      "Échelle de temps : siècles à millénaires, mais l'engagement peut être pris ce siècle.",
    ] },
  { id: "iles", nom: "Petits États insulaires", lat: -8, lon: 179, delta: "existence menacée",
    points: [
      "Tuvalu, Kiribati, Maldives, Marshall : altitude moyenne de quelques mètres.",
      "L'enjeu n'est pas seulement la submersion mais la salinisation des nappes et la perte d'habitabilité, bien avant l'immersion.",
      "Ces États émettent une fraction négligeable des émissions mondiales.",
    ] },
];

/* ---------------------------------------------------------------------
   5. SOLUTIONS
   ------------------------------------------------------------------- */

export const CADRE_PHYSIQUE = {
  tcre: 0.45,      // °C par 1000 GtCO2 cumulées (meilleure estimation AR6)
  tcrePlage: [0.27, 0.63],
  tcreSource: "GIEC AR6 WG1, SPM D.1.1 — réponse climatique transitoire aux émissions cumulées (TCRE) : 1,65 °C [1,0-2,3] par 1000 GtC, soit 0,45 °C [0,27-0,63] par 1000 GtCO₂",
  rechauffementActuel: 1.3,
  rechauffementActuelSource: "Tendance de fond estimée 2024, GIEC AR6 mis à jour (Forster et al. 2024, ESSD)",
  emissions2024: 41.6,
  emissionsSource: "Global Carbon Budget 2024 — 37,4 GtCO₂ fossile + 4,2 GtCO₂ usage des sols",
  budgets: [
    { cible: "1,5 °C", proba: "50 %", gt: 235, annees: "≈ 6 ans au rythme de 2024" },
    { cible: "1,7 °C", proba: "50 %", gt: 585, annees: "≈ 14 ans" },
    { cible: "2 °C",   proba: "50 %", gt: 1110, annees: "≈ 27 ans" },
  ],
  budgetsSource: "Global Carbon Budget 2024 (Friedlingstein et al., ESSD), budgets restants au 1er janvier 2025",
};

/* Leviers : potentiels d'atténuation à l'horizon 2030, GIEC AR6 WG3 SPM.7.
   `potentiel` = GtCO2-eq/an évités si le potentiel est pleinement réalisé.
   `defaut` = niveau initial du curseur (part du potentiel réalisée, %) */
export const LEVIERS = [
  { id: "solaire", nom: "Solaire photovoltaïque", cat: "Énergie", potentiel: 4.0, defaut: 35,
    cout: "Majoritairement à coût négatif ou < 20 $/tCO₂",
    note: "Le coût du PV a chuté d'environ 90 % entre 2010 et 2023. Principal frein aujourd'hui : réseaux, stockage et permis, plus que la technologie." },
  { id: "eolien", nom: "Éolien terrestre et en mer", cat: "Énergie", potentiel: 4.0, defaut: 30,
    cout: "Majoritairement < 20 $/tCO₂",
    note: "Même logique que le PV. La flexibilité du système (stockage, pilotage de la demande, interconnexions) devient le facteur limitant." },
  { id: "nucleaire", nom: "Nucléaire", cat: "Énergie", potentiel: 0.9, defaut: 25,
    cout: "0 à 100 $/tCO₂ selon les contextes",
    note: "Potentiel plus limité en 2030 par les délais de construction, non par la physique. Pertinent pour la production pilotable bas-carbone." },
  { id: "methane", nom: "Fuites de méthane fossile", cat: "Énergie", potentiel: 1.4, defaut: 30,
    cout: "Souvent à coût négatif — le gaz capté est vendable",
    note: "Le levier le plus rentable du tableau. Le méthane a un pouvoir de réchauffement ~82 fois celui du CO₂ à 20 ans." },
  { id: "efficacite-ind", nom: "Efficacité énergétique industrielle", cat: "Industrie", potentiel: 1.1, defaut: 40,
    cout: "Souvent < 20 $/tCO₂, retour sur investissement rapide",
    note: "Récupération de chaleur fatale, moteurs à variation de vitesse, air comprimé, isolation des fours." },
  { id: "ciment", nom: "Ciment et béton bas-carbone", cat: "Industrie", potentiel: 1.0, defaut: 25,
    cout: "50 à 200 $/tCO₂ selon le levier",
    note: "Environ 60 % des émissions du ciment viennent de la décarbonatation du calcaire, pas de la combustion : elles ne disparaissent pas en changeant de combustible. Leviers : baisse du taux de clinker, combustibles alternatifs, efficacité thermique, puis captage du CO₂." },
  { id: "acier", nom: "Acier bas-carbone", cat: "Industrie", potentiel: 1.0, defaut: 20,
    cout: "50 à 200 $/tCO₂",
    note: "Recyclage à l'arc électrique, réduction directe à l'hydrogène. Dépend de la disponibilité d'électricité bas-carbone bon marché." },
  { id: "batiment", nom: "Efficacité des bâtiments", cat: "Demande", potentiel: 2.2, defaut: 30,
    cout: "Large part à coût négatif",
    note: "Isolation, pompes à chaleur, conception bioclimatique. Frein principal : le coût d'investissement initial et le rythme de rénovation." },
  { id: "transport", nom: "Électrification des transports", cat: "Demande", potentiel: 1.4, defaut: 30,
    cout: "0 à 100 $/tCO₂, en baisse rapide",
    note: "Le bénéfice dépend du contenu carbone de l'électricité. Le report modal et la réduction des distances ont un effet du même ordre." },
  { id: "sobriete", nom: "Sobriété et changements de demande", cat: "Demande", potentiel: 2.0, defaut: 15,
    cout: "Coût net souvent négatif",
    note: "Le GIEC AR6 WG3 consacre pour la première fois un chapitre entier à la demande : 40 à 70 % de réduction possible d'ici 2050 sur les émissions d'usage final." },
  { id: "forets", nom: "Forêts : arrêt de la déforestation, restauration", cat: "Terres", potentiel: 7.3, defaut: 20,
    cout: "Large part < 100 $/tCO₂",
    note: "Le plus grand potentiel unitaire du tableau, mais aussi le moins permanent : un puits forestier peut être annulé par un incendie ou un changement de politique." },
  { id: "agriculture", nom: "Agriculture, sols, alimentation", cat: "Terres", potentiel: 4.1, defaut: 20,
    cout: "Variable",
    note: "Séquestration dans les sols, réduction du N₂O, gestion du méthane entérique, évolution des régimes alimentaires." },
  { id: "cdr", nom: "Captage direct et BECCS", cat: "Technologie", potentiel: 0.3, defaut: 10,
    cout: "100 à 600 $/tCO₂ aujourd'hui",
    note: "Indispensable à terme pour compenser les émissions résiduelles vraiment irréductibles, mais l'échelle actuelle est de l'ordre de 0,00001 Gt/an. Ce n'est pas une alternative à la réduction." },
];
export const LEVIERS_SOURCE =
  "Potentiels : GIEC AR6 WG3, SPM fig. SPM.7 (potentiels d'atténuation à l'horizon 2030, GtCO₂-eq/an, par gamme de coût). " +
  "Les potentiels ne sont pas strictement additifs — certains se recouvrent. Le simulateur applique un facteur de recouvrement de 0,85 au total, ce qui est une hypothèse de l'application et non une valeur du GIEC.";

export const FOCUS_CIMENT = {
  titre: "Focus industrie lourde : le ciment",
  intro: "Le ciment est un cas d'école utile : c'est un secteur où le problème n'est pas seulement l'énergie, mais la chimie elle-même.",
  points: [
    { t: "La production de ciment représente environ 7 à 8 % des émissions mondiales de CO₂, soit de l'ordre de 2,4 GtCO₂ par an.", s: "AIE, Cement Technology Roadmap ; Andrew 2019, ESSD" },
    { t: "Environ 60 % de ces émissions sont des émissions de procédé : la décarbonatation du calcaire (CaCO₃ → CaO + CO₂) libère du CO₂ par réaction chimique, indépendamment du combustible utilisé.", s: "AIE ; GCCA" },
    { t: "Conséquence directe : passer au biocombustible ou à l'électricité ne supprime que la part combustion (~40 %). Décarboner totalement le ciment impose soit de changer le liant, soit de capter le CO₂.", s: "GIEC AR6 WG3, chap. 11" },
    { t: "Leviers dans l'ordre de maturité : baisse du taux de clinker (laitiers, cendres, calcaire, argiles calcinées), combustibles alternatifs et biomasse, efficacité thermique des fours, optimisation du dosage béton, puis captage-stockage du CO₂.", s: "GCCA Roadmap to Net Zero 2050 ; AIE" },
    { t: "Le captage sur four à ciment est techniquement plus favorable que sur beaucoup d'autres sources, car le flux de CO₂ y est plus concentré — mais il exige de l'énergie et une infrastructure de transport et de stockage qui n'existe pas encore à l'échelle.", s: "GIEC AR6 WG3, chap. 11 ; projets Norcem Brevik, Go4Zero" },
  ],
};

/* ---------------------------------------------------------------------
   6. IDÉES REÇUES
   ------------------------------------------------------------------- */
export const IDEES_RECUES = [
  { q: "« Le climat a toujours changé »",
    r: "C'est exact, et c'est précisément l'argument le plus fort dans l'autre sens. Les changements passés ont eu des causes physiques identifiables — orbite, volcanisme, tectonique, CO₂ — et quand ils ont été rapides, ils ont provoqué des extinctions de masse. Aujourd'hui, aucun forçage naturel connu n'explique la tendance observée : l'activité solaire est stable ou en légère baisse depuis 1980, et les paramètres orbitaux nous placeraient plutôt en refroidissement lent. Ce qui reste, c'est le CO₂. Et le rythme actuel est au moins dix fois supérieur à celui du PETM, l'événement de réchauffement rapide de référence.",
    s: "GIEC AR6 WG1, chap. 2 et 3 ; Zeebe et al. 2016" },
  { q: "« La vapeur d'eau est le principal gaz à effet de serre »",
    r: "Vrai en contribution instantanée : la vapeur d'eau assure environ 50 % de l'effet de serre, les nuages 25 %, le CO₂ environ 20 %. Mais la vapeur d'eau ne pilote rien : son temps de séjour dans l'atmosphère est d'environ 9 jours et sa concentration est fixée par la température (relation de Clausius-Clapeyron, ≈ +7 % par degré). C'est donc une rétroaction, pas un forçage. Le CO₂, lui, a un temps de séjour de plusieurs siècles à millénaires : c'est lui qui fixe le thermostat, et la vapeur d'eau amplifie ensuite d'un facteur d'environ 2.",
    s: "Lacis et al. 2010, Science ; Schmidt et al. 2010, JGR" },
  { q: "« Les volcans émettent plus de CO₂ que l'homme »",
    r: "Le volcanisme mondial émet de l'ordre de 0,3 à 0,4 milliard de tonnes de CO₂ par an. Les activités humaines en émettent environ 41 milliards. Le rapport est de l'ordre de 1 à 100. C'est d'ailleurs mesurable autrement : le CO₂ fossile a une signature isotopique particulière (appauvri en ¹³C et dépourvu de ¹⁴C), et c'est exactement cette signature qu'on lit dans l'augmentation atmosphérique.",
    s: "Burton et al. 2013, Reviews in Mineralogy ; Global Carbon Budget 2024" },
  { q: "« Le CO₂ suit la température dans les carottes de glace, donc il n'est pas la cause »",
    r: "L'observation est correcte pour les cycles glaciaires : au début d'une déglaciation, le réchauffement précède la hausse du CO₂ de plusieurs siècles. L'interprétation est fausse. Le déclencheur est orbital ; le réchauffement initial libère du CO₂ de l'océan ; ce CO₂ amplifie ensuite le réchauffement, qui atteint des amplitudes impossibles à expliquer par l'orbite seule. Cause et conséquence à la fois, dans une boucle. Aujourd'hui, la séquence est inversée et sans ambiguïté : c'est le CO₂ qui augmente en premier, et il vient de sources fossiles identifiées isotopiquement.",
    s: "Shakun et al. 2012, Nature ; Parrenin et al. 2013, Science" },
  { q: "« De toute façon c'est trop tard »",
    r: "Physiquement faux, et c'est important. Le GIEC AR6 a établi que le réchauffement s'arrête pratiquement quand les émissions nettes de CO₂ atteignent zéro — il n'y a pas plusieurs décennies de hausse inévitable « dans les tuyaux ». La relation entre émissions cumulées et température est quasi linéaire : chaque tonne compte, à n'importe quel moment. Il n'existe aucun seuil au-delà duquel agir devient inutile ; il existe seulement des seuils au-delà desquels certains dommages deviennent irréversibles. La différence entre +2 °C et +3 °C reste, en 2025, entièrement entre nos mains.",
    s: "GIEC AR6 WG1, SPM D.1.1 et D.1.8" },
  { q: "« Les gestes individuels ne servent à rien »",
    r: "Réponse nuancée. Sur le plan strictement comptable, les leviers structurels (production d'électricité, industrie, aménagement, normes) dominent largement. Mais le GIEC AR6 WG3 chiffre pour la première fois le potentiel du côté de la demande : 40 à 70 % de réduction possible sur les émissions d'usage final d'ici 2050. Et les choix individuels ne comptent pas seulement par leur tonnage : ils déplacent les normes sociales, les marchés et donc les décisions politiques. La bonne question n'est pas « individuel ou collectif » mais « quelle est mon action à plus fort effet de levier », qui passe souvent par le vote, le métier et l'épargne plutôt que par le tri des déchets.",
    s: "GIEC AR6 WG3, chap. 5 ; Creutzig et al. 2022, Nature Climate Change" },
];

/* ---------------------------------------------------------------------
   7. MÉTHODE ET SOURCES
   ------------------------------------------------------------------- */
export const METHODE = {
  principes: [
    "Zéro donnée inventée. Chaque chiffre affiché provient d'une publication identifiée, citée sous la donnée.",
    "Quand la science donne une fourchette, l'application affiche la fourchette. Les incertitudes ne sont pas cachées : elles font partie du résultat.",
    "Chaque série porte un statut visible : mesure, carotte de glace, proxy (reconstruction indirecte), modèle, ou schéma explicitement simplifié.",
    "La position des continents est une vraie reconstruction publiée, pas un décor : modèle MERDITH2021 (Merdith et al. 2021), servi par le GPlates Web Service d'EarthByte, échantillonné sur 30 âges entre 0 et 900 millions d'années. Au-delà de 900 Ma — Hadéen, Archéen, Grande Oxydation — aucune reconstruction publiée n'existe : la géographie actuelle est alors affichée par défaut et le globe le signale.",
    "Attention à une limite majeure de ces reconstructions : avant environ 200 millions d'années, la longitude des blocs continentaux n'est pas contrainte par les données. Le paléomagnétisme donne la latitude et l'orientation, mais le plancher océanique qui permettrait de retrouver la position est-ouest a été subducté. La forme et la latitude sont fiables ; la longitude est un choix de modèle, et deux modèles concurrents peuvent différer de plusieurs dizaines de degrés. Le globe affiche cet avertissement dès qu'on dépasse 200 Ma.",
    "Le champ de couleur, lui, reste un modèle : il applique une amplification zonale simplifiée à l'anomalie globale de l'époque. Il illustre la structure du réchauffement (amplification polaire, contraste terre-océan), il ne représente pas une reconstruction régionale publiée. Les repères posés sur le globe utilisent les coordonnées actuelles des sites, pas leur paléoposition.",
    "Les courbes basse résolution (CO₂ paléo, cycles glaciaires) sont interpolées entre des points publiés. Elles reproduisent la structure et les amplitudes réelles, pas la résolution des données brutes. Les liens vers les jeux de données sources sont fournis ci-dessous.",
  ],
  modeleZonal:
    "Anomalie locale = anomalie globale × facteur de latitude × facteur de surface. Facteur de latitude : ×3,0 au-dessus de 70° N, " +
    "décroissant jusqu'à ×0,85 aux tropiques, ×0,6 dans l'océan Austral (l'inertie thermique y est très élevée). Facteur de surface : " +
    "×1,4 sur les continents, ×1,0 sur l'océan. Ces ordres de grandeur reprennent la structure décrite dans le GIEC AR6 WG1 " +
    "(amplification arctique, contraste terre-mer, retard de l'océan Austral). C'est une aide à la lecture, pas une donnée.",
  ouvrages: [
    { t: "GIEC (IPCC), Sixième rapport d'évaluation, AR6 — WG1 (2021), WG2 et WG3 (2022)", n: "La référence. Les Résumés pour décideurs (SPM) sont lisibles et font 30 à 40 pages.", u: "https://www.ipcc.ch/assessment-report/ar6/" },
    { t: "William F. Ruddiman, Earth's Climate: Past and Future (4ᵉ éd., 2021)", n: "Le manuel de référence sur le climat à l'échelle géologique. C'est la colonne vertébrale de la partie « Histoire » de cette application." },
    { t: "Andrew Dessler, Introduction to Modern Climate Change (3ᵉ éd., 2021)", n: "Le meilleur point d'entrée rigoureux et court sur la physique du problème." },
    { t: "John Houghton, Global Warming: The Complete Briefing (5ᵉ éd.)", n: "Classique, écrit par un ancien coprésident du groupe I du GIEC." },
    { t: "Valérie Masson-Delmotte, Climat : le vrai et le faux", n: "En français, par la coprésidente du groupe I pour AR6. Traite frontalement les idées reçues." },
    { t: "Jean-Marc Jancovici & Christophe Blain, Le Monde sans fin (2021)", n: "En français, sur le lien énergie-climat. Prise de position assumée sur le nucléaire, à lire comme telle." },
    { t: "Christophe Bonneuil & Jean-Baptiste Fressoz, L'Événement Anthropocène", n: "L'histoire politique et sociale de la trajectoire, en complément de la physique." },
    { t: "Friedlingstein et al., Global Carbon Budget (annuel, Earth System Science Data)", n: "Le bilan carbone mondial actualisé chaque année. C'est la source des chiffres d'émissions de cette application.", u: "https://globalcarbonbudget.org/" },
  ],
  jeuxDonnees: [
    { t: "NOAA Global Monitoring Laboratory — CO₂ Mauna Loa", u: "https://gml.noaa.gov/ccgg/trends/" },
    { t: "NOAA Paleoclimatology — carottes de glace (EPICA, Vostok, Law Dome)", u: "https://www.ncei.noaa.gov/products/paleoclimatology" },
    { t: "OMM — State of the Global Climate", u: "https://wmo.int/publication-series/state-of-global-climate" },
    { t: "Copernicus Climate Change Service", u: "https://climate.copernicus.eu/" },
    { t: "NSIDC — banquise arctique et antarctique", u: "https://nsidc.org/arcticseaicenews/" },
    { t: "Global Carbon Budget", u: "https://globalcarbonbudget.org/" },
    { t: "Climate Action Tracker — trajectoires de réchauffement", u: "https://climateactiontracker.org/" },
  ],
  narration:
    "Les textes de narration sont une réécriture des mêmes faits dans un registre de voix off : " +
    "phrases courtes, présent de narration, chiffres arrondis pour être audibles. Aucun fait n'y est " +
    "ajouté par rapport au texte écrit et à ses sources. Les nombres y sont écrits en toutes lettres " +
    "uniquement pour que la synthèse vocale les prononce correctement.",
  articlesCles: [
    "Hoffman et al. 1998, Science — A Neoproterozoic Snowball Earth",
    "Lüthi et al. 2008, Nature — CO₂ record 650 000 à 800 000 ans",
    "Zeebe, Ridgwell & Zachos 2016, Nature Geoscience — taux d'injection du carbone actuel vs PETM",
    "Westerhold et al. 2020, Science — CENOGRID, 66 Ma de climat cénozoïque",
    "Foster, Royer & Lunt 2017, Nature Communications — CO₂ sur 420 Ma",
    "Armstrong McKay et al. 2022, Science — points de bascule",
    "Rantanen et al. 2022, Comm. Earth & Environment — amplification arctique 4×",
    "PAGES 2k Consortium 2019, Nature Geoscience — cohérence spatiale du réchauffement",
    "Shakun et al. 2012, Nature — relation CO₂/température à la dernière déglaciation",
    "Friedlingstein et al. 2024, ESSD — Global Carbon Budget 2024",
  ],
};

/* ---------------------------------------------------------------------
   7 bis. SURFACES DE TEMPS PROFOND
   Au-delà de 900 Ma, aucune reconstruction de continents n'existe.
   Plutôt que d'afficher la géographie actuelle (faux) ou des continents
   inventés (pire), on représente l'ÉTAT DE SURFACE, qui lui est documenté :
   océan de magma, puis monde océanique sans terres émergées notables.
   ------------------------------------------------------------------- */
export const SURFACES = {
  hadeen: {
    type: "magma",
    titre: "Océan de magma",
    quoi: "Aucun continent. Après l'impact géant, la surface est fondue sur des centaines de kilomètres de profondeur. " +
      "Une croûte basaltique se forme, se brise et se refond. Il n'y a rien à cartographier.",
    faits: [
      { t: "L'impact qui forme la Lune refond la Terre : océan de magma global, refroidi en quelques millions d'années.", s: "Elkins-Tanton 2012, Annu. Rev. Earth Planet. Sci." },
      { t: "L'eau liquide est attestée dès 4,4 Ga par les zircons de Jack Hills — les premiers océans arrivent vite.", s: "Wilde et al. 2001, Nature" },
      { t: "Aucune croûte continentale stable n'est conservée de cette période : la plus vieille roche datée a 4,03 Ga.", s: "Gneiss d'Acasta ; Bowring & Williams 1999" },
    ],
    hazeCouleur: 0xff6a2a,
  },
  archeen: {
    type: "ocean",
    // La température archéenne est très mal contrainte (0 à +40 °C selon les proxies).
    // Peindre le globe avec la valeur centrale afficherait une certitude qui n'existe pas :
    // on affiche donc une teinte modérée, et l'incertitude est dite en toutes lettres.
    anomAffichee: 5,
    titre: "Monde océanique",
    quoi: "Des proto-continents existent, mais ils sont peu nombreux, largement submergés — et surtout, " +
      "leur position est inconnue. Ils ne sont donc pas représentés. Le globe montre l'océan global, rien d'autre. " +
      "La teinte est volontairement modérée : la température de l'Archéen est l'une des moins bien contraintes " +
      "de toute l'histoire de la Terre, et un globe écarlate suggérerait une précision qui n'existe pas.",
    faits: [
      { t: "Les terres émergées ne représenteraient que quelques pour cent de la surface du globe vers 3 Ga, contre 28 % aujourd'hui — estimation de modèle, débattue.", s: "Flament, Coltice & Rey 2008, Earth and Planetary Science Letters" },
      { t: "Aucun modèle tectonique publié ne reconstitue la position des blocs continentaux au-delà de 1 milliard d'années.", s: "Merdith et al. 2021, Earth-Science Reviews — limite de couverture du modèle" },
      { t: "L'atmosphère, riche en méthane et dépourvue d'oxygène, portait probablement une brume organique orangée, par intermittence.", s: "Zerkle et al. 2012, Nature Geoscience ; Trainer et al. 2006, PNAS" },
    ],
    hazeCouleur: 0xd98a3a,
  },
  goe: {
    type: "ocean",
    titre: "Monde océanique glacé",
    quoi: "La croûte continentale existe désormais en volume, mais sa position reste hors de portée des modèles. " +
      "Ce que le globe montre ici, c'est l'englacement : les glaciations huroniennes, qui suivent l'effondrement de l'effet de serre du méthane.",
    faits: [
      { t: "Glaciations huroniennes : environ 2,45 à 2,22 Ga, avec des dépôts glaciaires jusqu'aux basses latitudes.", s: "Formation de Gowganda, Ontario ; Kopp et al. 2005, PNAS" },
      { t: "La montée de l'oxygène détruit le méthane atmosphérique : la brume orangée disparaît, le ciel s'éclaircit.", s: "Farquhar et al. 2000, Science ; Kopp et al. 2005" },
      { t: "Position des continents : toujours inconnue à cet âge. Le supercontinent Kenorland est une hypothèse discutée, pas une reconstruction.", s: "Littérature tectonique ; aucun modèle full-plate publié au-delà de 1 Ga" },
    ],
    hazeCouleur: 0x6fa8d8,
  },
};

/* ---------------------------------------------------------------------
   7 ter. ÉVÉNEMENTS ANIMÉS
   Reconstitutions SCHÉMATIQUES. Ce ne sont pas des données : ni les
   trajectoires, ni les échelles de temps de l'animation ne sont réelles.
   L'application l'affiche explicitement pendant chaque animation.
   ------------------------------------------------------------------- */
export const EVENEMENTS = [
  {
    id: "lune", chapitre: "hadeen", duree: 11000,
    nom: "L'impact géant et la naissance de la Lune",
    quand: "il y a ≈ 4,51 milliards d'années",
    resume: "Un corps de la taille de Mars, souvent appelé Théia, percute la Terre. " +
      "L'impact vaporise une partie des deux corps, refond la Terre, et projette en orbite " +
      "un disque de débris dont la Lune s'accrète en quelques dizaines à centaines d'années.",
    faits: [
      { t: "Âge de la Lune : environ 4,51 milliards d'années, d'après les zircons lunaires.", s: "Barboni et al. 2017, Science Advances" },
      { t: "Le modèle de l'impact géant explique le moment cinétique du système Terre-Lune et le faible noyau lunaire.", s: "Canup & Asphaug 2001, Nature" },
      { t: "La Lune stabilise l'obliquité de l'axe terrestre — donc la régularité des saisons, et une partie du rythme des cycles glaciaires.", s: "Laskar, Joutel & Robutel 1993, Nature" },
    ],
    avertissement: "Animation schématique : angle d'impact, vitesse et durée sont illustratifs, pas simulés.",
  },
  {
    id: "oxydation", chapitre: "goe", duree: 8000,
    nom: "La Grande Oxydation",
    quand: "il y a 2,45 à 2,20 milliards d'années",
    resume: "L'oxygène produit par les cyanobactéries sature les puits océaniques et monte dans " +
      "l'atmosphère. Il détruit le méthane, gaz à effet de serre majeur : la brume orangée se dissipe, " +
      "le ciel s'éclaircit, et l'effet de serre s'effondre.",
    faits: [
      { t: "Datation par la disparition du fractionnement isotopique du soufre indépendant de la masse.", s: "Farquhar et al. 2000, Science" },
      { t: "La perte de l'effet de serre du méthane est le mécanisme proposé pour les glaciations huroniennes.", s: "Kopp et al. 2005, PNAS" },
    ],
    avertissement: "Animation schématique : le changement d'atmosphère s'est étalé sur des centaines de millions d'années.",
  },
  {
    id: "trapps", chapitre: "permien", duree: 9000, lat: 67, lon: 95,
    nom: "Les trapps de Sibérie",
    quand: "il y a 252 millions d'années",
    resume: "Une province magmatique s'ouvre en Sibérie et déverse plusieurs millions de kilomètres " +
      "cubes de basaltes sur environ un million d'années. Le magma traverse d'anciens bassins de " +
      "charbon et d'évaporites, libérant un carbone thermogénique qui s'ajoute au CO₂ volcanique.",
    faits: [
      { t: "Volume estimé : de l'ordre de 3 millions de km³ de basaltes.", s: "Burgess & Bowring 2015, Science Advances" },
      { t: "Réchauffement des eaux tropicales de +8 à +10 °C, acidification, anoxie, puis extinction de ~81 % des espèces marines.", s: "Joachimski et al. 2012 ; Clarkson et al. 2015 ; Stanley 2016" },
    ],
    avertissement: "Animation schématique : l'éruption a duré environ un million d'années, pas quelques secondes.",
  },
  {
    id: "chicxulub", chapitre: "kpg", duree: 9000, lat: 21.4, lon: -89.5,
    nom: "L'impact de Chicxulub",
    quand: "il y a 66,04 millions d'années",
    resume: "Un astéroïde d'environ 10 kilomètres frappe la péninsule du Yucatán. L'impact vaporise " +
      "des roches riches en sulfates et injecte poussières et aérosols dans la stratosphère. " +
      "La photosynthèse s'effondre, un hiver d'impact s'installe pour quelques années.",
    faits: [
      { t: "Impact daté à 66,04 ± 0,03 millions d'années ; cratère d'environ 180 km de diamètre.", s: "Renne et al. 2013, Science ; forage IODP-ICDP 364" },
      { t: "Environ 75 % des espèces disparaissent, dont tous les dinosaures non-aviens.", s: "Schulte et al. 2010, Science" },
      { t: "Puis le CO₂ libéré réchauffe la planète pendant des dizaines de milliers d'années : refroidissement bref, réchauffement long.", s: "Vellekoop et al. 2014, PNAS" },
    ],
    avertissement: "Animation schématique : trajectoire, vitesse et durée sont illustratives, pas simulées.",
  },
  {
    id: "boule", chapitre: "snowball", duree: 9000,
    nom: "La Terre boule de neige",
    quand: "il y a 717 à 635 millions d'années",
    resume: "La glace quitte les pôles, gagne les moyennes latitudes, atteint les tropiques. " +
      "Chaque avancée renvoie davantage de lumière vers l'espace, ce qui refroidit encore : " +
      "la rétroaction de l'albédo s'emballe et la planète bascule.",
    faits: [
      { t: "Dépôts glaciaires retrouvés à des paléolatitudes inférieures à 10°.", s: "Hoffman et al. 1998, Science" },
      { t: "Sortie de crise par accumulation de CO₂ volcanique, l'altération des roches étant bloquée sous la glace.", s: "Hoffman & Schrag 2002, Terra Nova" },
    ],
    avertissement: "Animation schématique : l'englacement s'est étalé sur des millions d'années.",
  },
];

/* ---------------------------------------------------------------------
   8. PARCOURS — « Comprendre en 10 minutes »
   Huit stations. Une thèse : la vitesse. Une fin : le pouvoir d'agir.
   C'est la porte d'entrée de l'application ; les 17 chapitres sont
   l'approfondissement, pas le passage obligé.
   ------------------------------------------------------------------- */
export const PARCOURS = [
  {
    id: "parenthese", chapitre: "holocene",
    numero: "La parenthèse",
    titre: "Tout ce que nous appelons civilisation tient dans un demi-degré",
    phrase: "Depuis 11 700 ans, la température de la planète n'a pratiquement pas bougé. " +
      "C'est dans ce calme, et seulement dans ce calme, que nous avons appris à cultiver, " +
      "à bâtir des villes et à écrire.",
    points: [
      { t: "Variabilité de la température globale sur tout l'Holocène : de l'ordre de ±0,5 °C.", s: "Marcott et al. 2013, Science ; Kaufman et al. 2020" },
      { t: "Chaque port, chaque zone agricole, chaque delta habité a été choisi en fonction de ce climat-là. Nous n'avons jamais rien connu d'autre.", s: "GIEC AR6 WG2, chap. 8" },
    ],
  },
  {
    id: "echelle", chapitre: "quaternaire",
    numero: "L'échelle",
    titre: "Cinq degrés, ce n'est pas « un peu plus chaud ». C'est un autre monde.",
    phrase: "Il y a 21 000 ans, la Terre était 4 à 6 °C plus froide qu'aujourd'hui. " +
      "Trois kilomètres de glace couvraient le Canada et la Scandinavie. Le niveau des mers " +
      "était 120 mètres plus bas. On passait à pied de la Belgique à l'Angleterre.",
    points: [
      { t: "Dernier Maximum Glaciaire : −4 à −6 °C par rapport au préindustriel, niveau marin −120 m.", s: "Tierney et al. 2020, Nature ; GIEC AR6 WG1" },
      { t: "Voilà ce que valent quelques degrés de moyenne globale. La trajectoire actuelle nous emmène vers +2,6 à +3,1 °C — dans l'autre sens.", s: "PNUE Emissions Gap Report 2024" },
    ],
  },
  {
    id: "carbone", chapitre: "carbonifere",
    numero: "L'origine",
    titre: "Nous rendons en deux siècles ce que la vie a mis 60 millions d'années à enfouir",
    phrase: "Le charbon, le pétrole et le gaz sont du carbone que la biosphère a lentement " +
      "retiré de l'atmosphère et enterré. Nous le remettons en circulation à une vitesse " +
      "sans commune mesure avec celle qui l'a stocké.",
    points: [
      { t: "Les grands bassins houillers se forment au Carbonifère, entre −359 et −299 millions d'années.", s: "Montañez & Poulsen 2013, Annu. Rev. Earth Planet. Sci." },
      { t: "Émissions fossiles mondiales en 2024 : 37,4 GtCO₂. Avec l'usage des sols : environ 41,6 GtCO₂.", s: "Global Carbon Budget 2024, Friedlingstein et al., ESSD" },
    ],
  },
  {
    id: "vitesse", chapitre: "petm",
    numero: "La vitesse",
    titre: "Ce n'est pas la première fois. C'est la plus rapide.",
    phrase: "Il y a 56 millions d'années, une injection massive de carbone a réchauffé la " +
      "planète de 5 à 8 °C et acidifié les océans. Les géologues en font un événement majeur. " +
      "Nous reproduisons cette injection au moins dix fois plus vite.",
    points: [
      { t: "PETM : 3 000 à 7 000 Gt de carbone injectées sur 3 000 à 20 000 ans.", s: "Gutjahr et al. 2017, Nature ; Zeebe et al. 2009" },
      { t: "Le taux d'injection actuel est au moins dix fois supérieur à celui du PETM.", s: "Zeebe, Ridgwell & Zachos 2016, Nature Geoscience" },
      { t: "C'est le cœur du problème. Ce n'est pas la chaleur en soi, c'est le temps que nous laissons aux écosystèmes — et aux sociétés — pour s'y adapter.", s: "GIEC AR6 WG2, SPM B.4" },
    ],
  },
  {
    id: "savoir", chapitre: "industrie",
    numero: "Le savoir",
    titre: "Ce n'est pas une découverte récente. Nous savons depuis 1896.",
    phrase: "La physique de l'effet de serre a été établie au XIX siècle, et l'ordre de " +
      "grandeur du réchauffement calculé à la main en 1896. Le débat n'a jamais porté sur la science.",
    points: [
      { t: "Fourier 1824, Foote 1856, Tyndall 1859 : l'absorption du rayonnement infrarouge par le CO₂ est mesurée en laboratoire.", s: "Annales de Chimie ; American Journal of Science ; Phil. Trans. R. Soc." },
      { t: "Arrhenius 1896 calcule qu'un doublement du CO₂ réchaufferait la Terre de 5 à 6 °C. Le GIEC répond aujourd'hui 3 °C, entre 2,5 et 4.", s: "Philosophical Magazine ; GIEC AR6 WG1 SPM A.4.4" },
    ],
  },
  {
    id: "constat", chapitre: "moderne",
    numero: "Où nous en sommes",
    titre: "425 ppm, +1,55 °C, et 91 % de la chaleur cachée dans l'océan",
    phrase: "Le CO₂ atmosphérique n'a pas dépassé 300 ppm une seule fois en 800 000 ans. " +
      "Il est aujourd'hui à 425. 2024 a été l'année la plus chaude jamais mesurée.",
    points: [
      { t: "CO₂ : 424,6 ppm en moyenne annuelle 2024. Plafond des 800 000 dernières années : 300 ppm.", s: "NOAA GML ; EPICA Dome C, Lüthi et al. 2008" },
      { t: "2024 : +1,55 °C au-dessus de 1850-1900. Les dix années les plus chaudes mesurées sont les dix dernières.", s: "OMM, State of the Global Climate 2024" },
      { t: "91 % de l'excès de chaleur est parti dans l'océan. Ce que nous ressentons dans l'air est une petite partie du déséquilibre réel.", s: "GIEC AR6 WG1 chap. 7 ; von Schuckmann et al. 2020" },
    ],
  },
  {
    id: "bifurcation", chapitre: "futur",
    numero: "La bifurcation",
    titre: "L'écart entre +1,5 °C et +4 °C n'est pas de la physique. C'est une décision.",
    phrase: "Les scénarios du GIEC ne sont pas des prédictions : ce sont des mondes différents, " +
      "selon ce que nous faisons. Et l'écart entre eux est immense.",
    points: [
      { t: "SSP1-1.9 : +1,4 °C en 2100. SSP2-4.5 : +2,7 °C. SSP5-8.5 : +4,4 °C.", s: "GIEC AR6 WG1, tableau SPM.1" },
      { t: "Politiques actuellement mises en œuvre : environ +2,6 à +3,1 °C.", s: "PNUE Emissions Gap Report 2024 ; Climate Action Tracker" },
      { t: "Les récifs coralliens tropicaux : 70 à 90 % perdus à +1,5 °C, plus de 99 % à +2 °C. Un demi-degré n'est jamais un détail.", s: "GIEC SR1.5, SPM B.4.2" },
    ],
  },
  {
    id: "agir", chapitre: "futur", final: true,
    numero: "Ce qui dépend de nous",
    titre: "Chaque tonne compte, et le compteur s'arrête quand nous nous arrêtons",
    phrase: "C'est le résultat le plus important du dernier rapport du GIEC, et le moins connu : " +
      "le réchauffement cesse pratiquement dès que les émissions nettes de CO₂ atteignent zéro. " +
      "Il n'y a pas de décennies de hausse inévitable « dans les tuyaux ».",
    points: [
      { t: "La température monte proportionnellement au CO₂ cumulé : environ 0,45 °C par 1000 GtCO₂. Le réchauffement s'arrête au net zéro.", s: "GIEC AR6 WG1, SPM D.1.1 et D.1.8" },
      { t: "Conséquence directe : il n'existe aucun seuil au-delà duquel agir deviendrait inutile. Il existe seulement des seuils au-delà desquels certains dommages ne se réparent plus.", s: "GIEC AR6 WG1, SPM D.1" },
      { t: "Les solutions existent et sont chiffrées : le GIEC estime qu'une réduction de moitié des émissions d'ici 2030 est atteignable, et qu'une large part de ce potentiel coûte moins de 20 $ la tonne — voire rapporte de l'argent.", s: "GIEC AR6 WG3, SPM C.12 et fig. SPM.7" },
      { t: "Du côté de la demande, les changements d'usage et d'infrastructure peuvent réduire de 40 à 70 % les émissions d'usage final d'ici 2050.", s: "GIEC AR6 WG3, SPM C.10" },
    ],
    conclusion:
      "Ce n'est pas la planète qu'il faut sauver. Elle a survécu à une Terre entièrement gelée, " +
      "aux trapps de Sibérie et à un astéroïde de dix kilomètres. Dans dix millions d'années, elle ira très bien.\n\n" +
      "Ce qu'il faut sauver, c'est la parenthèse. Ces onze mille ans de climat stable dans lesquels " +
      "nous avons appris à vivre, et dont dépend absolument tout ce que nous avons bâti.\n\n" +
      "Cette parenthèse, nous sommes la première espèce à pouvoir la refermer. " +
      "Et la seule à pouvoir décider de la garder ouverte.",
  },
];

/* Leviers individuels : ce qui pèse réellement, par ordre de grandeur.
   Sujet où circulent beaucoup de chiffres faux — chacun est sourcé. */
export const AGIR = {
  intro: "« Que puis-je faire ? » La réponse honnête tient en deux temps : quelques choix personnels pèsent " +
    "vraiment lourd, et quelques leviers non-consuméristes pèsent encore plus — mais on n'en parle presque jamais.",
  personnels: [
    { t: "Se passer de voiture individuelle, ou passer à l'électrique", d: "Le transport routier représente environ 12 % des émissions mondiales de CO₂. En Europe, la voiture est souvent le premier poste d'un ménage.", s: "AIE ; GIEC AR6 WG3 chap. 10" },
    { t: "Réduire l'avion, en particulier les vols long-courriers", d: "L'aviation pèse environ 2,5 % des émissions mondiales de CO₂, mais elle est extrêmement concentrée : une minorité de la population mondiale prend l'avion, et quelques vols suffisent à dominer un bilan individuel.", s: "Lee et al. 2021, Atmospheric Environment ; Gössling & Humpe 2020" },
    { t: "Chauffage : isolation et pompe à chaleur", d: "Le bâtiment représente un potentiel d'atténuation d'environ 2,2 GtCO₂-eq par an d'ici 2030, dont une large part à coût net négatif.", s: "GIEC AR6 WG3, fig. SPM.7" },
    { t: "Moins de viande, surtout de ruminants", d: "Le système alimentaire représente environ un tiers des émissions mondiales de gaz à effet de serre ; l'élevage en est la principale composante.", s: "Crippa et al. 2021, Nature Food" },
  ],
  leviers: [
    { t: "Votre métier", d: "C'est presque toujours le levier le plus puissant, et le plus négligé. Une décision professionnelle — un cahier des charges, un choix de fournisseur, un contrat d'énergie, une spécification technique — engage des ordres de grandeur qu'aucun choix domestique n'atteint.", s: "GIEC AR6 WG3, chap. 5 sur les acteurs du changement" },
    { t: "Votre épargne et votre pension", d: "L'argent placé finance des activités. Le fléchage de l'épargne est identifié par le GIEC comme un levier structurel, et les flux financiers actuels restent très en deçà de ce qu'exigent les trajectoires compatibles avec Paris.", s: "GIEC AR6 WG3, SPM B.5.4 et E.5" },
    { t: "Votre vote et votre voix publique", d: "Les leviers dominants sont politiques et infrastructurels : prix du carbone, normes, réseaux, urbanisme. Ils ne relèvent pas du choix individuel de consommation.", s: "GIEC AR6 WG3, SPM E.3 et E.4" },
    { t: "Les gens autour de vous", d: "Les normes sociales sont un moteur documenté de diffusion : les comportements et les équipements se propagent par imitation dans les réseaux proches, bien plus que par l'information seule.", s: "Creutzig et al. 2022, Nature Climate Change ; GIEC AR6 WG3 chap. 5" },
  ],
  avertissement:
    "Un mot sur les proportions. Les 10 % les plus émetteurs de la planète sont responsables d'environ 48 % " +
    "des émissions liées à la consommation ; les 50 % les moins émetteurs, d'environ 12 %. La responsabilité " +
    "n'est pas répartie également, et les marges de manœuvre non plus.",
  avertissementSource: "GIEC AR6 WG3, SPM B.3.4 ; Chancel 2022, Nature Sustainability",
};

/* ---------------------------------------------------------------------
   9. NARRATION — le même récit, écrit pour être dit
   Registre de voix off documentaire. Aucun fait ajouté par rapport aux
   sections `recit` et `faits` : c'est une réécriture, pas un supplément.
   Les nombres sont en toutes lettres pour la synthèse vocale.
   ------------------------------------------------------------------- */
export const NARRATIONS = {
  hadeen: [
    "Il n'y a pas encore de continents. Pas d'océans. Pas de ciel bleu.",
    "Il y a quatre milliards cinq cent quarante millions d'années, la Terre est une bille de roche en fusion, frappée sans relâche par les débris de sa propre naissance.",
    "Puis un monde de la taille de Mars vient la percuter. De cette collision naîtra la Lune.",
    "Le Soleil, à cette époque, ne brille qu'aux sept dixièmes de sa puissance actuelle. La Terre aurait dû être un désert de glace.",
    "Elle ne l'est pas. Car son atmosphère est saturée de gaz carbonique, et ce gaz retient la chaleur.",
    "Retenez bien cela. Le gaz qui a rendu la Terre habitable est celui-là même dont nous parlerons jusqu'à la fin de cette histoire.",
  ],
  archeen: [
    "La roche a refroidi. L'eau est là. Et dans cette eau, quelque chose commence.",
    "Il y a trois milliards cinq cents millions d'années, des colonies de microbes construisent des dômes de calcaire au bord des lagons. Ce sont les plus anciennes traces de vie que nous sachions lire.",
    "L'air est irrespirable. Pas d'oxygène. Du gaz carbonique, du méthane, de l'azote.",
    "Et pendant ce temps, sans que personne ne le décide, un mécanisme se met en place. La pluie attaque la roche. La roche capture le carbone. Le carbone descend au fond des océans.",
    "Quand la Terre a trop chaud, ce mécanisme s'emballe et la refroidit. Quand elle a trop froid, il ralentit et la laisse se réchauffer.",
    "Un thermostat. Un vrai. Il fonctionne encore aujourd'hui.",
    "Mais il lui faut cent mille ans pour réagir. Souvenez-vous de ce chiffre.",
  ],
  goe: [
    "Les microbes ont appris à se nourrir de lumière. Et ils rejettent un déchet.",
    "Ce déchet, c'est l'oxygène.",
    "Pendant des centaines de millions d'années, le fer dissous dans l'océan le dévore et rouille au fond des mers. Ces rouilles sont aujourd'hui nos mines de fer.",
    "Puis, il y a deux milliards quatre cents millions d'années, l'océan sature. L'oxygène monte dans le ciel.",
    "Et il détruit le méthane. L'effet de serre s'effondre.",
    "La planète gèle. Longtemps.",
    "Une forme de vie venait de modifier l'atmosphère du monde entier, et de bouleverser son climat.",
    "Ce n'était que la première fois.",
  ],
  snowball: [
    "Il y a sept cent vingt millions d'années, la glace descend.",
    "Elle quitte les pôles. Elle gagne les moyennes latitudes. Elle atteint les tropiques.",
    "Plus la glace s'étend, plus elle renvoie la lumière du Soleil vers l'espace. Plus elle renvoie la lumière, plus il fait froid. Plus il fait froid, plus la glace s'étend.",
    "La Terre bascule. Elle devient blanche.",
    "Et sous cette carapace, le thermostat est débranché. La pluie ne peut plus attaquer la roche. Le carbone ne peut plus être capturé.",
    "Mais les volcans, eux, n'ont pas cessé. Pendant des millions d'années, ils remplissent le ciel de gaz carbonique.",
    "Jusqu'à ce que la chaleur revienne, et fasse fondre un monde entier.",
    "La Terre sait se réparer. Mais elle prend son temps. Et elle ne demande pas notre avis.",
  ],
  paleozoique: [
    "La vie sort de l'eau.",
    "D'abord des tapis. Puis des tiges. Puis des racines. Puis du bois. En cent millions d'années, les continents passent du gris au vert.",
    "Et ces racines font quelque chose d'énorme. Elles brisent la roche. Elles offrent à la pluie une surface immense à attaquer. Le carbone est capturé plus vite qu'il n'est émis.",
    "Le gaz carbonique s'effondre. De plusieurs milliers de parties par million, il tombe à quelques centaines.",
    "Le monde se refroidit.",
    "Ce n'est pas une catastrophe. C'est simplement la forêt qui vient de prendre le contrôle du thermostat.",
    "Il lui aura fallu cinquante millions d'années.",
  ],
  carbonifere: [
    "Regardez ces marécages.",
    "Des fougères de trente mètres. Des libellules de soixante-dix centimètres d'envergure. Un air chargé à plus de trente pour cent d'oxygène.",
    "Chaque arbre qui tombe dans l'eau ne pourrit pas complètement. Il s'enfonce. Il se tasse. Il se transforme.",
    "Pendant soixante millions d'années, cette forêt enterre du carbone. Des milliards et des milliards de tonnes.",
    "Ce carbone porte un nom. Nous l'appelons le charbon.",
    "Sous vos pieds, dans le sillon Sambre-et-Meuse, dans la Ruhr, au pays de Galles, il est encore là.",
    "Et voilà ce qu'il faut comprendre. Ce que la vie a mis soixante millions d'années à retirer de l'air, nous le lui rendons en deux siècles.",
  ],
  permien: [
    "Il y a deux cent cinquante-deux millions d'années, la Sibérie s'ouvre.",
    "Pas une éruption. Un million d'années d'éruptions. Des millions de kilomètres cubes de lave, qui traversent en chemin d'anciens bassins de charbon, et les brûlent.",
    "Le gaz carbonique inonde l'atmosphère. La température monte de huit, peut-être dix degrés.",
    "Les océans s'acidifient. Puis ils perdent leur oxygène. Puis ils deviennent silencieux.",
    "Quatre-vingt-un pour cent des espèces marines disparaissent. La vie mettra des millions d'années à s'en relever.",
    "Les géologues appellent cela la Grande Mourrure.",
    "Le carbone, la chaleur, l'acide, l'asphyxie. Cet enchaînement n'est pas une théorie. Il a déjà eu lieu.",
  ],
  cretace: [
    "Oubliez les calottes polaires. Il n'y en a pas.",
    "Il y a cent millions d'années, des forêts poussent au-delà du cercle arctique. Des crocodiliens nagent là où il y aura la banquise.",
    "Le gaz carbonique est peut-être quatre fois plus abondant qu'aujourd'hui.",
    "Et sans glace sur les continents, toute cette eau est dans les océans. Le niveau des mers est cent, deux cents mètres plus haut. Des mers intérieures traversent l'Amérique du Nord, l'Europe et l'Afrique.",
    "Ce n'est pas un monde mort. C'est un monde luxuriant.",
    "Mais posez une carte de nos villes sur celle-ci. Et demandez-vous où elles seraient.",
  ],
  kpg: [
    "Un objet de dix kilomètres. Vingt kilomètres par seconde.",
    "Il touche la Terre au large du Yucatán.",
    "D'abord, le feu. Puis la poussière et le soufre montent dans la stratosphère et voilent le Soleil. La photosynthèse s'arrête. Le froid s'installe pour quelques années.",
    "Trois espèces sur quatre disparaissent. Les dinosaures non-aviens n'y survivent pas.",
    "Puis la poussière retombe. Et le gaz carbonique libéré par l'impact, lui, reste.",
    "Le monde se réchauffe pendant des dizaines de milliers d'années.",
    "Une poignée d'aérosols refroidit pour quelques saisons. Le carbone, lui, chauffe pour des millénaires.",
    "C'est toute la différence entre une pollution et un climat.",
  ],
  petm: [
    "Voici l'événement qui devrait nous intéresser plus que tous les autres.",
    "Il y a cinquante-six millions d'années, entre trois mille et sept mille milliards de tonnes de carbone entrent dans l'atmosphère et dans l'océan.",
    "La planète gagne cinq à huit degrés. Les océans s'acidifient au point de dissoudre le calcaire au fond des mers. Les espèces fuient vers les pôles.",
    "Les géologues lisent cet événement comme une rupture. Ils l'appellent le maximum thermique du Paléocène-Éocène.",
    "Maintenant, la vitesse.",
    "Ce carbone a été injecté sur trois mille à vingt mille ans. Un milliard de tonnes par an, tout au plus.",
    "Nous en émettons aujourd'hui plus de dix milliards de tonnes par an.",
    "Dix fois plus vite. Au moins.",
    "La vie du Paléocène a eu des millénaires pour se déplacer. Nous offrons à la nôtre quelques décennies.",
    "Et le retour à l'équilibre, à l'époque, a demandé cent cinquante mille ans.",
  ],
  cenozoique: [
    "Le monde se refroidit.",
    "L'Inde percute l'Asie et soulève l'Himalaya. Des montagnes neuves, de la roche fraîche, de la pluie. Le carbone est capturé, année après année, pendant cinquante millions d'années.",
    "Il y a trente-quatre millions d'années, un seuil est franchi. La glace prend sur l'Antarctique, et elle ne repartira plus.",
    "Puis, il y a environ trois millions d'années, une époque mérite qu'on s'y arrête.",
    "Le gaz carbonique y était compris entre trois cent cinquante et quatre cent cinquante parties par million. C'est-à-dire exactement là où nous en sommes.",
    "La température était deux et demi à quatre degrés au-dessus de l'ère préindustrielle. Et le niveau des mers, dix à vingt-cinq mètres plus haut qu'aujourd'hui.",
    "Ce n'est pas une prévision pour ce siècle. Les calottes sont lentes.",
    "C'est l'état d'équilibre vers lequel nous avons déjà orienté la planète.",
  ],
  quaternaire: [
    "Depuis deux millions six cent mille ans, la Terre respire.",
    "Cent mille ans de glace. Puis dix mille ans de douceur. Puis la glace revient.",
    "Ce rythme n'est pas un hasard. C'est l'orbite terrestre. Elle s'étire, l'axe s'incline, il oscille. La lumière du Soleil se redistribue entre les saisons et les latitudes.",
    "Mais ces variations sont bien trop faibles pour déplacer le climat de cinq degrés.",
    "Alors la glace de l'Antarctique nous livre la réponse. Dans chaque bulle d'air piégée, le gaz carbonique monte et descend avec la température. Cent quatre-vingts parties par million pendant les glaciations. Deux cent quatre-vingts pendant les périodes douces.",
    "Jamais au-dessus. Pas une seule fois en huit cent mille ans.",
    "Et il y a vingt et un mille ans, au plus froid. Cinq degrés de moins qu'aujourd'hui. Trois kilomètres de glace sur le Canada. Le niveau des mers cent vingt mètres plus bas. On pouvait marcher de la Belgique à l'Angleterre.",
    "Cinq degrés. Retenez ce que cinq degrés veulent dire.",
  ],
  holocene: [
    "Il y a onze mille sept cents ans, la glace se retire. Et quelque chose d'extraordinaire commence.",
    "Rien.",
    "Rien ne se passe. Pendant onze mille ans, la température globale ne bouge pratiquement pas. Un demi-degré de part et d'autre, tout au plus.",
    "C'est dans ce calme que nous avons semé le premier grain. Bâti la première ville. Écrit le premier mot. Tracé les premières frontières.",
    "Chaque port, chaque champ, chaque delta habité a été choisi en fonction de ce climat-là.",
    "Nous n'avons jamais connu autre chose.",
    "Toute notre civilisation tient dans une parenthèse de stabilité.",
  ],
  industrie: [
    "Mille sept cent soixante-neuf. James Watt dépose son brevet.",
    "Le charbon du Carbonifère remonte au jour. Et avec lui, le carbone enfoui depuis trois cents millions d'années.",
    "Et voici ce que peu de gens savent.",
    "Mille huit cent vingt-quatre. Joseph Fourier comprend que l'atmosphère retient la chaleur.",
    "Mille huit cent cinquante-six. Eunice Foote place au soleil un flacon d'air chargé en gaz carbonique, et mesure qu'il chauffe davantage.",
    "Mille huit cent cinquante-neuf. John Tyndall mesure précisément cette absorption.",
    "Mille huit cent quatre-vingt-seize. Svante Arrhenius calcule, à la main, qu'un doublement du gaz carbonique réchaufferait la Terre de cinq à six degrés.",
    "La science d'aujourd'hui, avec ses satellites et ses supercalculateurs, répond trois degrés, entre deux et demi et quatre.",
    "Arrhenius était un peu haut. Il n'était pas loin.",
    "Nous savons depuis cent trente ans.",
  ],
  acceleration: [
    "Après mille neuf cent quarante-cinq, tout accélère en même temps. La population. L'énergie. Les routes. Les engrais. Le commerce.",
    "En mille neuf cent cinquante-huit, un homme installe un appareil au sommet d'un volcan hawaïen. Il s'appelle Charles David Keeling. Il veut simplement savoir combien il y a de gaz carbonique dans l'air.",
    "La première année complète donne trois cent seize parties par million.",
    "Sa courbe monte et descend au fil des saisons. C'est la respiration des forêts de l'hémisphère nord.",
    "Et elle monte. Chaque année. Sans exception.",
    "En mille neuf cent soixante-dix-neuf, l'Académie des sciences américaine remet un rapport. Doubler le gaz carbonique réchaufferait la planète d'environ trois degrés.",
    "Quarante-cinq ans plus tard, ce chiffre n'a pas bougé.",
  ],
  moderne: [
    "Trois cent cinquante-quatre parties par million en mille neuf cent quatre-vingt-dix. Quatre cent vingt-cinq aujourd'hui.",
    "Entre les deux. Rio. Kyoto. Paris. Trente conférences mondiales. Des milliers de pages.",
    "Et trente-sept milliards de tonnes de gaz carbonique rejetées chaque année par les énergies fossiles. Plus que jamais.",
    "Deux mille vingt-quatre a été l'année la plus chaude jamais mesurée. Un degré cinquante-cinq au-dessus de l'ère préindustrielle.",
    "Les dix années les plus chaudes de toute l'histoire des mesures sont les dix dernières.",
    "Et pendant ce temps, l'océan encaisse. Quatre-vingt-onze pour cent de la chaleur en excès y est partie.",
    "Ce que nous ressentons dans l'air, ce n'est même pas trois pour cent de ce qui se passe réellement.",
  ],
  futur: [
    "Ici, l'histoire s'arrête. Parce que la suite n'est pas encore écrite.",
    "Ce que la physique nous dit est simple. Presque brutalement simple. La température monte proportionnellement au carbone total que nous aurons émis. Environ un demi-degré pour mille milliards de tonnes.",
    "Ce qui signifie trois choses.",
    "La première. Le réchauffement s'arrête à peu près quand nos émissions nettes atteignent zéro. Pas cinquante ans plus tard. Quand nous arrêtons.",
    "La deuxième. Chaque tonne compte. Il n'existe aucun seuil au-delà duquel il serait trop tard pour agir. Il existe seulement des seuils au-delà desquels certains dommages ne se répareront plus.",
    "La troisième. L'écart entre un monde à deux degrés et un monde à trois degrés n'est pas une question de physique. C'est une question de décisions.",
    "Quatre milliards et demi d'années nous ont amenés jusqu'ici.",
    "Ce qui vient ensuite tient dans les prochaines décennies.",
    "Et cela, pour la première fois dans toute cette histoire, dépend d'une seule espèce.",
  ],
};
