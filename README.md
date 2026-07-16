# RK A&#9733; Signals

The notification half of the RK A&#9733; setup tool. It receives an alert from
TradingView, sends you an **email**, pops a **desktop notification**, and shows a
live **dashboard** with the setup checklist.

```
TradingView alert  ->  /api/webhook  ->  email (Resend)
                                     ->  saved to KV
                                     ->  dashboard (desktop notification)
```

You deploy this once to Vercel. After that, every time the Pine indicator fires,
you get pinged.

---

## What you need (all free to start)

- A **GitHub** account (to hold the code) — or deploy straight from your machine.
- A **Vercel** account (you already have one).
- A **Resend** account (free — for the emails).
- **TradingView Essential** (for the webhook to fire — the £14.95 plan).

---

## Deploy — step by step

### 1. Get the code onto Vercel
Easiest path: create a new GitHub repo, drop these files in, push. Then in Vercel:
**Add New… → Project → Import** that repo. (Or, from this folder on your machine:
`npx vercel` and follow the prompts.)

Don't deploy yet — set the env vars first (next step), or redeploy after.

### 2. Add the KV store (for the dashboard)
In your Vercel project: **Storage → Create Database → KV** (Upstash Redis) → connect
it to the project. Vercel injects the `KV_*` variables automatically. Nothing to copy.
*(Skip this and email still works — you just won't get the live dashboard.)*

### 3. Get a Resend key
At resend.com: **API Keys → Create**. Copy the `re_...` key.
To start, you can send *to your own account email* using the default sender, so no
domain setup needed. (Add your own domain later for a custom "from" address.)

### 4. Set environment variables
Vercel project → **Settings → Environment Variables**. Add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | your `re_...` key |
| `ALERT_EMAIL` | the email you want alerts sent to |
| `WEBHOOK_TOKEN` | any long random string (make one up) |

### 5. Deploy
Hit **Deploy**. You'll get a URL like `https://rk-alerts-xxxx.vercel.app`.
Open it — you should see the dashboard saying **"No signal yet."** Click
**Turn on desktop notifications** and allow.

### 6. Test the pipe before touching TradingView
Send a fake signal from your terminal (swap in your URL + token):

```bash
curl -X POST "https://YOUR-APP.vercel.app/api/webhook?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grade":"A","session":"NY_AM","direction":"LONG","symbol":"NQ1!","strongPair":"NQ1!","sweptLevel":"London low","sweptPrice":24280,"steps":{"sweep":true,"pdaTap":true,"extSMT":true}}'
```

Within ~4 seconds the dashboard should light up green **LONG NQ1!**, you should get a
desktop notification, and an email should land. If all three happen, the pipe works.

### 7. Connect TradingView
On your NQ1! chart with the RK indicator loaded:
1. Click **Alert** (top toolbar).
2. Condition: **RK A&#9733; — Phase 1**.
3. Trigger: **Once Per Bar Close**.
4. Open **Notifications** tab in the alert dialog → tick **Webhook URL** → paste:
   `https://YOUR-APP.vercel.app/api/webhook?token=YOUR_TOKEN`
5. Make sure **2FA is enabled** on your TradingView account (required for webhooks).
6. Create.

Done. Now a real RK signal flows all the way to your inbox and desktop.

---

## Notes

- **Desktop notifications** only pop while the dashboard tab is open. Since you're at
  the screen during your sessions that's fine. Want pings with the tab closed? Add
  ntfy.sh or Pushover later — one extra POST in `lib/email.js`-style.
- The email and webhook responses are deliberately fast (<3s) so TradingView doesn't
  time the webhook out.
- Keep your webhook URL private — the token is what stops randoms from posting fake
  signals.

## Local dev

```bash
npm install
npm run dev   # http://localhost:3000
```
