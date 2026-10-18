# Katalogic

Katalogic ist eine installierbare PWA zum Katalogisieren verschiedenster Dinge.
Einträge werden lokal auf dem Gerät gespeichert und funktionieren dadurch auch
offline. Optional lassen sie sich über Supabase zwischen Geräten synchronisieren
oder als JSON-Datei exportieren und importieren.

Die Katalogic-Startseite bietet eine Einführung und Schnellzugriffe. Die
Navigationsleiste bündelt die spezialisierten Bereiche **Geräte**, **Spiele**,
**Bücher**, **Filme**, **Filamente** und **Kleinteile** im Menü **Verwaltung**. **Sammlung**
zeigt gespeicherte allgemeine Einträge und direkte Zugänge zu den Bereichen;
**Suchen** durchsucht den eigenen Bestand einschließlich Geräten, Spielen,
Büchern, Filmen, Filamentrollen und Kleinteilen, auch per Kamera-Barcode-Scan.
Neue Verwaltungsansichten werden mit `data-management-view`,
`data-management-label` und optional `data-management-icon` am jeweiligen
`.app-view` markiert und automatisch in das Verwaltungsmenü aufgenommen. Die
Bereiche erhalten dort eigene Icons (`MANAGEMENT_ICONS` in `app.js`); Bereiche
ohne eigenes Icon nutzen das Zeichen aus `data-management-icon`.
**Filamente** verwaltet Produkte, einzelne
Rollen, Restmengen, Verbrauchsbuchungen, Lagerung und persönliche Druckprofile.
**Kleinteile** verwaltet Artikelstammdaten, hierarchische Lagerorte, Fotos,
interne Kennungen und Bestandsbewegungen. Abgänge erfordern eine Bestätigung
und können den Bestand nicht unter null setzen.
Der allgemeine Bereich **Hinzufügen** wurde
entfernt. Neue Datensätze für diese Verwaltungsbereiche legst du jeweils dort
an; die allgemeine manuelle Artikelneuanlage ist nicht mehr verfügbar.
**Barcode** erzeugt eigene Code-128-, EAN-13- und QR-Codes (EAN mit automatischer
Prüfziffer, Download als SVG/PNG, Drucken und Teilen, komplett offline) und
bietet eine unabhängige Websuche. **Sync** enthält Sammlungs-ID, Datei-
Sicherungen (JSON-Export/-Import sowie ein PDF-Export als lesbare
Bestandsübersicht, der ohne zusätzliche Bibliothek im Browser erzeugt und nicht
importiert werden kann) und Supabase-Synchronisation. Zusätzlich exportiert
„Diagramme als Bild exportieren“ eine PNG-Seite mit sieben Diagrammen (Einträge
pro Bereich, Spiele nach Plattform, Geräte, Bücher und Kleinteile nach Kategorie,
Filme nach Format, Filament-Restmenge nach Material).
Der Gerätebereich speichert seine verknüpften Gerätedaten in der bestehenden
lokalen Katalogic-Sicherung und nimmt sie in JSON-Exporte und -Importe auf.
Geräte werden derzeit nicht über die Supabase-Synchronisation übertragen.
Auch die separate Spieleverwaltung wird lokal gespeichert und in JSON-
Sicherungen übernommen, derzeit jedoch nicht über Supabase synchronisiert.
Die Bücherverwaltung speichert Titel, Ausgaben, Autoren, Reihen, ISBNs,
Formatdetails, Lesestatus, Ausleihen und Cover ebenfalls lokal und in JSON-
Sicherungen; eine Supabase-Synchronisierung ist dafür nicht aktiviert.
Die Film- und Serienverwaltung speichert Ausgaben, Franchises, Formate,
Staffel-/Episodendaten, Zustände, Kaufdaten und bis zu acht Galeriebilder lokal
und in JSON-Sicherungen; eine Supabase-Synchronisierung ist dafür nicht aktiviert.
Die Filamentverwaltung speichert Produktdaten, einzelne Rollen, Verbrauchshistorien,
Profile und Fotos lokal und in JSON-Sicherungen; eine Supabase-Synchronisierung
ist dafür nicht aktiviert.
Die Kleinteileverwaltung speichert Artikel, Fotos, Lagerorte und
Bestandsbuchungen lokal im Katalogic-State und in JSON-Sicherungen; eine
Supabase-Synchronisierung ist dafür nicht aktiviert. Eigene Artikel- und
Lagerortkennungen lassen sich als QR- oder Code-128-Etikett drucken. USB- und
Bluetooth-Scanner funktionieren als Tastatureingabe; Kamerascans benötigen
einen Browser mit `BarcodeDetector` und eine Kameraberechtigung.

