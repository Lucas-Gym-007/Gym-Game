/*
 * Garage to Gym – 3D-Ansicht mit Three.js.
 * Wird mit esbuild zu js/render3d.bundle.js gebündelt (npm run build).
 * Liest nur den Spielstand und zeichnet ihn – die Simulation bleibt unverändert.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const D = window.GymData;
const Sim = window.GymSim;

// ---------------------------------------------------------------- Materialien

function std(color, metalness, roughness, extra) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

const M = {
  chrome: std(0xe9edf1, 1.0, 0.18),
  metal: std(0xb9c0c8, 0.85, 0.32),
  frame: std(0x353d48, 0.55, 0.42),
  frameLight: std(0x4b5664, 0.5, 0.45),
  dark: std(0x24272c, 0.4, 0.5),
  rubber: std(0x17181b, 0.0, 0.88),
  plate: std(0x1d1f23, 0.25, 0.55),
  plateRed: std(0xb8352a, 0.2, 0.5),
  plateBlue: std(0x2a5fa8, 0.2, 0.5),
  red: std(0xa8382c, 0.0, 0.55),
  mat: std(0x2b5877, 0.0, 0.92),
  wood: std(0xa07a50, 0.0, 0.68),
  cardio: std(0x2b2f35, 0.35, 0.42),
  accent: std(0x39b878, 0.15, 0.45),
  orange: std(0xf09a3e, 0.2, 0.5),
  screen: std(0x0c1218, 0.2, 0.25, { emissive: 0x58c4ff, emissiveIntensity: 0.85 }),
  skin: std(0xefc7a2, 0.0, 0.7),
  pants: std(0x2a313d, 0.0, 0.85),
  shoe: std(0xf1f1f1, 0.0, 0.6),
  bucket: std(0xffcf3f, 0.0, 0.5),
  mop: std(0x8fd3ff, 0.0, 0.8),
};

const HAIR = [0x2b1e16, 0x5a3a22, 0xc8a165, 0x111111, 0x8a4b2a, 0x9a9a9a];
const shirtCache = new Map();
function shirtMat(color) {
  if (!shirtCache.has(color)) shirtCache.set(color, std(new THREE.Color(color).getHex(), 0, 0.75));
  return shirtCache.get(color);
}

// ---------------------------------------------------------------- Bausteine

function shade(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

function box(w, h, d, mat, x, y, z, round) {
  const geo = round ? new RoundedBoxGeometry(w, h, d, 3, Math.min(round, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = shade(new THREE.Mesh(geo, mat));
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

/** Zylinder entlang einer Achse ('x', 'y' oder 'z'). */
function cyl(r, len, mat, axis, x, y, z, seg) {
  const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 20), mat));
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

