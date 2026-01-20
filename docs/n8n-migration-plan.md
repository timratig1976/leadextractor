# n8n Migration Plan (LeadExtractor)

## 1) Ziel
Die bestehende App wird als **reiner n8n-Workflow** umgesetzt:
- IMAP E‑Mails abrufen
- Klassifizierung über **Cerebras**
- Protokollierung in **Google Sheets**
- Keine UI, rein automatisiert

## 2) Scope
**In Scope**
- IMAP Abruf (INBOX, UNSEEN oder seit letztem Lauf)
- Body Preview (max 500 Zeichen)
- Vollständige KI‑Antwort im Protokoll
- Cron‑basiertes Polling
- Logging in Google Sheets

**Out of Scope**
- UI/Frontend
- Multi‑User/Projektverwaltung
- Echtzeit‑Benachrichtigungen

## 3) Workflow Architektur (n8n Nodes)
1. **Cron Trigger** (alle 5 Min)
2. **IMAP Node** (UNSEEN)
3. **Function Node – Normalize**
4. **HTTP Request – Cerebras**
5. **Function Node – Parse JSON**
6. **Google Sheets – Append Row**

## 4) Datenmodell (Google Sheet)
**Sheet Name:** `protocol`

| timestamp | mailbox | from | subject | body | category | source | confidence | model | provider | raw_response |

## 5) Credentials & Secrets
- IMAP Zugangsdaten
- Cerebras API Key
- Google Sheets OAuth

## 6) Deployment / Betrieb
- n8n lokal oder Docker
- Cron Trigger aktiv
- Fehlerlogging aktivieren
- Testmail zur Validierung

## 7) Rollout Plan
1. Credentials in n8n konfigurieren
2. Workflow importieren
3. Google Sheet vorbereiten
4. Testlauf durchführen
5. Monitor & Feintuning

## 8) Risiken
- API Rate Limits
- Parsing-Fehler bei untypischen E‑Mails
- Sheets‑Quota

## 9) Success Criteria
- Neue Mails landen in Sheets innerhalb 5 Minuten
- Klassifizierung vorhanden
- Kein manueller UI‑Eingriff nötig
