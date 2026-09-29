# Resonanz

**Ein Impuls kann eine ganze Kettenreaktion auslösen.** Resonanz ist ein Browser-Spiel über Orbs mit unterschiedlichen Fähigkeiten, gleitende Bewegung und das Zusammenspiel ihrer Effekte. Verschiebe einen Orb, beobachte die Reaktion und versuche, mit höchstens drei Impulsen die Energie aller Orbs zum Core zu bringen.

**[Jetzt Resonanz spielen](https://mnstrkm.github.io/resonance/)** · [Quellcode](https://github.com/mnstrkm/resonance) · Version **0.4.0**

Das Spiel läuft im Browser auf Geräten mit Touch oder Maus. Eine Installation ist nicht erforderlich.

## So funktioniert es

1. Wähle einen Orb und verschiebe ihn innerhalb der angezeigten Reichweite.
2. Lass ihn los, um einen Impuls auszulösen. Aktivierte Orbs laden kurz auf und entfalten danach ihre Fähigkeit.
3. Sammle die Energie **aller** Orbs, bevor die drei Impulse aufgebraucht sind.

Ungültige Platzierungen verbrauchen keinen Impuls. Die Anleitung mit den Orb-Fähigkeiten findest du im Pausenmenü. Dort kannst du auch Tempo und Lautstärken (getrennt nach Musik und Effekten) einstellen sowie über den Feld-Code einen zufällig erzeugten Aufbau wieder aufrufen. Derselbe Feld-Code setzt dieselbe Spielversion und dieselben Balancewerte voraus.

## Spielmodi

Nach dem Klick auf **Spiel starten** stehen drei Modi zur Auswahl:

- **Level**: Nacheinander freischaltbare, handgefertigte Herausforderungen. In den ersten Leveln werden die Mechaniken der einzelnen Orbs schrittweise durch interaktive Tutorials erklärt. Sammle bis zu 3 Sterne pro Level, abhängig von den benötigten Impulsen (1 Impuls = 3 Sterne, 2 Impulse = 2 Sterne, 3 Impulse = 1 Stern).
- **Zufall**: Der klassische Endlosmodus mit prozedural generierten Feldern und teilbaren Feld-Codes.
- **Eigenes Feld**: Der integrierte Level-Editor zum freien Gestalten, Testen und Exportieren eigener Aufbauten.

## Die Orbs

| Orb | Fähigkeit |
| --- | --- |
| **Druck** (Rot) | Regt nahe Orbs an und stößt sie weg. |
| **Sog** (Blau) | Zieht nahe Orbs an und regt sie an. |
| **Pulsar** (Violett) | Zieht zuerst an und löst anschließend einen Druckstoß aus. |
| **Pfeil** (Grün) | Trifft das nächste ruhende Ziel in Reichweite. |
| **Funke** (Gold) | Sucht ein zufälliges ruhendes Ziel in der ganzen Arena. |
| **Aura** (Orange) | Regt nahe Orbs an und verstärkt Kraft und Reichweite bestimmter Fähigkeiten. |
| **Spiegel** (Perlmutt) | Kopiert die Fähigkeit des auslösenden Orbs. |

## Eigenes Feld (Editor)

Über **Eigenes Feld** im Hauptmenü kannst du Orbs platzieren, verschieben und deinen Aufbau direkt spielen. Beim Testen bleibt der Entwurf erhalten; du kannst erneut spielen oder zum Editor zurückkehren. Der letzte Entwurf wird lokal in diesem Browser gespeichert. Er wird nicht zwischen Geräten synchronisiert und kann beim Löschen der Websitedaten verloren gehen.

- **Hilfslinien**: Im Editor können kreisförmige und lineare Hilfslinien platziert werden, an denen Orbs beim Verschieben sanft einrasten. Jede Hilfslinie besitzt separate, intuitive Anfasser zum Verschieben (Mittelpunkt), Skalieren (Quadrat) und Drehen (Kreis mit Achspunkt).
- **Rückgängig-Funktion**: Änderungen an Orbs und Hilfslinien lassen sich über die Rückgängig-Schaltfläche schrittweise zurücknehmen.

---

## Projektpflege

Die folgenden Hinweise sind für die Weiterentwicklung gedacht. Die Spielregeln und Einstellwerte liegen in den verlinkten Dateien; ausführlichere technische Zusammenhänge stehen in [ARCHITECTURE.md](ARCHITECTURE.md).

### Balance ändern

Die zentralen Zahlen stehen in [js/config.js](js/config.js). Distanzen sind **logische Arena-Einheiten**, Zeiten in **Sekunden**. Die Größe auf dem Bildschirm ist davon getrennt.

| Ziel | Einstellung | Aktueller Wert |
| --- | --- | ---: |
| Anzahl zufällig erzeugter Orbs | `gameplay.minOrbs` / `maxOrbs` | 10 / 15 |
| Verfügbare Impulse | `gameplay.impulses` | 3 |
| Benötigte Energie im normalen Spiel | `gameplay.requiredRatio` | 1 = alle Orbs |
| Ladezeit eines aktivierten Orbs | `gameplay.chargeTime` | 0,5 s |
| Erlaubte Verschiebung eines Orbs | `gameplay.moveRadius` | 64 |
| Mindestabstand bei der Erzeugung | `generator.minDistance` | 50 |
| Physik: Abbremsen / Abprallen | `physics.damping` / `restitution` | 1,9 / 0,64 |
| Radius von Druck, Sog und Pulsar | `abilities.red/blue/violet.radius` | jeweils 100 |
| Reichweite des Pfeils | `abilities.green.radius` | 175 |
| Maximale Musik-Lautstärke | `audio.musicMax` | 0,35 |
| Aura: eigener Radius / Kraft / Reichweite | `abilities.orange.radius` / `multiplier` / `rangeMultiplier` | 70 / 1,65 / 1,15 |

Die Zielzahl für **Eigenes Feld** entspricht unabhängig von `requiredRatio` immer der Anzahl der platzierten Orbs; der Modus steht in [js/state.js](js/state.js). Geschwindigkeitseinstellungen im Pausenmenü ändern das Spieltempo, nicht die Reichweiten. Orange verstärkt direkt aktivierte rote, blaue, violette und grüne Orbs; ein direkt aktiviertes Orange hat eine größere Aura. Gold und die Fähigkeit des Spiegels bleiben bei ihrer gewohnten Wirkung. Der Bonus wird nicht durch andere Orb-Typen weitergegeben oder nachträglich auf bereits ladende Orbs angewandt. Für eine Balanceänderung möglichst nur einen Wert auf einmal ändern und anschließend dasselbe Feld erneut testen.

### Darstellung, Orbs und Sounds

- Namen, Farben, Beschreibungen und Symbolzuordnung: [js/orb-types.js](js/orb-types.js). Die Orb-Darstellung wird in [js/renderer.js](js/renderer.js) gezeichnet; Fähigkeiten liegen in [js/chain.js](js/chain.js).
- Einen weiteren Orb ergänzen: Typ in `orb-types.js`, Werte in `config.js`, Fähigkeit in `chain.js` und gegebenenfalls Symbol, Sound und Beschreibung ergänzen. Die genaue Reihenfolge steht in [ARCHITECTURE.md](ARCHITECTURE.md#neuer-orb).
- Eigene Sounddateien: [assets/sounds/SOUNDS.md](assets/sounds/SOUNDS.md) enthält Dateinamen und Hinweise. **Hintergrundmusik** kann im Ordner `assets/music/` abgelegt (z. B. im bandbreitenschonenden `.opus`-Format oder als `.mp3`) und in der Datei `assets/music/playlist.json` registriert werden. Das Spiel spielt diese fortlaufend ab. [js/audio.js](js/audio.js) ordnet Sounddateien und Einzel-Lautstärken (`SoundAssets`) zu; `Config.audio` in `config.js` steuert die Gruppenlautstärken. Ohne eigene Aufnahmen verwendet das Spiel synthetische Vorschauklänge.
- Herkunft und Lizenzen neuer Assets in [ASSET_LICENSES.md](ASSET_LICENSES.md) ergänzen.

### Eigene Level als JSON sichern

**[Editor mit JSON-Export öffnen](https://mnstrkm.github.io/resonance/?creator=1)** → im Hauptmenü **Eigenes Feld** wählen → Aufbau erstellen → Download-Symbol im Editor drücken. Nur dieser bewusste Klick lädt eine JSON-Datei herunter; die normale Editoransicht speichert Entwürfe lediglich lokal im Browser.

Die JSON-Datei enthält unter anderem Positionen und Typen der Orbs, den Seed sowie Spiel- und Balanceinformationen. Du kannst diese Dateien im Ordner `levels/` als `01.json`, `02.json` usw. ablegen. Das Spiel erkennt bis zu 50 solcher Level automatisch über [js/level-loader.js](js/level-loader.js) und schaltet sie im neuen **Level-Modus** frei. Fehlt eine fortlaufende Datei, wird der Level-Platz als gesperrt markiert.

`?creator=1` blendet lediglich die Export-Schaltfläche ein und ist **kein Zugangsschutz**. Wer den Link kennt, kann die Funktion ebenfalls verwenden.

### Versionen und Änderungen

Die sichtbare Spielversion steht in [js/ui.js](js/ui.js) als `R.version`. Bei einer neuen Version außerdem die Versionsangabe oben in dieser README und die `?v=`-Kennungen der geänderten CSS- und JavaScript-Dateien in [index.html](index.html) prüfen, damit Browser die neuen Dateien laden. Die Cache-Kennung darf für einen gezielt aktualisierten Einzelfall auch einen Zusatz haben. Eine neue Version erhält anschließend einen passenden Git-Tag und Release auf `main`.

Vor dem Veröffentlichen: Spiel und Editor auf Touch und Maus durchspielen, Pause und Zurück-Navigation prüfen, einen Export testen und die Schritte in [TESTING.md](TESTING.md) nachsehen. Bei Änderungen an Leveldaten oder Balance prüfen, ob alte JSON-Dateien noch zum aktuellen Spiel passen.