function group(...children) {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

/** Hantel quer zur z-Achse, liegend. */
function dumbbell(x, y, z, scale) {
  const s = scale || 1;
  return group(
    cyl(0.017 * s, 0.18 * s, M.chrome, 'z', x, y, z),
    cyl(0.055 * s, 0.055 * s, M.plate, 'z', x, y, z - 0.085 * s, 6),
    cyl(0.055 * s, 0.055 * s, M.plate, 'z', x, y, z + 0.085 * s, 6),
  );
}

/** Langhantel entlang der x-Achse mit Scheiben. */
function barbell(len, x, y, z, plateMat) {
  const g = group(cyl(0.022, len, M.chrome, 'x', x, y, z));
  const pm = plateMat || M.plate;
  for (const side of [-1, 1]) {
    const px = x + side * (len / 2 - 0.12);
    g.add(cyl(0.22, 0.06, pm, 'x', px, y, z, 32));
    g.add(cyl(0.17, 0.04, pm, 'x', px - side * 0.055, y, z, 32));
    g.add(cyl(0.035, 0.03, M.chrome, 'x', px + side * 0.05, y, z));
  }
  return g;
}

// ---------------------------------------------------------------- Geräte (Grundausrichtung: Breite entlang x, Tiefe entlang z)

const DEVICE_HEIGHT = { kurzhanteln: 0.9, hantelbank: 1.25, squatrack: 2.35, ergometer: 1.4, laufband: 1.5, kabelzug: 2.35 };

const BUILD = {
  kurzhanteln() {
    const g = group(box(1.86, 0.035, 0.86, M.mat, 0.2, 0.018, 0, 0.012));
    // kleines Hantelregal an der Rückseite
    const rx = -0.42;
    g.add(box(0.05, 0.7, 0.26, M.frame, rx - 0.42, 0.35, -0.27));
    g.add(box(0.05, 0.7, 0.26, M.frame, rx + 0.42, 0.35, -0.27));
    g.add(box(0.9, 0.035, 0.26, M.frameLight, rx, 0.36, -0.27, 0.01));
    g.add(box(0.9, 0.035, 0.26, M.frameLight, rx, 0.64, -0.27, 0.01));
    for (let i = 0; i < 4; i++) {
      g.add(dumbbell(rx - 0.3 + i * 0.2, 0.42, -0.27, 0.8 + i * 0.08));
      g.add(dumbbell(rx - 0.3 + i * 0.2, 0.7, -0.27, 0.7 + i * 0.06));
    }
    g.add(dumbbell(0.55, 0.07, 0.15, 1.1));
    g.add(dumbbell(0.75, 0.07, 0.15, 1.1));
    return g;
  },
  hantelbank() {
    const g = group();
    g.add(box(0.95, 0.07, 0.12, M.frame, -0.1, 0.36, 0));
    for (const lx of [-0.6, 0.3]) {
      g.add(box(0.08, 0.36, 0.08, M.frame, lx, 0.18, 0));
      g.add(box(0.1, 0.05, 0.46, M.frame, lx, 0.025, 0));
    }
    g.add(box(1.05, 0.11, 0.32, M.red, -0.12, 0.46, 0, 0.045));
    // Ablage mit Langhantel
    for (const pz of [-0.3, 0.3]) {
      g.add(box(0.06, 1.0, 0.06, M.frame, 0.6, 0.5, pz));
      g.add(box(0.08, 0.04, 0.05, M.metal, 0.56, 0.96, pz));
    }
    g.add(box(0.12, 0.05, 0.7, M.frame, 0.6, 0.025, 0));
    const bar = barbell(0.98, 0, 0, 0, M.plateRed);
    bar.rotation.y = Math.PI / 2;
    bar.position.set(0.56, 1.0, 0);
    g.add(bar);
    return g;
  },
  squatrack() {
    const g = group(box(1.92, 0.05, 1.92, M.wood, 0, 0.025, 0, 0.01));
    g.add(box(0.7, 0.054, 1.92, M.rubber, 0, 0.026, 0));
    const px = 0.62, pz = 0.55;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = box(0.08, 2.2, 0.08, M.frame, sx * px, 1.15, sz * pz);
      g.add(post);
      for (let h = 0.4; h < 2.1; h += 0.12) g.add(box(0.082, 0.02, 0.02, M.dark, sx * px, h, sz * pz + sz * 0.04));
    }
    for (const sz of [-1, 1]) g.add(box(1.32, 0.08, 0.08, M.frame, 0, 2.21, sz * pz));
    for (const sx of [-1, 1]) {
      g.add(box(0.08, 0.08, 1.18, M.frame, sx * px, 2.21, 0));
      g.add(box(0.05, 0.05, 1.18, M.metal, sx * px, 0.7, 0)); // Sicherheitsablagen
      g.add(box(0.1, 0.06, 0.08, M.orange, sx * px, 1.32, pz + 0.06));
    }
    g.add(barbell(1.9, 0, 1.38, pz + 0.08, M.plateBlue));
    return g;
  },
  ergometer() {
    const g = group(box(0.46, 0.06, 1.55, M.cardio, 0, 0.03, 0.05, 0.02));
    g.add(cyl(0.27, 0.2, M.cardio, 'x', 0, 0.36, -0.5, 32));
    g.add(cyl(0.272, 0.04, M.accent, 'x', 0.09, 0.36, -0.5, 32));
    g.add(cyl(0.272, 0.04, M.accent, 'x', -0.09, 0.36, -0.5, 32));
    const stem = box(0.08, 0.75, 0.08, M.cardio, 0, 0.75, -0.62);
    g.add(stem);
    g.add(box(0.52, 0.04, 0.06, M.metal, 0, 1.12, -0.6, 0.015));
    const con = box(0.26, 0.17, 0.05, M.cardio, 0, 1.24, -0.64, 0.02);
    con.rotation.x = -0.4;
    g.add(con);
    const scr = box(0.2, 0.11, 0.01, M.screen, 0, 1.25, -0.61);
    scr.rotation.x = -0.4;
    g.add(scr);
    const tube = box(0.09, 0.09, 0.95, M.cardio, 0, 0.42, -0.05);
    tube.rotation.x = 0.35;
    g.add(tube);
    g.add(box(0.07, 0.42, 0.07, M.cardio, 0, 0.5, 0.36));
    g.add(box(0.3, 0.08, 0.36, M.rubber, 0, 0.74, 0.38, 0.035));
    for (const sx of [-1, 1]) g.add(box(0.1, 0.03, 0.06, M.dark, sx * 0.17, 0.34, -0.12));
    return g;
  },
  laufband() {
    const g = group(box(0.82, 0.14, 1.86, M.cardio, 0, 0.07, 0.02, 0.03));
    g.add(box(0.62, 0.02, 1.62, M.rubber, 0, 0.15, 0.08));
    for (const sx of [-1, 1]) {
      g.add(box(0.09, 0.025, 1.62, M.accent, sx * 0.36, 0.15, 0.08));
      g.add(box(0.06, 1.05, 0.07, M.cardio, sx * 0.34, 0.62, -0.78));
      g.add(cyl(0.022, 0.5, M.metal, 'z', sx * 0.34, 1.0, -0.52));
    }
    const con = box(0.78, 0.12, 0.3, M.cardio, 0, 1.18, -0.74, 0.04);
    con.rotation.x = -0.5;
    g.add(con);
    const scr = box(0.42, 0.015, 0.17, M.screen, 0, 1.25, -0.72);
    scr.rotation.x = -0.5;
    g.add(scr);
    return g;
  },
  kabelzug() {
    const g = group(box(1.96, 0.04, 0.9, M.dark, 0, 0.02, 0, 0.01));
    for (const sx of [-1, 1]) {
      const tx = sx * 0.78;
      for (const pz of [-0.2, 0.2]) g.add(box(0.07, 2.2, 0.07, M.frame, tx, 1.12, pz));
      g.add(box(0.07, 2.2, 0.07, M.frame, tx + sx * 0.14, 1.12, 0));
      for (let i = 0; i < 12; i++) g.add(box(0.2, 0.06, 0.26, i % 4 === 0 ? M.frameLight : M.plate, tx, 0.09 + i * 0.065, 0, 0.01));
      g.add(cyl(0.012, 1.3, M.chrome, 'y', tx - 0.05, 1.4, 0));
      g.add(cyl(0.012, 1.3, M.chrome, 'y', tx + 0.05, 1.4, 0));
      g.add(box(0.24, 0.08, 0.3, M.frame, tx, 1.0, 0));
      g.add(cyl(0.06, 0.03, M.metal, 'z', tx - sx * 0.15, 2.05, 0.2));
      g.add(cyl(0.005, 0.9, M.dark, 'y', tx - sx * 0.15, 1.6, 0.22));
      g.add(box(0.14, 0.03, 0.03, M.rubber, tx - sx * 0.15, 1.14, 0.22));
    }
    g.add(box(1.76, 0.1, 0.14, M.frame, 0, 2.24, 0));
    g.add(box(1.76, 0.06, 0.06, M.orange, 0, 2.12, 0.08));
    return g;
  },
};

