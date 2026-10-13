# Katalogic

Katalogic ist eine installierbare PWA zum Katalogisieren verschiedenster Dinge.
Einträge werden lokal auf dem Gerät gespeichert und funktionieren dadurch auch
offline. Optional lassen sie sich über Supabase zwischen Geräten synchronisieren
oder als JSON-Datei exportieren und importieren.

Die Katalogic-Startseite bietet eine Einführung und Schnellzugriffe. Über die
Navigationsleiste gelangst du in fünf getrennte Bereiche:
**Sammlung** zeigt gespeicherte Einträge nach Kategorie, **Suchen** prüft den
eigenen Bestand anhand von Name, Kategorie, Notizen, Lagerort, Spieldetails
oder Barcode (auch direkt per Kamera-Scan),
**Hinzufügen** bündelt Online-, Google- und manuelle Erfassung, **Barcode**
erzeugt eigene Code-128-, EAN-13- und QR-Codes (EAN mit automatischer Prüfziffer,
Download als SVG/PNG, Drucken und Teilen, komplett offline; ein Button
**Im Internet öffnen** startet zusätzlich eine Google-Suche in einem neuen Tab,
deren Texte du per Kopieren und Einfügen übernehmen kannst) und **Sync**
enthält Sammlungs-ID, Datei-Sicherungen und Supabase-Synchronisation.

## Artikel erfassen und suchen

Barcodes kannst du entweder mit der Kamera
(Browser mit `BarcodeDetector` erforderlich) oder mit einem USB-/Bluetooth-
Scanner erfassen. Scanner, die sich wie eine Tastatur verhalten, können den
Barcode direkt in das Barcode-Feld eingeben. ISBNs und Buchtitel werden über Open Library gesucht. Barcodes und allgemeine
Produktnamen werden zusätzlich über UPCitemdb und Open Food Facts nachgeschlagen.
Die allgemeine Produktsuche läuft über `/api/products` auf dem Katalogic-Server,
weil UPCitemdb Browser-Anfragen von fremden Domains blockiert.
Vor der Suche kannst du eine Kategorie auswählen oder automatisch anhand der
Produktdaten erkennen lassen. Ergebnisse zeigen, soweit verfügbar, Bild, Marke,
Modell, Farbe, Produktgruppe und Barcode. Wähle einen Treffer aus, prüfe die
vorgeschlagenen Daten und speichere ihn. Unbekannte Artikel lassen sich
weiterhin manuell ergänzen.

Die Sammlung bietet Kategorien für Spiele, Geräte, Filament, Filme, Zubehör,
Laser, 3D Drucker, Kleinteile, Bücher und Sonstiges. Bei der Suche kannst du
eine Zielkategorie festlegen; übernommene Treffer werden dieser Kategorie
zugeordnet. Mit automatischer Erkennung schlägt Katalogic eine Kategorie anhand
der Datenquelle und des Produktnamens vor. Produktabdeckung und
Ergebnisqualität hängen von den offenen Datenquellen ab; einzelne Produkte
werden möglicherweise nicht gefunden oder falsch kategorisiert. UPCitemdbs
kostenlose Test-Schnittstelle ist begrenzt und kann bei Überschreitung ihres
Limits vorübergehend keine Suchergebnisse liefern. Auf einem eigenen Hosting
muss der Server ebenfalls `/api/products` an UPCitemdb weiterleiten; `server.js`
enthält einen einfachen Node.js-Server für die lokale Nutzung und kleine
Installationen.

