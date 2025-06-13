## Workflow einer LLM-Interaktion

1. **Anbieter & Modell wählen**
   Wähle in der Sidebar Google, OpenAI oder DeepSeek und trage Deinen API-Key ein.

2. **Inhalte eingeben**
   Füge Deinen Quelltext in das Textfeld ein oder lade bis zu 5 Bilder hoch (PNG/JPG).

3. **Prompt zusammenstellen**
   Das Tool kombiniert Deine Eingabe mit Spracheinstellungen, Zielniveau und optionalen Lernzielen zu einem vollständigen Prompt.

4. **API-Aufruf**
   Je nach Provider wird der Prompt (inkl. Bilddaten) per REST-Request an das gewählte LLM geschickt.

5. **Antwort verarbeiten**
   Die Antwort wird extrahiert, deutsche Sonderzeichen bereinigt und die Token-Statistik erfasst (Input/Output).

6. **Ergebnis anzeigen & exportieren**
   Generierte Fragen oder Lernziele erscheinen im Ergebnisbereich. Über „Download“ lässt sich alles als Textdatei speichern.

---

## Haupt­funktionen

* **Multi-Provider-Support**: Google Gemini, OpenAI (GPT-4o/4.1), DeepSeek
* **Sprachwahl**: Deutsch & Englisch
* **Zielniveaus**: A2 (elementar) bis C2 (Experten)
* **Lernziele**: Automatischer „Die Lernenden können…“-Assistent
* **Themen-Explorer**: Vorschläge zu verwandten Konzepten
* **Fragetypen**:

  * Single-Choice
  * Multiple-Choice (1–3 korrekte Antworten)
  * K-Prim
  * True/False
  * Drag & Drop
  * Inline-Fill-in-the-Blank
* **Bildintegration**: Inline-Base64 (Google) oder image\_url (OpenAI/DeepSeek)
* **Token-Tracking**: Anzeige von Input-, Output- und Gesamttokens
* **Export**: Alle Ergebnisse als `.txt` herunterladen