function buildDevice(kind) {
  const g = BUILD[kind]();
  g.traverse((o) => { if (o.isMesh) o.userData.kind = kind; });
  return g;
}

// ---------------------------------------------------------------- Figuren

function makePerson(shirtColor, hairColor, role) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shirt = shirtMat(shirtColor);

  const legs = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.075, 0.5, 0);
    const leg = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.32, 4, 10), M.pants));
    leg.position.y = -0.22;
    pivot.add(leg);
    pivot.add(box(0.1, 0.06, 0.17, M.shoe, 0, -0.46, 0.03, 0.025));
    body.add(pivot);
    legs.push(pivot);
  }
  const torso = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.26, 6, 14), shirt));
  torso.position.y = 0.77;
  torso.scale.z = 0.72;
  body.add(torso);

  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.18, 0.93, 0);
    const upper = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 4, 8), shirt));
    upper.position.y = -0.09;
    pivot.add(upper);
    const fore = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.16, 4, 8), M.skin));
    fore.position.y = -0.27;
    pivot.add(fore);
    body.add(pivot);
    arms.push(pivot);
  }
  const head = shade(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), M.skin));
  head.position.y = 1.15;
  body.add(head);
  const hair = shade(new THREE.Mesh(new THREE.SphereGeometry(0.117, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), std(hairColor, 0, 0.8)));
  hair.position.y = 1.16;
  hair.rotation.x = -0.25;
  body.add(hair);

  if (role === 'cleaner') {
    const bucket = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 16), M.bucket));
    bucket.position.set(0.32, 0.08, 0.1);
    root.add(bucket);
    const mop = group(cyl(0.012, 1.1, M.metal, 'y', 0, 0.55, 0), box(0.24, 0.04, 0.08, M.mop, 0, 0.02, 0));
    mop.position.set(-0.25, 0, 0.18);
    mop.rotation.z = 0.25;
    root.add(mop);
    arms[0].rotation.x = -0.5;
  }
  root.scale.setScalar(1.18);
  return { root, body, legs, arms };
}

// ---------------------------------------------------------------- Sprites (Stimmung, Beschriftungen)

const spriteTexCache = new Map();

function canvasTexture(key, w, h, draw) {
  if (spriteTexCache.has(key)) return spriteTexCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  spriteTexCache.set(key, tex);
  return tex;
}