Bei Einträgen der Kategorie **Spiele** kannst du zusätzlich optionale Angaben
wie Plattform, Edition, Region, Speichermedium, Entwickler, Publisher,
Erscheinungsjahr, Zustand, Originalhülle, Anleitung, Beilagen und Kaufdaten
über **Spieldetails öffnen** einblenden und speichern. Der Button erscheint
bei erkannter oder manuell ausgewählter Spiele-Kategorie. Die Angaben werden
beim Bearbeiten, in der Bestandssuche, im Export und bei der Synchronisation
berücksichtigt.
Plattform, Edition und Region sind Auswahlfelder mit gängigen vorgefüllten
Optionen; über **Andere …** kann ein eigener Wert eingetragen werden. Die
Spieleingaben passen sich im Hell- und Dunkelmodus an.
Für das Speichermedium gibt es unter anderem die Auswahl UMD, Speicherkarte
sowie Diskette 3,5 und 5,25 Zoll.
Für jeden Eintrag kann außerdem ein optionaler, frei eingebbarer Lagerort
gespeichert werden; er bleibt beim Bearbeiten, Suchen und Synchronisieren
erhalten.
Für Einträge aller Kategorien können bis zu drei JPEG-, PNG- oder WebP-Fotos
hinzugefügt werden. Die Bilder werden beim Auswählen verkleinert und zusammen
mit den Einträgen lokal gespeichert; sie bleiben auch in Datei-Sicherungen und
bei der Supabase-Synchronisation enthalten.

