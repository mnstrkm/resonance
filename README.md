# Resonanz

Ein ruhiges Browser-Spiel mit sieben Orb-Fähigkeiten, gleitender Physik und kurzen Kettenreaktionen. Arbeitstitel, Version **0.3.0**.

**Kein Build, kein npm, keine APK zum Spielen nötig.** Alle benötigten Spiel-Dateien sind enthalten. Die Vorschauklänge werden im Browser erzeugt; eigene Sounddateien ersetzen sie automatisch.

## 1. Sofort ausprobieren

1. ZIP vollständig entpacken.
2. Im Ordner `resonance` die Datei `index.html` im Browser öffnen.
3. „Spiel starten“ drücken. Dieser erste Klick schaltet zugleich Audio frei.

Die Spiellogik und synthetischen Vorschauklänge funktionieren ohne Server. Einige Browser blockieren das Laden eigener Audiodateien bei `file://`. Für eigene Sounds deshalb GitHub Pages oder den lokalen Server unten verwenden. Auf Smartphones am einfachsten den GitHub-Pages-Link öffnen.

## 2. Auf GitHub veröffentlichen

1. Ein neues Repository anlegen, beispielsweise `resonanz`. Für einen unkomplizierten kostenlosen Pages-Einstieg ein öffentliches Repository verwenden; der Code ist dann öffentlich.
2. **Den Inhalt** des entpackten Ordners `resonance` hochladen, nicht die ZIP. `index.html` muss direkt im Repository liegen, daneben `js`, `css`, `assets` und die Anleitungen. Nicht einen zusätzlichen `resonance`-Unterordner hochladen.
3. Dateien mit einer kurzen Beschreibung speichern/committen, z. B. „Erste spielbare Version“.
4. Im Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch** wählen.
5. Branch **main**, Ordner **/(root)** auswählen und speichern.
6. Warten, bis Pages die Veröffentlichung bestätigt. Den dort angezeigten Link öffnen, gewöhnlich `https://DEIN-NAME.github.io/resonanz/`.

Keine zusätzlichen Workflows oder Build-Befehle nötig. Der Browser lädt Bilder, Skripte und Sounds über relative Pfade; das Spiel funktioniert auch unter einem Repository-Unterpfad.

Offizielle Anleitung: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 3. Spielen

- Einen hellen Orb berühren und innerhalb des gestrichelten Kreises verschieben.
- Mindestens ein kleines Stück bewegen, dann loslassen: ein Impuls wird verbraucht.
- Zurück auf den Ausgangspunkt, außerhalb des Kreises/der Arena oder über einem anderen Orb loslassen: ungültige Platzierung; kein Impuls wird verbraucht.
- Beim Ziehen werden keine anderen Orbs bewegt. Die Welt ändert sich erst beim gültigen Loslassen.
- Jeder angeregte Orb lädt 0,45 Sekunden und löst an seiner aktuellen Position aus.
- Jeder Orb liefert genau einmal Energie. Der Core benötigt die Energie aller Orbs.
- Nächster Zug erst nach Ende der Kette und Bewegung. Es gibt drei Impulse.
- Gewonnene Runden enden mit einer Core-Welle. Niederlagen erlauben denselben Aufbau oder ein neues Feld.
- Die Anleitung im Pausenmenü erklärt alle sieben Typen. Pause enthält Geschwindigkeit, Lautstärke und einen Zugang zu weiteren Einstellungen.
- Der Feld-Code im Pausenmenü lässt sich anklicken und auf einem anderen Gerät eingeben. Gleiche Version und Config vorausgesetzt.

## 4. Die sieben Orbs

| Typ                | Wirkung                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rot / Druck        | Aktiviert ruhende Orbs im Radius und schiebt alle Nachbarn einschließlich verbrauchter weg.                                                                                              |
| Blau / Sog         | Zieht Nachbarn an und aktiviert ruhende Orbs im Radius.                                                                                                                                  |
| Violett / Pulsar   | Zieht zunächst an. Nach einer kurzen Zusatzphase folgt die aktivierende Druckwelle.                                                                                                      |
| Grün / Pfeil       | Wählt beim Auslösen den nächsten ruhenden, nicht reservierten Orb in begrenzter Reichweite. Ein zielsuchender Pfeil aktiviert und schiebt ihn; der Sender erhält einen kleinen Rückstoß. |
| Gold / Funke       | Wählt beim Auslösen ein zufälliges ruhendes, nicht reserviertes Ziel. Suchkringel, dann Energieübertragung ohne Reichweitenlimit.                                                        |
| Orange / Aura      | Kleinster Radius. Aktiviert ruhende Nachbarn und verstärkt ihre Kraft einmalig um Faktor 1,55. Keine Stapelung.                                                                          |
| Perlmutt / Spiegel | Kopiert die Fähigkeit des auslösenden Orbs, auch durch eine Klon-Kette. Manuell ohne Vorlage: nur eigene Core-Energie.                                                                   |