## Sammlung und Suche

Die Sammlungsübersicht bietet über die Auswahl **Sammlung auswählen** „Alle
Katalogeinträge“ sowie direkte Zugänge zu den eigenständigen Bereichen
**Geräte**, **Spiele**, **Bücher**, **Filme**, **Filamente** und **Kleinteile**. Bereits vorhandene allgemeine
Katalogeinträge bleiben in Sammlung, Suche und Sicherungen erhalten und können
weiterhin bearbeitet oder gelöscht werden.
Der allgemeine Bereich **Hinzufügen** wurde entfernt; neue Einträge werden in
den jeweiligen Verwaltungsbereichen angelegt.

Die Bestandssuche durchsucht den lokalen Bestand einschließlich Geräte, Spiele,
Bücher, Filme, Filamentrollen und Kleinteile. Barcodes können dort per Kamera (Browser mit
`BarcodeDetector` erforderlich) oder USB-/Bluetooth-Scanner eingegeben werden.
Der separate Bereich **Barcode** bleibt zum Erzeugen eigener Barcodes und zum
Öffnen einer externen Websuche verfügbar.
Die separate **Spiele**-Verwaltung gruppiert Einträge per Reiter nach Spielart
und bietet Suche, kombinierbare Filter, Sortierung sowie Kachel- und
Listenansicht. Für Video-, Brett-/Gesellschafts-, Karten- und
Tabletop-/Rollenspiele erscheinen passende Zusatzfelder; eigene Felder,
Kategorien, Spielarten und Plattformen lassen sich ergänzen. Erfasst werden
unter anderem Edition, Entwickler, Verlag, Sprache, Veröffentlichungsdatum,
Produktnummer, Zustand, Funktionsfähigkeit, Vollständigkeit, Kaufdaten,
Wertschätzung und bis zu acht verkleinerte Galeriebilder. Als Speichermedium
stehen unter anderem Disc, Modul / Cartridge, UMD, UMD Film, Speicherkarte und
Download Code zur Auswahl.
Zubehör und Erweiterungen können mit Menge, Zustand und Funktionsfähigkeit
erfasst und mehreren Spielen zugeordnet werden. Der Spielebestand ist in
JSON-Sicherungen enthalten. Die Barcode-Kamerasuche in „In meiner Sammlung
suchen“ durchsucht auch Spiele.
Für jeden Eintrag kann außerdem ein optionaler, frei eingebbarer Lagerort
gespeichert werden; er bleibt beim Bearbeiten, Suchen und Synchronisieren
erhalten.
Der Bereich **Bücher** verwaltet Ausgaben als unabhängige Datensätze mit
mehreren Autoren, Kategorien, Reihen und verknüpften Werken. Gedruckte Bücher,
E-Books, Hörbücher, Comics und Manga zeigen passende Formatdetails. ISBN-10
und ISBN-13 werden mit Prüfziffer validiert. Erfasse Lesestatus, Bewertung,
Ausleihen und Rückgabetermine, Exemplare, Regalplatz, Kaufdaten und bis zu
acht verkleinerte Cover- oder Galeriebilder. Suche, kombinierbare Filter,
Sortierung, Kachel- und Listenansicht, Duplizieren, Löschen sowie eigene
Kategorien und Genres sind im Bücherbereich verfügbar. Die Bücher werden in
der Bestandssuche samt ISBN gefunden und können von dort direkt geöffnet
werden.
Der Bereich **Filme** verwaltet physische und digitale Ausgaben als getrennte
Datensätze. Er bietet Kategorien, kombinierbare Filter, Sortierung sowie
Kachel- und Listenansicht. Für DVD, Blu-ray, 3D-Blu-ray, 4K, digitale Filme,
Streaming und VHS erscheinen passende Felder; für Serien lassen sich Staffeln,
Episoden und Episodentitel erfassen. Zustände, Wiedergabefunktion und
Vollständigkeit bleiben getrennt. Franchises, Boxsets und verwandte Einträge
lassen sich verknüpfen; Cover, Poster und weitere Bilder können pro Ausgabe
gespeichert werden. Suche, Duplizieren, Löschen, eigene Kategorien und Genres
sowie eigene Auswahlwerte sind verfügbar. Der Filmbestand ist in JSON-
Sicherungen enthalten und wird in der Bestandssuche samt EAN gefunden.
Der Bereich **Filamente** trennt gemeinsame Produktdaten von individuellen
Spulen. Restmengen lassen sich manuell oder anhand des gewogenen
Gesamtgewichts abzüglich des Spulengewichts erfassen; Verbrauch wird erst nach
Bestätigung gebucht und bleibt mit Datum und optionalem Projekt nachvollziehbar.
Material- und Farbübersichten, Restwertschätzung, Bestandswarnungen,
Feuchtigkeits- und Lagerungsangaben, eigene Materialtypen, Druckprofile,
Fotos sowie Suche, Filter und Listen-/Kachelansicht sind verfügbar. Mehrere
manuell verwaltete AMS-Einheiten (AMS 2 Pro, AMS Lite, AMS, AMS HT und
benutzerdefinierte Slot-Anzahlen) können beschriftet, Druckern zugeordnet und
mit Bestandsrollen belegt werden. Slot-Verbrauch wird nach Bestätigung von der
Rollenrestmenge abgezogen und in der Verbrauchshistorie gespeichert; eine
direkte Verbindung zur Druckerhardware besteht nicht.
Filamentdaten bleiben lokal gespeichert, sind in JSON-Sicherungen enthalten
und können über die Bestandssuche direkt geöffnet werden.
Geräte, Spiele, Bücher, Filme und Filamente behalten ihre jeweils eigenen
Formulare und Bild-Uploads. Bereits gespeicherte allgemeine Einträge und ihre
Bilder bleiben in vorhandenen Sicherungen erhalten.

