# Gym-Tycoon – Spielkonzept

23. Nov. 2026 · Lucas Fritz

## Überblick

Gym-Tycoon ist ein Aufbauspiel für den Browser. Aus einer leeren Garage machst du eine Fitnessstudio-Kette: Du platzierst Geräte, hältst Mitglieder zufrieden und stellst Personal ein.

| Thema | Festlegung |
|---|---|
| Arbeitstitel | Garage to Gym (Alternativen: Iron Empire, Gains Tycoon) |
| Genre | Aufbau- und Wirtschaftssimulation (Tycoon) für einen Spieler |
| Plattform | Browser, zuerst am Computer mit Maus, später auch am Handy |
| Ansicht | Draufsicht auf ein Raster, schlichte 2D-Grafik |
| Ziel | Vier Ausbaustufen von der Garage bis zur Kette, danach ein Endlosmodus |
| Spieldauer | Sitzungen von 15–30 Minuten, etwa 3 Stunden bis zur ersten Filiale bei normalem Tempo |
| Vorbilder | Factorio (Engpässe, Layout optimieren), Sim Companies (Preise, Konkurrenz), Theme Hospital (Figuren mit eigenen Wünschen) |

Alle Zahlen in diesem Konzept sind Startwerte, die beim Ausbalancieren noch angepasst werden. Es ist Spielgeld, keine echten Preise.

## Spielkreislauf

Der Kreislauf läuft im Uhrzeigersinn. Die Bremse sorgt dafür, dass Wachstum ohne gutes Layout nicht klappt: Zu viele Mitglieder auf zu wenigen Geräten bedeuten Wartezeiten und Kündigungen.

## Studio bauen

Gebaut wird auf einem Raster. Jedes Gerät belegt feste Felder, und wie gut du die Fläche nutzt, entscheidet über Wartezeiten und Laune.

- **Raster:** Die Grundfläche ist pro Ausbaustufe vorgegeben, von 6 × 5 Feldern in der Garage bis 20 × 14 im Studio. Der Eingang liegt fest.
- **Baumodus:** Geräte kaufen, mit R drehen und ablegen. Verschieben ist kostenlos, Verkaufen bringt 50 % des Kaufpreises zurück.
- **Räume:** Umkleide, Duschen und Kursraum ziehst du als Rechteck mit Tür auf. Jeder Raum hat eine Mindestgröße.
- **Zugang:** Jedes Gerät braucht an einer Seite ein freies Feld. Geräte und Räume ohne Weg dorthin markiert das Spiel rot, und sie bleiben außer Betrieb.
- **Zonen:** Drei oder mehr Geräte derselben Art nebeneinander bilden eine Zone (Kraft oder Cardio). Wer in einer passenden Zone trainiert, bekommt +5 Zufriedenheit.
- **Gedränge:** Stehen mehr als 2 Personen in einem Bereich von 3 × 3 Feldern, sinkt die Laune. Breite Gänge lohnen sich zur Stoßzeit.
- **Wege kosten Zeit:** Mitglieder laufen zwischen Umkleide, Geräten und Theke hin und her. Lange Wege fressen Trainingszeit. Man plant sie wie die Förderbänder in Factorio.

## Geräte & Einrichtung

Zum Start gibt es 8 Trainingsgeräte und 7 Einrichtungen. Jede neue Ausbaustufe schaltet teurere Geräte mit mehr Plätzen frei.

### Trainingsgeräte

