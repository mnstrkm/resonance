# Eigene Sounds einfügen

Hier dürfen deine Audiodateien liegen. Die mitgelieferte Version enthält keine externen Tonaufnahmen. Die hörbaren Klänge sind bewusst vorläufige Synthese und lassen sich im Pausenmenü abschalten.

## Einfachster Weg

1. Passende MP3 besorgen und ihre Nutzungslizenz prüfen.
2. Exakt wie unten benennen (kleingeschrieben, inklusive Bindestrichen).
3. In diesen Ordner legen: `assets/sounds/`.
4. Datei mit ins GitHub-Repository hochladen.
5. Spielseite neu laden und „Spiel starten“ drücken.

Die Datei wird automatisch anstelle des Vorschauklangs verwendet. Fehlende Dateien sind erlaubt. Keine leeren MP3-Platzhalter erstellen. Bei lokalem Öffnen per Doppelklick können Browser den Dateizugriff blockieren: dann den lokalen Server oder GitHub Pages nutzen.

| Datei                  | Ereignis                              | Gestaltung / grobe Länge                  |
| ---------------------- | ------------------------------------- | ----------------------------------------- |
| `grab.mp3`             | Orb berühren                          | Weicher Kontakt, 0,08–0,2 s               |
| `release.mp3`          | Gültiger manueller Impuls             | Präziser kurzer Beginn, 0,1–0,25 s        |
| `cancel.mp3`           | Ungültig loslassen                    | Sehr leise Rückkehr, 0,1–0,2 s            |
| `orb-charge.mp3`       | Orb wird angeregt                     | Kurzes Anschwellen, höchstens ca. 0,45 s  |
| `orb-red.mp3`          | Roter Druckstoß                       | Warmer Druck + Glasresonanz, 0,3–0,7 s    |
| `orb-blue.mp3`         | Blauer Sog                            | Nach innen ziehend, 0,3–0,7 s             |
| `orb-violet.mp3`       | Violette Anziehung                    | Kurzer Auftakt, etwa 0,3 s                |
| `orb-violet-burst.mp3` | Violette Druckphase                   | Auf den Auftakt abgestimmt, 0,3–0,7 s     |
| `orb-green.mp3`        | Pfeil-Abschuss                        | Leichter gerichteter Luftklang, 0,1–0,3 s |
| `orb-green-hit.mp3`    | Pfeil trifft                          | Runder kleiner Treffer, 0,1–0,3 s         |
| `orb-gold.mp3`         | Gold sucht                            | Kreisende helle Textur, ca. 0,35 s        |
| `orb-gold-hit.mp3`     | Gold erreicht Ziel                    | Kurze Auflösung, 0,1–0,4 s                |
| `orb-orange.mp3`       | Verstärker-Aura                       | Warme kompakte Resonanz, 0,3–0,6 s        |
| `orb-pearl-empty.mp3`  | Manuell ausgelöster Klon ohne Vorlage | Leise gläserne Hülle, 0,2–0,4 s           |
| `core-charge.mp3`      | Energie gelangt zum Core              | Kurzer harmonischer Ton, 0,2–0,5 s        |
| `core-full.mp3`        | Energieziel erstmals erreicht         | Stabile Resonanz, 0,5–1 s                 |
| `core-complete.mp3`    | Abschlusswelle nach Kettenende        | Voller, warmer Ausklang, etwa 1,5–2,3 s   |
| `round-failed.mp3`     | Runde verloren                        | Sanftes Abklingen, 0,5–1 s                |
| `collision.mp3`        | Ausreichend kräftiger Kontakt         | Leiser kurzer Kontakt, 0,05–0,15 s        |

Der Klon spielt bei einer kopierten Fähigkeit deren Sound. Seine Klangfarbe folgt damit ebenso der kopierten Fähigkeit wie die Effektfarbe. Keine zusätzliche dauerhafte Hintergrundmusik vorgesehen.

## Qualität und Abstimmung

- Keine lange Stille am Dateianfang: der Treffer muss sofort hörbar sein.
- Ähnliche Grundlautstärke verwenden, keine bereits übersteuerten Clips.
- Tonale Klänge gemeinsam abstimmen, z. B. D-Moll-Pentatonik. Core-Charge wird in einer kleinen Tonfolge transponiert; ein D als Grundton passt zur Vorschau.
- `SoundAssets` in `js/audio.js` enthält die Lautstärke `gain` jedes Clips. 0,5 entspricht halber Amplitude, nicht „halb so laut“ im Hörempfinden.
- Lange Nachhallfahnen bei jeder Kollision vermeiden. Sie summieren sich schnell.
- Kleine Handylautsprecher testen, nicht nur Kopfhörer.
- Partikel brauchen keine eigenen Dateien und keine einzelnen Sounds.

## Andere Formate

Du kannst z. B. eine WAV-Datei verwenden, indem du den zugehörigen `file`-Eintrag in `js/audio.js` änderst. Die Endung nur umzubenennen konvertiert das Audio nicht. MP3 ist der einfache Ausgangspunkt für dieses Projekt; jedes alternative Format auf deinen Zielbrowsern testen. WAV braucht bei langen Clips deutlich mehr Speicher.

Quelle, Autor und Lizenz jedes hinzugefügten Assets in `ASSET_LICENSES.md` ergänzen.
