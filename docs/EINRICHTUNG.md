# Einrichtung für den Echtbetrieb

Reihenfolge: Supabase → Vercel → Anmeldung testen → Mistral → Mail-Eingang.
Jeder Schritt funktioniert für sich; die App läuft schon nach Schritt 2, Transkription und Mail kommen dazu.

> **Schlüssel gehören nie in den Chat, in Code oder ins Repository** – nur in die Umgebungsvariablen bei Vercel (und lokal in `.env.local`, die Git ignoriert).

---

## 1 · Supabase (Datenbank, Anmeldung, Dateien) – ca. 15 Min.

1. **Neues Projekt** auf supabase.com anlegen
   - Name: `cofunction-wissen`
   - Region: **Central EU (Frankfurt)**
   - Datenbank-Passwort sicher ablegen (Passwortmanager)
2. **Schema einspielen:** SQL Editor → *New query* → Inhalt von `supabase/migrations/0001_grundschema.sql` und `supabase/migrations/0002_bereich_verknuepfungen.sql` nacheinander einfügen → jeweils *Run*.
3. **Anmeldung einstellen:** Authentication →
   - *Sign In / Providers* → **Email** aktiv, **„Allow new users to sign up“ ausschalten** (nur Eingeladene).
   - *URL Configuration* → Site URL = deine Vercel-Adresse (kommt in Schritt 2, z. B. `https://cofunction-connect.vercel.app`); unter *Redirect URLs* zusätzlich `https://<deine-adresse>/auth/callback` und `http://localhost:3000/auth/callback`.
   - *Emails → Templates → Magic Link*: den Code in die Mail aufnehmen, z. B.
     ```html
     <h2>Anmeldung CoFunction Wissen</h2>
     <p>Dein Code: <strong style="font-size:22px;letter-spacing:4px">{{ .Token }}</strong></p>
     <p>Oder direkt: <a href="{{ .ConfirmationURL }}">Anmelden</a></p>
     ```
     Der Code ist wichtig für die installierte Handy-App: Links aus Mails öffnen dort den normalen Browser statt der App.
4. **Dich selbst einladen:** Authentication → Users → *Invite user* → deine Adresse. Die **erste Person wird automatisch Admin.**
   Den Namen kannst du danach in Table Editor → `profile` anpassen (z. B. „Olivia B.“, Kürzel „OB“).
5. **Startdaten:** nach deiner ersten Anmeldung (Schritt 3) im SQL Editor `supabase/startdaten.sql` ausführen – legt die fünf Leistungsfelder als Areas, Ressourcen, Archiv und ein erstes Regelwerk an.
6. **Schlüssel notieren:** Project Settings → API
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key → `SUPABASE_SECRET_KEY` (**geheim**)

**Datenschutz:** Im Supabase-Dashboard unter *Organization → Legal Documents* den Auftragsverarbeitungsvertrag (DPA) abschließen.

---

## 2 · Vercel (die App im Netz) – ca. 10 Min.

1. vercel.com → *Add New → Project* → GitHub-Repository `cofunction-connect` importieren.
2. Framework wird erkannt (Next.js). Unter **Environment Variables** eintragen:

   | Name | Wert |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | aus Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | aus Supabase |
   | `SUPABASE_SECRET_KEY` | aus Supabase |
   | `NEXT_PUBLIC_MAIL_ADRESSE` | z. B. `wissen@cofunction.de` (siehe Schritt 5) |
   | `CRON_SECRET` | langes Zufallsgeheimnis* |
   | `MAIL_WEBHOOK_SECRET` | langes Zufallsgeheimnis* |

   \* erzeugen z. B. im Terminal mit `openssl rand -hex 32`
3. *Deploy*. Die Funktionen laufen in Frankfurt (`vercel.json`).
4. Die Vercel-Adresse in Supabase als Site URL und Redirect URL eintragen (Schritt 1.3).

Jede Änderung an den Umgebungsvariablen braucht ein neues Deployment (*Deployments → … → Redeploy*).

