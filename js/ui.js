/*
 * Garage to Gym – Bedienoberfläche: Panels, Eingaben, Dialoge.
 */
(function (root) {
  'use strict';

  const D = root.GymData;
  const Sim = root.GymSim;
  const R = root.GymRender;

  const $ = (id) => document.getElementById(id);
  const euro = (v) => `${Math.round(v).toLocaleString('de-DE')} €`;
  const signed = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('de-DE')} €`;
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const ROLE_LABEL = { member: 'Mitglied', trial: 'Probetraining', daypass: 'Tagesgast', cleaner: 'Reinigungskraft' };

  let app = null;          // { s, speed, setSpeed, save, newGame }
  let canvas, ctx, view;
  let canvas3d = null, r3d = null;
  let viewMode = '3d';
  let dpr = 1;
  const ui = {
    placing: null, rot: 0, carry: null, press: null, hover: null, ghost: null,
    selectedDevice: null, selectedAgent: null, overlay: 'none',
  };
  let flashMsg = null;
  let lastLogId = 0;
  let lastStage = -1;
  let modalKind = null;
  const htmlCache = new Map();

  const S = () => app.s;

  function setHTML(el, html) {
    if (htmlCache.get(el) === html) return;
    htmlCache.set(el, html);
    el.innerHTML = html;
  }

  function flash(text, bad) {
    flashMsg = { text, bad: !!bad, until: performance.now() + 2200 };
  }

  // ---------------------------------------------------------------- Aufbau

  function init(appRef) {
    app = appRef;
    canvas = $('game');
    ctx = canvas.getContext('2d');
    canvas3d = $('game3d');
    try {
      if (root.GymRender3D) r3d = root.GymRender3D.create(canvas3d);
    } catch (err) {
      console.warn('3D-Ansicht nicht verfügbar, nutze 2D:', err);
      r3d = null;
    }
    try { viewMode = localStorage.getItem('garage-to-gym-view') || '3d'; } catch (err) { /* egal */ }

    for (const c of [canvas, canvas3d]) {
      c.addEventListener('pointermove', onPointerMove);
      c.addEventListener('pointerdown', onPointerDown);
      c.addEventListener('pointerup', onPointerUp);
      c.addEventListener('pointerleave', () => { if (!ui.carry) ui.hover = null; });
      c.addEventListener('contextmenu', (e) => { e.preventDefault(); cancelAction(); });
    }
    // Kamera mit gedrückter mittlerer Maustaste verschieben
    let panDrag = null;
    canvas3d.addEventListener('pointerdown', (e) => { if (e.button === 1 && is3D()) { e.preventDefault(); panDrag = { x: e.clientX, y: e.clientY }; } });
    window.addEventListener('pointermove', (e) => {
      if (!panDrag) return;
      const k = r3d.pixelsToTiles(1);
      r3d.pan(-(e.clientX - panDrag.x) * k, (e.clientY - panDrag.y) * k);
      panDrag = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointerup', (e) => { if (e.button === 1) panDrag = null; });
    canvas3d.addEventListener('wheel', (e) => {
      if (!is3D()) return;
      e.preventDefault();
      r3d.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
    window.addEventListener('keydown', onKey);

    $('viewBtns').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-view]');
      if (!b) return;
      setViewMode(b.dataset.view);
    });
    $('camBtns').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-cam]');
      if (!b || !is3D()) return;
      if (b.dataset.cam === 'reset') r3d.resetView(); else r3d.rotate(Number(b.dataset.cam));
    });

    $('speedBtns').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-speed]');
      if (b) app.setSpeed(Number(b.dataset.speed));
    });
    $('btnSave').addEventListener('click', () => app.save(false));
    $('btnNew').addEventListener('click', () => showConfirmNew());
    $('btnHelp').addEventListener('click', () => showHelp());
    $('btnRotate').addEventListener('click', rotateAction);
    $('btnCancel').addEventListener('click', cancelAction);
    $('btnLastReport').addEventListener('click', () => { if (S().lastReport) showReport(S().lastReport, true); });

    $('overlayBtns').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-overlay]');
      if (!b) return;
      ui.overlay = b.dataset.overlay;
      for (const x of $('overlayBtns').querySelectorAll('button')) x.classList.toggle('active', x === b);
    });

    $('feeSlider').addEventListener('input', (e) => { Sim.setFee(S(), Number(e.target.value)); refreshPanels(); });

    $('infoPanel').addEventListener('click', onPanelClick);
    $('deviceList').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-kind]');
      if (!b) return;
      const kind = b.dataset.kind;
      if (ui.placing === kind) { cancelAction(); return; }
      if (!Sim.isUnlocked(S(), kind)) { flash(`${D.DEVICES[kind].name} gibt es erst ab ${D.STAGES[D.DEVICES[kind].stage].name}.`, true); return; }
      ui.placing = kind;
      ui.carry = null;
      ui.selectedDevice = null;
      ui.selectedAgent = null;
      closeDrawers();
      refreshPanels();
    });

    for (const b of document.querySelectorAll('[data-collapse]')) {
      b.addEventListener('click', () => {
        const p = $(b.dataset.collapse);
        if (window.matchMedia('(max-width: 960px)').matches) { p.classList.remove('open'); return; }
        p.classList.toggle('collapsed');
        b.textContent = p.classList.contains('collapsed')
          ? (p.id === 'buildPanel' ? '›' : '‹')
          : (p.id === 'buildPanel' ? '‹' : '›');
      });
    }
    $('openBuild').addEventListener('click', () => { $('buildPanel').classList.toggle('open'); $('infoPanel').classList.remove('open'); });
    $('openInfo').addEventListener('click', () => { $('infoPanel').classList.toggle('open'); $('buildPanel').classList.remove('open'); });

    $('buildHint').innerHTML = 'Gerät wählen und aufs Raster klicken. <kbd>R</kbd> dreht, <kbd>Esc</kbd> oder Rechtsklick bricht ab. ' +
      'Gestellte Geräte ziehst du kostenlos mit der Maus an einen neuen Platz. ' +
      'Jedes Gerät braucht ein freies, vom Eingang erreichbares Feld daneben – sonst wird es rot und bleibt außer Betrieb.';

    reset();
  }

  function reset() {
    Object.assign(ui, { placing: null, carry: null, press: null, ghost: null, selectedDevice: null, selectedAgent: null });
    lastStage = -1;
    htmlCache.clear();
    $('toasts').innerHTML = '';
    const log = S().log;
    lastLogId = log.length ? log[log.length - 1].id - 1 : 0;
    refreshPanels();
  }

  function closeDrawers() {
    $('buildPanel').classList.remove('open');
    $('infoPanel').classList.remove('open');
  }

  function buildDeviceList() {
    const s = S();
    const list = $('deviceList');
    list.innerHTML = '';
    for (const [kind, d] of Object.entries(D.DEVICES)) {
      const b = document.createElement('button');
      b.className = 'device';
      b.dataset.kind = kind;
      const unlocked = Sim.isUnlocked(s, kind);
      b.title = `${d.name}: ${d.w} × ${d.h} Felder, ${d.slots} ${d.slots === 1 ? 'Platz' : 'Plätze'}, ${d.duration} Min. pro Nutzung`;
      b.innerHTML = `<canvas width="92" height="92"></canvas>
        <div><div class="name">${esc(d.name)}</div>
        <div class="meta"><span class="price">${euro(d.price)}</span> · ${d.w}×${d.h} · ${d.duration} Min.${d.slots > 1 ? ` · ${d.slots} Plätze` : ''}</div>
        <div class="meta">${unlocked ? (d.category === 'kraft' ? 'Kraft' : 'Cardio') + (d.power ? ` · Strom ${d.power} €/Monat` : '') : `ab ${D.STAGES[d.stage].name}`}</div></div>`;
      list.appendChild(b);
      const c = b.querySelector('canvas').getContext('2d');
      const ts = 80 / Math.max(d.w, d.h);
      c.translate(46, 46);
      R.drawDeviceShape(c, kind, d.w * ts, d.h * ts, ts);
      if (!unlocked) b.classList.add('locked');
    }
  }

  // ---------------------------------------------------------------- Eingaben

  function pointerPos(e) {
    const r = (is3D() ? canvas3d : canvas).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function is3D() { return viewMode === '3d' && !!r3d; }

  function setViewMode(mode) {
    viewMode = mode;
    try { localStorage.setItem('garage-to-gym-view', mode); } catch (err) { /* egal */ }
    refreshPanels();
  }

  function tileAt(p) {
    if (is3D()) return r3d.screenToTile(p.x, p.y);
    return view ? R.screenToTile(view, p.x, p.y) : null;
  }

  function agentAtPos(s, p) {
    return is3D() ? r3d.agentAt(s, p.x, p.y) : R.agentAt(view, s, p.x, p.y);
  }

  function deviceAtPos(p, t) {
    if (is3D()) {
      const id = r3d.deviceAt(p.x, p.y);
      if (id) return Sim.deviceById(S(), id);
    }
    return deviceAtTile(t);
  }

  function deviceAtTile(t) {
    const s = S();
    const L = Sim.getLayout(s);
    if (t.x < 0 || t.y < 0 || t.x >= L.W || t.y >= L.H) return null;
    const id = L.occ[t.y * L.W + t.x];
    return id ? Sim.deviceById(s, id) : null;
  }

  function onPointerMove(e) {
    const p = pointerPos(e);
    ui.hover = tileAt(p);
    if (!ui.hover) return;
    if (ui.press && !ui.carry && Math.hypot(p.x - ui.press.sx, p.y - ui.press.sy) > 6) startCarry();
  }

  function onPointerDown(e) {
    if (modalKind) return;
    if (e.button === 2 || e.button === 1) return;
    const s = S();
    const p = pointerPos(e);
    ui.hover = tileAt(p);
    if (!ui.hover) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }

    if (ui.placing) { updateGhost(); tryPlace(); return; }

    const agent = agentAtPos(s, p);
    const dev = deviceAtPos(p, ui.hover);
    if (agent) {
      ui.selectedAgent = agent.id;
      ui.selectedDevice = null;
      refreshPanels();
      return;
    }
    if (dev) {
      ui.selectedDevice = dev.id;
      ui.selectedAgent = null;
      const fp = Sim.footprint(dev.kind, dev.x, dev.y, dev.rot);
      const off = {
        x: Math.max(0, Math.min(fp.w - 1, ui.hover.x - dev.x)),
        y: Math.max(0, Math.min(fp.h - 1, ui.hover.y - dev.y)),
      };
      ui.press = { devId: dev.id, sx: p.x, sy: p.y, off };
      refreshPanels();
      return;
    }
    if (Sim.cleanDirtAt(s, ui.hover.x, ui.hover.y)) { flash('Blitzblank!'); return; }
    ui.selectedDevice = null;
    ui.selectedAgent = null;
    refreshPanels();
  }

  function onPointerUp() {
    if (ui.carry) finishCarry();
    ui.press = null;
  }

  function startCarry() {
    const s = S();
    const dev = Sim.deviceById(s, ui.press.devId);
    if (!dev) { ui.press = null; return; }
    Sim.pickUpDevice(s, dev.id);
    ui.carry = { devId: dev.id, kind: dev.kind, rot: dev.rot, off: ui.press.off, from: { x: dev.x, y: dev.y, rot: dev.rot } };
    ui.press = null;
  }

  function finishCarry() {
    const s = S();
    const g = ui.ghost;
    const c = ui.carry;
    ui.carry = null;
    if (g && g.ok) {
      Sim.dropDevice(s, c.devId, g.x, g.y, g.rot);
    } else {
      Sim.cancelMove(s, c.devId);
      if (g && g.reason) flash(`Verschieben abgebrochen: ${g.reason}`, true);
    }
    ui.ghost = null;
    refreshPanels();
  }

  function tryPlace() {
    const s = S();
    const g = ui.ghost;
    if (!g) return;
    const res = Sim.buyDevice(s, g.kind, g.x, g.y, g.rot);
    if (!res.ok) { flash(res.reason, true); return; }
    flash(`${D.DEVICES[g.kind].name} aufgestellt (−${euro(D.DEVICES[g.kind].price)}).`);
    if (s.money < D.DEVICES[g.kind].price) ui.placing = null;
    refreshPanels();
  }

  function rotateAction() {
    const s = S();
    if (ui.placing) { ui.rot = ui.rot ? 0 : 1; return; }
    if (ui.carry) { ui.carry.rot = ui.carry.rot ? 0 : 1; return; }
    if (ui.selectedDevice) {
      const res = Sim.rotateDevice(s, ui.selectedDevice);
      if (!res.ok) flash(`Drehen geht hier nicht: ${res.reason}`, true);
    }
  }

  function cancelAction() {
    if (ui.carry) {
      Sim.cancelMove(S(), ui.carry.devId);
      ui.carry = null;
    }
    ui.placing = null;
    ui.ghost = null;
    ui.press = null;
    ui.selectedDevice = null;
    ui.selectedAgent = null;
    refreshPanels();
  }

  function onKey(e) {
    if (modalKind) {
      if (e.key === ' ') { e.preventDefault(); return; } // Leertaste soll keinen Dialog wegklicken
      if (e.key === 'Enter' || e.key === 'Escape') {
        const btn = $('modalBody').querySelector('button.primary');
        if (btn) { e.preventDefault(); btn.click(); }
      }
      return;
    }
    if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    const k = e.key.toLowerCase();
    if (k === 'r') rotateAction();
    else if (k === 'q' && is3D()) r3d.rotate(-1);
    else if (k === 'e' && is3D()) r3d.rotate(1);
    else if (e.key.startsWith('Arrow') && is3D()) {
      e.preventDefault();
      const step = 1;
      if (e.key === 'ArrowLeft') r3d.pan(-step, 0);
      if (e.key === 'ArrowRight') r3d.pan(step, 0);
      if (e.key === 'ArrowUp') r3d.pan(0, step);
      if (e.key === 'ArrowDown') r3d.pan(0, -step);
    }
    else if (e.key === 'Escape') cancelAction();
    else if (e.key === ' ') { e.preventDefault(); app.setSpeed(app.speed === 0 ? (app.prevSpeed || 1) : 0); }
    else if (k === '1') app.setSpeed(1);
    else if (k === '2') app.setSpeed(2);
    else if (k === '3') app.setSpeed(4);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedDevice) sellSelected();
  }

  function sellSelected() {
    const res = Sim.sellDevice(S(), ui.selectedDevice);
    if (res.ok) flash(`Verkauft für ${euro(res.refund)}.`);
    ui.selectedDevice = null;
    refreshPanels();
  }

  function onPanelClick(e) {
    const b = e.target.closest('button[data-action]');
    if (!b) return;
    const s = S();
    const a = b.dataset.action;
    let res = null;
    switch (a) {
      case 'repair':
        res = Sim.repairDevice(s, ui.selectedDevice);
        if (res.ok) flash(`Repariert für ${euro(res.cost)}.`); else flash(res.reason, true);
        break;
      case 'rotate': rotateAction(); break;
      case 'sell': sellSelected(); break;
      case 'deselect': ui.selectedDevice = null; ui.selectedAgent = null; break;
      case 'hire':
        res = Sim.hireStaff(s, 'reinigung', b.dataset.shift);
        if (!res.ok) flash(res.reason, true);
        break;
      case 'fire': Sim.fireStaff(s, Number(b.dataset.id)); break;
      case 'ad':
        res = Sim.buyAd(s, b.dataset.kind);
        if (!res.ok) flash(res.reason, true);
        break;
      case 'upgrade':
        if (Sim.upgrade(s)) { cancelAction(); app.save(true); }
        break;
      default:
    }
    refreshPanels();
  }

  // ---------------------------------------------------------------- Zeichnen

  function updateGhost() {
    const s = S();
    ui.ghost = null;
    if (!ui.hover || (!ui.placing && !ui.carry)) return;
    const kind = ui.placing || ui.carry.kind;
    const rot = ui.placing ? ui.rot : ui.carry.rot;
    const fp = Sim.footprint(kind, 0, 0, rot);
    let x, y;
    if (ui.placing) {
      x = ui.hover.x - Math.floor((fp.w - 1) / 2);
      y = ui.hover.y - Math.floor((fp.h - 1) / 2);
    } else {
      x = ui.hover.x - Math.min(ui.carry.off.x, fp.w - 1);
      y = ui.hover.y - Math.min(ui.carry.off.y, fp.h - 1);
    }
    let reason = Sim.placementProblem(s, kind, x, y, rot, ui.carry ? ui.carry.devId : undefined);
    if (!reason && ui.placing && s.money < D.DEVICES[kind].price) reason = 'Nicht genug Geld';
    ui.ghost = { kind, x, y, rot, ok: !reason, reason };
  }

  function render() {
    const s = S();
    if (ui.selectedAgent && !Sim.agentById(s, ui.selectedAgent)) ui.selectedAgent = null;
    if (ui.selectedDevice && !Sim.deviceById(s, ui.selectedDevice)) ui.selectedDevice = null;
    const use3d = is3D();
    canvas.style.display = use3d ? 'none' : 'block';
    canvas3d.style.display = use3d ? 'block' : 'none';
    if (use3d) {
      updateGhost();
      r3d.render(s, ui);
      updateStatusLine();
      updateToasts();
      return;
    }
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view = R.computeView(canvas, s);
    updateGhost();
    R.draw(ctx, view, s, ui);
    updateStatusLine();
    updateToasts();
  }

  function updateStatusLine() {
    const el = $('statusLine');
    let text = '', bad = false;
    if (flashMsg && performance.now() < flashMsg.until) {
      text = flashMsg.text; bad = flashMsg.bad;
    } else if (ui.ghost) {
      const d = D.DEVICES[ui.ghost.kind];
      if (ui.ghost.ok) text = ui.placing ? `${d.name} (${euro(d.price)}) – klicken zum Aufstellen, R zum Drehen` : `${d.name} – loslassen zum Abstellen`;
      else { text = ui.ghost.reason; bad = true; }
    } else if (ui.placing) {
      text = `${D.DEVICES[ui.placing].name}: Feld auf dem Raster wählen`;
    } else if (app.speed === 0) {
      text = 'Pausiert – Leertaste zum Fortsetzen';
    }
    if (el.textContent !== text) el.textContent = text;
    el.classList.toggle('bad', bad);
  }

  function updateToasts() {
    const s = S();
    const box = $('toasts');
    for (const entry of s.log) {
      if (entry.id <= lastLogId) continue;
      lastLogId = entry.id;
      const t = document.createElement('div');
      t.className = `toast ${entry.kind}`;
      t.textContent = entry.text;
      box.appendChild(t);
      setTimeout(() => t.classList.add('fade'), 5000);
      setTimeout(() => t.remove(), 5700);
      while (box.children.length > 4) box.firstChild.remove();
    }
  }

  // ---------------------------------------------------------------- Panels

  function refreshPanels() {
    if (!app || !app.s) return;
    const s = S();
    if (s.stage !== lastStage) { lastStage = s.stage; buildDeviceList(); }

    // Leiste oben
    const st = Sim.stageDef(s);
    $('stageName').textContent = st.name;
    const m = $('sMoney');
    m.textContent = euro(s.money);
    m.classList.toggle('neg', s.money < 0);
    $('sMembers').textContent = `${s.members.length} / ${st.capacity}`;
    const sat = Sim.averageSatisfaction(s);
    $('sSat').textContent = sat === null ? '–' : Math.round(sat);
    $('sRep').textContent = stars(Sim.reputation(s));
    const clean = Sim.cleanliness(s);
    const cEl = $('sClean');
    cEl.textContent = `${Math.round(clean)} %`;
    cEl.classList.toggle('neg', clean < 50);
    $('sMonth').textContent = `${D.MONTH_NAMES[s.month]} · Tag ${s.day + 1}/${D.DAYS_PER_MONTH} · Jahr ${s.year}`;
    for (const b of $('speedBtns').querySelectorAll('button')) b.classList.toggle('active', Number(b.dataset.speed) === app.speed);

    // Baumenü
    for (const b of $('deviceList').querySelectorAll('button[data-kind]')) {
      const kind = b.dataset.kind;
      b.classList.toggle('selected', ui.placing === kind);
      b.classList.toggle('poor', Sim.isUnlocked(s, kind) && s.money < D.DEVICES[kind].price);
    }
    $('btnRotate').disabled = !(ui.placing || ui.carry || ui.selectedDevice);
    for (const b of $('viewBtns').querySelectorAll('button')) {
      b.classList.toggle('active', b.dataset.view === (is3D() ? '3d' : '2d'));
      if (b.dataset.view === '3d') b.disabled = !r3d;
    }
    $('camBtns').classList.toggle('hidden', !is3D());
    $('btnCancel').disabled = !(ui.placing || ui.carry || ui.selectedDevice || ui.selectedAgent);

    // Beitrag
    const slider = $('feeSlider');
    if (document.activeElement !== slider) slider.value = s.fee;
    $('feeValue').textContent = `${s.fee} €`;
    const types = [...new Set(D.STAGES.slice(0, s.stage + 1).flatMap((x) => Object.keys(x.typeMix)))];
    setHTML($('feeHints'), types.map((t) => {
      const mt = D.MEMBER_TYPES[t];
      const f = Math.pow(mt.refPrice / s.fee, 2);
      const cls = f >= 1 ? 'pos' : f >= 0.7 ? '' : 'neg';
      return `<div class="row"><span>${mt.plural} <span class="muted">(fair: ${mt.refPrice} €)</span></span><span class="${cls}">${Math.round(f * 100)} %</span></div>`;
    }).join('') + '<div class="muted">Faktor auf die Beitrittschance nach dem Probetraining.</div>');

    setHTML($('selInfo'), selectionHTML());
    $('selInfo').classList.toggle('hidden', !ui.selectedDevice && !ui.selectedAgent);
    setHTML($('goals'), goalsHTML());
    setHTML($('staff'), staffHTML());
    setHTML($('ads'), adsHTML());
    setHTML($('ledger'), ledgerHTML());
    $('btnLastReport').classList.toggle('hidden', !s.lastReport);
  }

  function selectionHTML() {
    const s = S();
    if (ui.selectedDevice) {
      const dev = Sim.deviceById(s, ui.selectedDevice);
      if (!dev) return '';
      const d = D.DEVICES[dev.kind];
      const L = Sim.getLayout(s);
      const n = dev.stats.uses + dev.stats.skips;
      const avgWait = n ? dev.stats.wait / n : 0;
      const zone = L.zone[dev.id];
      let state;
      if (dev.moving) state = '<span class="muted">wird verschoben</span>';
      else if (dev.broken) state = '<span class="neg">kaputt</span>';
      else if (!L.active[dev.id]) state = '<span class="neg">kein Zugang – außer Betrieb</span>';
      else if (dev.users.length) state = `<span class="pos">in Benutzung (${dev.users.length}/${d.slots})</span>`;
      else state = 'frei';
      return `<h3>${esc(d.name)}</h3>
        <div class="row"><span>Status</span><span>${state}</span></div>
        <div class="row"><span>Zustand</span><span class="${dev.condition < D.BREAK_THRESHOLD ? 'neg' : ''}">${dev.condition.toFixed(1)} %</span></div>
        <div class="row"><span>Zone</span><span>${zone ? D.CATEGORIES[zone].zoneName : '–'}</span></div>
        <div class="row"><span>Heute genutzt</span><span>${dev.stats.uses}×</span></div>
        <div class="row"><span>Ø Wartezeit heute</span><span>${avgWait.toFixed(1)} Min.</span></div>
        <div class="row"><span>Warteschlange</span><span>${dev.queue.length}</span></div>
        <div class="btns">
          <button class="small" data-action="repair" ${dev.condition >= 100 ? 'disabled' : ''}>Reparieren (${euro(Sim.repairCost(dev))})</button>
          <button class="small" data-action="rotate">Drehen</button>
          <button class="small danger" data-action="sell">Verkaufen (+${euro(d.price * D.SELL_REFUND)})</button>
        </div>
        <div class="muted" style="margin-top:6px">Zum Verschieben mit der Maus ziehen.</div>`;
    }
    if (ui.selectedAgent) {
      const a = Sim.agentById(s, ui.selectedAgent);
      if (!a) return '';
      if (a.role === 'cleaner') {
        const p = s.staff.find((x) => x.id === a.staffId);
        return `<h3>${esc(a.name)} · Reinigungskraft</h3>
          <div class="row"><span>Schicht</span><span>${p ? D.SHIFTS[p.shift].label : '–'}</span></div>
          <div class="thought">„${esc(a.thought)}“</div>`;
      }
      const mt = D.MEMBER_TYPES[a.type];
      const m = a.memberId ? Sim.memberById(s, a.memberId) : null;
      const doing = a.cur ? `${a.state === 'wait' ? 'wartet auf' : a.state === 'use' ? 'trainiert an' : 'geht zu'} ${D.DEVICES[a.cur.kind].name}` : (a.state === 'exit' ? 'geht nach Hause' : 'überlegt');
      const plan = a.plan.map((k) => D.DEVICES[k].short).join(', ') || '–';
      return `<h3>${esc(a.name)} · ${mt.name}</h3>
        <div class="row"><span>Rolle</span><span>${ROLE_LABEL[a.role]}</span></div>
        <div class="row"><span>Note dieses Besuchs</span><span style="color:${R.moodColor(a.score)}">${Math.round(Math.max(0, Math.min(100, a.score)))}</span></div>
        ${m ? `<div class="row"><span>Zufriedenheit (Monat)</span><span>${Math.round(Sim.memberSatisfaction(m))}</span></div>` : ''}
        <div class="row"><span>Gerade</span><span>${doing}</span></div>
        <div class="row"><span>Noch geplant</span><span>${plan}</span></div>
        <div class="row"><span>Gewartet</span><span>${Math.round(a.waitTotal)} Min.</span></div>
        ${a.thought ? `<div class="thought">„${esc(a.thought)}“</div>` : ''}
        <div class="muted">Will vor allem: ${Object.entries(mt.prefs).filter(([, w]) => w >= 3).map(([k]) => D.DEVICES[k].short).join(', ')}</div>`;
    }
    return '';
  }

  function goalsHTML() {
    const s = S();
    const u = Sim.upgradeStatus(s);
    if (!u) return '<div class="muted">Höchste Ausbaustufe erreicht.</div>';
    let html = `<div class="muted" style="margin-bottom:4px">Umzug ins ${esc(u.target)}:</div>`;
    for (const c of u.checks) {
      html += `<div class="goal"><span class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✔' : '○'} ${esc(c.label)}</span><span>${esc(c.value)}</span></div>`;
    }
    if (u.available) {
      html += `<div class="btns"><button class="primary" data-action="upgrade" ${u.ready ? '' : 'disabled'}>Ins ${esc(u.target)} umziehen</button></div>`;
    } else if (u.note) {
      html += `<div class="muted" style="margin-top:6px">${esc(u.note)}</div>`;
    }
    return html;
  }

  function staffHTML() {
    const s = S();
    const def = D.STAFF.reinigung;
    if (s.stage < def.stage) {
      return '<div class="muted">In der Garage machst du alles selbst: Klick auf die braunen Schmutzflecken, um sie wegzuputzen. Ab dem Kellerstudio kannst du eine Reinigungskraft einstellen.</div>';
    }
    let html = '';
    for (const [key, sh] of Object.entries(D.SHIFTS)) {
      const p = s.staff.find((x) => x.role === 'reinigung' && x.shift === key);
      if (p) {
        html += `<div class="staff-row"><span>${esc(p.name)} · ${sh.name}<br><span class="muted">${sh.label}, ${euro(def.salary)}/Monat</span></span><button class="small danger" data-action="fire" data-id="${p.id}">Entlassen</button></div>`;
      } else {
        html += `<div class="staff-row"><span>${sh.name}<br><span class="muted">${sh.label} · niemand</span></span><button class="small" data-action="hire" data-shift="${key}">Einstellen</button></div>`;
      }
    }
    html += `<div class="muted" style="margin-top:4px">Reinigungskraft: ${euro(def.salary)} pro Monat, tageweise abgerechnet.</div>`;
    return html;
  }

  function adsHTML() {
    const s = S();
    return Object.entries(D.ADS).map(([key, ad]) => {
      const run = s.ads.find((a) => a.kind === key && a.until > s.absDay);
      const right = run
        ? `<span class="pos">noch ${run.until - s.absDay} ${run.until - s.absDay === 1 ? 'Tag' : 'Tage'}</span>`
        : `<button class="small" data-action="ad" data-kind="${key}" ${s.money < ad.cost ? 'disabled' : ''}>${euro(ad.cost)}</button>`;
      return `<div class="staff-row"><span>${ad.name}<br><span class="muted">+${Math.round(ad.boost * 100)} % Interessenten, ${ad.days} Tage</span></span>${right}</div>`;
    }).join('');
  }

  function ledgerHTML() {
    const s = S();
    const st = Sim.stageDef(s);
    const L = s.ledger;
    const fees = s.members.length * s.fee;
    const power = s.devices.reduce((sum, d) => sum + D.DEVICES[d.kind].power, 0);
    const rows = [
      ['Beiträge (Monatsende)', fees],
      ['Tageskarten', L.daypass],
      ['Miete (Monatsende)', -st.rent],
      ['Gehälter', -L.salaries],
      ['Strom (Monatsende)', -power],
      ['Reparaturen', -L.repairs],
      ['Werbung', -L.ads],
    ];
    const total = rows.reduce((sum, r) => sum + r[1], 0);
    let html = rows.filter((r) => r[1] !== 0 || r[0].startsWith('Beiträge')).map(([k, v]) => `<div class="row"><span>${k}</span><span class="${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}">${signed(v)}</span></div>`).join('');
    html += `<div class="row total"><span>Voraussichtlich</span><span class="${total < 0 ? 'neg' : 'pos'}">${signed(total)}</span></div>`;
    if (L.purchases || L.sales) html += `<div class="row"><span class="muted">Gerätekäufe / -verkäufe</span><span class="muted">${signed(L.sales - L.purchases)}</span></div>`;
    html += `<div class="row"><span class="muted">Probetrainings / neue Mitglieder</span><span class="muted">${s.monthStats.trials} / ${s.monthStats.joined}</span></div>`;
    return html;
  }

  // ---------------------------------------------------------------- Dialoge

  function openModal(kind, html, onClose) {
    modalKind = kind;
    $('modalBody').innerHTML = html;
    $('modal').classList.remove('hidden');
    for (const b of $('modalBody').querySelectorAll('button[data-close]')) {
      b.addEventListener('click', () => {
        closeModal();
        if (onClose) onClose(b.dataset.close);
      });
    }
    const primary = $('modalBody').querySelector('button.primary');
    if (primary) primary.focus();
  }

  function closeModal() {
    modalKind = null;
    $('modal').classList.add('hidden');
  }

  function isModalOpen() { return !!modalKind; }

  function row(label, value, cls) {
    return `<div class="row"><span>${label}</span><span class="${cls || ''}">${value}</span></div>`;
  }

  function showReport(r, archived) {
    const L = r.ledger;
    const income = L.fees + L.daypass;
    const running = L.rent + L.salaries + L.power + L.repairs + L.ads;
    const op = income - running;
    const invest = L.purchases - L.sales;
    const leftTypes = {};
    for (const t of r.leftTypes) leftTypes[t] = (leftTypes[t] || 0) + 1;
    const complaints = r.complaints.length
      ? `<ul>${r.complaints.map((c) => `<li>${esc(c.label)} <span class="muted">(${c.count}×)</span></li>`).join('')}</ul>`
      : '<p class="muted">Keine Beschwerden – stark!</p>';
    const html = `
      <h2>Monatsbericht ${esc(r.monthName)}</h2>
      <div class="muted">Jahr ${r.year}</div>
      <div class="cols">
        <div>
          <h4>Einnahmen</h4>
          ${row('Beiträge', euro(L.fees))}
          ${row('Tageskarten', euro(L.daypass))}
          <h4>Ausgaben</h4>
          ${row('Miete', euro(L.rent))}
          ${row('Gehälter', euro(L.salaries))}
          ${row('Strom', euro(L.power))}
          ${row('Reparaturen', euro(L.repairs))}
          ${row('Werbung', euro(L.ads))}
          <div class="row total"><span>Gewinn</span><span class="${op < 0 ? 'neg' : 'pos'}">${signed(op)}</span></div>
          ${invest ? row('Geräte (Kauf − Verkauf)', signed(-invest), 'muted') : ''}
          ${row('Kontostand', euro(r.money), r.money < 0 ? 'neg' : '')}
        </div>
        <div>
          <h4>Mitglieder</h4>
          ${row('Zu Monatsbeginn', r.membersBefore)}
          ${row('Probetrainings', r.trials)}
          ${row('Neu dabei', `+${r.joined}`, 'pos')}
          ${row('Gekündigt', `−${r.left}`, r.left ? 'neg' : '')}
          <div class="row total"><span>Jetzt</span><span>${r.members}</span></div>
          ${r.left ? `<div class="muted">${Object.entries(leftTypes).map(([t, n]) => `${n} ${D.MEMBER_TYPES[t].plural}`).join(', ')}</div>` : ''}
          <h4>Stimmung</h4>
          ${row('Ø Zufriedenheit', r.avgSat === null ? '–' : Math.round(r.avgSat))}
          ${row('Ruf', `<span class="stars">${stars(r.reputation)}</span>`)}
        </div>
      </div>
      <h4>Häufigste Beschwerden</h4>
      ${complaints}
      ${r.warning ? `<div class="warning">${esc(r.warning)}</div>` : ''}
      <div class="actions"><button class="primary" data-close="ok">${archived ? 'Schließen' : 'Weiter'}</button></div>`;
    openModal('report', html, () => {
      if (!archived) {
        S().pendingReport = null;
        app.save(true);
      }
    });
  }

  function showGameOver() {
    const s = S();
    openModal('gameover', `
      <h2>Pleite!</h2>
      <p>Dein Konto stand zwei Monate hintereinander im Minus. Die Bank macht dein Studio dicht.</p>
      ${row('Durchgehalten bis', `${D.MONTH_NAMES[s.month]}, Jahr ${s.year}`)}
      ${row('Ausbaustufe', Sim.stageDef(s).name)}
      ${row('Mitglieder', s.members.length)}
      <p class="muted">Tipp: Achte auf Miete und Gehälter, bevor du umziehst, und stell nur so viele Geräte auf, wie du auslasten kannst.</p>
      <div class="actions"><button class="primary" data-close="new">Neues Spiel</button></div>`,
    () => app.newGame());
  }

  function showConfirmNew() {
    openModal('confirm', `
      <h2>Neues Spiel?</h2>
      <p>Dein aktueller Spielstand wird überschrieben.</p>
      <div class="actions"><button data-close="no">Abbrechen</button><button class="primary" data-close="yes">Neues Spiel</button></div>`,
    (answer) => { if (answer === 'yes') app.newGame(); });
  }

  function showHelp() {
    openModal('help', `
      <h2>Garage to Gym</h2>
      <p>Aus einer leeren Garage machst du ein Fitnessstudio. Stell Geräte auf, halte deine Mitglieder zufrieden und wachse – aber nur so schnell, wie dein Layout es hergibt: Zu viele Mitglieder auf zu wenigen Geräten bedeuten Wartezeiten und Kündigungen.</p>
      <h4>Ziel (Version 0.1)</h4>
      <ul>
        <li><b>Garage → Kellerstudio:</b> 12 Mitglieder und 1.500 € in der Kasse.</li>
        <li><b>Kellerstudio → Studio:</b> 50 Mitglieder, Zufriedenheit ≥ 70 und 20.000 € (Studio folgt in 0.2).</li>
        <li>Steht das Konto zwei Monatsenden hintereinander im Minus, ist das Spiel verloren.</li>
      </ul>
      <h4>Steuerung</h4>
      <ul>
        <li>Gerät links wählen, aufs Raster klicken. <kbd>R</kbd> dreht, <kbd>Esc</kbd> bricht ab.</li>
        <li>Geräte mit der Maus ziehen = kostenlos verschieben. Verkaufen bringt 50 % zurück.</li>
        <li>Figuren anklicken zeigt ihre Gedanken. Braune Flecken anklicken = putzen.</li>
        <li><kbd>Leertaste</kbd> Pause, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> Tempo 1×, 2×, 4×.</li>
        <li>3D-Ansicht: <kbd>Q</kbd> / <kbd>E</kbd> dreht die Kamera, Mausrad zoomt, Pfeiltasten oder mittlere Maustaste verschieben. Links unter „Ansicht“ kannst du auf den 2D-Plan umschalten.</li>
      </ul>
      <h4>Tipps</h4>
      <ul>
        <li>Jedes Gerät braucht ein freies Nachbarfeld, das vom Eingang erreichbar ist.</li>
        <li>3 Kraft- oder Cardiogeräte nebeneinander bilden eine Zone (+5 Laune).</li>
        <li>Mehr als 2 Leute in 3 × 3 Feldern = Gedränge. Lass Gänge frei.</li>
        <li>Stoßzeit ist 17–20 Uhr. Die Ansicht „Wartezeit“ zeigt dir die Engpässe.</li>
      </ul>
      <div class="actions"><button class="primary" data-close="ok">Los geht's</button></div>`);
  }

  root.GymUI = {
    init, reset, render, refreshPanels, flash,
    showReport, showGameOver, showHelp, isModalOpen,
    get modalKind() { return modalKind; },
    get renderer3d() { return is3D() ? r3d : null; },
  };
})(this);
