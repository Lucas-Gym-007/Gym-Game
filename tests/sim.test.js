'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/data.js');
const Sim = require('../js/sim.js');

function runDays(s, days) {
  const target = s.absDay + days;
  while (s.absDay < target && !s.gameOver) {
    Sim.advance(s, 60);
    if (s.pendingReport) s.pendingReport = null;
  }
}

test('Beitrittschance folgt der Formel und ist bei 90 % gedeckelt', () => {
  assert.equal(Sim.joinChance(60, 3, 25, 25), 0.6);
  assert.equal(Sim.joinChance(60, 3, 25, 50), 0.15);
  assert.ok(Math.abs(Sim.joinChance(60, 4, 30, 30) - 0.8) < 1e-9);
  assert.equal(Sim.joinChance(100, 5, 30, 10), 0.9);
});

test('Kündigungsrate: 2 % Grundrate plus 1 % je Punkt unter 50', () => {
  assert.equal(Sim.churnRate(80), 0.02);
  assert.equal(Sim.churnRate(50), 0.02);
  assert.ok(Math.abs(Sim.churnRate(30) - 0.22) < 1e-9);
});

test('Ruf in Sternen', () => {
  assert.equal(Sim.starsFromAverage(0), 1);
  assert.equal(Sim.starsFromAverage(19), 1);
  assert.equal(Sim.starsFromAverage(20), 2);
  assert.equal(Sim.starsFromAverage(79), 4);
  assert.equal(Sim.starsFromAverage(80), 5);
  assert.equal(Sim.starsFromAverage(100), 5);
});

test('Platzieren: Grenzen, Überlappung, Eingang, Geld und Freischaltung', () => {
  const s = Sim.newGame();
  assert.ok(Sim.buyDevice(s, 'squatrack', 0, 0, 0).ok);
  assert.equal(s.money, D.START_MONEY - 900);
  assert.equal(Sim.buyDevice(s, 'hantelbank', 1, 1, 0).ok, false, 'überlappt');
  assert.equal(Sim.buyDevice(s, 'hantelbank', 5, 0, 0).ok, false, 'ragt hinaus');
  assert.equal(Sim.buyDevice(s, 'kurzhanteln', 2, 4, 0).ok, false, 'Eingang bei (3,4)');
  assert.equal(Sim.buyDevice(s, 'laufband', 4, 0, 0).ok, false, 'erst im Kellerstudio');
  s.money = 100;
  assert.equal(Sim.buyDevice(s, 'kurzhanteln', 3, 0, 0).ok, false, 'zu teuer');
});

test('Gedreht belegt ein Gerät andere Felder', () => {
  const fp = Sim.footprint('hantelbank', 1, 1, 1);
  assert.deepEqual([fp.w, fp.h], [1, 2]);
  assert.deepEqual(fp.tiles, [{ x: 1, y: 1 }, { x: 1, y: 2 }]);
});

test('Verkaufen bringt 50 % zurück', () => {
  const s = Sim.newGame();
  const dev = Sim.buyDevice(s, 'hantelbank', 0, 0, 0).device;
  const res = Sim.sellDevice(s, dev.id);
  assert.equal(res.refund, 150);
  assert.equal(s.money, D.START_MONEY - 150);
  assert.equal(s.devices.length, 0);
});

test('Geräte ohne erreichbares freies Nachbarfeld sind außer Betrieb', () => {
  const s = Sim.newGame();
  // Kurzhanteln in die Ecke, dann mit Bänken einmauern
  const inner = Sim.buyDevice(s, 'kurzhanteln', 0, 0, 0).device;
  assert.ok(Sim.getLayout(s).active[inner.id]);
  Sim.buyDevice(s, 'hantelbank', 0, 1, 0);
  s.money = 5000;
  Sim.buyDevice(s, 'hantelbank', 2, 0, 1);
  assert.equal(Sim.getLayout(s).active[inner.id], false);
});