---

## 3 · Anmeldung testen

1. App öffnen → E-Mail eingeben → Code aus der Mail eintippen.
2. `supabase/startdaten.sql` ausführen (Schritt 1.5).
3. **Handy:** App im Browser öffnen → *Teilen → Zum Home-Bildschirm* (iPhone) bzw. *App installieren* (Android). Beim ersten Aufnehmen das Mikrofon erlauben.
4. Ralph einladen (Authentication → Users → Invite user).

---

## 4 · Mistral (Transkription) – ca. 5 Min.

1. console.mistral.ai → Konto anlegen (Organisation: CoFunction bzw. wie mit Ralph vereinbart) → Zahlungsmethode hinterlegen.
2. *API Keys* → neuen Schlüssel erstellen → in Vercel als `MISTRAL_API_KEY` eintragen → Redeploy.
3. In den Mistral-Einstellungen prüfen, dass API-Daten nicht für Training verwendet werden, und die Datenschutzbedingungen/DPA ablegen.
4. Aufnahmen, die vorher ohne Transkription gespeichert wurden, im Eintrag über **„Erneut verarbeiten“** transkribieren.

Kosten: ca. 0,003 $ pro Audiominute. Die Begriffe aus dem Regelwerk werden als Fachvokabular mitgeschickt – das verbessert die Erkennung von Fachbegriffen.

---

## 5 · Mail-Eingang (optional) – ca. 15 Min.

Empfohlen: **Postmark Inbound** (kostenloser Entwicklertarif mit 100 Mails/Monat, danach kostenpflichtig).

1. postmarkapp.com → Server anlegen → *Inbound Stream*.
2. **Webhook-URL** eintragen:
   `https://<deine-adresse>/api/eingang/mail?token=<MAIL_WEBHOOK_SECRET>`
3. **Adresse festlegen** – zwei Wege:
   - *Schnell:* die von Postmark vergebene Adresse (`…@inbound.postmarkapp.com`) nutzen. Plus-Zusätze funktionieren: `…+hockey@inbound.postmarkapp.com`. Diese Adresse dann als `NEXT_PUBLIC_MAIL_ADRESSE` eintragen.
   - *Schön:* eigene Adresse wie `wissen@in.cofunction.de` – dafür beim Domain-Anbieter von cofunction.de einen **MX-Eintrag** für die Subdomain `in` auf `inbound.postmarkapp.com` setzen und die Domain in Postmark als *Inbound Domain* hinterlegen. (Braucht Zugriff auf die DNS-Einstellungen der Domain.)
4. Testmail von deiner eingetragenen Adresse schicken, z. B. an `wissen+hockey@…` mit Betreff `Test #hockey`. Mails von fremden Adressen werden ignoriert.

---

## 6 · Lokal entwickeln

```bash
cp .env.example .env.local   # Werte eintragen (oder leer lassen → Demo-Modus)
npm install
npm run dev
```

## Häufige Probleme

| Problem | Lösung |
|---|---|
| „Diese Adresse ist nicht eingeladen“ | Person in Supabase unter Authentication → Users einladen. |
| Kein Code in der Mail | Magic-Link-Vorlage um `{{ .Token }}` ergänzen (Schritt 1.3). |
| Aufnahme bleibt „Ohne Transkription“ | `MISTRAL_API_KEY` fehlt oder kein Redeploy danach → „Erneut verarbeiten“. |
| Eintrag hängt auf „Wird verarbeitet …“ | Nach 10 Minuten erscheint „Erneut verarbeiten“. Zusätzlich räumt der tägliche Cron-Job auf. |
| Datei zu groß | Supabase Free: 50 MB pro Datei (≈ 2 h Meeting im App-Format). Im Pro-Tarif höher einstellbar. |
| Mikrofon geht nicht | Browser-Einstellungen → Mikrofon für die Seite erlauben; auf dem iPhone Safari verwenden. |
