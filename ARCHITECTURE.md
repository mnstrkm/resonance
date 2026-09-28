# Architektur und Weiterentwicklung

## Prinzip

Statische HTML/CSS/JavaScript-Dateien, Canvas 2D und Web Audio. Keine externen Laufzeitabhängigkeiten, kein Framework, kein Backend, keine Build-Pipeline. Klassische Skripte laden in definierter Reihenfolge; sämtliche öffentlichen Namen liegen unter `window.Resonance`, nicht verteilt als globale Variablen. Dadurch funktioniert auch das Öffnen der HTML-Datei direkt.

Die Dateien sind bewusst unkomprimiert. Die Renderer-Details enthalten lokale Gestaltungskoordinaten; Gameplay-, Physik-, Effekt- und Lautstärkeregler sind zentral konfiguriert.

## Zuständigkeiten

| Datei          | Verantwortung                                                                    |
| -------------- | -------------------------------------------------------------------------------- |
| `config.js`    | Balance, Physik, Arena, Effektbudgets, Audiogruppen                              |
| `orb-types.js` | Daten: Farbe, Name, Symbol, Beschreibung und Standardfähigkeit                   |
| `generator.js` | Seed-Zufall, Gruppenankerpunkte, Mindestabstände, vollständiger Anfangsaufbau    |
| `state.js`     | Frischer Rundenzustand und Modus-Registry                                        |
| `physics.js`   | Fester Zeitschritt, gleiche Masse für alle Orbs, Dämpfung, Wand-/Orb-Kollisionen |
| `chain.js`     | Ladetimer, Fähigkeiten-Registry, verzögerte Jobs, Projektile, Energie            |
| `particles.js` | Rein dekorative, begrenzte Effektlisten                                          |
| `renderer.js`  | Canvas, Hintergrund-Core, Orbs, Ladezustände, Effekte, Ziehvorschau              |
| `input.js`     | Pointer-Erfassung, gültige Positionen, Abbruch; keine Physik während Ziehen      |
| `audio.js`     | Datei-Manifest, Laden, Lautstärken, Stimmbegrenzung, Vorschau-Synthese           |
| `ui.js`        | DOM, Menüs, Lexikon, Feld-Code, Ergebnis                                         |
| `game.js`      | Verbindet Systeme; Rundentakt, Pause, Ende, Retry                                |

## Datenfluss

Input bestätigt einen Zug → Game setzt Position und verbraucht Impuls → Chain regt den Orb an → Fähigkeit verändert ausschließlich Spielzustand/Physik und emittiert Ereignisse → Audio und Particles reagieren → Renderer zeichnet den aktuellen Zustand.

Der Renderer löst keine Spielregeln aus. Dekorative Partikel entscheiden niemals über Treffer. Abstände werden mathematisch im Spielzustand geprüft.

## Zeit und Zustände

Runde: `ready → chain → ready` oder `chain → complete → won` bzw. `chain → lost`.

Orb: `idle → charging → spent`. Der sichtbare Auslöse-Effekt läuft unabhängig vom Orb weiter. Ein separater persistenter `active`-Zustand ist deshalb nicht nötig. Violett legt seine verzögerte Druckphase in `jobs` ab; Grün und Gold legen bewegliche Effekte in `projectiles` ab. Solange eines davon aktiv ist, endet die Kette nicht.

Simulation: 1/120 Sekunde. Renderframes sammeln Zeit in einem Akkumulator. Große Zeitsprünge sind begrenzt. Verlassen/Verstecken des Fensters pausiert das Spiel. Vor dem nächsten Zug müssen alle Spiel-Effekte abgeschlossen sein und die Kugeln unter die konfigurierte Stoppgrenze fallen.

## Neuer Orb

1. `OrbTypes` um eindeutige ID, Farbe, Beschreibung und Symbol ergänzen.
2. Werte unter `Config.abilities` ergänzen.
3. Eine Funktion unter `Abilities[id]` ergänzen. Sie bekommt `(chain, orb, config)`.
4. `chain.activate(target, sourceAbility, boost)` verwenden; nie direkt mehrfach Energie vergeben.
5. Für verzögerte Effekte `state.jobs` oder das Projektile-System nutzen. Keine `setTimeout`-Timer für Gameplay: diese würden Pause/Retry umgehen.
6. Sound in `SoundAssets` ergänzen und eventuelle eigene Darstellung im Renderer/Lexikon hinzufügen.
7. Einen Verhaltenstest ergänzen. Generator verwendet neue Typen automatisch.

Das ist datengetrieben für gemeinsame Eigenschaften, mit kleinen Funktionen für tatsächlich unterschiedliche Fähigkeiten. Ein neuer Orb erfordert gezielte Ergänzungen, keinen Neubau der Engine.

## Neuer Modus

`Modes` in `state.js` enthält pro Modus `create(seed)`, `requiredEnergy(count)`, `impulses()` und `outcome(state)`. Die Ergebnisfunktion liefert `won`, `lost` oder `continue`. `new Game(modeId)` wählt den Modus; der Standard ist `resonance`. Generator, Physik, Orbs, Audio und Renderer sind wiederverwendbar.