| Gerät | Felder | Preis | Plätze | Dauer pro Nutzung | Beliebt bei | Ab Stufe |
|---|---|---|---|---|---|---|
| Kurzhanteln mit Matte | 2 × 1 | 150 € | 1 | 20 Min. | Einsteiger, alle | Garage |
| Hantelbank | 2 × 1 | 300 € | 1 | 25 Min. | Kraftsportler | Garage |
| Squat-Rack | 2 × 2 | 900 € | 1 | 30 Min. | Kraftsportler | Garage |
| Fahrrad-Ergometer | 1 × 2 | 600 € | 1 | 30 Min. | Ausdauerfans, Senioren | Kellerstudio |
| Laufband | 1 × 2 | 1.200 € | 1 | 30 Min. | Ausdauerfans, Einsteiger | Kellerstudio |
| Kabelzug | 2 × 2 | 1.800 € | 2 | 20 Min. | alle | Kellerstudio |
| Beinpresse | 2 × 3 | 2.500 € | 1 | 20 Min. | Kraftsportler, Senioren | Studio |
| Kursraum | 5 × 5 | 4.000 € | 12 | 45 Min. | Einsteiger, Senioren | Studio |

Jedes Gerät nutzt sich ab: Sein Zustand sinkt pro Nutzung um 0,5 %. Unter 30 % kann es ausfallen, und eine Reparatur kostet 10 % des Kaufpreises. Laufband und Ergometer brauchen Strom, 15 € bzw. 5 € pro Monat.

### Einrichtung

| Einrichtung | Felder | Preis | Wirkung | Ab Stufe |
|---|---|---|---|---|
| Wasserspender | 1 × 1 | 150 € | stillt Durst, +3 Laune | Garage |
| Deko (Pflanze, Spiegel, Musikanlage) | 1 × 1 | 50–400 € | mehr Atmosphäre, bis +5 Laune im Umkreis | Garage |
| Empfangstresen | 3 × 1 | 800 € | Pflicht ab Kellerstudio, mit Personal mehr Neuanmeldungen | Kellerstudio |
| Umkleide | mind. 3 × 3 | 1.000 € | 8 Spinde; ohne Umkleide −10 Laune pro Besuch | Kellerstudio |
| Shake-Theke | 3 × 1 | 1.500 € | verkauft Shakes, 2 € Gewinn pro Stück | Kellerstudio |
| Duschen | mind. 2 × 3 | 2.500 € | 3 Plätze, Wasser 40 € pro Monat | Studio |
| Personalraum | mind. 3 × 2 | 1.200 € | Pausen fürs Personal, Moral steigt | Studio |

## Mitglieder

Mitglieder sind das Herz des Spiels. Jedes hat einen Typ, einen Trainingsplan mit 3–4 Übungen und eine Laune, die bei jedem Besuch steigt oder fällt.

### Mitgliedertypen

| Typ | Kommt meist | Will vor allem | Referenzpreis | Stört sich an | Ab Stufe |
|---|---|---|---|---|---|
| Einsteiger | 17–20 Uhr | Kurzhanteln, Laufband, Hilfe vom Trainer | 25 € | Gedränge, keine Betreuung | Garage |
| Kraftsportler | 17–23 Uhr | Squat-Rack, Hantelbank, Kabelzug | 30 € | Wartezeit an den Racks | Garage |
| Ausdauerfans | 6–9 Uhr | Laufband, Ergometer, Duschen | 30 € | volle Cardio-Geräte, fehlende Duschen | Kellerstudio |
| Studierende | 12–17 und 20–23 Uhr | alles, Hauptsache günstig | 20 € | hohe Preise, kurze Öffnungszeiten | Kellerstudio |
| Senioren | 9–12 Uhr | Ergometer, Beinpresse, Kurse | 35 € | Lärm, Gedränge, keine Betreuung | Studio |

Der Referenzpreis ist der Monatsbeitrag, den dieser Typ für fair hält.

### Ein Besuch

Ein Mitglied arbeitet seinen Trainingsplan Übung für Übung ab. Jede Warteschlange kostet Laune, und wer zu lange wartet, lässt die Übung ganz aus.

### Zufriedenheit

Jeder Besuch ergibt eine Note von 0 bis 100. Sie startet bei 60 und ändert sich so:

