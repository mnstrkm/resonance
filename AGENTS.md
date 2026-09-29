# Anweisungen für KI-Agenten (AGENTS.md)

Diese Datei enthält Kontext, Verhaltensregeln und Richtlinien für KI-Codierungs-Assistenten (wie Cursor, GitHub Copilot, etc.), die in diesem Repository arbeiten. **Bitte lies diese Datei sorgfältig durch, bevor du Code generierst oder Änderungen vornimmst.**

## 1. Projektübersicht & Tech-Stack
- **Projekt:** Resonanz (Ein ruhiges Kettenreaktionsspiel).
- **Tech-Stack:** Reines Vanilla HTML, CSS und JavaScript.
- **Keine Frameworks:** Es werden **keine** Frontend-Frameworks (React, Vue, etc.) verwendet. Das Spiel läuft komplett im Browser.
- **Keine Build-Pipeline:** Es gibt kein Webpack, Vite oder npm-Build-Schritte für das Spiel. Der Code wird so, wie er geschrieben ist, direkt vom Browser ausgeführt. (Nur für Tests wird Node.js verwendet).

## 2. Architektur & Struktur
- **Globaler Namespace:** Alle Klassen und Funktionen leben im globalen Objekt `window.Resonance` (oder `R`).
- **Strikte Trennung:** 
  - `js/config.js`: Hier liegen **alle** Balance-Werte, Physik-Variablen und zentralen Einstellungen.
  - `js/state.js` & `js/chain.js`: Enthalten die reine Spiellogik (Spielzustand, Orbs, Fähigkeiten).
  - `js/renderer.js`: Zeichnet ausschließlich den aktuellen Zustand. Der Renderer darf **niemals** Spiellogik ausführen oder Spielzustände verändern.
  - `js/ui.js`: Steuert die DOM-Menüs und HTML-Overlays.
  - `js/audio.js`: Verwaltet Soundeffekte und Hintergrundmusik.
  - `js/level-loader.js`: Lädt externe JSON-Leveldateien asynchron.

*(Weitere Details zur Systemarchitektur stehen in der `ARCHITECTURE.md`)*

## 3. Sprach- und Stilregeln
- **Code (Variablen & Funktionen):** Strikt auf **Englisch** (z. B. `state`, `orbs`, `charging`).
- **Kommentare & UI-Texte:** Strikt auf **Deutsch**. Alle Code-Kommentare, Commit-Nachrichten und sichtbaren Texte für den Nutzer müssen auf Deutsch formuliert werden.
- **Dokumentation:** Alle Markdown-Dateien im Projekt sind auf Deutsch.

## 4. Wichtige Verhaltensregeln (Pflichten & No-Gos)
Bei der Ausführung von Aufträgen gelten folgende unumstößliche Regeln:

1. **Erst lesen, dann schreiben:** Vor Änderungen immer den aktuellen Branch und den betroffenen Code analysieren. Verwende niemals eine ältere Version (z.B. aus einer ZIP-Datei) als Ausgangspunkt.
2. **Fokus:** Ändere **nur** den ausdrücklich beauftragten Bereich. Erledige Aufträge exakt und präzise.
3. **Bestandsschutz:** Bestehende Orb-Regeln, Balancewerte und Grafiken **müssen erhalten bleiben**, sofern der Auftrag sie nicht ausdrücklich betrifft. Mach nichts Bestehendes kaputt!
4. **Struktur wahren:** Neue Balancewerte kommen ausnahmslos in die `js/config.js`. Spielregeln gehören in `js/chain.js` und `js/state.js`, neue Darstellungen in `js/renderer.js`.
5. **Verifizierung nach Änderungen:**
   - Prüfe die betroffene Fähigkeit oder Funktion gezielt.
   - Führe den Regressionstest aus, sofern du eine Node-Umgebung hast (`node tests/regression.cjs`).
   - Kontrolliere abschließend den Git-Diff auf unbeabsichtigte Änderungen (z.B. Auto-Formatierungen an Stellen, die nicht beauftragt waren).