Beim Hinzufügen liest „Text aus Foto erkennen“ ein Foto von Hülle, Cover oder
Etikett per OCR ([Tesseract.js](https://github.com/naptha/tesseract.js),
Deutsch + Englisch) und trägt Name, Kategorie, Barcode/ISBN, Notiz (Jahr,
USK/FSK/PEGI) sowie bei Spielen Plattform, Edition und Region in leere Felder
ein. Erkannte Zeilen lassen sich per Tipp als Name übernehmen. Die Erkennung
läuft komplett auf dem Gerät; die Bibliothek und die Sprachdaten (ca. 13 MB)
liegen unter `vendor/tesseract/` und werden erst bei der ersten Nutzung geladen
und danach offline zwischengespeichert. Die Ergebnisse sind Vorschläge und sollten
geprüft werden.

In der Kategorie „Geräte“ erscheint beim Hinzufügen und Bearbeiten das Feld
„Zubehör“ als zwei Buttons zur Auswahl (Original-Zubehör oder Drittanbieter; ein
erneuter Klick hebt die Auswahl auf); die Angabe wird
in Sammlung und Bestandssuche angezeigt und ist durchsuchbar.

Nach jeder Barcode- oder Produktsuche stellt Katalogic zusätzlich direkte
Links zu Google Websuche und (bei Barcodes) Google Shopping bereit. Diese
öffnen die Google-Ergebnisse in einem neuen Tab; Google-Ergebnisse werden nicht
innerhalb der App eingebettet. Der Suchbegriff bzw. Barcode wird beim Öffnen an
Google übermittelt.
Das separate Google-Scan-Widget öffnet bereits beim Kamerastart einen neuen
Tab und leitet ihn nach dem Erkennen des Barcodes direkt zur Google-Suche
weiter. Ein Barcodescanner, der Text eingibt, kann auch das Widget-Eingabefeld
füllen; mit **Google öffnen** wird die Suche sofort in einem neuen Tab geöffnet.
Übernommene Bilder werden als HTTPS-Bildadresse gespeichert und zum Anzeigen
vom jeweiligen Datenanbieter geladen; sie sind nicht offline verfügbar.
Suchbegriffe und Barcodes werden direkt an die genannten Anbieter gesendet.

## Lokal starten

Starte den enthaltenen Node.js-Server (Node.js 18 oder neuer):

```sh
node server.js
```

Öffne anschließend `http://localhost:8000`. Dieser Server stellt sowohl die
PWA als auch den Produkt-Suchendpunkt bereit. Ein einfacher statischer
Dateiserver wie `python -m http.server` genügt für die allgemeine
Produktsuche nicht. Service Worker und Kamera benötigen einen sicheren
Kontext; `http://localhost` wird unterstützt.

Die App-Shell wird vom Service Worker zwischengespeichert und kann nach dem
ersten erfolgreichen Laden ohne Internet geöffnet werden. Einträge, Änderungen,
Suche im eigenen Bestand und JSON-Export/-Import funktionieren lokal offline.
Internetsuche, Google, externe Bilder und Supabase-Synchronisation benötigen
eine Verbindung. Die Installation als PWA ist für zuverlässigen Offline-Start
empfohlen.

Über die Schaltfläche **Hell/Dunkel** oben rechts wechselst du zwischen dem
dunklen Grau-Blau-Lila-Design und der hellen Variante. Die Auswahl wird auf
diesem Gerät gespeichert.

### Google Shopping API (optional)

Für breitere Produkttreffer kann SerpApi Google Shopping zugeschaltet werden:

1. Erstelle ein Konto unter <https://serpapi.com/users/sign_up> und kopiere
   deinen API-Key aus dem Dashboard.
2. Setze den Key als Server-Umgebungsvariable **vor** dem Serverstart. In
   PowerShell:

   ```powershell
   $env:SERPAPI_API_KEY = "DEIN_SERPAPI_KEY"
   node server.js
   ```

   In macOS/Linux:

   ```sh
   SERPAPI_API_KEY="DEIN_SERPAPI_KEY" node server.js
   ```

Der Key wird ausschließlich serverseitig verwendet und darf nicht in
`app.js`, HTML, Browserfeldern oder Git eingecheckt werden. Wenn die Variable
gesetzt ist, verwendet die Produkt- und Barcode-Suche Google Shopping über
SerpApi. Ohne Variable bleibt UPCitemdb aktiv. SerpApi listet aktuell einen
kostenlosen Tarif mit 250 Suchen pro Monat; weitere Tarife sind kostenpflichtig.
Siehe <https://serpapi.com/google-shopping-api> und
<https://serpapi.com/pricing>. Suchanfragen werden an SerpApi und Google
Shopping übermittelt.

## Export und Import

Im Bereich **Sync** kannst du **Sammlung exportieren** wählen, um eine
JSON-Sicherung einschließlich Sammlungs-ID und Einträgen herunterzuladen.
**Sicherung importieren** ersetzt nach einer Bestätigung den lokalen Bestand.
Exportiere vor dem Ersetzen eine Sicherung, wenn du die vorhandenen Daten
behalten möchtest. Die JSON-Datei enthält unverschlüsselte Eintragsdaten und
sollte vertraulich aufbewahrt werden.

Um ein weiteres Gerät zu verbinden, importiere die Sicherungsdatei oder
verwende auf beiden Geräten dieselbe **Sammlungs-ID**. Die ID ist keine
Zugangssicherung.

## Synchronisation einrichten

1. Erstelle ein Supabase-Projekt.
2. Führe im Supabase SQL Editor das Schema aus `supabase.sql` aus.
3. Öffne in Katalogic den Bereich **Sync** und trage Projekt-URL sowie
   Publishable-/Anon-Key aus den API-Einstellungen des Projekts ein.
4. Verwende auf allen Geräten dieselbe Sammlungs-ID. Eine Sicherung enthält
   diese ID; alternativ kannst du sie kopieren und auf einem anderen Gerät
   eintragen.
5. Mit **Jetzt synchronisieren** werden Änderungen gesendet und empfangen.
   Solange die App geöffnet ist, sucht Katalogic außerdem regelmäßig nach
   Änderungen.

Der Supabase Publishable-/Anon-Key ist für die Verwendung im Browser gedacht;
trage niemals einen `service_role`-Key ein. Das Schema erlaubt anonymen
Clients den Lese- und Schreibzugriff auf die Tabelle. Die Einträge werden
unverschlüsselt synchronisiert; jeder mit Projekt-URL und Anon-Key kann sie
lesen oder ändern, solange die Policies das erlauben. Die Sammlungs-ID ist
öffentlich und ersetzt keine Anmeldung. Nutze die Standard-Policies nicht für
sensible Daten; richte für produktive Nutzung Supabase Auth und passende
Row-Level-Security-Policies ein.

Die Synchronisation führt Einträge anhand ihres Änderungszeitpunkts zusammen.
Gleichzeitige Änderungen desselben Eintrags verwenden „last write wins“;
unterschiedliche Einträge werden zusammengeführt. Löschungen werden als
Tombstones synchronisiert. Bei einem Upgrade werden alte lokale Tresor-Daten
beibehalten; alte verschlüsselte Supabase-Einträge werden beim nächsten
erfolgreichen Sync mit dem bisherigen Geräteschlüssel einmalig in das neue
unverschlüsselte Format migriert.
