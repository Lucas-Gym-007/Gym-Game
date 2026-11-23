/*
 * Garage to Gym – Darstellung auf dem Canvas (Draufsicht, schlichte 2D-Grafik).
 */
(function (root) {
  'use strict';

  const D = root.GymData;
  const Sim = root.GymSim;

  const C = {
    bg: '#1d2127',
    wall: '#3b414b',
    floorA: ['#9a958c', '#cfd6d9'],
    floorB: ['#928d84', '#c6cdd1'],
    grid: 'rgba(0,0,0,0.08)',
    entrance: '#5cc46e',
    kraft: '#5b6b80',
    kraftDark: '#38434f',
    cardio: '#3f8f6c',
    cardioDark: '#285c45',
    metal: '#d9dde2',
    plate: '#22262b',
    pad: '#a9473a',
    mat: '#2f5c7a',
    dirt: 'rgba(92,64,38,0.75)',
    ok: 'rgba(92,196,110,0.35)',
    bad: 'rgba(230,80,70,0.45)',
    select: '#ffd24a',
    moodGood: '#3fcf6a',
    moodMid: '#f2c23a',
    moodBad: '#e5533d',
    cleaner: '#9b6ad6',
  };

  function computeView(canvas, s) {
    const st = Sim.stageDef(s);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const pad = 28;
    const ts = Math.max(14, Math.min(72, Math.floor(Math.min((cw - pad * 2) / st.w, (ch - pad * 2) / st.h))));
    const ox = Math.floor((cw - st.w * ts) / 2);
    const oy = Math.floor((ch - st.h * ts) / 2);
    return { ts, ox, oy, W: st.w, H: st.h, cw, ch };
  }

  function screenToTile(view, px, py) {
    return { x: Math.floor((px - view.ox) / view.ts), y: Math.floor((py - view.oy) / view.ts), fx: (px - view.ox) / view.ts - 0.5, fy: (py - view.oy) / view.ts - 0.5 };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function heat(v) {
    // 0 = grün, 1 = rot
    const t = Math.max(0, Math.min(1, v));
    const r = Math.round(60 + t * 190);
    const g = Math.round(200 - t * 140);
    return `rgba(${r},${g},70,0.6)`;
  }

  // ---------------------------------------------------------------- Geräte

  /** Zeichnet ein Gerät in Grundausrichtung, zentriert im Ursprung (bw × bh Pixel). */
  function drawDeviceShape(ctx, kind, bw, bh, ts) {
    const u = ts / 10;
    switch (kind) {
      case 'kurzhanteln': {
        ctx.fillStyle = C.mat;
        roundRect(ctx, -bw / 2 + u, -bh / 2 + u, bw - 2 * u, bh - 2 * u, 2 * u); ctx.fill();
        for (const off of [-bw / 4, bw / 4]) {
          ctx.strokeStyle = C.metal; ctx.lineWidth = u * 0.9;
          ctx.beginPath(); ctx.moveTo(off - 2.2 * u, 0); ctx.lineTo(off + 2.2 * u, 0); ctx.stroke();
          ctx.fillStyle = C.plate;
          ctx.fillRect(off - 3 * u, -1.6 * u, 1.4 * u, 3.2 * u);
          ctx.fillRect(off + 1.6 * u, -1.6 * u, 1.4 * u, 3.2 * u);
        }
        break;
      }
      case 'hantelbank': {
        ctx.fillStyle = C.kraftDark;
        roundRect(ctx, -bw / 2 + u, -bh / 2 + 1.5 * u, bw - 2 * u, bh - 3 * u, 2 * u); ctx.fill();
        ctx.fillStyle = C.pad;
        roundRect(ctx, -bw / 2 + 2.5 * u, -1.8 * u, bw * 0.62, 3.6 * u, 1.5 * u); ctx.fill();
        const bx = bw / 2 - 4 * u;
        ctx.strokeStyle = C.metal; ctx.lineWidth = u * 0.8;
        ctx.beginPath(); ctx.moveTo(bx, -bh / 2 + u); ctx.lineTo(bx, bh / 2 - u); ctx.stroke();
        ctx.fillStyle = C.plate;
        ctx.fillRect(bx - 1.6 * u, -bh / 2 + 0.6 * u, 3.2 * u, 1.4 * u);
        ctx.fillRect(bx - 1.6 * u, bh / 2 - 2 * u, 3.2 * u, 1.4 * u);
        break;
      }
      case 'squatrack': {
        ctx.fillStyle = C.kraftDark;
        roundRect(ctx, -bw / 2 + u, -bh / 2 + u, bw - 2 * u, bh - 2 * u, 1.5 * u); ctx.fill();
        ctx.fillStyle = '#4a5563';
        ctx.fillRect(-bw / 2 + 3 * u, -bh / 2 + 3 * u, bw - 6 * u, bh - 6 * u);
        ctx.fillStyle = C.metal;
        for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.fillRect(px * (bw / 2 - 3 * u) - 1.2 * u, py * (bh / 2 - 3 * u) - 1.2 * u, 2.4 * u, 2.4 * u);
        }
        ctx.strokeStyle = C.metal; ctx.lineWidth = u;
        ctx.beginPath(); ctx.moveTo(-bw / 2 + 2 * u, 0); ctx.lineTo(bw / 2 - 2 * u, 0); ctx.stroke();
        ctx.fillStyle = C.plate;
        ctx.fillRect(-bw / 2 + 2.5 * u, -2.5 * u, 1.8 * u, 5 * u);
        ctx.fillRect(bw / 2 - 4.3 * u, -2.5 * u, 1.8 * u, 5 * u);
        break;
      }
      case 'ergometer': {
        ctx.fillStyle = C.cardioDark;
        roundRect(ctx, -bw / 2 + 1.5 * u, -bh / 2 + u, bw - 3 * u, bh - 2 * u, 2 * u); ctx.fill();
        ctx.fillStyle = C.plate;
        roundRect(ctx, -2.5 * u, -bh / 2 + 2 * u, 5 * u, 5 * u, 2 * u); ctx.fill();
        ctx.strokeStyle = C.metal; ctx.lineWidth = u;
        ctx.beginPath(); ctx.moveTo(-3 * u, bh / 2 - 4 * u); ctx.lineTo(3 * u, bh / 2 - 4 * u); ctx.stroke();
        ctx.fillStyle = '#e8e2d0';
        roundRect(ctx, -1.6 * u, 0, 3.2 * u, 4 * u, 1.4 * u); ctx.fill();
        break;
      }
      case 'laufband': {
        ctx.fillStyle = C.cardioDark;
        roundRect(ctx, -bw / 2 + u, -bh / 2 + u, bw - 2 * u, bh - 2 * u, 2 * u); ctx.fill();
        ctx.fillStyle = C.plate;
        ctx.fillRect(-bw / 2 + 2.5 * u, -bh / 2 + 5 * u, bw - 5 * u, bh - 7 * u);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = u * 0.5;
        for (let y = -bh / 2 + 6 * u; y < bh / 2 - 2 * u; y += 2.5 * u) {
          ctx.beginPath(); ctx.moveTo(-bw / 2 + 2.5 * u, y); ctx.lineTo(bw / 2 - 2.5 * u, y); ctx.stroke();
        }
        ctx.fillStyle = '#7fd0ff';
        ctx.fillRect(-bw / 2 + 2 * u, -bh / 2 + 1.5 * u, bw - 4 * u, 2.5 * u);
        break;
      }
      case 'kabelzug': {
        ctx.fillStyle = C.kraftDark;
        roundRect(ctx, -bw / 2 + u, -bh / 2 + u, bw - 2 * u, bh - 2 * u, 1.5 * u); ctx.fill();
        ctx.fillStyle = C.plate;
        ctx.fillRect(-bw / 2 + 2 * u, -bh / 2 + 2 * u, 4 * u, bh - 4 * u);
        ctx.fillRect(bw / 2 - 6 * u, -bh / 2 + 2 * u, 4 * u, bh - 4 * u);
        ctx.strokeStyle = C.metal; ctx.lineWidth = u * 0.6;
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + 6 * u, -bh / 2 + 4 * u); ctx.lineTo(0, 0); ctx.lineTo(bw / 2 - 6 * u, -bh / 2 + 4 * u);
        ctx.moveTo(-bw / 2 + 6 * u, bh / 2 - 4 * u); ctx.lineTo(0, 0); ctx.lineTo(bw / 2 - 6 * u, bh / 2 - 4 * u);
        ctx.stroke();
        ctx.fillStyle = C.metal;
        ctx.beginPath(); ctx.arc(0, 0, 1.3 * u, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default:
        ctx.fillStyle = C.kraft;
        ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    }
  }

  function drawDevice(ctx, view, kind, x, y, rot, alpha) {
    const d = D.DEVICES[kind];
    const ts = view.ts;
    const w = rot ? d.h : d.w;
    const h = rot ? d.w : d.h;
    const cx = view.ox + (x + w / 2) * ts;
    const cy = view.oy + (y + h / 2) * ts;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(Math.PI / 2);
    // Grundausrichtung: Ergometer und Laufband stehen hochkant (1 × 2)
    drawDeviceShape(ctx, kind, d.w * ts, d.h * ts, ts);
    ctx.restore();
  }

  // ---------------------------------------------------------------- Figuren

  function moodColor(score) {
    if (score >= 70) return C.moodGood;
    if (score >= 50) return C.moodMid;
    return C.moodBad;
  }

  function drawAgent(ctx, view, a, ox, oy, selected) {
    const ts = view.ts;
    const px = view.ox + (a.x + 0.5 + ox) * ts;
    const py = view.oy + (a.y + 0.5 + oy) * ts;
    const r = ts * 0.2;
    const body = a.role === 'cleaner' ? C.cleaner : D.MEMBER_TYPES[a.type].color;

    if (selected) {
      ctx.strokeStyle = C.select; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, r * 1.9, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(px + r * 0.2, py + r * 0.35, r * 1.2, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.2, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#f1d2b6';
    ctx.beginPath(); ctx.arc(px, py, r * 0.55, 0, Math.PI * 2); ctx.fill();

    if (a.role === 'cleaner') {
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(px + r * 0.9, py - r * 0.2, r * 0.7, r * 0.7);
      if (a.state === 'clean') {
        ctx.fillStyle = 'rgba(160,220,255,0.8)';
        ctx.beginPath(); ctx.arc(px + r * 1.6, py + r * 0.6, r * 0.35, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    // Probetraining und Tageskarte bekommen ein kleines Abzeichen
    if (a.role !== 'member') {
      ctx.fillStyle = a.role === 'trial' ? '#ffffff' : '#ffd24a';
      ctx.beginPath(); ctx.arc(px - r * 1.1, py - r * 0.9, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.font = `bold ${Math.max(7, r * 0.6)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.role === 'trial' ? 'P' : 'T', px - r * 1.1, py - r * 0.88);
    }
    // Stimmungssymbol über dem Kopf
    const my = py - r * 1.7;
    ctx.fillStyle = moodColor(a.score);
    ctx.beginPath(); ctx.arc(px, my, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    if (a.state === 'wait') {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(8, r * 0.7)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('…', px, my - r * 0.05);
    }
  }

  // ---------------------------------------------------------------- Hauptzeichnung

  function draw(ctx, view, s, ui) {
    const { ts, ox, oy, W, H } = view;
    const L = Sim.getLayout(s);
    const st = Sim.stageDef(s);
    const floorIdx = s.stage === 0 ? 0 : 1;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, view.cw, view.ch);

    // Wand
    ctx.fillStyle = C.wall;
    roundRect(ctx, ox - 10, oy - 10, W * ts + 20, H * ts + 20, 6); ctx.fill();

    // Boden
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      ctx.fillStyle = (x + y) % 2 ? C.floorA[floorIdx] : C.floorB[floorIdx];
      ctx.fillRect(ox + x * ts, oy + y * ts, ts, ts);
    }
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) { ctx.moveTo(ox + x * ts + 0.5, oy); ctx.lineTo(ox + x * ts + 0.5, oy + H * ts); }
    for (let y = 0; y <= H; y++) { ctx.moveTo(ox, oy + y * ts + 0.5); ctx.lineTo(ox + W * ts, oy + y * ts + 0.5); }
    ctx.stroke();

    // Eingang
    const e = st.entrance;
    ctx.fillStyle = 'rgba(92,196,110,0.35)';
    ctx.fillRect(ox + e.x * ts, oy + e.y * ts, ts, ts);
    ctx.fillStyle = C.entrance;
    ctx.fillRect(ox + e.x * ts + 3, oy + (e.y + 1) * ts, ts - 6, 10);
    ctx.fillStyle = '#e8f5ea';
    ctx.font = `${Math.max(9, ts * 0.2)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Eingang', ox + (e.x + 0.5) * ts, oy + (e.y + 1) * ts + 12);

    // Zugangsfelder hervorheben, solange gebaut wird
    if (ui.placing || ui.carry) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      for (let i = 0; i < L.reach.length; i++) {
        if (!L.reach[i] || L.occ[i]) continue;
        ctx.fillRect(ox + (i % W) * ts, oy + Math.floor(i / W) * ts, ts, ts);
      }
    }

    // Schmutz
    for (const d of s.dirt) {
      const cx = ox + (d.x + 0.5) * ts, cy = oy + (d.y + 0.5) * ts;
      ctx.fillStyle = C.dirt;
      ctx.beginPath();
      ctx.ellipse(cx - ts * 0.08, cy, ts * 0.2, ts * 0.13, 0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + ts * 0.12, cy + ts * 0.06, ts * 0.12, ts * 0.09, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Geräte
    const minutesOpen = Math.max(1, s.time - D.DAY_START);
    for (const dev of s.devices) {
      if (dev.moving) continue;
      const fp = Sim.footprint(dev.kind, dev.x, dev.y, dev.rot);
      const px = ox + dev.x * ts, py = oy + dev.y * ts, pw = fp.w * ts, ph = fp.h * ts;
      const zone = L.zone[dev.id];
      if (zone) {
        ctx.fillStyle = zone === 'kraft' ? 'rgba(91,107,128,0.35)' : 'rgba(63,143,108,0.35)';
        ctx.fillRect(px, py, pw, ph);
      }
      drawDevice(ctx, view, dev.kind, dev.x, dev.y, dev.rot, dev.broken ? 0.45 : 1);

      if (ui.overlay !== 'none') {
        let v, label;
        if (ui.overlay === 'auslastung') {
          v = dev.stats.busy / minutesOpen;
          label = `${Math.round(v * 100)} %`;
        } else {
          const n = dev.stats.uses + dev.stats.skips + dev.queue.length;
          const w = n ? dev.stats.wait / n : 0;
          v = w / 10;
          label = `${Math.round(w)} Min.`;
        }
        ctx.fillStyle = heat(v);
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(9, Math.min(ts * 0.26, pw / 4.2))}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, px + pw / 2, py + ph / 2);
      }

      if (!L.active[dev.id]) {
        ctx.fillStyle = 'rgba(230,60,50,0.35)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      }
      if (dev.broken) {
        ctx.fillStyle = '#e5533d';
        ctx.beginPath(); ctx.arc(px + pw / 2, py + ph / 2, ts * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, ts * 0.3)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', px + pw / 2, py + ph / 2 + 1);
      } else if (dev.condition < 60) {
        const bw = pw - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(px + 4, py + ph - 7, bw, 4);
        ctx.fillStyle = dev.condition < D.BREAK_THRESHOLD ? '#e5533d' : '#f2c23a';
        ctx.fillRect(px + 4, py + ph - 7, bw * dev.condition / 100, 4);
      }
      if (ui.selectedDevice === dev.id) {
        ctx.strokeStyle = C.select; ctx.lineWidth = 3;
        ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
      }
    }

    // Vorschau beim Platzieren oder Verschieben
    const ghost = ui.ghost;
    if (ghost) {
      const fp = Sim.footprint(ghost.kind, ghost.x, ghost.y, ghost.rot);
      ctx.fillStyle = ghost.ok ? C.ok : C.bad;
      for (const t of fp.tiles) {
        if (t.x < 0 || t.y < 0 || t.x >= W || t.y >= H) continue;
        ctx.fillRect(ox + t.x * ts, oy + t.y * ts, ts, ts);
      }
      drawDevice(ctx, view, ghost.kind, ghost.x, ghost.y, ghost.rot, 0.7);
    }

    // Figuren
    const offsets = [[0, 0], [0.22, 0.12], [-0.22, 0.12], [0.12, -0.2], [-0.12, -0.2], [0.3, -0.05], [-0.3, -0.05]];
    const sorted = [...s.agents].sort((a, b) => a.y - b.y);
    for (const a of sorted) {
      let o = [0, 0];
      if (a.state === 'wait' && a.cur) {
        const dev = Sim.deviceById(s, a.cur.dev);
        const qi = dev ? dev.queue.indexOf(a.id) : 0;
        o = offsets[Math.max(0, qi) % offsets.length];
      }
      drawAgent(ctx, view, a, o[0], o[1], ui.selectedAgent === a.id);
    }

    // Feld unter der Maus
    if (ui.hover && !ghost && ui.hover.x >= 0 && ui.hover.y >= 0 && ui.hover.x < W && ui.hover.y < H) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + ui.hover.x * ts + 0.5, oy + ui.hover.y * ts + 0.5, ts - 1, ts - 1);
    }
  }

  function agentAt(view, s, px, py) {
    let best = null, bestD = Infinity;
    for (const a of s.agents) {
      const ax = view.ox + (a.x + 0.5) * view.ts;
      const ay = view.oy + (a.y + 0.5) * view.ts;
      const d = Math.hypot(ax - px, ay - py);
      if (d < view.ts * 0.38 && d < bestD) { bestD = d; best = a; }
    }
    return best;
  }

  root.GymRender = { computeView, screenToTile, draw, agentAt, drawDeviceShape, moodColor };
})(this);
