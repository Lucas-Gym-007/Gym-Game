# Garage to Gym

Ein Gym-Tycoon für den Browser: Aus einer leeren Garage machst du ein Fitnessstudio. Du stellst Geräte auf ein Raster, hältst Mitglieder zufrieden und wächst – aber nur so schnell, wie dein Layout es hergibt.

Das vollständige Spielkonzept steht in [`docs/KONZEPT.md`](docs/KONZEPT.md). Dieses Repo enthält den **Prototyp 0.1**, der eine Frage beantworten soll: *Macht es Spaß, Geräte zu stellen und Warteschlangen aufzulösen?*

## Starten

Keine Abhängigkeiten, kein Build. Einen lokalen Webserver im Projektordner starten und `http://localhost:8080` öffnen:

```bash
python3 -m http.server 8080
```

Alternativ `index.html` direkt im Browser öffnen (Speichern im Browser funktioniert dann je nach Browser eingeschränkt).

## Steuerung

| Aktion | Eingabe |
|---|---|
| Gerät kaufen | links wählen, aufs Raster klicken |
| Drehen | `R` (beim Platzieren, Ziehen oder für das ausgewählte Gerät) |
| Verschieben (kostenlos) | Gerät mit der Maus ziehen |
| Verkaufen (50 % zurück) | Gerät anklicken → „Verkaufen“ oder `Entf` |
| Abbrechen | `Esc` oder Rechtsklick |
| Putzen | braune Flecken anklicken |
| Gedanken lesen | Figur anklicken |
| Tempo | `Leertaste` Pause, `1` / `2` / `3` für 1×, 2×, 4× |

## Was in 0.1 drin ist

- Raster für **Garage** (6 × 5) und **Kellerstudio** (12 × 8), Baumodus mit Kaufen, Drehen, Verschieben, Verkaufen
- 6 Geräte: Kurzhanteln, Hantelbank, Squat-Rack, Ergometer, Laufband, Kabelzug (mit Abnutzung, Ausfällen, Reparatur, Stromkosten)
- 3 Mitgliedertypen mit eigenen Uhrzeiten, Lieblingsgeräten und Geduld: Einsteiger, Kraftsportler, Ausdauerfans
- Besuchsablauf: Figuren laufen per Wegsuche zu den Geräten, stellen sich an, warten, lassen Übungen aus
- Zufriedenheit nach Konzept (Warten, Auslassen, Sauberkeit, Gedränge, Zonen), Ruf in Sternen, Kündigungen
- Beitragsregler, Beitrittsformel, Tageskarten, Werbung, Monatsabrechnung mit Bericht und den häufigsten Beschwerden
- Sauberkeit: in der Garage putzt du selbst, im Kellerstudio Reinigungskräfte in Früh- und Spätschicht
- Zugang: Geräte ohne erreichbares freies Nachbarfeld werden rot und bleiben außer Betrieb
- Ansichten für Auslastung und Wartezeit, um Engpässe zu finden
- Tempo Pause / 1× / 2× / 4×, automatisches Speichern im Browser (`localStorage`)

Bewusst noch nicht drin: Einrichtung (Umkleide, Empfang, Theke …), Studio und Kette, Studierende und Senioren, Trainer, Saisons, Zufallsereignisse, Kredit.

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/data.js` | alle Zahlen und Tabellen aus dem Konzept (Geräte, Typen, Stufen, Balancing) |
| `js/sim.js` | Simulation ohne DOM: Raster, Wegsuche, Besuche, Wirtschaft, Monatsende |
| `js/render.js` | Zeichnen auf dem Canvas |
| `js/ui.js` | Panels, Maus/Tastatur, Dialoge |
| `js/main.js` | Spielschleife und Speichern |

Der Spielstand ist ein reines JSON-Objekt; `sim.js` läuft auch in Node.

## Tests

```bash
npm test
```

Die Tests prüfen die Formeln aus dem Konzept (Beitritt, Kündigung, Ruf), die Bau-Regeln (Platzieren, Drehen, Zugang, Zonen, Verschieben, Verkaufen), die Monatsabrechnung und einen längeren Spielverlauf inklusive Speichern und Laden.
