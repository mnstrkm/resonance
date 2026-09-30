# Prüfstand v1.0.0-rc.1

Release-Vorbereitung und Verifikation des ersten Release-Kandidaten (v1.0.0-rc.1).

## Durchgeführt und bestanden

- **JavaScript-Syntaxprüfung und `git diff --check`**: Alle Dateien syntaktisch einwandfrei und ohne unerwünschte Whitespace-Fehler.
- **Audio-Lebenszyklus und Hintergrundmusik (`tests/release-readiness.cjs`)**:
  - Höchstens eine Hintergrundmusikquelle gleichzeitig aktiv, auch bei verzögertem Nachladen weiterer Tracks.
  - Zuverlässiger Übergang zum nächsten Track nach Track-Ende (`onended`).
  - Zuverlässige Endlos-Wiederholung bei Playlists mit nur einem Track.
  - Ausschalten (`volume = 0`) und Wiedereinschalten erzeugen keine doppelten Quellen.
  - Veraltete `onended`-Callbacks nach `stopMusic()` starten keine verwaisten Quellen.
  - Lautstärkeeinstellungen, `dimMusic()` und `restoreMusic()` bleiben funktionsfähig.
- **JSON-Import mit UTF-8-BOM (`tests/release-readiness.cjs`)**:
  - Einlesen von Level-Dateien mit führendem UTF-8-BOM (z. B. `levels/24.json`) funktioniert fehlerfrei.
  - Reguläre JSON-Dateien ohne BOM werden unverändert importiert.
  - Tatsächlich ungültiges JSON wird verständlich abgewiesen, ohne den aktuellen Entwurf zu verändern.
- **Escape-Navigation (`tests/release-readiness.cjs`)**:
  - Im laufenden Spiel oder Editor öffnet Escape das Pausenmenü.
  - Bei geöffnetem Menü (Pause, Anleitung, Einstellungen) schließt Escape die oberste Menüebene.
  - In Moduswahl und Levelauswahl navigiert Escape genau eine Ebene zurück.
  - Im Hauptmenü bewirkt Escape nichts.
  - Während eines aktiven Ziehvorgangs bricht Escape nur den Ziehvorgang ab, ohne zusätzlich die Pause zu öffnen.
- **Speicher-Resilienz (`tests/release-readiness.cjs`)**:
  - `renderLevels()` und Stern-Speicherung brechen auch bei verweigertem `localStorage` (z. B. Private Browsing / SecurityError) nicht ab.
  - Fehlerhafte/korrupte gespeicherte Daten führen nicht zum Absturz der Ansicht.
  - Vorhandene gültige Sterne bleiben vollständig erhalten.
- **Tutorial-Anzeige (`tests/release-readiness.cjs`)**:
  - Ein geschlossener Tutorialtext bleibt für den aktuellen Versuch geschlossen und erscheint nicht nach Pause → Weiterspielen erneut.
  - Bei bewusstem Neustart (`Neu versuchen`) oder erneutem Öffnen des Levels erscheint das Tutorial wieder.
  - Normale Level ohne Tutorial bleiben unbeeinflusst.
- **Pausenmenü-Überschrift (`tests/release-readiness.cjs`)**:
  - Im Editor heißt die Überschrift stets „Pause“ (auch wenn zuvor ein Kampagnenlevel gespielt wurde).
  - Im Kampagnenlevel wird weiterhin „Level X – Pause“ angezeigt.
- **Render-Optimierung (`tests/release-readiness.cjs`)**:
  - Kein fortlaufendes Neuzeichnen hinter vollständig verdeckenden Ansichten (`home`, `modes`, `levels`) oder im pausierten Zustand.
  - Korrektes Neuzeichnen bei Größenänderungen (`resize`), Editor-Änderungen, Ziehvorgängen und Ansichtswechseln.
  - Physik-Simulation und Rundenzeiten bleiben 100 % unverändert.
- **Regressionstest (`tests/regression.cjs`)**:
  - Gesamter Spielzyklus über Moduswahl, Level, Editor, Import/Export, Ergebnis-Navigation und Canvas-Rendering bestanden.
- **Orb-Fähigkeiten & Physik (`tests/orange-bonus.cjs`)**:
  - Balance, Orange-Verstärkung, Pfeilreichweite, Sog, Druck, Pulsar, Gold und Klon-Verhalten vollständig verifiziert.
- **Historischer Grafik- und Modulvergleich (`tests/visual-scope.cjs`)**:
  - Physik-, Generator- und Partikel-Kerne unverändert.
  - Abweichungen im Renderer als bewusstes Ethereal-Zen UI-Overhaul (v0.5.0) dokumentiert.

## Tests selbst ausführen (nur Entwicklung)

Node.js (ab Version 22) verwenden:

```sh
node tests/release-readiness.cjs
node tests/regression.cjs
node tests/orange-bonus.cjs
node tests/visual-scope.cjs
```

## Grenzen der automatisierten Prüfung & empfohlene Geräteprüfung

Die automatisierten Tests laufen in Node.js mit JSDOM und `@napi-rs/canvas`. Sie prüfen DOM-Zustände, Logik, History und Canvas-Aufrufe, ersetzen jedoch keine echten Hardware- und Browsertests.

Folgende Punkte müssen auf realen Testgeräten (Desktop und Mobilgeräte) überprüft werden:

1. **Android / iOS Gesten-Navigation**:
   - Systemeigene Zurück-Geste auf Android: schließt Pausenmenü bzw. führt eine Ansichtsebene zurück.
   - Touch-Bedienung im Editor (Palette öffnen, Orbs und Hilfslinien per Touch platzieren und verschieben).
2. **Audio auf Mobilgeräten**:
   - Erstes Antippen von „Spiel starten“ schaltet Web-Audio auf Mobilbrowsern (Autoplay-Policy) korrekt frei.
   - Hintergrundmusik läuft stabil und pausiert beim Tab-Wechsel.
   - Lautstärkeregler für Musik und Effekte auf kleinen Touchscreens bedienbar.
3. **Visuelle Darstellung & Performance**:
   - Layout und Schriften auf verschiedenen Bildschirmgrößen (Querformat, Hochformat).
   - Flüssige Bildrate (60 Hz / 120 Hz) auf Zielgeräten ohne erhöhte Akkubelastung im Pausenzustand.
