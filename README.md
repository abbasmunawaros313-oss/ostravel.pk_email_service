# OS Travel Email Notification Service

Standalone backend for sending status-change and edit-access emails to visa applicants.
Kept fully separate from AutoEmail (follow-up scheduler) and Alfahlah Payment.

## Endpoints

- `POST /api/email/status-update` — sent when admin/sub-admin changes an application's status
- `POST /api/email/edit-access` — sent when admin/sub-admin enables/locks document edit access

## Local setup

```
npm install
```

Create a `.env` file (not committed) or set these in Railway's Variables tab:

```
SMTP_USER=your_smtp2go_username
SMTP_PASS=your_smtp2go_password
PORT=4000
```

Run:

```
npm start
```

## Deploy to Railway

1. Push this repo to GitHub.
2. Railway → New Project → Deploy from GitHub repo → select this repo.
3. Add `SMTP_USER` and `SMTP_PASS` in the Variables tab.
4. Railway auto-detects Node and runs `npm start`.
5. Generate a public domain under Settings → Networking if not automatic.
6. Copy that URL into the frontend's `src/Utils/emailService.js` (`EMAIL_API_BASE`).
# ostravel.pk_email
# ostravel.pk_email_service
