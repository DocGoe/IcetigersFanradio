# ICE TIGERS FANRADIO - STATS TOOL

Dieses Tool ermöglicht dir das Einlesen und Visualisieren von DEL-Statistiken mithilfe einer CSV-Datei. Du kannst Teams auswählen und dir für jeden Spieler umfangreiche Statistiken anzeigen lassen. Zusätzlich ist es möglich, ein individuelles Layout der Statistiken zu erstellen, als PDF zu drucken oder als Excel zu exportieren.

## Features

1. **CSV-Import**
   - **Lokale CSV-Datei:** Du kannst eine CSV von deinem Rechner hochladen.
   - **CSV via URL:** Du kannst einen URL-Link zu einer CSV-Datei eintragen und direkt laden.

2. **Teams und Spieler**
   - Wähle dein Home- und Away-Team aus der eingelesenen CSV-Datei.
   - (De)Aktiviere Spieler, die in deiner Auswahl berücksichtigt werden sollen.

3. **Individuelles Stats-Layout**
   - Über ein **Drag & Drop**-Panel kannst du auswählen, welche Statistiken in welcher Spalte (1/2/3) auftauchen.
   - Du kannst dieses Layout speichern, sodass es nach einem Reload weiterhin verfügbar ist (Local Storage).

4. **PDF-Export** und **Excel-Export** (XLS via CSV)
   - Erstelle eine Tabelle mit allen gewünschten Spalten für beide Teams.
   - **PDF:** Per Knopfdruck wird ein Popup-Fenster geöffnet, in dem eine HTML-Tabelle zum direkten Druck bereitsteht (Querformat, pro Team eine Seite).
   - **Excel (CSV):** Die Daten werden als CSV-Datei bereitgestellt, wobei
     - Kommazahlen (z.B. 46,1538) korrekt für deutsche Excel-Umgebungen formatiert werden,
     - Sonderzeichen (z.B. Umlaute) dank UTF-8 BOM richtig dargestellt werden,
     - Prozentzeichen entfernt werden, um Fehldeutungen als Datum zu vermeiden.

5. **Local Storage**
   - Deine hochgeladene CSV und das gewählte Layout werden im Local Storage gespeichert, sodass du beim nächsten Laden der Seite direkt weitermachen kannst.

## Quick Start

1. **Dateien laden**: Stelle sicher, dass du alle Dateien in einem Ordner hast:
   - `index.html`
   - `style.css`
   - `main.js`
   - `default.csv` (optional, als Fallback)
   - `README.md` (diese Datei)

2. **HTML öffnen**: Öffne `index.html` in deinem Browser.

3. **CSV importieren**
   - Wechsle per Radiobutton zwischen „Lokale CSV-Datei“ und „CSV von URL“.
   - **Lokale CSV**: Datei auswählen und auf „CSV importieren“ klicken.
   - **URL CSV**: URL eintragen und auf „CSV von URL laden“ klicken.

4. **Teams laden**
   - Wähle oben dein Home- und Away-Team aus dem Dropdown und klicke auf „Teams laden“.

5. **Eingesetzte Spieler** (Edit Mode)
   - Klicke auf „Eingesetzte Spieler“, um eine Liste aller Spieler anzuzeigen und ggf. Spieler zu deaktivieren (werden nicht angezeigt/berücksichtigt).

6. **Stats Layout wählen**
   - Klicke auf „Stats Layout wählen“.  
   - Ziehe aus dem „Pool“ die gewünschten Statistiken in Spalte 1/2/3.  
   - Speichere das Layout.

7. **Export-Funktionen**
   - **PDF Export**: Klicke auf „PDF Export“.  
     - Ein Popup öffnet sich, in dem eine Tabelle für beide Teams generiert wurde (auf separaten Seiten, Querformat).  
     - Dort kannst du direkt drucken.
   - **XLS Export**: Klicke auf „XLS Export“.  
     - Eine CSV-Datei wird heruntergeladen, die für Excel optimiert ist (UTF-8 BOM, Kommazahlen für deutsche Lokalisation).

## Hilfe

- **CSV-Upload**: Du findest alle Infos in der App unter „Hilfe“.  
- **Teams laden / Spieler aktivieren**: Beschreibungen im Hilfe-Bereich.  
- **Drag & Drop**: Lege fest, welche Spalten in welcher Reihenfolge gezeigt werden.  
- **PDF** vs. **Excel**: Zwei separate Buttons, kein Bestätigungsdialog mehr.

## Bekannte Besonderheiten

- **Pop-Up-Blocker**: Beim PDF-Export wird ein neues Fenster geöffnet. Stelle sicher, dass dein Browser Pop-ups zulässt.
- **Excel und UTF-8**: Dank UTF-8 BOM und Kommazahlen werden Umlaute, Sonderzeichen und Dezimalwerte auf deutschsprachigen Systemen korrekt interpretiert. Sollte Excel dennoch meckern, prüfe bitte deine Regionseinstellungen.


---

Viel Erfolg bei der Nutzung des **ICE TIGERS FANRADIO - STATS TOOL**!