Andere Ziele und Zugbudgets können damit in der Modus-Registry definiert werden. Ein komplett anderer Zugablauf (z. B. Echtzeit statt rundenweise) braucht gezielte Ergänzungen im Game-Koordinator; Physik, Fähigkeiten und Renderer bleiben wiederverwendbar. Es ist bewusst keine universelle Modus-Engine.

## Retry und Zufall

Ein Seed erzeugt den Ausgangsaufbau. Zusätzlich wird ein vollständiger Snapshot gespeichert, damit „Noch einmal“ genau diesen Aufbau rekonstruiert. Gameplay-Zufall für Gold hat einen eigenen reproduzierbaren Generator. Dekorativer Zufall läuft getrennt und beeinflusst die Fähigkeiten nicht.

Der Feld-Code ist die Base-36-Darstellung des 32-Bit-Seeds. Er ist kein Speicherstand und garantiert dieselbe Anordnung nur mit gleicher Version/Config.

## Rendering und Mobile

Eine logische Arena wird proportional skaliert; Pixel-Dichte ist auf Faktor 2 begrenzt. Orbs liegen vor einem diffusen Core-Licht ohne feste Außenkante oder Kollisionskörper. Touch-Zielradius und sichtbarer Radius sind getrennt.

Der erste Renderer ist Canvas 2D: keine echte 3D-Lichtbrechung, kein Postprocessing-Bloom. Weiche Gradienten, transparente Effekte und begrenzte Partikel erzeugen Lichtwirkung. Ein späterer WebGL-Renderer kann dieselben Zustandsdaten lesen.

## Audio

Alle Sounddateien sind optional. Fehler beim Laden unterbrechen das Spiel nicht. Ein gültiger dekodierter Clip ersetzt den entsprechenden synthetischen Vorschauklang. Fehlende Clips können stumm bleiben. Das Audiomanifest enthält die einzelnen Dateinamen und Gains, `Config.audio` die Gruppenwerte.

Audio wird durch „Spiel starten“ freigeschaltet. Eine Kompressionsstufe und eine Stimmenbegrenzung verhindern Überlagerungen unbegrenzt vieler Klänge; sie ersetzen kein professionelles Sound-Mastering. Pause/Retry stoppen laufende Stimmen. Der Core-Erfolg besteht aus Voll-Ladung und späterer Abschlusswelle.

## Editor, Leveldateien und Navigation (v0.3.0)

- `level-data.js`: prüft Typen, endliche Koordinaten, Arena-Grenzen und Überschneidungen. Versioniertes Exportformat `resonanz-level`, `formatVersion: 1`.
- `editor.js`: hält den Entwurf getrennt vom simulierten Zustand; Platzieren/Verschieben, Rückgängig, lokaler letzter Entwurf und bewusst ausgelöster Download. Es gibt keine automatischen Dateidownloads.
- `navigation.js`: History-Einträge für Hauptmenü, Editor, Spiel und Unterfenster. `popstate` rendert vorhandene Routen. Menüs erneut zu rendern legt keine neuen History-Einträge an.
- `ui.js`: kompakte Editor-Werkzeuge, Navigation, identische Canvas-Orbs in Anleitung und Auswahl.

`Editor.snapshot()` wird beim Probespielen kopiert. `Game.retry()` nutzt wie bisher den Ausgangssnapshot. Simulation, zufällige Zielwahl und Bewegung verändern nie den Editor-Entwurf. Der Modus `editor` übernimmt die normalen Regeln und setzt `requiredEnergy(count)` explizit auf die Orb-Anzahl.

Die JSON-Datei enthält den Ausgangsaufbau als `layout` (Seed und Positionen/Typen), Arena, Regeln sowie Versions- und Balanceinformationen. Der Seed hält insbesondere Golds zufällige Zielwahl reproduzierbar. Der normale kurze Feld-Code reicht für handgebaute Anordnungen nicht aus.

Exportierte Dateien können später unter frei gewählten Namen, beispielsweise `levels/001.json`, ins Repository geladen werden. Noch liest das Spiel diesen Ordner nicht: Ein zukünftiger Level-Loader muss Format/Version prüfen und entscheiden, wie er mit abweichenden Balancewerten umgeht. Die gespeicherten Werte werden heute nicht automatisch in die Config übernommen. Die JSON-Dateien allein beweisen auch nicht, dass ein Feld lösbar ist.

Der letzte Entwurf liegt unter `resonance.editor.draft.v1` in `localStorage`. Das ist eine Browser-Speicherung ohne sichtbare Dateien auf dem Handy. Bei gesperrtem Speicher funktioniert Bearbeiten weiter; die UI weist auf die begrenzte Lebensdauer hin. Rückgängig-Verlauf und laufende Proberunden werden nicht dauerhaft gespeichert.
