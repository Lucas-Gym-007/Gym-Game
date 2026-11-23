/*
 * Garage to Gym – Start, Spielschleife, Speichern im Browser.
 */
(function (root) {
  'use strict';

  const D = root.GymData;
  const Sim = root.GymSim;
  const UI = root.GymUI;

  const MINUTES_PER_REAL_SECOND = (D.DAY_END - D.DAY_START) / D.REAL_SECONDS_PER_DAY;

  function loadSave() {
    try {
      const raw = localStorage.getItem(D.SAVE_KEY);
      if (!raw) return null;
      return Sim.normalizeLoaded(JSON.parse(raw));
    } catch (err) {
      console.warn('Spielstand konnte nicht geladen werden:', err);
      return null;
    }
  }

  const app = {
    s: null,
    speed: 1,
    prevSpeed: 1,
    lastAbsDay: 0,

    setSpeed(v) {
      if (v > 0) this.prevSpeed = v;
      this.speed = v;
      UI.refreshPanels();
    },

    save(silent) {
      try {
        localStorage.setItem(D.SAVE_KEY, JSON.stringify(this.s));
        if (!silent) UI.flash('Spielstand gespeichert.');
      } catch (err) {
        UI.flash('Speichern hat nicht geklappt.', true);
      }
    },

    newGame() {
      this.s = Sim.newGame();
      this.lastAbsDay = 0;
      this.speed = 1;
      UI.reset();
      this.save(true);
    },
  };

  root.GymApp = app; // zum Debuggen in der Konsole

  const loaded = loadSave();
  app.s = loaded || Sim.newGame();
  app.lastAbsDay = app.s.absDay;
  UI.init(app);
  if (!loaded) UI.showHelp();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const s = app.s;

    if (app.speed > 0 && !UI.isModalOpen()) {
      Sim.advance(s, dt * app.speed * MINUTES_PER_REAL_SECOND);
    }
    if (s.absDay !== app.lastAbsDay) {
      app.lastAbsDay = s.absDay;
      app.save(true);
      UI.refreshPanels();
    }
    if (!UI.isModalOpen()) {
      if (s.pendingReport) UI.showReport(s.pendingReport, false);
      else if (s.gameOver) UI.showGameOver();
    }
    UI.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  setInterval(() => UI.refreshPanels(), 250);
  setInterval(() => document.getElementById('sTime').textContent = clockText(app.s.time), 100);
  window.addEventListener('beforeunload', () => app.save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) app.save(true); });

  function clockText(min) {
    const h = Math.floor(min / 60), m = Math.floor(min % 60);
    return `${String(h).padStart(2, '0')}:${String(Math.floor(m / 15) * 15).padStart(2, '0')} Uhr`;
  }
})(this);