function moodTexture(color, waiting, badge) {
  return canvasTexture(`mood:${color}:${waiting}:${badge || ''}`, 96, 96, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(48, 51, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(48, 46, 30, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
    ctx.fillStyle = '#1b1e22';
    if (waiting) {
      for (const dx of [-12, 0, 12]) { ctx.beginPath(); ctx.arc(48 + dx, 47, 4.5, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // kleines Gesicht
      ctx.beginPath(); ctx.arc(38, 40, 4, 0, Math.PI * 2); ctx.arc(58, 40, 4, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#1b1e22'; ctx.lineCap = 'round';
      ctx.beginPath();
      if (color === '#3fcf6a') ctx.arc(48, 50, 11, 0.15 * Math.PI, 0.85 * Math.PI);
      else if (color === '#f2c23a') { ctx.moveTo(38, 57); ctx.lineTo(58, 57); }
      else ctx.arc(48, 66, 11, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    }
    if (badge) {
      ctx.fillStyle = badge === 'P' ? '#ffffff' : '#ffd24a';
      ctx.beginPath(); ctx.arc(76, 20, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(badge, 76, 21);
    }
  });
}

function labelTexture(text, bg, fg) {
  return canvasTexture(`label:${text}:${bg}:${fg}`, 256, 80, (ctx, w, h) => {
    ctx.fillStyle = bg;
    const r = 22;
    ctx.beginPath();
    ctx.moveTo(r, 4); ctx.arcTo(w - 4, 4, w - 4, h - 4, r); ctx.arcTo(w - 4, h - 4, 4, h - 4, r);
    ctx.arcTo(4, h - 4, 4, 4, r); ctx.arcTo(4, 4, w - 4, 4, r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fg || '#fff';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

function makeSprite(tex, scaleX, scaleY) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(scaleX, scaleY, 1);
  s.renderOrder = 10;
  return s;
}

function moodColor(score) {
  if (score >= 70) return '#3fcf6a';
  if (score >= 50) return '#f2c23a';
  return '#e5533d';
}

function heatCss(v) {
  const t = Math.max(0, Math.min(1, v));
  return `rgba(${Math.round(60 + t * 190)},${Math.round(200 - t * 140)},70,0.92)`;
}

// ---------------------------------------------------------------- Raum

function floorTexture(stage, W, H) {
  return canvasTexture(`floor:${stage}`, W * 64, H * 64, (ctx, w, h) => {
    const keller = stage > 0;
    ctx.fillStyle = keller ? '#4a4e55' : '#8c877f';
    ctx.fillRect(0, 0, w, h);
    // Struktur: Beton-Sprenkel bzw. Gummiboden mit bunten Flocken
    const n = w * h / 18;
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      if (keller) {
        const c = Math.random();
        ctx.fillStyle = c < 0.07 ? 'rgba(90,170,220,0.55)' : c < 0.12 ? 'rgba(230,230,230,0.35)' : 'rgba(0,0,0,0.18)';
      } else {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
      }
      ctx.fillRect(x, y, keller ? 1.6 : 2, keller ? 1.6 : 2);
    }
    if (!keller) {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(60,50,40,0.06)';
        ctx.beginPath(); ctx.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 60, 20 + Math.random() * 40, Math.random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = keller ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = keller ? 2 : 1.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += 64) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  });
}

function backWallTexture(stage, W) {
  return canvasTexture(`wall:${stage}`, W * 64, 128, (ctx, w, h) => {
    if (stage === 0) {
      // Garagentor
      ctx.fillStyle = '#b8b2a8'; ctx.fillRect(0, 0, w, h);
      const gx = w * 0.18, gw = w * 0.64;
      ctx.fillStyle = '#cfd3d6'; ctx.fillRect(gx, 14, gw, h - 14);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
      for (let y = 26; y < h; y += 14) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
      ctx.strokeStyle = '#6d6a64'; ctx.lineWidth = 4; ctx.strokeRect(gx, 14, gw, h - 12);
    } else {
      ctx.fillStyle = '#d8dcdf'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffb547'; ctx.fillRect(0, h - 22, w, 6);
      ctx.fillStyle = '#2b3036';
      ctx.font = 'bold 34px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('GARAGE TO GYM', 24, 36);
    }
  });
}

// ---------------------------------------------------------------- Renderer

function create(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1e24);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x404a58, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  const cam = { az: 0.42, targetAz: 0.42, polar: 0.92, zoom: 1, targetZoom: 1, px: 0, pz: 0, tpx: 0, tpz: 0 };

  const roomGroup = new THREE.Group();
  const deviceGroup = new THREE.Group();
  const agentGroup = new THREE.Group();
  const dirtGroup = new THREE.Group();
  const fxGroup = new THREE.Group();
  scene.add(roomGroup, deviceGroup, agentGroup, dirtGroup, fxGroup);

  let roomKey = '';
  let walls = [];
  let overlayCanvas = null, overlayTex = null, overlayKey = '';
  const devices = new Map();
  const agents = new Map();
  const dirt = new Map();
  let ghost = null, ghostKey = '';
  const ghostOk = new THREE.MeshStandardMaterial({ color: 0x5cd67a, transparent: true, opacity: 0.55, roughness: 0.5 });
  const ghostBad = new THREE.MeshStandardMaterial({ color: 0xf0584a, transparent: true, opacity: 0.55, roughness: 0.5 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x5a3e24, transparent: true, opacity: 0.8, roughness: 1, depthWrite: false });
  const selRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 32), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.95, depthWrite: false }));
  selRing.rotation.x = -Math.PI / 2;
  selRing.visible = false;
  fxGroup.add(selRing);

  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let W = 1, H = 1;
  let clock = performance.now();

  // ---------------------------------------------- Raum aufbauen

  function buildRoom(s) {
    const st = Sim.stageDef(s);
    const key = `${s.stage}`;
    if (key === roomKey) return;
    roomKey = key;
    W = st.w; H = st.h;
    roomGroup.clear();
    walls = [];

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(s.stage, W, H), roughness: s.stage ? 0.9 : 0.8, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((W - 1) / 2, 0, (H - 1) / 2);
    floor.receiveShadow = true;
    roomGroup.add(floor);

    const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.3, H + 0.6), std(0x2a2f36, 0, 0.9));
    base.position.set((W - 1) / 2, -0.151, (H - 1) / 2);
    base.receiveShadow = true;
    roomGroup.add(base);

    const wallMat = std(s.stage ? 0xd4d8dc : 0xb5aea3, 0, 0.92);
    const wallH = 1.9, t = 0.16;
    const addWall = (w, d, x, z, normal, mat) => {
      const g = new THREE.Group();
      const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), mat || wallMat));
      m.position.y = wallH / 2;
      g.add(m);
      g.position.set(x, 0, z);
      roomGroup.add(g);
      walls.push({ g, normal: new THREE.Vector2(normal[0], normal[1]) });
      return g;
    };
    const back = backWallTexture(s.stage, W);
    const backMats = [wallMat, wallMat, wallMat, wallMat, new THREE.MeshStandardMaterial({ map: back, roughness: 0.85 }), wallMat];
    addWall(W + 2 * t, t, (W - 1) / 2, -0.5 - t / 2, [0, -1], backMats);
    addWall(t, H, -0.5 - t / 2, (H - 1) / 2, [-1, 0]);
    addWall(t, H, W - 0.5 + t / 2, (H - 1) / 2, [1, 0]);
    // Vorderwand mit Lücke für den Eingang
    const e = st.entrance;
    const leftW = e.x + t, rightW = W - e.x - 1 + t;
    addWall(leftW, t, -0.5 - t + leftW / 2, H - 0.5 + t / 2, [0, 1]);
    addWall(rightW, t, e.x + 0.5 + rightW / 2, H - 0.5 + t / 2, [0, 1]);

    if (s.stage > 0) {
      // Spiegelwand im Kellerstudio
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6, W - 2), 1.1), std(0xdfe6ec, 1, 0.04));
      walls[0].g.add(mirror);
      mirror.position.set(1, 1.05, t / 2 + 0.005);
    }

    // Eingangsmatte und Schild
    const matE = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), std(0x3fae5c, 0, 0.9));
    matE.rotation.x = -Math.PI / 2;
    matE.position.set(e.x, 0.004, e.y);
    matE.receiveShadow = true;
    roomGroup.add(matE);
    const sign = makeSprite(labelTexture('Eingang', 'rgba(63,174,92,0.95)'), 0.95, 0.3);
    sign.position.set(e.x, 0.3, e.y + 1.1);
    roomGroup.add(sign);

    // Überlagerung für Bauhilfen (Erreichbarkeit, Vorschau, Auswahl)
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = W * 32; overlayCanvas.height = H * 32;
    overlayTex = new THREE.CanvasTexture(overlayCanvas);
    overlayTex.colorSpace = THREE.SRGBColorSpace;
    const ov = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: overlayTex, transparent: true, depthWrite: false }));
    ov.rotation.x = -Math.PI / 2;
    ov.position.set((W - 1) / 2, 0.008, (H - 1) / 2);
    ov.renderOrder = 2;
    roomGroup.add(ov);
    overlayKey = '';

    // Licht und Schatten auf die Fläche abstimmen
    const cx = (W - 1) / 2, cz = (H - 1) / 2;
    sun.position.set(cx - W * 0.35, 9 + W * 0.3, cz + H * 0.2);
    sun.target.position.set(cx, 0, cz);
    const sc = sun.shadow.camera;
    const ext = Math.max(W, H) * 0.85 + 2;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 0.5; sc.far = 60;
    sc.updateProjectionMatrix();

    for (const d of devices.values()) deviceGroup.remove(d.group);
    devices.clear();
  }

  // ---------------------------------------------- Kamera

  function updateCamera(dt) {
    const k = 1 - Math.exp(-dt * 8);
    cam.az += (cam.targetAz - cam.az) * k;
    cam.zoom += (cam.targetZoom - cam.zoom) * k;
    cam.tpx = Math.max(-W / 2, Math.min(W / 2, cam.tpx));
    cam.tpz = Math.max(-H / 2, Math.min(H / 2, cam.tpz));
    cam.px += (cam.tpx - cam.px) * k;
    cam.pz += (cam.tpz - cam.pz) * k;
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    const radius = Math.hypot(W + 1, H + 1) / 2 + 0.6;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    let dist = radius / Math.sin(fov / 2);
    if (camera.aspect < 1) dist /= Math.max(0.55, camera.aspect);
    dist *= 0.72 / cam.zoom;
    const cx = (W - 1) / 2 + cam.px, cz = (H - 1) / 2 + cam.pz;
    camera.position.set(
      cx + dist * Math.sin(cam.polar) * Math.sin(cam.az),
      dist * Math.cos(cam.polar),
      cz + dist * Math.sin(cam.polar) * Math.cos(cam.az),
    );
    camera.lookAt(cx, 0.35, cz);
    camera.updateProjectionMatrix();

    // Wände auf der Kameraseite absenken, damit man hineinsieht
    const view = new THREE.Vector2(Math.sin(cam.az), Math.cos(cam.az));
    for (const wl of walls) {
      const facing = wl.normal.dot(view);
      const target = facing > 0.25 ? 0.12 : 1;
      wl.g.scale.y += (target - wl.g.scale.y) * k;
    }
  }

  // ---------------------------------------------- Geräte

  function deviceCenter(dev) {
    const fp = Sim.footprint(dev.kind, dev.x, dev.y, dev.rot);
    return { x: dev.x + (fp.w - 1) / 2, z: dev.y + (fp.h - 1) / 2 };
  }

  function syncDevices(s, ui) {
    const seen = new Set();
    for (const dev of s.devices) {
      seen.add(dev.id);
      let entry = devices.get(dev.id);
      if (!entry) {
        const g = buildDevice(dev.kind);
        g.traverse((o) => { if (o.isMesh) o.userData.devId = dev.id; });
        deviceGroup.add(g);
        const warn = makeSprite(labelTexture('!', '#e5533d'), 0.34, 0.34 * 80 / 256 * 3.2);
        warn.visible = false;
        g.add(warn);
        const label = makeSprite(labelTexture('–', '#333'), 0.9, 0.28);
        label.visible = false;
        g.add(label);
        entry = { group: g, warn, label, key: '' };
        devices.set(dev.id, entry);
      }
      const key = `${dev.x},${dev.y},${dev.rot}`;
      if (entry.key !== key) {
        entry.key = key;
        const c = deviceCenter(dev);
        entry.group.position.set(c.x, 0, c.z);
        entry.group.rotation.y = dev.rot ? Math.PI / 2 : 0;
      }
      entry.group.visible = !dev.moving;
      const hgt = DEVICE_HEIGHT[dev.kind];
      entry.warn.visible = dev.broken;
      entry.warn.position.set(0, hgt + 0.35 + Math.sin(clock / 250) * 0.05, 0);
      entry.warn.scale.set(0.8, 0.25, 1);

      if (ui.overlay !== 'none' && !dev.moving) {
        const minutesOpen = Math.max(1, s.time - D.DAY_START);
        let v, text;
        if (ui.overlay === 'auslastung') {
          v = dev.stats.busy / minutesOpen;
          text = `${Math.round(v * 100)} %`;
        } else {
          const n = dev.stats.uses + dev.stats.skips + dev.queue.length;
          const w = n ? dev.stats.wait / n : 0;
          v = w / 10;
          text = `${Math.round(w)} Min.`;
        }
        entry.label.material.map = labelTexture(text, heatCss(v));
        entry.label.visible = true;
        entry.label.scale.set(1.25, 0.39, 1);
        entry.label.position.set(0, hgt + 0.35, 0);
      } else {
        entry.label.visible = false;
      }
    }
    for (const [id, entry] of devices) {
      if (!seen.has(id)) { deviceGroup.remove(entry.group); devices.delete(id); }
    }
  }

  function syncGhost(ui) {
    const g = ui.ghost;
    const key = g ? `${g.kind}:${g.rot}:${g.ok}` : '';
    if (key !== ghostKey) {
      ghostKey = key;
      if (ghost) fxGroup.remove(ghost);
      ghost = null;
      if (g) {
        ghost = buildDevice(g.kind);
        const mat = g.ok ? ghostOk : ghostBad;
        ghost.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
        fxGroup.add(ghost);
      }
    }
    if (ghost && g) {
      const fp = Sim.footprint(g.kind, g.x, g.y, g.rot);
      ghost.position.set(g.x + (fp.w - 1) / 2, 0.02, g.y + (fp.h - 1) / 2);
      ghost.rotation.y = g.rot ? Math.PI / 2 : 0;
    }
  }

  // ---------------------------------------------- Bodenüberlagerung

  function drawOverlay(s, ui) {
    const L = Sim.getLayout(s);
    const sel = ui.selectedDevice ? Sim.deviceById(s, ui.selectedDevice) : null;
    const g = ui.ghost;
    const building = !!(ui.placing || ui.carry);
    const inactive = s.devices.filter((d) => !d.moving && !L.active[d.id]).map((d) => d.id).join(',');
    const key = [s.layoutVersion, s.stage, building, g ? `${g.x},${g.y},${g.rot},${g.ok},${g.kind}` : '',
      ui.hover && !g ? `${ui.hover.x},${ui.hover.y}` : '', sel ? `${sel.id},${sel.x},${sel.y},${sel.rot}` : '', inactive].join('|');
    if (key === overlayKey) return;
    overlayKey = key;
    const ctx = overlayCanvas.getContext('2d');
    const T = 32;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (building) {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < L.reach.length; i++) {
        if (!L.reach[i] || L.occ[i]) continue;
        ctx.fillRect((i % L.W) * T + 1, Math.floor(i / L.W) * T + 1, T - 2, T - 2);
      }
    }
    for (const dev of s.devices) {
      if (dev.moving || L.active[dev.id]) continue;
      const fp = Sim.footprint(dev.kind, dev.x, dev.y, dev.rot);
      ctx.fillStyle = 'rgba(240,70,60,0.55)';
      ctx.fillRect(dev.x * T, dev.y * T, fp.w * T, fp.h * T);
      ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 3;
      ctx.strokeRect(dev.x * T + 1.5, dev.y * T + 1.5, fp.w * T - 3, fp.h * T - 3);
    }
    if (g) {
      ctx.fillStyle = g.ok ? 'rgba(92,214,122,0.6)' : 'rgba(240,88,74,0.6)';
      for (const t of Sim.footprint(g.kind, g.x, g.y, g.rot).tiles) {
        if (t.x < 0 || t.y < 0 || t.x >= L.W || t.y >= L.H) continue;
        ctx.fillRect(t.x * T, t.y * T, T, T);
      }
    } else if (ui.hover && ui.hover.x >= 0 && ui.hover.y >= 0 && ui.hover.x < L.W && ui.hover.y < L.H) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.strokeRect(ui.hover.x * T + 1, ui.hover.y * T + 1, T - 2, T - 2);
    }
    if (sel && !sel.moving) {
      const fp = Sim.footprint(sel.kind, sel.x, sel.y, sel.rot);
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 4;
      ctx.strokeRect(sel.x * T + 2, sel.y * T + 2, fp.w * T - 4, fp.h * T - 4);
    }
    overlayTex.needsUpdate = true;
  }

  // ---------------------------------------------- Schmutz

  function syncDirt(s) {
    const seen = new Set();
    for (const d of s.dirt) {
      seen.add(d.id);
      if (!dirt.has(d.id)) {
        const g = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const m = new THREE.Mesh(new THREE.CircleGeometry(0.08 + Math.random() * 0.1, 18), dirtMat);
          m.rotation.x = -Math.PI / 2;
          m.position.set((Math.random() - 0.5) * 0.35, 0.006 + i * 0.0005, (Math.random() - 0.5) * 0.35);
          m.scale.y = 0.6 + Math.random() * 0.5;
          m.renderOrder = 1;
          g.add(m);
        }
        g.position.set(d.x, 0, d.y);
        dirtGroup.add(g);
        dirt.set(d.id, g);
      }
    }
    for (const [id, g] of dirt) if (!seen.has(id)) { dirtGroup.remove(g); dirt.delete(id); }
  }

  // ---------------------------------------------- Figuren

  const QUEUE_OFFSETS = [[0, 0], [0.24, 0.14], [-0.24, 0.14], [0.14, -0.22], [-0.14, -0.22], [0.32, -0.04], [-0.32, -0.04]];

  function syncAgents(s, ui, dt) {
    const seen = new Set();
    const t = clock / 1000;
    let selected = null;
    for (const a of s.agents) {
      seen.add(a.id);
      let e = agents.get(a.id);
      if (!e) {
        const color = a.role === 'cleaner' ? '#9b6ad6' : D.MEMBER_TYPES[a.type].color;
        const p = makePerson(color, HAIR[a.id % HAIR.length], a.role);
        const mood = makeSprite(moodTexture('#3fcf6a', false), 0.34, 0.34);
        mood.position.y = 1.62;
        p.root.add(mood);
        agentGroup.add(p.root);
        e = { ...p, mood, x: a.x, z: a.y, yaw: 0, phase: Math.random() * 6 };
        agents.set(a.id, e);
      }

      // Zielposition und Haltung bestimmen
      let tx = a.x, tz = a.y, ty = 0, yaw = e.yaw, pose = 'idle';
      const dev = a.cur ? Sim.deviceById(s, a.cur.dev) : null;
      if (a.state === 'use' && dev) {
        const d = D.DEVICES[dev.kind];
        const c = deviceCenter(dev);
        const devYaw = dev.rot ? Math.PI / 2 : 0;
        if (d.slots === 1) { tx = c.x; tz = c.z; }
        pose = dev.kind;
        if (dev.kind === 'laufband' || dev.kind === 'ergometer') {
          yaw = devYaw + Math.PI;
          if (dev.kind === 'ergometer') {
            const off = 0.38;
            tx = c.x + Math.sin(devYaw) * off; tz = c.z + Math.cos(devYaw) * off;
            ty = 0.2;
          } else {
            ty = 0.16;
          }
        } else if (dev.kind === 'hantelbank') {
          // liegend, Kopf unter der Langhantel
          yaw = devYaw - Math.PI / 2;
          const off = -0.85;
          tx = c.x + Math.cos(devYaw) * off; tz = c.z - Math.sin(devYaw) * off;
          ty = 0.62;
        } else if (dev.kind === 'kabelzug') {
          // vor den Turm auf der eigenen Seite stellen, Blick zum Turm
          const side = Math.sign((a.x - c.x) * Math.cos(devYaw) - (a.y - c.z) * Math.sin(devYaw)) || 1;
          const towerX = c.x + Math.cos(devYaw) * side * 0.78, towerZ = c.z - Math.sin(devYaw) * side * 0.78;
          tx = c.x + Math.cos(devYaw) * side * 0.2 + Math.sin(devYaw) * 0.55;
          tz = c.z - Math.sin(devYaw) * side * 0.2 + Math.cos(devYaw) * 0.55;
          yaw = Math.atan2(towerX - tx, towerZ - tz);
        } else if (dev.kind === 'squatrack') {
          yaw = devYaw;
          tx = c.x + Math.sin(devYaw) * 0.6; tz = c.z + Math.cos(devYaw) * 0.6;
        } else {
          yaw = devYaw;
          tx = c.x + Math.cos(devYaw) * 0.45; tz = c.z - Math.sin(devYaw) * 0.45;
        }
      } else if (a.state === 'wait' && dev) {
        const qi = Math.max(0, dev.queue.indexOf(a.id));
        const o = QUEUE_OFFSETS[qi % QUEUE_OFFSETS.length];
        tx = a.x + o[0]; tz = a.y + o[1];
        const c = deviceCenter(dev);
        yaw = Math.atan2(c.x - tx, c.z - tz);
        pose = 'wait';
      } else if (a.role === 'cleaner' && a.state === 'clean') {
        pose = 'clean';
      }

      const moving = Math.hypot(tx - e.x, tz - e.z) > 0.002 && (a.state === 'walk' || a.state === 'exit' || a.state === 'cwalk');
      if (moving) {
        yaw = Math.atan2(tx - e.x, tz - e.z);
        pose = 'walk';
      }
      // weich nachführen
      const k = 1 - Math.exp(-dt * 14);
      e.x += (tx - e.x) * k;
      e.z += (tz - e.z) * k;
      let dy = yaw - e.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      e.yaw += dy * (1 - Math.exp(-dt * 10));
      e.root.position.set(e.x, ty, e.z);
      e.root.rotation.y = e.yaw;
      animate(e, pose, t + e.phase);

      if (a.role !== 'cleaner') {
        const badge = a.role === 'trial' ? 'P' : a.role === 'daypass' ? 'T' : '';
        e.mood.material.map = moodTexture(moodColor(a.score), a.state === 'wait', badge);
        if (pose === 'hantelbank') e.mood.position.set(0, 0.7, -1.0);
        else e.mood.position.set(0, 1.62, 0);
      } else {
        e.mood.visible = false;
      }
      if (ui.selectedAgent === a.id) selected = e;
    }
    for (const [id, e] of agents) if (!seen.has(id)) { agentGroup.remove(e.root); agents.delete(id); }

    selRing.visible = !!selected;
    if (selected) {
      selRing.position.set(selected.x, 0.012, selected.z);
      selRing.scale.setScalar(1 + Math.sin(clock / 200) * 0.06);
    }
  }

  function animate(e, pose, t) {
    const [lL, lR] = e.legs, [aL, aR] = e.arms;
    e.body.rotation.set(0, 0, 0);
    e.body.position.set(0, 0, 0);
    for (const p of [lL, lR, aL, aR]) p.rotation.set(0, 0, 0);
    switch (pose) {
      case 'walk': {
        const s = Math.sin(t * 9);
        lL.rotation.x = s * 0.55; lR.rotation.x = -s * 0.55;
        aL.rotation.x = -s * 0.45; aR.rotation.x = s * 0.45;
        e.body.position.y = Math.abs(Math.cos(t * 9)) * 0.025;
        break;
      }
      case 'laufband': {
        const s = Math.sin(t * 13);
        lL.rotation.x = s * 0.8; lR.rotation.x = -s * 0.8;
        aL.rotation.x = -s * 0.7 - 0.3; aR.rotation.x = s * 0.7 - 0.3;
        e.body.position.y = Math.abs(Math.cos(t * 13)) * 0.05;
        e.body.rotation.x = 0.12;
        break;
      }
      case 'ergometer': {
        const s = Math.sin(t * 7);
        lL.rotation.x = -1.2 + s * 0.45; lR.rotation.x = -1.2 - s * 0.45;
        aL.rotation.x = -1.1; aR.rotation.x = -1.1;
        e.body.rotation.x = 0.35;
        break;
      }
      case 'hantelbank': {
        const s = (Math.sin(t * 3) + 1) / 2;
        e.body.rotation.x = -Math.PI / 2;
        e.body.position.set(0, 0, 0);
        aL.rotation.x = -Math.PI / 2 + 0.55 * s; aR.rotation.x = -Math.PI / 2 + 0.55 * s;
        lL.rotation.x = 1.3; lR.rotation.x = 1.3;
        break;
      }
      case 'squatrack': {
        const s = (Math.sin(t * 2.6) + 1) / 2;
        e.body.position.y = -0.22 * s;
        lL.rotation.x = -0.9 * s; lR.rotation.x = -0.9 * s;
        e.body.rotation.x = 0.3 * s;
        aL.rotation.x = -2.6; aR.rotation.x = -2.6;
        aL.rotation.z = 0.5; aR.rotation.z = -0.5;
        break;
      }
      case 'kabelzug': {
        const s = (Math.sin(t * 3.2) + 1) / 2;
        aL.rotation.x = -2.6 + 1.6 * s; aR.rotation.x = -2.6 + 1.6 * s;
        aL.rotation.z = 0.25; aR.rotation.z = -0.25;
        break;
      }
      case 'kurzhanteln': {
        const s = Math.sin(t * 3.5);
        aL.rotation.x = -0.4 - Math.max(0, s) * 1.6;
        aR.rotation.x = -0.4 - Math.max(0, -s) * 1.6;
        break;
      }
      case 'clean': {
        const s = Math.sin(t * 6);
        aL.rotation.x = -0.6 + s * 0.4; aR.rotation.x = -0.6 - s * 0.4;
        e.body.rotation.x = 0.2;
        break;
      }
      case 'wait': {
        e.body.rotation.z = Math.sin(t * 1.5) * 0.04;
        aL.rotation.z = 0.12; aR.rotation.z = -0.12;
        break;
      }
      default:
        e.body.rotation.z = Math.sin(t * 1.2) * 0.02;
    }
  }

  // ---------------------------------------------- öffentliche Schnittstelle

  function render(s, ui) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - clock) / 1000);
    clock = now;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
    }
    buildRoom(s);
    updateCamera(dt);
    syncDevices(s, ui);
    syncGhost(ui);
    drawOverlay(s, ui);
    syncDirt(s);
    syncAgents(s, ui, dt);
    renderer.render(scene, camera);
  }

  function ndc(px, py) {
    return new THREE.Vector2((px / canvas.clientWidth) * 2 - 1, -(py / canvas.clientHeight) * 2 + 1);
  }

  function screenToTile(px, py) {
    raycaster.setFromCamera(ndc(px, py), camera);
    const p = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(floorPlane, p)) return { x: -99, y: -99, fx: -99, fy: -99 };
    return { x: Math.floor(p.x + 0.5), y: Math.floor(p.z + 0.5), fx: p.x, fy: p.z };
  }

  function agentAt(s, px, py) {
    let best = null, bestD = Infinity;
    const v = new THREE.Vector3();
    for (const a of s.agents) {
      const e = agents.get(a.id);
      if (!e) continue;
      v.set(e.x, e.root.position.y + 0.75, e.z).project(camera);
      const sx = (v.x + 1) / 2 * canvas.clientWidth, sy = (1 - v.y) / 2 * canvas.clientHeight;
      const d = Math.hypot(sx - px, sy - py);
      if (d < 26 * cam.zoom && d < bestD) { bestD = d; best = a; }
    }
    return best;
  }

  function deviceAt(px, py) {
    raycaster.setFromCamera(ndc(px, py), camera);
    const hits = raycaster.intersectObjects(deviceGroup.children, true);
    for (const h of hits) {
      if (h.object.isSprite) continue;
      if (h.object.userData.devId) return h.object.userData.devId;
    }
    return null;
  }

  function tileToScreen(x, y) {
    const v = new THREE.Vector3(x, 0, y).project(camera);
    return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight };
  }

  return {
    render,
    tileToScreen,
    screenToTile,
    agentAt,
    deviceAt,
    rotate(dir) { cam.targetAz += dir * Math.PI / 4; },
    zoom(factor) { cam.targetZoom = Math.max(0.6, Math.min(2.6, cam.targetZoom * factor)); },
    resetView() { cam.targetAz = Math.round(cam.targetAz / (Math.PI * 2)) * Math.PI * 2 + 0.42; cam.targetZoom = 1; cam.tpx = 0; cam.tpz = 0; },
    /** Verschiebt die Kamera relativ zur Blickrichtung (rechts, vorwärts) in Feldern. */
    pan(right, forward) {
      cam.tpx += Math.cos(cam.targetAz) * right - Math.sin(cam.targetAz) * forward;
      cam.tpz += -Math.sin(cam.targetAz) * right - Math.cos(cam.targetAz) * forward;
    },
    /** Pixel → Felder für das Ziehen mit der Maus. */
    pixelsToTiles(px) { return px * (Math.hypot(W + 1, H + 1) / Math.max(1, canvas.clientWidth)) * 1.4 / cam.zoom; },
  };
}

window.GymRender3D = { create };