## Scannen und Produkterkennung

In jedem der sechs Verwaltungsbereiche öffnet **Scannen / Produkt erkennen**
den gemeinsamen Importdialog. Barcodes können per Kamera (EAN-8, EAN-13,
UPC-A und UPC-E, sofern der Browser `BarcodeDetector` unterstützt), manuell
oder mit einem USB-/Bluetooth-Scanner als Tastatureingabe erfasst werden.
Die Kamera startet erst nach einem Klick; HTTPS oder `localhost` und eine
erteilte Kameraberechtigung sind erforderlich.

Für Barcodes fragt der enthaltene Node.js-Server UPCitemdb ab. Deren kostenlose
Trial-Schnittstelle benötigt keinen API-Schlüssel, ist laut Anbieter aber auf
100 Anfragen pro Tag und sechs Abfragen pro Minute begrenzt; Katalogic wartet
mindestens zehn Sekunden zwischen UPC-Abfragen. Sie kann bei Nichtverfügbarkeit,
Kontingentüberschreitung oder fehlendem Treffer keine Produktdaten liefern.
Für Bücher wird bei ISBN zusätzlich die öffentliche Google-Books-API genutzt;
ohne eigenen API-Schlüssel kann auch diese Quelle Anfragen begrenzen (HTTP 429).
Andere Onlinequellen werden nicht simuliert; für weitere Treffer öffnet der
Dialog eine vorbereitete Google-Suche. Die Onlinequellen können unvollständige
oder fehlerhafte Katalogdaten liefern und benötigen eine Internetverbindung.
Details und aktuelle Anbieterbedingungen: [UPCitemdb Rate Limits](https://www.upcitemdb.com/wp/docs/main/development/api-rate-limits/),
[UPCitemdb Pläne](https://www.upcitemdb.com/wp/docs/main/development/plan/),
[Google Books API](https://developers.google.com/books/docs/v1/using) und
[Google Books Nutzungsbedingungen](https://developers.google.com/books/terms).

Produkttexte lassen sich einfügen und analysieren. Bilder werden mit
Tesseract.js lokal im Browser erkannt; beim ersten OCR-Aufruf lädt die App die
Bibliothek sowie Sprachdaten (Deutsch und Englisch) von jsDelivr und
Project Naptha. Das Bild wird dabei nicht an diese Dienste hochgeladen. Ohne
Internetverbindung ist dieser erstmalige Download nicht möglich.

Erkannte Angaben werden vor der Übernahme angezeigt und bleiben bis zur
Bestätigung im jeweiligen vorhandenen Kategorieformular ungespeichert.
Duplikate werden anhand vorhandener Identifikatoren bzw. Titel gesucht.
Beim Ergänzen/Bearbeiten werden nur leere, unpersönliche Produktfelder
vorbelegt; Kaufdaten, Zustand, Standort, Notizen, Verbrauchs- und andere
Bestandsangaben werden nicht aus Onlinequellen übernommen. Einige bestehende
Datenmodelle besitzen kein eigenes Barcodefeld (zum Beispiel Geräte und
Filamentrollen); ein dort gescannter Code kann deshalb nicht als Barcode am
Eintrag gespeichert werden.

## Lokal starten

Starte den enthaltenen Node.js-Server (Node.js 18 oder neuer):

```sh
node server.js
```

Öffne anschließend `http://localhost:8000`. Service Worker und Kamera benötigen
einen sicheren Kontext; `http://localhost` wird unterstützt.

Die App-Shell wird vom Service Worker zwischengespeichert und kann nach dem
ersten erfolgreichen Laden ohne Internet geöffnet werden. Einträge, Änderungen,
Suche im eigenen Bestand und JSON-Export/-Import funktionieren lokal offline.
Externe Websuche und Supabase-Synchronisation benötigen eine Verbindung. Die
Installation als PWA ist für zuverlässigen Offline-Start empfohlen.

Über die Schaltfläche **Hell/Dunkel** oben rechts wechselst du zwischen dem
dunklen Grau-Blau-Lila-Design und der hellen Variante. Die Auswahl wird auf
diesem Gerät gespeichert.
## Export und Import

Im Bereich **Sync** kannst du **Sammlung exportieren** wählen, um eine
JSON-Sicherung einschließlich Sammlungs-ID und Einträgen herunterzuladen.
**Sicherung importieren** ersetzt nach einer Bestätigung den lokalen Bestand.
Exportiere vor dem Ersetzen eine Sicherung, wenn du die vorhandenen Daten
behalten möchtest. Die JSON-Datei enthält unverschlüsselte Eintragsdaten und
sollte vertraulich aufbewahrt werden.

**Als PDF exportieren** erzeugt eine lesbare Bestandsübersicht aller Bereiche
(nur Text, ohne Bilder; nicht importierbar). **Diagramme als Bild exportieren**
speichert eine PNG-Seite mit sieben Diagrammen. Beide Exporte werden im Browser
ohne zusätzliche Bibliotheken erstellt; die Daten verlassen das Gerät nicht. Gerät zu verbinden, importiere die Sicherungsdatei oder
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
