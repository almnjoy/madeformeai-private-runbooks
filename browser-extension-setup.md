# Browser Extension Setup Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)  
**User interaction required:** Yes — user must install extension and enter gateway URL/token  
**CLI required:** No  
**Model requirements:** Works on small/slow models

---

## What this runbook does

Configures the OpenClaw browser extension to connect to the user's remote gateway (their MadeForMeAI instance). After setup, the agent can control the user's Chrome browser — navigate pages, fill forms, read page content, take screenshots.

**Important capability note:** This gives the agent the ability to interact with websites that the user is logged into. It's powerful. Always confirm user understands what they're enabling.

---

## Prerequisites

- User has Chrome or Chromium browser
- User's OpenClaw instance is running and responding
- User's instance URL is known (e.g., `yourname.madeformeai.com`)

---

## Step-by-step

### Step 1 — Set expectations

Tell user:
> "The browser extension lets me control your Chrome browser — I can navigate websites, fill out forms, read pages, and take screenshots while you watch. You're always in control and can stop me at any time.
>
> To set this up, you'll need to:
> 1. Install a small Chrome extension
> 2. Enter your AI's URL and a security token so the extension knows who to talk to
>
> It takes about 5 minutes."

### Step 2 — Extension installation

Direct user to install the OpenClaw browser extension from the Chrome Web Store (or provide the direct link if available in the dashboard).

Tell user:
> "Go to the Chrome Web Store and search for 'OpenClaw' to install the extension. Or check your dashboard — there may be a direct install link.
>
> Once installed, you'll see the OpenClaw icon in your browser toolbar. Click 'Add to Chrome' and confirm."

Wait for user to confirm extension is installed.

### Step 3 — Get the gateway URL and token

The extension needs two things:
- **Gateway URL:** The user's OpenClaw instance URL, which is `https://yourname.madeformeai.com`
- **Gateway token:** A secret token that authenticates the extension to the gateway

To get the current gateway token, check the OpenClaw config or dashboard. The token is typically found in:
- The user's dashboard under "Extension" or "Browser Control" settings
- Or in `openclaw.json` under `gateway.token` or `browserExtension.token`

Do NOT display the full token in chat. Tell user where to find it:
> "Open your dashboard at yourname.madeformeai.com and look for a 'Browser Extension' or 'Connect Extension' section. You'll see your gateway URL and a token to copy."

### Step 4 — Configure the extension

Tell user:
> "Click the OpenClaw icon in your Chrome toolbar. You'll see two fields:
>
> 1. Gateway URL — enter: `https://yourname.madeformeai.com` (your actual URL)
> 2. Token — paste the token from your dashboard
>
> Click Save or Connect."

### Step 5 — Run canary test

After user configures the extension, run the minimal connectivity test:

Tell user: "I'm going to run a quick test to confirm the connection is working."

Ask the agent to execute:
> "Open a new tab, navigate to about:blank, return the page title, and confirm browser control is active. Do not do anything else."

Expected result: `about:blank` title returned, no errors.

If this passes: Extension is working.

### Step 6 — Confirm with a real page test (optional)

If user wants to verify with a real page:
> "Navigate to google.com and return the page title only. Stop there."

Expected: "Google" returned.

Tell user: "Browser control is working. I can now help you with tasks in your browser."

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Extension can't connect at all | Wrong gateway URL or gateway not running | Verify URL is exactly `https://yourname.madeformeai.com` (no trailing slash issues) — check gateway health |
| "Unauthorized" or 401 | Token mismatch | User needs to re-copy token from dashboard, re-enter in extension popup |
| "Origin not allowed" error | Gateway allowedOrigins doesn't include browser's URL | Check `openclaw.json` for `allowedOrigins` and add the exact URL the browser is using |
| Works once, then fails | Stale token after gateway restart | Gateway may have rotated token — re-copy from dashboard and re-enter in extension |
| Canary passes but real tasks fail | Permission or content security issue on specific site | Some sites block automation. Test on a simple page first. |
| Extension installed but icon not visible | Extension may be hidden | Click the puzzle piece icon in Chrome toolbar to find and pin the OpenClaw extension |

**Token mismatch fix:**
1. Get current token from user's dashboard (it may have changed after a restart)
2. Click extension icon in Chrome
3. Clear old token, paste new one
4. Click Save/Connect
5. Rerun canary

**"Origin not allowed" fix:**
This requires an infrastructure-level change to the gateway config. The `allowedOrigins` in `openclaw.json` must include the exact origin (scheme + host + port) that the browser is connecting from.

For MadeForMeAI instances, the browser connects from `chrome-extension://[extension-id]`. This should already be pre-configured. If not, escalate to Dustin.

---

## Access method recommendation

For reliable remote browser control, the extension connects through Tailscale or directly to the HTTPS gateway:

- **Recommended (most stable):** Extension connects to `https://yourname.madeformeai.com` directly — this is the standard path for MadeForMeAI users
- **If using Tailscale:** Extension URL should be the Tailscale IP or hostname of the gateway

Do not use temporary tunnel URLs (like LocalTunnel or ngrok) for regular use — they rotate or expire and break the connection.

---

## What to tell user when done

> "Your browser extension is connected. I can now:
>
> - Navigate to websites and read their content
> - Fill out forms for you (you'll always review before I submit)
> - Take screenshots so I can see exactly what you see
> - Help automate repetitive browser tasks
>
> Just tell me what you need help with in your browser."

---

## Minimal agent prompt (for constrained models)

> Set up the OpenClaw browser extension for this user. Guide them to install from Chrome Web Store. Get their gateway URL (yourname.madeformeai.com) and direct them to copy the token from their dashboard. Guide them to enter both in the extension popup. Run canary: navigate to about:blank, confirm page title returned. Report pass/fail. No CLI instructions to user.