test('Drei Kraftgeräte nebeneinander bilden eine Zone', () => {
  const s = Sim.newGame();
  s.money = 5000;
  const a = Sim.buyDevice(s, 'kurzhanteln', 0, 0, 0).device;
  const b = Sim.buyDevice(s, 'hantelbank', 2, 0, 0).device;
  let L = Sim.getLayout(s);
  assert.equal(L.zone[a.id], null);
  const c = Sim.buyDevice(s, 'kurzhanteln', 4, 0, 0).device;
  L = Sim.getLayout(s);
  assert.equal(L.zone[a.id], 'kraft');
  assert.equal(L.zone[b.id], 'kraft');
  assert.equal(L.zone[c.id], 'kraft');
});

test('Verschieben ist kostenlos und prüft den Zielplatz', () => {
  const s = Sim.newGame();
  const dev = Sim.buyDevice(s, 'kurzhanteln', 0, 0, 0).device;
  Sim.buyDevice(s, 'hantelbank', 0, 2, 0);
  const money = s.money;
  Sim.pickUpDevice(s, dev.id);
  assert.equal(Sim.dropDevice(s, dev.id, 0, 2, 0).ok, false);
  assert.ok(Sim.dropDevice(s, dev.id, 3, 0, 1).ok);
  assert.deepEqual([dev.x, dev.y, dev.rot, dev.moving], [3, 0, 1, false]);
  assert.equal(s.money, money);
});

test('Ohne Geräte tritt niemand bei', () => {
  const s = Sim.newGame();
  runDays(s, 14);
  assert.equal(s.members.length, 0);
});

test('Monatsabrechnung: Beiträge, Miete und Gehälter', () => {
  const s = Sim.newGame();
  s.stage = 1;
  s.layoutVersion++;
  s.money = 10000;
  s.members = Array.from({ length: 10 }, (_, i) => ({ id: 1000 + i, name: 'X', type: 'kraft', since: { month: 0, year: 1 }, visits: [], sat: 80, lastScore: 80 }));
  s.arrivals = [];
  Sim.hireStaff(s, 'reinigung', 'spaet');
  s.fee = 30;
  // Ein Monat ohne Besuche: Sauberkeit, Laune etc. spielen keine Rolle
  for (let d = 0; d < D.DAYS_PER_MONTH; d++) {
    s.arrivals = [];
    s.members.forEach((m) => { m.visits = []; });
    Sim.endDay(s);
  }
  const r = s.pendingReport;
  assert.ok(r, 'Monatsbericht liegt vor');
  assert.equal(r.ledger.fees, 300);
  assert.equal(r.ledger.rent, 600);
  assert.equal(r.ledger.salaries, 300);
});

test('Längerer Spielverlauf bleibt stabil und speicherbar', () => {
  const s = Sim.newGame();
  Sim.buyDevice(s, 'squatrack', 0, 0, 0);
  Sim.buyDevice(s, 'hantelbank', 3, 0, 0);
  Sim.buyDevice(s, 'kurzhanteln', 3, 2, 0);
  runDays(s, 7 * 6);
  assert.ok(Number.isFinite(s.money));
  assert.ok(s.members.length <= Sim.capacity(s));
  assert.ok(s.members.length > 0, 'mit Geräten kommen Mitglieder');
  for (const m of s.members) assert.ok(m.sat >= 0 && m.sat <= 100);
  for (const dev of s.devices) assert.ok(dev.condition >= 0 && dev.condition <= 100);

  const copy = Sim.normalizeLoaded(JSON.parse(JSON.stringify(s)));
  assert.ok(copy);
  runDays(copy, 7);
  assert.ok(Number.isFinite(copy.money));
});

test('Aufstieg ins Kellerstudio nur mit erfüllten Zielen', () => {
  const s = Sim.newGame();
  assert.equal(Sim.upgrade(s), false);
  s.members = Array.from({ length: 12 }, (_, i) => ({ id: 1000 + i, name: 'X', type: 'einsteiger', since: { month: 0, year: 1 }, visits: [], sat: 70, lastScore: 70 }));
  s.money = 1500;
  assert.equal(Sim.upgrade(s), true);
  assert.equal(Sim.stageDef(s).id, 'keller');
  const next = Sim.upgradeStatus(s);
  assert.equal(next.available, false, 'Studio folgt erst in Version 0.2');
});
