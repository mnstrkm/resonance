# Prüfstand Version 0.1.0

## Durchgeführt

- Syntaxprüfung sämtlicher JavaScript-Dateien.
- `node tests/simulation.cjs`: 10 Testsuiten bestanden.
- 1.000 Seeds: reproduzierbarer Aufbau, Grenzen, Mindestabstände, alle sieben Typen.
- 500 simulierte Runden mit bis zu drei Aktivierungen: endende Ketten, endliche Positionen, Bewegung beruhigt sich, Energie nur einmal pro Orb.
- Einzelfälle: Ladeverzögerung, Rot, Blau, violette Zusatzphase, Grün-Reichweite/Rückstoß, Gold-Zufall, Orange-Verstärkung, Klon-Ketten, manueller leerer Klon und Kollisionen ohne Aktivierung.
- Separate DOM-Integration in einer simulierten Umgebung: Spielstart, Antippen ohne Kosten, zu weites Ziehen, Überlappung, Pointer-Abbruch, gültiger Zug, Pause/Fortsetzen, Lexikon, Sieg/Niederlage, Retry.
- Canvas-Ausgabe direkt gerendert und als Bild angesehen: ruhende und laufende Szene.

## Noch auf echten Geräten prüfen

Ein echter Browsertest war in der Erstellungsumgebung nicht möglich. Das ist keine Zusage, dass Safari/Chrome auf jedem Gerät bereits fehlerfrei laufen.

1. Link auf deinem Handy öffnen. Starten, Ton hören, Lautstärke verändern und stummschalten.
2. Gültigen Zug machen. Während der Kette dürfen keine weiteren Züge möglich sein.
3. Zurück auf den Ausgangspunkt, außerhalb des Radius und über einem anderen Orb loslassen: jeweils drei Impulse behalten, wenn noch kein gültiger Zug gemacht wurde.
4. Jede Fähigkeit anhand des Lexikons ausprobieren. Gold und Grün dürfen bereits verbrauchte Ziele nicht neu aktivieren.
5. Pause während der Kette, dann fortsetzen: Bewegung und Ladezeit dürfen nicht vorspringen.
6. In andere App wechseln und zurückkehren: Pausenmenü, anschließend Ton und Simulation fortsetzen.
7. Gleichen Aufbau wiederholen: ursprüngliche Positionen, volle Impulse, leerer Core.
8. Niederlage und Erfolg prüfen. Die letzte Kette muss vollständig auslaufen.
9. Eigenen Sound hinzufügen, neu laden, Vorschauklänge abschalten: der eigene Clip muss weiterhin hörbar sein.
10. Kleines Smartphone und Tablet: vollständige Arena, lesbare Menüs, keine verzerrten Kreise. Bei Querformat ist Scrollen möglich; Hochformat ist die vorgesehene Spielrichtung.

Bei Fehlern notieren: Gerät, Browser, Feld-Code, betroffener Orb und was unmittelbar vorher passierte. Diese Informationen sind für gezielte Korrekturen hilfreicher als „geht nicht“.
