# Katalogic
Eine App zum Katalogiesieren verschiedenster Dinge.

## Funktionen
- PWA (installierbar, offlinefähig) – Daten liegen lokal im Browser.
- Barcode erfassen per USB-/Bluetooth-Scanner (Eingabefeld + Enter) oder Handy-Kamera (BarcodeDetector, Chrome/Android).
- Automatische Online-Suche nach Titel, Eckdaten und Bildern (Open Library, Open Food Facts, UPCitemdb; optional Google Custom Search über `GOOGLE_API_KEY` und `GOOGLE_CX`) sowie ein Google-Link. Bilder können per Tipp übernommen werden, eigene Fotos sind möglich.
- Kategorien: Spiele, Bücher, Geräte, Zubehör, Filamente, Kleinteile, Sonstiges.
- Synchronisation über einen geheimen Schlüssel (auf dem Server wird nur dessen SHA-256 als Dateiname verwendet).

## Start
```
npm start      # http://localhost:3000 (PORT, DATA_DIR konfigurierbar)
npm test
```
Kamerazugriff und Service Worker benötigen HTTPS (oder localhost).