- +5 für jede Übung ohne Warten, −10 für jede ausgelassene Übung
- −1 pro Spielminute Wartezeit
- −15 bei schmutzigem Studio (Sauberkeit unter 50 %), +5 bei über 90 %
- −10 bei Gedränge, +5 in einer passenden Zone
- +10, wenn ein Trainer geholfen hat (Einsteiger und Senioren)
- +5 für Shake oder Dusche nach dem Training, −10 wenn erwartete Duschen fehlen

Die Zufriedenheit eines Mitglieds ist der Durchschnitt seiner Besuche im Monat. Oben in der Leiste steht der Durchschnitt aller Mitglieder.

### Neue Mitglieder und Kündigungen

- **Zulauf:** Jeden Tag kommen Interessenten zum Probetraining. Wie viele, hängt von Ausbaustufe, Ruf und Werbung ab.
- **Beitritt:** Nach dem Probetraining entscheiden sie nach der Formel unten. Die Grundchance ist die Note des Probetrainings geteilt durch 100. Die Beitrittschance liegt höchstens bei 90 %.
- **Kündigung:** Am Monatsende kündigt jedes Mitglied mit einer Grundrate von 2 %. Liegt seine Zufriedenheit unter 50, kommt für jeden fehlenden Punkt 1 % dazu. Bei Zufriedenheit 30 sind das also 22 %.
- **Ruf (1–5 Sterne):** Er ergibt sich aus dem Durchschnitt der Zufriedenheit der letzten 3 Monate. 0–19 Punkte ergeben 1 Stern, 20–39 Punkte 2 Sterne und so weiter bis 5 Sterne ab 80 Punkten.

$$P_{\text{Beitritt}} = \text{Grundchance} \times \frac{\text{Ruf}}{3} \times \left(\frac{\text{Referenzpreis}}{\text{Beitrag}}\right)^{2}$$

## Personal

In der Garage machst du alles selbst. Ab dem Kellerstudio stellst du Personal ein, das Geld kostet, dir aber Arbeit abnimmt und die Laune der Mitglieder hebt.

| Rolle | Aufgabe | Gehalt pro Monat | Ab Stufe | Wirkung |
|---|---|---|---|---|
| Du selbst | putzt per Klick auf Schmutzflecken, begrüßt Neue | – | Garage | reicht nur für die Garage |
| Reinigungskraft | hält die Sauberkeit hoch | 300 € | Kellerstudio | schafft etwa 100 Felder pro Schicht |
| Empfang | Check-in, verkauft Tageskarten und Verträge | 500 € | Kellerstudio | +20 % Beitrittschance, kein Stau am Eingang |
| Trainer | hilft Einsteigern und Senioren, gibt Kurse und Personal Training | 800 € | Studio | +10 Laune bei Hilfe, 15 € Umsatz pro Stunde Personal Training |
| Filialleiter | führt eine Filiale nach deiner Vorlage | 1.500 € | Kette | die Filiale läuft ohne dich weiter |

- **Bewerbungen:** Pro Stelle zeigt das Spiel 3 Bewerber mit Können von 1 bis 5 Sternen. Das Gehalt in der Tabelle gilt für 1 Stern, jeder weitere Stern kostet 25 % mehr.
- **Schichten:** Frühschicht 6–14 Uhr, Spätschicht 14–23 Uhr. Wer nur eine Schicht besetzt, hat in der anderen keine Hilfe.
- **Moral (0–100):** Sie sinkt bei Überlastung, zum Beispiel bei mehr als 15 Mitgliedern gleichzeitig pro Trainer. Sie steigt mit einer Gehaltserhöhung oder einem Personalraum. Unter 30 kündigt die Person zum Monatsende.
- **Erfahrung:** Nach 6 Monaten im Team kann ein Mitarbeiter einen Stern aufsteigen.

## Wirtschaft

Ein gut laufendes Kellerstudio macht rund 1.500 € Gewinn pro Spielmonat. Für den Umzug ins Studio (20.000 €) braucht man damit gut ein Spieljahr.

