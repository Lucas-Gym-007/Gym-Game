/*
 * Garage to Gym – Spieldaten (Version 0.1)
 * Alle Zahlen sind Startwerte aus dem Spielkonzept und werden beim Ausbalancieren angepasst.
 */
(function (root) {
  'use strict';

  const GymData = {
    SAVE_KEY: 'garage-to-gym-save-v1',
    SAVE_VERSION: 1,

    // Zeit
    DAY_START: 6 * 60,          // 6:00 Uhr
    DAY_END: 23 * 60,           // 23:00 Uhr
    LAST_ARRIVAL: 21 * 60 + 30, // spätester Besuchsbeginn
    DAYS_PER_MONTH: 7,
    MONTHS_PER_YEAR: 12,
    REAL_SECONDS_PER_DAY: 40,   // bei Tempo 1×
    SIM_STEP: 0.5,              // Spielminuten pro Simulationsschritt
    MONTH_NAMES: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
      'August', 'September', 'Oktober', 'November', 'Dezember'],

    // Start & Wirtschaft
    START_MONEY: 2000,
    START_FEE: 25,
    FEE_MIN: 10,
    FEE_MAX: 80,
    DAY_PASS_PRICE: 8,
    SELL_REFUND: 0.5,
    REPAIR_COST: 0.1,
    NEGATIVE_MONTHS_TO_LOSE: 2,

    // Mitglieder
    VISIT_PROB: 0.45,          // Chance pro Tag, dass ein Mitglied trainieren kommt
    START_SCORE: 60,
    START_REPUTATION: 3,
    MAX_JOIN_CHANCE: 0.9,
    CHURN_BASE: 0.02,
    CHURN_THRESHOLD: 50,
    WALK_SPEED: 0.6,           // Felder pro Spielminute
    CROWD_LIMIT: 3,            // ab so vielen Personen in 3×3 Feldern ist es Gedränge
    CROWD_MINUTES: 4,          // so lange muss das Gedränge anhalten
    NO_WAIT_THRESHOLD: 1,      // unter 1 Minute Warten gilt als „ohne Warten“

    // Geräte & Sauberkeit
    WEAR_PER_USE: 0.5,
    BREAK_THRESHOLD: 30,
    BREAK_CHANCE: 0.05,
    DIRT_PER_USE: 0.2,
    DIRT_PER_STEP: 0.004,
    CLEAN_MINUTES: 2,

    STAGES: [
      {
        id: 'garage', name: 'Garage', w: 6, h: 5, rent: 0, capacity: 15,
        entrance: { x: 3, y: 4 },
        interest: 1.6,          // Interessenten pro Tag bei 3 Sternen
        dayPasses: 0.4,         // Tagesgäste pro Tag
        typeMix: { einsteiger: 0.5, kraft: 0.5 },
        staff: false,
        next: { members: 12, money: 1500 },
      },
      {
        id: 'keller', name: 'Kellerstudio', w: 12, h: 8, rent: 600, capacity: 60,
        entrance: { x: 6, y: 7 },
        interest: 4.5,
        dayPasses: 4,
        typeMix: { einsteiger: 0.4, kraft: 0.35, ausdauer: 0.25 },
        staff: true,
        next: { members: 50, satisfaction: 70, money: 20000, locked: 'Das Studio folgt in Version 0.2.' },
      },
    ],

    DEVICES: {
      kurzhanteln: {
        name: 'Kurzhanteln mit Matte', short: 'Kurzhanteln', the: 'die Kurzhanteln', plural: true,
        w: 2, h: 1, price: 150, slots: 1, duration: 20, category: 'kraft', stage: 0, power: 0,
      },
      hantelbank: {
        name: 'Hantelbank', short: 'Bank', the: 'die Hantelbank',
        w: 2, h: 1, price: 300, slots: 1, duration: 25, category: 'kraft', stage: 0, power: 0,
      },
      squatrack: {
        name: 'Squat-Rack', short: 'Rack', the: 'das Squat-Rack',
        w: 2, h: 2, price: 900, slots: 1, duration: 30, category: 'kraft', stage: 0, power: 0,
      },
      ergometer: {
        name: 'Fahrrad-Ergometer', short: 'Ergo', the: 'das Ergometer',
        w: 1, h: 2, price: 600, slots: 1, duration: 30, category: 'cardio', stage: 1, power: 5,
      },
      laufband: {
        name: 'Laufband', short: 'Laufband', the: 'das Laufband',
        w: 1, h: 2, price: 1200, slots: 1, duration: 30, category: 'cardio', stage: 1, power: 15,
      },
      kabelzug: {
        name: 'Kabelzug', short: 'Kabelzug', the: 'der Kabelzug',
        w: 2, h: 2, price: 1800, slots: 2, duration: 20, category: 'kraft', stage: 1, power: 0,
      },
    },

    CATEGORIES: {
      kraft: { name: 'Kraft', zoneName: 'Kraftzone' },
      cardio: { name: 'Cardio', zoneName: 'Cardiozone' },
    },

    MEMBER_TYPES: {
      einsteiger: {
        name: 'Einsteiger', plural: 'Einsteiger', refPrice: 25, hours: [17, 20], patience: 12,
        prefs: { kurzhanteln: 3, laufband: 3, ergometer: 1, hantelbank: 1, kabelzug: 1, squatrack: 0.5 },
        zones: ['kraft', 'cardio'], color: '#4fa3e0',
      },
      kraft: {
        name: 'Kraftsportler', plural: 'Kraftsportler', refPrice: 30, hours: [17, 23], patience: 15,
        prefs: { squatrack: 3, hantelbank: 3, kabelzug: 3, kurzhanteln: 1.5, laufband: 0.3, ergometer: 0.3 },
        zones: ['kraft'], color: '#e0663f',
      },
      ausdauer: {
        name: 'Ausdauerfan', plural: 'Ausdauerfans', refPrice: 30, hours: [6, 9], patience: 12,
        prefs: { laufband: 3, ergometer: 3, kabelzug: 1, kurzhanteln: 0.5, hantelbank: 0.3, squatrack: 0.3 },
        zones: ['cardio'], color: '#3fbf7f',
      },
    },

    STAFF: {
      reinigung: { name: 'Reinigungskraft', salary: 300, stage: 1 },
    },

    SHIFTS: {
      frueh: { name: 'Frühschicht', start: 6 * 60, end: 14 * 60, label: '6–14 Uhr' },
      spaet: { name: 'Spätschicht', start: 14 * 60, end: 23 * 60, label: '14–23 Uhr' },
    },

    ADS: {
      flyer: { name: 'Flyer', cost: 200, boost: 0.3, days: 7 },
      online: { name: 'Online-Anzeige', cost: 500, boost: 0.6, days: 7 },
    },

    COMPLAINTS: {
      wait: 'Wartezeit an Geräten',
      skip: 'Übungen ausgelassen',
      dirty: 'Studio ist schmutzig',
      crowd: 'Zu voll, Gedränge',
      price: 'Beitrag zu hoch',
      broken: 'Geräte kaputt',
      nothing: 'Zu wenig Geräte',
      full: 'Studio ist voll',
    },

    NAMES: ['Anna', 'Ben', 'Clara', 'David', 'Elif', 'Finn', 'Greta', 'Hannes', 'Ida', 'Jonas',
      'Kemal', 'Lena', 'Mia', 'Noah', 'Olga', 'Paul', 'Rosa', 'Sami', 'Tom', 'Ute', 'Vera',
      'Wiebke', 'Yusuf', 'Zoe', 'Aylin', 'Bruno', 'Carla', 'Dennis', 'Emma', 'Felix', 'Hanna',
      'Ilias', 'Jana', 'Karl', 'Luisa', 'Milan', 'Nele', 'Oskar', 'Pia', 'Ronja', 'Sven', 'Tilda'],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GymData;
  else root.GymData = GymData;
})(this);
