/*
 * Garage to Gym – Simulation (ohne DOM, läuft auch in Node).
 * Der gesamte Spielstand ist ein reines JSON-Objekt und lässt sich jederzeit speichern.
 */
(function (root) {
  'use strict';

  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.GymData;

  // ---------------------------------------------------------------- Hilfen

  const rand = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  function poisson(lambda) {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rand(); } while (p > L);
    return k - 1;
  }

  function weightedPick(weights) {
    let total = 0;
    for (const k in weights) total += weights[k];
    if (total <= 0) return null;
    let r = rand() * total;
    for (const k in weights) {
      r -= weights[k];
      if (r <= 0) return k;
    }
    return Object.keys(weights).pop();
  }

  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  // ---------------------------------------------------------------- Formeln aus dem Konzept

  /** Beitrittschance nach dem Probetraining. */
  function joinChance(score, reputation, refPrice, fee) {
    const p = (score / 100) * (reputation / 3) * Math.pow(refPrice / fee, 2);
    return clamp(p, 0, D.MAX_JOIN_CHANCE);
  }

  /** Kündigungsrate am Monatsende. */
  function churnRate(satisfaction) {
    return D.CHURN_BASE + Math.max(0, D.CHURN_THRESHOLD - satisfaction) / 100;
  }

  /** Ruf in Sternen aus der durchschnittlichen Zufriedenheit. */
  function starsFromAverage(a) {
    return clamp(Math.floor(a / 20) + 1, 1, 5);
  }

  // ---------------------------------------------------------------- Spielstand

  function emptyLedger() {
    return { fees: 0, daypass: 0, sales: 0, rent: 0, salaries: 0, power: 0, repairs: 0, ads: 0, purchases: 0 };
  }

  function emptyMonthStats() {
    return { joined: 0, left: 0, trials: 0, scoreSum: 0, scoreCount: 0, membersStart: 0 };
  }

  function newGame() {
    const s = {
      version: D.SAVE_VERSION,
      nextId: 1,
      logId: 0,
      stage: 0,
      money: D.START_MONEY,
      fee: D.START_FEE,
      time: D.DAY_START,
      day: 0,
      month: 0,
      year: 1,
      absDay: 0,
      devices: [],
      agents: [],
      members: [],
      dirt: [],
      staff: [],
      arrivals: [],
      ads: [],
      repHistory: [],
      ledger: emptyLedger(),
      complaints: {},
      monthStats: emptyMonthStats(),
      negMonths: 0,
      gameOver: false,
      pendingReport: null,
      lastReport: null,
      layoutVersion: 0,
      log: [],
    };
    startDay(s);
    addLog(s, 'Willkommen in deiner Garage! Stell die ersten Geräte auf.', 'info');
    return s;
  }

  function nid(s) { return s.nextId++; }

  function addLog(s, text, kind) {
    s.log.push({ id: ++s.logId, text, kind: kind || 'info', day: s.absDay, time: s.time });
    if (s.log.length > 40) s.log.splice(0, s.log.length - 40);
  }

  function complain(s, key, n) {
    s.complaints[key] = (s.complaints[key] || 0) + (n || 1);
  }

  const stageDef = (s) => D.STAGES[s.stage];
  const deviceById = (s, id) => s.devices.find((d) => d.id === id);
  const agentById = (s, id) => s.agents.find((a) => a.id === id);
  const memberById = (s, id) => s.members.find((m) => m.id === id);

  function reputation(s) {
    if (!s.repHistory.length) return D.START_REPUTATION;
    return starsFromAverage(avg(s.repHistory.slice(-3)));
  }

  function averageSatisfaction(s) {
    if (!s.members.length) return null;
    return avg(s.members.map(memberSatisfaction));
  }

  function memberSatisfaction(m) {
    return m.visits.length ? avg(m.visits) : m.sat;
  }

  function adBoost(s) {
    return s.ads.filter((a) => a.until > s.absDay).reduce((sum, a) => sum + D.ADS[a.kind].boost, 0);
  }

  function capacity(s) { return stageDef(s).capacity; }

  // ---------------------------------------------------------------- Raster & Layout

  function footprint(kind, x, y, rot) {
    const d = D.DEVICES[kind];
    const w = rot ? d.h : d.w;
    const h = rot ? d.w : d.h;
    const tiles = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) tiles.push({ x: x + i, y: y + j });
    return { w, h, tiles };
  }

  const layoutCache = new WeakMap();

  /** Belegung, Erreichbarkeit, Zugangsfelder und Zonen – neu berechnet, wenn sich das Layout ändert. */
  function getLayout(s) {
    const cached = layoutCache.get(s);
    if (cached && cached.version === s.layoutVersion && cached.stage === s.stage) return cached;

    const st = stageDef(s);
    const W = st.w, H = st.h;
    const occ = new Array(W * H).fill(0);
    const placed = s.devices.filter((d) => !d.moving);
    for (const dev of placed) {
      for (const t of footprint(dev.kind, dev.x, dev.y, dev.rot).tiles) {
        if (t.x >= 0 && t.y >= 0 && t.x < W && t.y < H) occ[t.y * W + t.x] = dev.id;
      }
    }

    // Erreichbarkeit vom Eingang
    const reach = new Array(W * H).fill(false);
    const e = st.entrance;
    const q = [e.y * W + e.x];
    reach[q[0]] = true;
    while (q.length) {
      const idx = q.shift();
      const x = idx % W, y = (idx - x) / W;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (reach[n] || occ[n]) continue;
        reach[n] = true;
        q.push(n);
      }
    }

    // Zugangsfelder je Gerät
    const access = {};
    const active = {};
    for (const dev of placed) {
      const set = new Set();
      for (const t of footprint(dev.kind, dev.x, dev.y, dev.rot).tiles) {
        for (const [dx, dy] of DIRS) {
          const nx = t.x + dx, ny = t.y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (!occ[n] && reach[n]) set.add(n);
        }
      }
      access[dev.id] = [...set];
      active[dev.id] = set.size > 0;
    }

    // Zonen: 3+ Geräte derselben Kategorie, die direkt aneinandergrenzen
    const zone = {};
    const parent = {};
    const find = (a) => (parent[a] === a ? a : (parent[a] = find(parent[a])));
    for (const dev of placed) parent[dev.id] = dev.id;
    for (const dev of placed) {
      const cat = D.DEVICES[dev.kind].category;
      for (const t of footprint(dev.kind, dev.x, dev.y, dev.rot).tiles) {
        for (const [dx, dy] of DIRS) {
          const nx = t.x + dx, ny = t.y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const other = occ[ny * W + nx];
          if (!other || other === dev.id) continue;
          const od = placed.find((p) => p.id === other);
          if (od && D.DEVICES[od.kind].category === cat) parent[find(dev.id)] = find(other);
        }
      }
    }
    const sizes = {};
    for (const dev of placed) { const r = find(dev.id); sizes[r] = (sizes[r] || 0) + 1; }
    for (const dev of placed) zone[dev.id] = sizes[find(dev.id)] >= 3 ? D.DEVICES[dev.kind].category : null;

    let freeTiles = 0;
    for (let i = 0; i < occ.length; i++) if (!occ[i]) freeTiles++;

    const layout = { version: s.layoutVersion, stage: s.stage, W, H, occ, reach, access, active, zone, freeTiles };
    layoutCache.set(s, layout);
    return layout;
  }

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /** Breitensuche ab einem Feld. Das Startfeld darf belegt sein (z. B. wer gerade an einem Gerät steht). */
  function bfs(L, sx, sy) {
    const W = L.W, H = L.H;
    sx = clamp(sx, 0, W - 1); sy = clamp(sy, 0, H - 1);
    const dist = new Int16Array(W * H).fill(-1);
    const prev = new Int32Array(W * H).fill(-1);
    const start = sy * W + sx;
    dist[start] = 0;
    const q = [start];
    let head = 0;
    while (head < q.length) {
      const idx = q[head++];
      const x = idx % W, y = (idx - x) / W;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (dist[n] >= 0 || L.occ[n]) continue;
        dist[n] = dist[idx] + 1;
        prev[n] = idx;
        q.push(n);
      }
    }
    return { dist, prev, start };
  }

  function buildPath(L, search, target) {
    const path = [];
    let cur = target;
    while (cur !== search.start && cur >= 0) {
      path.push({ x: cur % L.W, y: Math.floor(cur / L.W) });
      cur = search.prev[cur];
    }
    return path.reverse();
  }

  function nearestTarget(search, targets) {
    let best = -1, bestD = Infinity;
    for (const t of targets) {
      const d = search.dist[t];
      if (d >= 0 && d < bestD) { bestD = d; best = t; }
    }
    return { target: best, dist: bestD };
  }

  function cleanliness(s) {
    const L = getLayout(s);
    return clamp(100 - (s.dirt.length / Math.max(1, L.freeTiles)) * 200, 0, 100);
  }

  // ---------------------------------------------------------------- Bauen

  function isUnlocked(s, kind) { return D.DEVICES[kind].stage <= s.stage; }

  /** Prüft, ob ein Gerät an diese Stelle passt. Gibt null oder einen Grund zurück. */
  function placementProblem(s, kind, x, y, rot, ignoreId) {
    const st = stageDef(s);
    const fp = footprint(kind, x, y, rot);
    for (const t of fp.tiles) {
      if (t.x < 0 || t.y < 0 || t.x >= st.w || t.y >= st.h) return 'Außerhalb der Fläche';
      if (t.x === st.entrance.x && t.y === st.entrance.y) return 'Der Eingang muss frei bleiben';
    }
    for (const dev of s.devices) {
      if (dev.moving || dev.id === ignoreId) continue;
      const other = footprint(dev.kind, dev.x, dev.y, dev.rot);
      for (const t of fp.tiles) {
        if (other.tiles.some((o) => o.x === t.x && o.y === t.y)) return 'Dort steht schon etwas';
      }
    }
    return null;
  }

  function removeDirtUnderDevices(s) {
    const L = getLayout(s);
    s.dirt = s.dirt.filter((d) => !L.occ[d.y * L.W + d.x]);
  }

  function buyDevice(s, kind, x, y, rot) {
    const d = D.DEVICES[kind];
    if (!d) return { ok: false, reason: 'Unbekanntes Gerät' };
    if (!isUnlocked(s, kind)) return { ok: false, reason: `Erst ab ${D.STAGES[d.stage].name}` };
    if (s.money < d.price) return { ok: false, reason: 'Nicht genug Geld' };
    const problem = placementProblem(s, kind, x, y, rot);
    if (problem) return { ok: false, reason: problem };
    const dev = {
      id: nid(s), kind, x, y, rot: rot ? 1 : 0, condition: 100, broken: false,
      users: [], queue: [], stats: newDeviceStats(),
    };
    s.devices.push(dev);
    s.money -= d.price;
    s.ledger.purchases += d.price;
    s.layoutVersion++;
    removeDirtUnderDevices(s);
    return { ok: true, device: dev };
  }

  function newDeviceStats() { return { busy: 0, wait: 0, uses: 0, skips: 0 }; }

  /** Schickt alle Nutzer und Wartenden eines Geräts weiter (ohne Strafe). */
  function releaseDevice(s, dev, reason) {
    for (const id of [...dev.users, ...dev.queue]) {
      const a = agentById(s, id);
      if (!a || !a.cur) continue;
      if (reason === 'broken') {
        a.score -= 10;
        complain(s, 'broken');
        think(a, `Mist, ${D.DEVICES[dev.kind].the} ${D.DEVICES[dev.kind].plural ? 'sind' : 'ist'} kaputt.`);
      } else {
        a.plan.unshift(a.cur.kind);
      }
      a.cur = null;
      a.state = 'decide';
      a.path = [];
    }
    dev.users = [];
    dev.queue = [];
  }

  function sellDevice(s, id) {
    const dev = deviceById(s, id);
    if (!dev) return { ok: false };
    releaseDevice(s, dev);
    const refund = Math.round(D.DEVICES[dev.kind].price * D.SELL_REFUND);
    s.money += refund;
    s.ledger.sales += refund;
    s.devices = s.devices.filter((d) => d.id !== id);
    s.layoutVersion++;
    return { ok: true, refund };
  }

  function pickUpDevice(s, id) {
    const dev = deviceById(s, id);
    if (!dev || dev.moving) return false;
    releaseDevice(s, dev);
    dev.moving = true;
    s.layoutVersion++;
    return true;
  }

  function dropDevice(s, id, x, y, rot) {
    const dev = deviceById(s, id);
    if (!dev) return { ok: false, reason: 'Gerät fehlt' };
    const problem = placementProblem(s, dev.kind, x, y, rot, id);
    if (problem) return { ok: false, reason: problem };
    dev.x = x; dev.y = y; dev.rot = rot ? 1 : 0;
    dev.moving = false;
    s.layoutVersion++;
    removeDirtUnderDevices(s);
    return { ok: true };
  }

  function cancelMove(s, id) {
    const dev = deviceById(s, id);
    if (dev && dev.moving) { dev.moving = false; s.layoutVersion++; }
  }

  function rotateDevice(s, id) {
    const dev = deviceById(s, id);
    if (!dev) return { ok: false };
    const rot = dev.rot ? 0 : 1;
    const problem = placementProblem(s, dev.kind, dev.x, dev.y, rot, id);
    if (problem) return { ok: false, reason: problem };
    releaseDevice(s, dev);
    dev.rot = rot;
    s.layoutVersion++;
    removeDirtUnderDevices(s);
    return { ok: true };
  }

  function repairCost(dev) { return Math.round(D.DEVICES[dev.kind].price * D.REPAIR_COST); }

  function repairDevice(s, id) {
    const dev = deviceById(s, id);
    if (!dev) return { ok: false };
    const cost = repairCost(dev);
    if (s.money < cost) return { ok: false, reason: 'Nicht genug Geld' };
    s.money -= cost;
    s.ledger.repairs += cost;
    dev.condition = 100;
    dev.broken = false;
    return { ok: true, cost };
  }

  // ---------------------------------------------------------------- Personal, Preise, Werbung

  function setFee(s, fee) { s.fee = clamp(Math.round(fee), D.FEE_MIN, D.FEE_MAX); }

  function hireStaff(s, role, shift) {
    const def = D.STAFF[role];
    if (!def || s.stage < def.stage) return { ok: false, reason: `Erst ab ${D.STAGES[def ? def.stage : 1].name}` };
    if (s.staff.some((p) => p.role === role && p.shift === shift)) return { ok: false, reason: 'Schicht ist schon besetzt' };
    const p = { id: nid(s), role, shift, name: pick(D.NAMES) };
    s.staff.push(p);
    addLog(s, `${p.name} putzt jetzt in der ${D.SHIFTS[shift].name}.`, 'good');
    return { ok: true, staff: p };
  }

  function fireStaff(s, id) {
    s.staff = s.staff.filter((p) => p.id !== id);
    s.agents = s.agents.filter((a) => a.staffId !== id);
  }

  function buyAd(s, kind) {
    const ad = D.ADS[kind];
    if (!ad) return { ok: false };
    if (s.ads.some((a) => a.kind === kind && a.until > s.absDay)) return { ok: false, reason: 'Läuft bereits' };
    if (s.money < ad.cost) return { ok: false, reason: 'Nicht genug Geld' };
    s.money -= ad.cost;
    s.ledger.ads += ad.cost;
    s.ads.push({ kind, until: s.absDay + ad.days });
    addLog(s, `${ad.name} geschaltet: +${Math.round(ad.boost * 100)} % Interessenten für ${ad.days} Tage.`, 'good');
    return { ok: true };
  }

  // ---------------------------------------------------------------- Ausbaustufen

  function upgradeStatus(s) {
    const st = stageDef(s);
    const n = st.next;
    if (!n) return null;
    const sat = averageSatisfaction(s);
    const checks = [
      { label: `${n.members} Mitglieder`, ok: s.members.length >= n.members, value: `${s.members.length}` },
    ];
    if (n.satisfaction) {
      checks.push({ label: `Zufriedenheit ≥ ${n.satisfaction}`, ok: sat !== null && sat >= n.satisfaction, value: sat === null ? '–' : `${Math.round(sat)}` });
    }
    checks.push({ label: `${n.money.toLocaleString('de-DE')} € in der Kasse`, ok: s.money >= n.money, value: `${Math.round(s.money).toLocaleString('de-DE')} €` });
    const nextStage = D.STAGES[s.stage + 1];
    return {
      target: nextStage ? nextStage.name : 'Studio',
      checks,
      ready: checks.every((c) => c.ok),
      available: !!nextStage && !n.locked,
      note: n.locked || null,
    };
  }

  function upgrade(s) {
    const u = upgradeStatus(s);
    if (!u || !u.ready || !u.available) return false;
    s.stage++;
    s.layoutVersion++;
    for (const a of s.agents) a.path = [];
    addLog(s, `Umzug geschafft: Willkommen im ${stageDef(s).name}! Neue Geräte und Personal sind freigeschaltet.`, 'good');
    return true;
  }

  // ---------------------------------------------------------------- Tagesablauf

  function sampleArrival(type) {
    const t = D.MEMBER_TYPES[type];
    let minute;
    if (rand() < 0.8) {
      minute = (t.hours[0] + rand() * (t.hours[1] - t.hours[0])) * 60;
    } else {
      minute = D.DAY_START + rand() * (D.LAST_ARRIVAL - D.DAY_START);
    }
    return clamp(minute, D.DAY_START, D.LAST_ARRIVAL);
  }

  function startDay(s) {
    const st = stageDef(s);
    s.time = D.DAY_START;
    s.arrivals = [];
    s.ads = s.ads.filter((a) => a.until > s.absDay);
    for (const dev of s.devices) dev.stats = newDeviceStats();

    for (const m of s.members) {
      if (rand() < D.VISIT_PROB) s.arrivals.push({ t: sampleArrival(m.type), role: 'member', type: m.type, memberId: m.id });
    }
    const repFactor = reputation(s) / 3;
    const trials = poisson(st.interest * repFactor * (1 + adBoost(s)));
    for (let i = 0; i < trials; i++) {
      const type = weightedPick(st.typeMix);
      s.arrivals.push({ t: sampleArrival(type), role: 'trial', type });
    }
    const passes = poisson(st.dayPasses * repFactor);
    for (let i = 0; i < passes; i++) {
      const type = weightedPick(st.typeMix);
      s.arrivals.push({ t: sampleArrival(type), role: 'daypass', type });
    }
    s.arrivals.sort((a, b) => a.t - b.t);
  }

  function endDay(s) {
    for (const a of [...s.agents]) {
      if (a.role !== 'cleaner') finishVisit(s, a, true);
    }
    s.agents = [];
    for (const dev of s.devices) { dev.users = []; dev.queue = []; }
    for (const p of s.staff) s.ledger.salaries += D.STAFF[p.role].salary / D.DAYS_PER_MONTH;

    s.absDay++;
    s.day++;
    if (s.day >= D.DAYS_PER_MONTH) {
      monthEnd(s);
      s.day = 0;
      s.month++;
      if (s.month >= D.MONTHS_PER_YEAR) { s.month = 0; s.year++; }
    }
    startDay(s);
  }

  function monthEnd(s) {
    const st = stageDef(s);
    const L = s.ledger;
    const ms = s.monthStats;
    const membersBefore = ms.membersStart;

    L.fees = s.members.length * s.fee;
    L.rent = st.rent;
    L.salaries = Math.round(L.salaries);
    L.power = s.devices.reduce((sum, d) => sum + D.DEVICES[d.kind].power, 0);
    s.money += L.fees - L.rent - L.salaries - L.power;

    for (const m of s.members) {
      if (m.visits.length) m.sat = avg(m.visits);
      m.visits = [];
    }
    let avgSat = averageSatisfaction(s);
    if (avgSat === null && ms.scoreCount) avgSat = ms.scoreSum / ms.scoreCount;
    if (avgSat !== null) {
      s.repHistory.push(avgSat);
      if (s.repHistory.length > 12) s.repHistory.shift();
    }

    const leaving = s.members.filter((m) => rand() < churnRate(m.sat));
    if (leaving.length) {
      s.members = s.members.filter((m) => !leaving.includes(m));
      ms.left += leaving.length;
    }

    const income = L.fees + L.daypass + L.sales;
    const running = L.rent + L.salaries + L.power + L.repairs + L.ads;
    const topComplaints = Object.entries(s.complaints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, count]) => ({ key, label: D.COMPLAINTS[key] || key, count }));

    let warning = null;
    if (s.money < 0) {
      s.negMonths++;
      if (s.negMonths >= D.NEGATIVE_MONTHS_TO_LOSE) {
        s.gameOver = true;
        warning = 'Zwei Monate hintereinander im Minus – das Studio ist pleite.';
      } else {
        warning = 'Dein Konto ist im Minus! Steht es nächsten Monat wieder im Minus, ist das Spiel verloren.';
      }
    } else {
      s.negMonths = 0;
    }

    const report = {
      monthName: D.MONTH_NAMES[s.month],
      year: s.year,
      ledger: { ...L },
      income,
      running,
      operatingProfit: income - running - L.sales,
      profit: income - running - L.purchases,
      membersBefore,
      joined: ms.joined,
      left: leaving.length,
      leftTypes: leaving.map((m) => m.type),
      members: s.members.length,
      trials: ms.trials,
      avgSat,
      reputation: reputation(s),
      complaints: topComplaints,
      money: s.money,
      warning,
    };
    s.pendingReport = report;
    s.lastReport = report;
    s.ledger = emptyLedger();
    s.complaints = {};
    s.monthStats = emptyMonthStats();
    s.monthStats.membersStart = s.members.length;
  }

  // ---------------------------------------------------------------- Figuren

  function think(a, text) { a.thought = text; }

  function spawnVisitor(s, arrival) {
    const e = stageDef(s).entrance;
    const member = arrival.memberId ? memberById(s, arrival.memberId) : null;
    if (arrival.memberId && !member) return; // inzwischen gekündigt
    const a = {
      id: nid(s), role: arrival.role, type: arrival.type, memberId: arrival.memberId || null,
      name: member ? member.name : pick(D.NAMES),
      x: e.x, y: e.y, path: [], state: 'decide', plan: [], cur: null,
      score: D.START_SCORE, crowd: 0, flags: {}, thought: '', ver: -1, waitTotal: 0,
    };
    a.plan = makePlan(s, a.type);
    if (!a.plan.length) {
      a.flags.nothing = true;
      think(a, 'Hier gibt es ja gar nichts zum Trainieren!');
    } else if (arrival.role === 'trial') {
      think(a, 'Mal schauen, ob mir das Studio gefällt …');
    } else {
      think(a, 'Auf geht\'s!');
    }
    if (arrival.role === 'daypass') {
      s.money += D.DAY_PASS_PRICE;
      s.ledger.daypass += D.DAY_PASS_PRICE;
    }
    s.agents.push(a);
  }

  function availableKinds(s) {
    const L = getLayout(s);
    const kinds = new Set();
    for (const dev of s.devices) {
      if (!dev.moving && !dev.broken && L.active[dev.id]) kinds.add(dev.kind);
    }
    return kinds;
  }

  function makePlan(s, type) {
    const kinds = availableKinds(s);
    if (!kinds.size) return [];
    const prefs = D.MEMBER_TYPES[type].prefs;
    const weights = {};
    for (const k of kinds) weights[k] = prefs[k] != null ? prefs[k] : 0.3;
    const n = rand() < 0.5 ? 3 : 4;
    const plan = [];
    for (let i = 0; i < n; i++) {
      const k = weightedPick(weights);
      if (!k) break;
      plan.push(k);
      weights[k] /= 2;
    }
    return plan;
  }

  function spawnCleaner(s, p) {
    const e = stageDef(s).entrance;
    s.agents.push({
      id: nid(s), role: 'cleaner', staffId: p.id, name: p.name, type: null,
      x: e.x, y: e.y, path: [], state: 'cidle', timer: 0, target: null, thought: 'Dann mal los.', ver: -1,
    });
  }

  function tileOf(a) { return { x: Math.round(a.x), y: Math.round(a.y) }; }

  function moveAlong(s, a, dt) {
    let budget = D.WALK_SPEED * dt;
    while (budget > 0 && a.path.length) {
      const t = a.path[0];
      const dx = t.x - a.x, dy = t.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        a.x = t.x; a.y = t.y;
        a.path.shift();
        budget -= d;
        if (a.role !== 'cleaner' && rand() < D.DIRT_PER_STEP) addDirt(s, t.x, t.y);
      } else {
        a.x += (dx / d) * budget;
        a.y += (dy / d) * budget;
        budget = 0;
      }
    }
    return a.path.length === 0;
  }

  function addDirt(s, x, y) {
    const L = getLayout(s);
    if (x < 0 || y < 0 || x >= L.W || y >= L.H) return;
    if (L.occ[y * L.W + x]) return;
    if (s.dirt.some((d) => d.x === x && d.y === y)) return;
    s.dirt.push({ id: nid(s), x, y });
  }

  function cleanDirtAt(s, x, y) {
    const before = s.dirt.length;
    s.dirt = s.dirt.filter((d) => !(d.x === x && d.y === y));
    return s.dirt.length < before;
  }

  function bestDevice(s, L, search, kind) {
    let best = null;
    const dd = D.DEVICES[kind];
    for (const dev of s.devices) {
      if (dev.kind !== kind || dev.moving || dev.broken || !L.active[dev.id]) continue;
      const near = nearestTarget(search, L.access[dev.id]);
      if (near.target < 0) continue;
      const load = dev.users.length + dev.queue.length;
      const free = load < dd.slots;
      const expWait = Math.max(0, load - dd.slots + 1) * dd.duration / dd.slots;
      const cost = near.dist / D.WALK_SPEED + expWait;
      if (!best || cost < best.cost) best = { dev, cost, free, target: near.target };
    }
    return best;
  }

  function decideNext(s, a) {
    const L = getLayout(s);
    if (!a.plan.length) { goExit(s, a); return; }
    const t = tileOf(a);
    const search = bfs(L, t.x, t.y);

    // Zuerst eine Übung, deren Gerät gerade frei ist – sonst die nächste im Plan.
    let idx = -1, choice = null;
    for (let i = 0; i < a.plan.length; i++) {
      const b = bestDevice(s, L, search, a.plan[i]);
      if (b && b.free) { idx = i; choice = b; break; }
    }
    if (idx < 0) {
      for (let i = 0; i < a.plan.length; i++) {
        const b = bestDevice(s, L, search, a.plan[i]);
        if (b) { idx = i; choice = b; break; }
      }
    }
    if (idx < 0) {
      // Für keine der restlichen Übungen gibt es ein funktionierendes Gerät.
      a.score -= 10 * a.plan.length;
      complain(s, 'skip', a.plan.length);
      think(a, 'Die Geräte, die ich brauche, gehen gerade nicht.');
      a.plan = [];
      goExit(s, a);
      return;
    }
    const kind = a.plan.splice(idx, 1)[0];
    a.cur = { kind, dev: choice.dev.id, waited: 0 };
    a.path = buildPath(L, search, choice.target);
    a.state = 'walk';
    a.ver = s.layoutVersion;
  }

  function goExit(s, a) {
    const L = getLayout(s);
    const e = stageDef(s).entrance;
    const t = tileOf(a);
    const search = bfs(L, t.x, t.y);
    const target = e.y * L.W + e.x;
    a.path = search.dist[target] >= 0 ? buildPath(L, search, target) : [];
    if (search.dist[target] < 0) { a.x = e.x; a.y = e.y; }
    a.state = 'exit';
    a.cur = null;
    a.ver = s.layoutVersion;
  }

  function arriveAtDevice(s, a) {
    const dev = deviceById(s, a.cur.dev);
    if (!dev || dev.moving || dev.broken) {
      a.plan.unshift(a.cur.kind);
      a.cur = null;
      a.state = 'decide';
      return;
    }
    if (!dev.queue.includes(a.id)) dev.queue.push(a.id);
    a.state = 'wait';
  }

  function startUse(s, a, dev) {
    const d = D.DEVICES[dev.kind];
    const L = getLayout(s);
    a.state = 'use';
    a.timer = d.duration;
    dev.users.push(a.id);

    // Auf das Gerätefeld stellen, das am nächsten liegt und nicht schon belegt ist.
    const tiles = footprint(dev.kind, dev.x, dev.y, dev.rot).tiles;
    const taken = dev.users.map((id) => agentById(s, id)).filter((o) => o && o !== a).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`);
    let best = tiles[0], bestD = Infinity;
    for (const t of tiles) {
      const dd = Math.abs(t.x - a.x) + Math.abs(t.y - a.y) + (taken.includes(`${t.x},${t.y}`) ? 10 : 0);
      if (dd < bestD) { bestD = dd; best = t; }
    }
    a.standX = Math.round(a.x); a.standY = Math.round(a.y);
    a.x = best.x; a.y = best.y;

    if (a.cur.waited < D.NO_WAIT_THRESHOLD) {
      a.score += 5;
      if (rand() < 0.3) think(a, `Super, ${d.the} ${d.plural ? 'waren' : 'war'} direkt frei.`);
    }
    const zone = L.zone[dev.id];
    if (zone && !a.flags.zone && D.MEMBER_TYPES[a.type].zones.includes(zone)) {
      a.flags.zone = true;
      a.score += 5;
      think(a, zone === 'kraft' ? 'Die Kraftecke ist richtig gut gemacht.' : 'Schöner Cardio-Bereich!');
    }
  }

  function finishUse(s, a) {
    const dev = deviceById(s, a.cur.dev);
    a.cur = null;
    a.state = 'decide';
    if (!dev) return;
    dev.users = dev.users.filter((id) => id !== a.id);
    dev.stats.uses++;
    dev.condition = Math.max(0, dev.condition - D.WEAR_PER_USE);

    const standX = a.standX != null ? a.standX : Math.round(a.x);
    const standY = a.standY != null ? a.standY : Math.round(a.y);
    a.x = standX; a.y = standY;
    if (rand() < D.DIRT_PER_USE) addDirt(s, standX, standY);

    if (dev.condition < D.BREAK_THRESHOLD && rand() < D.BREAK_CHANCE) {
      dev.broken = true;
      releaseDevice(s, dev, 'broken');
      addLog(s, `${D.DEVICES[dev.kind].name} ist ausgefallen! Reparatur: ${repairCost(dev)} €.`, 'bad');
    }
  }

  function finishVisit(s, a, closing) {
    if (a.done) return;
    a.done = true;
    for (const dev of s.devices) {
      dev.users = dev.users.filter((id) => id !== a.id);
      dev.queue = dev.queue.filter((id) => id !== a.id);
    }

    const clean = cleanliness(s);
    if (clean < 50) { a.score -= 15; complain(s, 'dirty'); }
    else if (clean > 90) a.score += 5;
    if (a.flags.nothing) {
      // Wer gar nicht trainieren konnte, ist enttäuscht – und meldet sich sicher nicht an.
      a.score = 10;
      complain(s, 'nothing');
    }
    const score = clamp(Math.round(a.score), 0, 100);
    a.score = score;

    s.monthStats.scoreSum += score;
    s.monthStats.scoreCount++;

    if (a.role === 'member') {
      const m = memberById(s, a.memberId);
      if (m) { m.visits.push(score); m.lastScore = score; }
    } else if (a.role === 'trial') {
      s.monthStats.trials++;
      const t = D.MEMBER_TYPES[a.type];
      if (s.members.length >= capacity(s)) {
        complain(s, 'full');
        if (!closing) addLog(s, `${a.name} wollte Mitglied werden, aber das Studio ist voll.`, 'bad');
      } else if (!a.flags.nothing) {
        const p = joinChance(score, reputation(s), t.refPrice, s.fee);
        if (rand() < p) {
          s.members.push({
            id: nid(s), name: a.name, type: a.type, since: { month: s.month, year: s.year },
            visits: [], sat: score, lastScore: score,
          });
          s.monthStats.joined++;
          addLog(s, `Neues Mitglied: ${a.name} (${t.name}), Probetraining mit Note ${score}.`, 'good');
        } else if (Math.pow(t.refPrice / s.fee, 2) < 0.8) {
          complain(s, 'price');
        }
      }
    }
    a.remove = true;
  }

  function updateVisitor(s, a, dt) {
    if (a.ver !== s.layoutVersion && (a.state === 'walk' || a.state === 'exit')) {
      if (a.state === 'walk') { a.plan.unshift(a.cur.kind); a.cur = null; a.state = 'decide'; }
      else goExit(s, a);
    }
    switch (a.state) {
      case 'decide':
        decideNext(s, a);
        break;
      case 'walk':
        if (moveAlong(s, a, dt)) arriveAtDevice(s, a);
        break;
      case 'wait': {
        const dev = deviceById(s, a.cur.dev);
        if (!dev || dev.moving || dev.broken) { a.plan.unshift(a.cur.kind); a.cur = null; a.state = 'decide'; break; }
        a.cur.waited += dt;
        a.waitTotal += dt;
        a.score -= dt;
        dev.stats.wait += dt;
        const d = D.DEVICES[dev.kind];
        if (a.cur.waited > 5 && !a.cur.complained) {
          a.cur.complained = true;
          think(a, `Schon wieder ${d.plural ? 'sind' : 'ist'} ${d.the} besetzt!`);
        }
        if (a.cur.waited >= D.MEMBER_TYPES[a.type].patience) {
          dev.queue = dev.queue.filter((id) => id !== a.id);
          dev.stats.skips++;
          a.score -= 10;
          complain(s, 'wait');
          complain(s, 'skip');
          think(a, `Keine Lust mehr zu warten – ich lasse ${d.the} aus.`);
          a.cur = null;
          a.state = 'decide';
        }
        break;
      }
      case 'use':
        a.timer -= dt;
        if (a.timer <= 0) finishUse(s, a);
        break;
      case 'exit':
        if (moveAlong(s, a, dt)) {
          if (a.score >= 70) think(a, 'Gutes Training heute!');
          else if (a.score >= 50) think(a, 'Naja, ging so.');
          else think(a, 'Das war nix.');
          finishVisit(s, a, false);
        }
        break;
      default:
        a.state = 'decide';
    }
  }

  function updateCleaner(s, a, dt) {
    const L = getLayout(s);
    if (a.ver !== s.layoutVersion && a.state === 'cwalk') { a.state = 'cidle'; a.timer = 0; }
    switch (a.state) {
      case 'cidle': {
        a.timer -= dt;
        if (a.timer > 0) break;
        a.timer = 1;
        if (!s.dirt.length) { think(a, 'Alles sauber.'); break; }
        const t = tileOf(a);
        const search = bfs(L, t.x, t.y);
        const near = nearestTarget(search, s.dirt.map((d) => d.y * L.W + d.x));
        if (near.target < 0) break;
        a.target = { x: near.target % L.W, y: Math.floor(near.target / L.W) };
        a.path = buildPath(L, search, near.target);
        a.state = 'cwalk';
        a.ver = s.layoutVersion;
        think(a, 'Da hinten ist ein Fleck.');
        break;
      }
      case 'cwalk':
        if (!s.dirt.some((d) => d.x === a.target.x && d.y === a.target.y)) { a.state = 'cidle'; a.timer = 0; break; }
        if (moveAlong(s, a, dt)) { a.state = 'clean'; a.timer = D.CLEAN_MINUTES; think(a, 'Wird geputzt …'); }
        break;
      case 'clean':
        a.timer -= dt;
        if (a.timer <= 0) { cleanDirtAt(s, a.target.x, a.target.y); a.state = 'cidle'; a.timer = 0; }
        break;
      default:
        a.state = 'cidle';
    }
  }

  // ---------------------------------------------------------------- Hauptschleife

  function tick(s, dt) {
    if (s.gameOver || s.pendingReport) return;
    s.time += dt;

    while (s.arrivals.length && s.arrivals[0].t <= s.time) spawnVisitor(s, s.arrivals.shift());

    // Reinigungskräfte kommen und gehen mit ihrer Schicht.
    for (const p of s.staff) {
      const sh = D.SHIFTS[p.shift];
      const onDuty = s.time >= sh.start && s.time < sh.end;
      const agent = s.agents.find((a) => a.staffId === p.id);
      if (onDuty && !agent) spawnCleaner(s, p);
      if (!onDuty && agent) agent.remove = true;
    }

    // Warteschlangen nachrücken lassen.
    for (const dev of s.devices) {
      const d = D.DEVICES[dev.kind];
      dev.queue = dev.queue.filter((id) => { const a = agentById(s, id); return a && a.state === 'wait' && a.cur && a.cur.dev === dev.id; });
      while (!dev.broken && !dev.moving && dev.users.length < d.slots && dev.queue.length) {
        const a = agentById(s, dev.queue.shift());
        startUse(s, a, dev);
      }
      dev.stats.busy += dt * dev.users.length / d.slots;
    }

    // Gedränge: mehr als 2 Personen in 3×3 Feldern.
    const L = getLayout(s);
    const count = new Int16Array(L.W * L.H);
    for (const a of s.agents) {
      const t = tileOf(a);
      if (t.x >= 0 && t.y >= 0 && t.x < L.W && t.y < L.H) count[t.y * L.W + t.x]++;
    }
    for (const a of s.agents) {
      if (a.role === 'cleaner') continue;
      const t = tileOf(a);
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = t.x + dx, y = t.y + dy;
        if (x >= 0 && y >= 0 && x < L.W && y < L.H) n += count[y * L.W + x];
      }
      if (n >= D.CROWD_LIMIT) a.crowd += dt; else a.crowd = Math.max(0, a.crowd - dt);
      if (a.crowd >= D.CROWD_MINUTES && !a.flags.crowd) {
        a.flags.crowd = true;
        a.score -= 10;
        complain(s, 'crowd');
        think(a, 'Puh, ganz schön eng hier.');
      }
    }

    for (const a of s.agents) {
      if (a.remove) continue;
      if (a.role === 'cleaner') updateCleaner(s, a, dt);
      else updateVisitor(s, a, dt);
    }
    s.agents = s.agents.filter((a) => !a.remove);

    if (s.time >= D.DAY_END) endDay(s);
  }

  /** Lässt die Simulation um die angegebene Anzahl Spielminuten weiterlaufen. */
  function advance(s, minutes) {
    while (minutes > 1e-9 && !s.pendingReport && !s.gameOver) {
      const step = Math.min(D.SIM_STEP, minutes);
      tick(s, step);
      minutes -= step;
    }
  }

  function normalizeLoaded(s) {
    if (!s || s.version !== D.SAVE_VERSION || !Array.isArray(s.devices)) return null;
    s.layoutVersion = (s.layoutVersion || 0) + 1;
    return s;
  }

  const GymSim = {
    newGame, advance, tick, startDay, endDay, monthEnd,
    joinChance, churnRate, starsFromAverage,
    reputation, averageSatisfaction, memberSatisfaction, cleanliness, adBoost, capacity,
    stageDef, deviceById, agentById, memberById, footprint, getLayout, placementProblem, isUnlocked,
    buyDevice, sellDevice, pickUpDevice, dropDevice, cancelMove, rotateDevice, repairDevice, repairCost,
    setFee, hireStaff, fireStaff, buyAd, upgradeStatus, upgrade, cleanDirtAt, addDirt, addLog,
    normalizeLoaded,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GymSim;
  else root.GymSim = GymSim;
})(this);