- **Einnahmen:** Monatsbeiträge, Tageskarten (Start 8 €), Shakes (2 € Gewinn pro Stück), ab dem Studio Personal Training (15 € pro Stunde) und ein Premium-Tarif mit Kursen und Duschen.
- **Ausgaben:** Miete, Gehälter, Strom und Wasser, Wartung und Reparaturen, Werbung.
- **Preise:** Den Monatsbeitrag stellst du mit einem Regler ein (10–80 €). Liegt er über dem Referenzpreis eines Typs, kommen weniger Mitglieder dieses Typs (Formel unter Mitglieder). Ab dem Studio gibt es bis zu drei Tarife: Basis, Studierende, Premium.
- **Werbung:** Ein Flyer (200 €) bringt einen Monat lang 30 % mehr Interessenten, eine Online-Anzeige (500 €) 60 % mehr.
- **Kredit:** Die Bank leiht dir bis zum Dreifachen des Monatsumsatzes, zu 2 % Zinsen pro Monat. Steht das Konto zwei Monate hintereinander im Minus, ist das Spiel verloren.

### Beispiel: Kellerstudio, ein Spielmonat

| Posten | Betrag |
|---|---|
| 60 Mitglieder × 35 € | +2.100 € |
| 30 Tageskarten × 8 € | +240 € |
| 150 Shakes × 2 € Gewinn | +300 € |
| Miete | −600 € |
| Reinigungskraft | −300 € |
| Strom und Wasser | −120 € |
| Wartung | −120 € |
| **Gewinn** | **+1.500 €** |

## Ausbaustufen

Die Garage ist das Tutorial, die Kette das Endspiel. Für jeden Aufstieg brauchst du genug Mitglieder, genug Geld und eine Mindestqualität.

| Stufe | Fläche | Miete pro Monat | Platz für | Neu freigeschaltet | Aufstieg, wenn |
|---|---|---|---|---|---|
| Garage | 6 × 5 Felder | 0 € | 15 Mitglieder | Kurzhanteln, Hantelbank, Squat-Rack, Wasserspender, Deko | 12 Mitglieder und 1.500 € in der Kasse |
| Kellerstudio | 12 × 8 Felder | 600 € | 60 Mitglieder | Ergometer, Laufband, Kabelzug, Umkleide, Empfang, Shake-Theke, Reinigungskraft | 50 Mitglieder, Zufriedenheit mindestens 70, 20.000 € |
| Studio | 20 × 14 Felder | 2.500 € | 250 Mitglieder | Beinpresse, Kursraum, Duschen, Personalraum, Trainer, Tarife | 200 Mitglieder, Ruf mindestens 4 Sterne, 50.000 € |
| Kette | je Filiale wie ein Studio | je Standort | 250 pro Filiale | Standorte, Filialleiter, Grundriss-Vorlagen | Ziel: 5 Filialen, danach Endlosmodus |

In der Kette wählst du Standorte mit eigener Kundschaft. Im Uni-Viertel trainieren viele Studierende, im Vorort viele Senioren und in der Innenstadt Kraft- und Ausdauersportler. Jede Filiale führt ein Filialleiter nach einem Grundriss, den du als Vorlage speicherst. Ab der zweiten Filiale eröffnet eine Billigkette in der Stadt, und du musst über Preis oder Qualität dagegenhalten.

## Zeit & Ereignisse

Ein Spieltag dauert bei normalem Tempo etwa 40 Sekunden, ein Spieljahr rund eine Stunde. Am Ende jedes Monats wird abgerechnet.

- **Zeitmodell:** Ein Tag läuft von 6 bis 23 Uhr, ein Monat hat 7 Spieltage, ein Jahr 12 Monate. Das Tempo lässt sich auf Pause, 1×, 2× oder 4× stellen.
- **Öffnungszeiten:** Du legst sie selbst fest. Längere Zeiten kosten mehr Personal und Strom, gefallen aber Studierenden und Ausdauerfans.
- **Monatsende:** Beiträge werden eingezogen, Miete und Gehälter bezahlt, Kündigungen werden wirksam. Ein Monatsbericht zeigt Gewinn, neue und verlorene Mitglieder und die drei häufigsten Beschwerden.