Verstärkung erhöht Druck/Sog bei Rot, Blau und Violett sowie den Zielschub bei Grün. Grün erhält keinen stärkeren Eigenrückstoß. Orange und Gold profitieren nicht zusätzlich. Der Klon verwendet den Kraftfaktor für die kopierte Fähigkeit. Bereits ladende Orbs werden durch weitere Treffer nicht erneut geladen oder nachträglich verstärkt; sie können aber bewegt werden.

Normale Kollisionen aktivieren keine Orbs. Projektile werden von anderen Orbs nicht blockiert. Reservierungen verhindern, dass mehrere gleichzeitig ausgesandte Zielprojektile unnötig dasselbe ruhende Ziel auswählen. Wird ein reserviertes Ziel vorher durch eine Flächenfähigkeit angeregt, trifft der Pfeil trotzdem, setzt seinen Countdown aber nicht zurück.

## 5. Das Wichtigste ändern

Öffne **`js/config.js`**. Einheiten sind logische Arena-Einheiten und Sekunden, unabhängig von Bildschirm-Pixeln.

| Einstellung                    | Standard    | Bedeutung                                                              |
| ------------------------------ | ----------- | ---------------------------------------------------------------------- |
| `gameplay.minOrbs` / `maxOrbs` | 10 / 15     | Anzahl pro neuem Feld                                                  |
| `gameplay.impulses`            | 3           | Manuelle Züge                                                          |
| `gameplay.requiredRatio`       | 1           | Anteil der benötigten Orbs; aktuell alle Orbs                  |
| `gameplay.chargeTime`          | 0.45        | Zeit zwischen Anregung und Fähigkeit                                   |
| `gameplay.moveRadius`          | 64          | Erlaubte Verschiebung                                                  |
| `gameplay.minDrag`             | 9           | Freie Abbruchzone um die Ursprungsposition                             |
| `gameplay.orbRadius`           | 13          | Physischer Radius                                                      |
| `generator.minDistance`        | 50          | Mindestabstand bei Erzeugung                                           |
| `generator.includeEveryType`   | true        | Jeden Typ mindestens einmal erzeugen, wenn genug Plätze vorhanden sind |
| `physics.damping`              | 1.9         | Höher = kürzeres Gleiten                                               |
| `physics.restitution`          | 0.64        | Höher = elastischeres Abprallen                                        |
| `physics.stopSpeed`            | 2.8         | Winzige Restbewegungen beenden                                         |
| `abilities.*`                  | pro Typ     | Reichweiten, Kräfte, Such-/Flugzeiten                                  |
| `effects.particles`            | 12          | Partikel pro größerem Effekt                                           |
| `effects.glow`                 | 0.7         | Lichtschein an ladenden/verstärkten Orbs                               |
| `audio.*`                      | siehe Datei | Gesamtlautstärke und Gruppenlautstärken                                |

Orb-Farben, Namen und Beschreibungen: **`js/orb-types.js`**. Audiodateien und einzelne Lautstärken: **`js/audio.js` → `SoundAssets`**.

Sinnvoll: eine Änderung nach der anderen, ein bekanntes Feld erneut spielen. Werte nicht beliebig extrem setzen: große Orb-Zahlen, zu große Kugeln oder unpassende Mindestabstände können die Arena überfüllen.

## 6. Eigene Sounds

Siehe **`assets/sounds/SOUNDS.md`**. Kurz: MP3-Datei unter dem vorgegebenen Namen dort ablegen, hochladen, Seite neu laden. Kein Umbau der Spiellogik nötig.

Aktuell sind **keine externen Soundaufnahmen** enthalten. Die leisen Synthese-Klänge sind ausdrücklich Vorschauklänge, keine fertige Premium-Soundproduktion. Im Pausenmenü abschaltbar. Eine passende Soundfamilie mit abgestimmten Lautstärken bleibt ein eigener Qualitäts-Schritt.

