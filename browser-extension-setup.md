# Browser Extension Setup Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)
**User interaction required:** Yes — user must install extension and connect it to their gateway
**CLI required:** No
**Model requirements:** Works on small/slow models

---

## What this runbook does

Configures the OpenClaw browser extension to connect to the user's MadeForMeAI instance. After setup, the agent can control the user's Chrome browser — navigate pages, fill forms, read page content, take screenshots.

**Important capability note:** This gives the agent the ability to interact with websites the user is logged into. Always confirm the user understands what they're enabling.

---

## MadeForMeAI auth model — read this first

MadeForMeAI instances use **Authentik ForwardAuth** (trusted-proxy mode). There is no standalone gateway token.

The browser extension connects to the user's gateway at:

```
https://username.madeformeai.com
```

Authentication goes through the user's active Authentik session (their browser is already signed in). The extension does not need a separate token — it uses the user's browser session cookie automatically when connecting from the same browser.

**What this means for setup:**
- No token to copy or paste
- The user just needs to be logged into their MadeForMeAI account in Chrome
- The extension URL is simply `https://username.madeformeai.com`

---

## Prerequisites

- User has Chrome or Chromium browser
- User's OpenClaw instance is running and responding in webchat
- User is signed into their MadeForMeAI account in Chrome

---

## Step 1 — Set expectations

Tell user:

> The browser extension lets me control your Chrome browser — I can navigate websites, fill out forms, read pages, and take screenshots while you watch. You're always in control and can stop me at any time.
>
> To set this up, you'll need to:
> 1. Install a small Chrome extension
> 2. Point it at your AI's URL — no separate password needed
>
> It takes about 5 minutes.

---

## Step 2 — Extension installation

Direct user to install the OpenClaw browser extension from the Chrome Web Store.

Tell user:

> Go to the Chrome Web Store and search for "OpenClaw" to install the extension. Or check your dashboard — there may be a direct install link.
>
> Once installed, you'll see the OpenClaw icon in your browser toolbar. Click "Add to Chrome" and confirm.

Wait for user to confirm the extension is installed.

---

## Step 3 — Configure the extension

The extension only needs the gateway URL — no token.

Tell user:

> Click the OpenClaw icon in your Chrome toolbar. You'll see a field for your Gateway URL.
>
> Enter: `https://username.madeformeai.com`
>
> (Replace "username" with your actual MadeForMeAI username.)
>
> Click Save or Connect. Make sure you're already signed into your MadeForMeAI account in Chrome.

---

## Step 4 — Run canary test

After user configures the extension, run the minimal connectivity test.

Tell user: "I'm going to run a quick test to confirm the connection is working."

Ask the agent to execute:

> Open a new tab, navigate to about:blank, return the page title, and confirm browser control is active. Do not do anything else.

Expected result: `about:blank` title returned, no errors.

If this passes: Extension is working.

---

## Step 5 — Confirm with a real page test (optional)

If user wants to verify with a real page:

> Navigate to google.com and return the page title only. Stop there.

Expected: "Google" returned.

Tell user: "Browser control is working. I can now help you with tasks in your browser."

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Extension can't connect at all | Wrong gateway URL or not signed in to MadeForMeAI | Verify URL is exactly `https://username.madeformeai.com` (no trailing slash) — confirm user is signed in to MadeForMeAI in Chrome |
| "Unauthorized" or 401 | Session cookie missing or expired | User signs out and back in to `username.madeformeai.com`, then retries extension connection |
| "Origin not allowed" error | Gateway allowedOrigins doesn't include the extension origin | Escalate to Dustin — requires adding `chrome-extension://[extension-id]` to allowedOrigins in openclaw.json |
| Canary passes but real tasks fail | Permission or content security issue on specific site | Some sites block automation. Test on a simple page first |
| Extension installed but icon not visible | Extension may be hidden in Chrome | Click the puzzle piece icon in Chrome toolbar to find and pin the OpenClaw extension |
| Works then stops working after a day | Authentik session expired | User signs back in to `username.madeformeai.com`, connection automatically resumes |

**"Origin not allowed" fix:**

This requires an infrastructure-level change. The `controlUi.allowedOrigins` (or equivalent) in openclaw.json must include the exact Chrome extension origin. The format is:

```
chrome-extension://[extension-id]
```

This should be pre-configured in the MadeForMeAI template. If it's missing, escalate to Dustin.

---

## Access method

The extension connects directly to `https://username.madeformeai.com` through Traefik + Authentik. This is the standard and only supported path for MadeForMeAI users.

Do not use temporary tunnel URLs (LocalTunnel, ngrok, etc.) for regular use — they expire and break the connection.

---

## What to tell user when done

> Your browser extension is connected. I can now:
>
> - Navigate to websites and read their content
> - Fill out forms for you (you'll always review before I submit)
> - Take screenshots so I can see exactly what you see
> - Help automate repetitive browser tasks
>
> Just tell me what you need help with in your browser.

---

## Minimal agent prompt (for constrained models)

> Set up the OpenClaw browser extension for this user. Guide them to install from Chrome Web Store. The gateway URL is `https://username.madeformeai.com` — no separate token is needed, the user's MadeForMeAI session handles auth. Guide them to enter the URL in the extension popup. Run canary: navigate to about:blank, confirm page title returned. Report pass/fail. No CLI instructions to user.