### Tagesablauf

| Uhrzeit | Auslastung | Wer kommt |
|---|---|---|
| 6–9 Uhr | mittel | Ausdauerfans |
| 9–12 Uhr | niedrig | Senioren |
| 12–14 Uhr | mittel | Studierende, Mittagspause |
| 14–17 Uhr | niedrig | Studierende |
| 17–20 Uhr | sehr hoch, Stoßzeit | Einsteiger, Kraftsportler, fast alle |
| 20–23 Uhr | mittel | Kraftsportler, Studierende |

### Saisons

| Monat | Effekt |
|---|---|
| Januar | +40 % Interessenten durch Neujahrsvorsätze |
| Februar–März | Januar-Neulinge kündigen doppelt so oft |
| April–Mai | +20 % Interessenten vor dem Sommer |
| Juli–August | −25 % Besuche, Duschen und Wasserspender stark gefragt |
| September | Semesterstart, +50 % Studierende |
| Dezember | wenige Besuche, dafür Verkauf von Gutscheinen |

### Zufallsereignisse

- **Gerät kaputt:** Ein abgenutztes Gerät fällt aus, bis du es reparierst.
- **Influencer-Besuch:** Ist die Note seines Besuchs über 80, steigt der Ruf, und es kommt ein Ansturm. Ist sie darunter, sinkt der Ruf.
- **Kontrolle vom Gesundheitsamt:** Bei Sauberkeit unter 50 % gibt es ein Bußgeld von 500 €.
- **Stromausfall:** Laufbänder und Ergometer stehen einen Tag lang still.
- **Hitzewelle:** Cardio-Geräte bleiben leer, Duschen sind überfüllt.
- **Firmenkunde:** Eine Firma bietet 10 Mitglieder auf einmal an, verlangt aber 20 % Rabatt.

## Bedienoberfläche

Das Studio füllt die Bildschirmmitte. Alles andere liegt in schmalen Leisten am Rand, damit man beim Bauen immer sieht, was passiert.

Das Raster bekommt so viel Platz wie möglich. Auf kleinen Bildschirmen lassen sich Baumenü und Infopanel einklappen.

- **Figuren:** Mitglieder sind kleine Figuren mit einem Stimmungssymbol über dem Kopf. Ein Klick zeigt ihre Gedanken, zum Beispiel „Schon wieder ist das Squat-Rack besetzt!“.
- **Overlays:** Wie in Factorio lassen sich Ansichten für Auslastung, Wartezeit und Sauberkeit einblenden. So siehst du Engpässe auf einen Blick.
- **Menüs:** Finanzen mit Monatsbericht, Personal, Preise und Tarife, Ziele der aktuellen Stufe.

## Prototyp und Roadmap

Der erste Prototyp (Version 0.1) testet nur eine Frage: Macht es Spaß, Geräte zu stellen und Warteschlangen aufzulösen? Garage und Kellerstudio reichen dafür.

### Umfang Version 0.1

- [x] Raster für Garage und Kellerstudio mit Baumodus (kaufen, drehen, verschieben, verkaufen)
- [x] 6 Geräte: Kurzhanteln, Hantelbank, Squat-Rack, Ergometer, Laufband, Kabelzug
- [x] 3 Mitgliedertypen: Einsteiger, Kraftsportler, Ausdauerfans
- [x] Besuchsablauf mit Warten, Auslassen und Laune
- [x] Geld, Beitragsregler und Monatsabrechnung
- [x] Zufriedenheit, Ruf und Kündigungen
- [x] Reinigungskraft und Sauberkeit
- [x] Tempo-Knöpfe und Speichern im Browser