## 7. Lokaler Server (optional)

Wenn Python bereits installiert ist, Terminal im Ordner `resonance` öffnen:

```sh
python -m http.server 8000
```

Auf manchen Systemen heißt der Befehl `python3` statt `python`. Danach `http://localhost:8000` öffnen. Das ist kein Build; der Server liefert nur vorhandene Dateien aus. Beenden mit Strg+C.

## 8. Änderungen mit KI und GitHub

- Anfangs reicht der Branch `main`. Vor größeren Änderungen eine funktionierende Version sichern/committen.
- Kleine Änderungen getrennt speichern, etwa „Grünen Rückstoß reduzieren“.
- Für größere Experimente einen eigenen Branch nutzen und erst nach Testen übernehmen.
- Bei KI-Aufträgen den aktuellen Projektstand mitgeben, nicht eine alte ZIP.
- Nenne gewünschtes Verhalten, betroffene Fälle und was erhalten bleiben soll. Verweise auf `ARCHITECTURE.md`.
- Beispiel: „Füge einen neuen Orb hinzu. Nutze OrbTypes und Abilities, ergänze Soundzuordnung, Lexikon-Symbol und Tests. Ändere die bestehenden Regeln nicht.“
- Keine Abhängigkeiten oder generierten Paketordner nötig. Die ZIP enthält auch `.gitignore` und `.nojekyll`.

## 9. Prüfen und bekannte Grenzen

Prüfstand und reproduzierbare Testbefehle für v0.3.0: **`TESTING.md`**. Integration und Grafikvergleich bestanden. Ein echter Android-/iPad-Browsertest steht noch aus; die lokale Vorschau war in der Arbeitsumgebung gesperrt.

Weitere bewusste Grenzen:

- Zufällige Felder sind nicht garantiert lösbar; noch kein Schwierigkeits-Solver.
- Keine Kampagne, Sterne, Konten, Shop, Speicherung einer laufenden Runde oder Offline-PWA.
- Keine APK; die Dateien bleiben für eine spätere Verpackung geeignet.
- Maus/Touch nötig; die Canvas-Spielmechanik ist noch nicht vollständig per Tastatur/Screenreader bedienbar.
- Exakter Ausgangsaufbau und reproduzierbarer Gameplay-Zufall. Partikel verwenden bewusst eigenen dekorativen Zufall. Pixelgenaue Physik-Gleichheit über sämtliche Browser wird nicht versprochen.
- Kleinere Displays haben eine kompaktere Arena; Touch-Treffflächen sind größer als sichtbare Orbs. Hochformat ist empfohlen.

Die Bilder aus der Planungsphase sind nicht enthalten und werden nicht als Spielassets verwendet.

## 10. Eigenes Feld (v0.3.0)

Im Hauptmenü „Eigenes Feld“ wählen. Das Plus öffnet eine kleine Orb-Auswahl. Einen Typ antippen und dann auf einen freien Platz tippen; alternativ direkt aus der Auswahl ins Feld ziehen. Bestehende Orbs lassen sich im Editor ohne Bewegungsradius verschieben. Überlappungen und Positionen außerhalb der Arena werden abgewiesen.

- Papierkorb: Zurücksetzen. Gebogener Pfeil: Rückgängig (bis zu 40 Schritte).
- Ausgewählter Orb: kleines X entfernt ihn.
- Spielen: drei Impulse, alle platzierten Orbs als Core-Ziel; maximal 100 Orbs pro Entwurf.
- „Zum Editor“ bringt den ursprünglichen Entwurf zurück. „Neu versuchen“ startet diesen Aufbau erneut.
- Der letzte Entwurf bleibt automatisch im Browser auf diesem Gerät. Kein Download und keine Cloud-Synchronisierung. Löschen der Websitedaten oder privates Surfen kann ihn entfernen. Eine laufende Runde wird nicht gespeichert.

Für eigene spätere Leveldateien die Seite mit `?creator=1` öffnen:
https://mnstrkm.github.io/resonance/?creator=1

Nur diese Werkzeugansicht zeigt im Editor einen Download-Knopf. Erst ein bewusster Klick speichert eine JSON-Datei. Der Parameter ist ein UI-Schalter, kein Zugangsschutz. Details zum späteren Level-Ordner stehen in `ARCHITECTURE.md`; ein Import oder eine Kampagne ist noch nicht enthalten.
