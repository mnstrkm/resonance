# Prüfstand v0.3.0

Ausgangspunkt: GitHub `mnstrkm/resonance`, Commit `4592091f6c5aea8bbff465d326ee29331c8e99ff` (v0.2.0).

## Durchgeführt und bestanden

- JavaScript-Syntaxprüfung und `git diff --check`.
- Integration in JSDOM mit nativem Canvas: Start, Pause, Anleitung, Einstellungen, Hauptmenü, Browser-History zurück; wiederholtes Öffnen/Schließen ohne zusätzliche Pause-Einträge.
- Anleitung fokussiert das obere X ohne Scrollsprung; Scrollposition wird beim Öffnen auf null gesetzt.
- Editor-Pointer-Eingaben: Auswahl, Platzieren, Ziehen aus der Palette, Verschieben ohne Radius, ungültige Positionen, Abbruch, einzelnes Entfernen, Zurücksetzen und Rückgängig. Antippen der über der Arena liegenden Palette platziert keinen Orb darunter.
- Drei bzw. zwanzig platzierte Orbs ergeben Core-Ziel drei bzw. zwanzig; jeweils drei Impulse. Gültiger Spielzug kostet einen Impuls.
- Probespiel verändert den Editor-Entwurf nicht. Retry und Rückkehr zum Editor bewahren den Ausgangsaufbau.
- Entwurf speichern/wiederherstellen; Exportstruktur und ungültige Typen/Koordinaten; Export-Schalter nur in der Werkzeugansicht.
- Normales Zufallsspiel, Sieg/Niederlage, Wiederholen; leeres Editor-Feld ohne Division durch null zeichnen.
- Pixelvergleich aktiver und ladender Orbs gegen den Ausgangscommit: Rot, Blau, Violett, Grün, Orange und Perlmutt identisch. Bei Gold sind Pixeländerungen auf das mittlere Symbol begrenzt.
- Vorher-/Nachher-Grafik direkt mit dem Canvas-Renderer erstellt und angesehen: verbrauchte Orbs ohne versetzten Innenkreis und Highlightbogen.
- Bytevergleich bestätigt unveränderte Config, Physik, Fähigkeiten, Generator, Partikel, Audio, App-Icons und Manifest.

Beim Prüfen korrigiert: nach Platzieren falsche gespeicherte Orb-Anzahl; unbeabsichtigtes Platzieren unter einer angetippten Orb-Palette. Danach Tests erneut bestanden.

## Tests selbst ausführen (nur Entwicklung)

Node.js 22.12 oder neuer und Git verwenden. In einem Klon mit dem oben genannten Ausgangscommit:

```sh
npm install --no-save --package-lock=false jsdom@30.1.1 @napi-rs/canvas@0.1.100
node tests/regression.cjs
node tests/visual-scope.cjs
```

Die Tests brauchen diese Entwicklungsabhängigkeiten. Das Spiel selbst benötigt weder npm noch einen Build. `node_modules` nicht ins Repository hochladen. Der Grafikvergleich benötigt den Ausgangscommit in der Git-Historie und funktioniert nicht aus einer allein entpackten ZIP.

## Grenzen und kurze Geräteprüfung

Der Cloud-Browser hat das Öffnen der lokalen Vorschau blockiert. Daher kein echter Browser- oder Gerätetest: JSDOM prüft Verhalten und History, aber kein CSS-Layout, native Android-Gesten oder echte Audioausgabe. Die native Canvas-Prüfung ersetzt keinen vollständigen Screenshot im Handy-Browser.

Nach dem Upload:

1. v0.3.0 im Hauptmenü kontrollieren; normales Feld spielen, Sound/Lautstärke und 0,5× / 1× / 2× testen.
2. Android: Spiel → Pause → Anleitung. Zurückgeste dreimal: Pause → Spiel → Hauptmenü. Beim Probespiel führt Zurück zum Editor.
3. Anleitung muss oben beginnen. X und unterer Zurück-Knopf schließen sie. Beim erneuten Öffnen wieder oben.
4. Pause auf deinem Handy ohne Scrollen bedienen. Auf sehr kurzen Viewports oder bei vergrößerter Systemschrift bleibt Scrollen als Ausweichmöglichkeit erhalten, damit nichts abgeschnitten wird. Querformat hat eine kompakte zweispaltige Anordnung.
5. Editor mit Touch: Palette antippen und wieder schließen, Orbs platzieren/ziehen, Überlappung und Arena-Grenzen probieren. Danach Spielen → Zum Editor sowie Neu versuchen testen.
6. Entwurf erstellen, Seite neu laden, „Eigenes Feld“ öffnen: Entwurf noch da. Normales Spielen darf keine Datei herunterladen.
7. `?creator=1`: Download bewusst auslösen, JSON-Datei aufheben. Ein späterer Level-Loader ist noch nicht enthalten.

Bei Fehlern: Gerät, Browser, Spielversion, Feld-Code bzw. exportierter Entwurf und letzte Eingaben notieren.
