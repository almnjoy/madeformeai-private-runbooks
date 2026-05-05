# iMessage / SMS Setup Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)  
**User interaction required:** Yes — significant prerequisites  
**CLI required:** No (but platform has hard requirements)  
**Model requirements:** Works on small/slow models

---

## What this runbook does

Connects iMessage (Apple Messages) to the user's OpenClaw instance so they can interact with their AI via iMessage on iPhone or Mac. SMS (Android) is a separate path covered at the end.

**CRITICAL LIMITATION — READ FIRST:**

iMessage requires a Mac running macOS. There is no way around this. Apple does not provide an API for iMessage. The only viable paths are:

1. **BlueBubbles** (recommended) — runs on a Mac you own, stays on 24/7, proxies iMessage to your AI
2. **imsg CLI** (legacy/fragile) — command-line tool, unreliable, not recommended for non-technical users

**Who this is NOT for:**
- Users who only have an iPhone and no Mac
- Users who have a Mac but can't leave it on 24/7 (or don't want to)
- Users on Windows or Linux (there is no iMessage on these platforms)

If the user does not have a Mac, skip to the SMS section at the bottom and explain the limitation honestly.

---

## Step 1 — Qualify the user

Ask:
> "To connect iMessage, you need a Mac computer that can stay on and connected to the internet. Do you have a Mac you'd be comfortable leaving on?"

**If no Mac:** See "No Mac path" section below.

**If yes Mac:** Continue to Step 2.

---

## Step 2 — BlueBubbles setup

BlueBubbles is an open-source app that runs on macOS and creates a server that OpenClaw can connect to. It's the most reliable iMessage path for non-technical users.

### 2a — Tell user what to install

> "We'll use BlueBubbles — a free app that lets your AI talk to iMessage. Here's what we need to do:
>
> 1. Download BlueBubbles on your Mac from bluebubbles.app
> 2. Open it and follow the setup — it will guide you through enabling some Mac settings
> 3. BlueBubbles will give you a server URL and a password — bring those back here
>
> This takes about 10-15 minutes the first time. Open bluebubbles.app on your Mac and come back when you have the server URL and password."

Wait for user.

### 2b — Collect BlueBubbles server details

User should provide:
- Server URL (e.g., `https://your-mac-name.local:1234` or an ngrok/Cloudflare tunnel URL)
- BlueBubbles server password

Do NOT echo the password back. Store immediately in OpenClaw config under the iMessage/BlueBubbles connector section.

### 2c — Network accessibility check

The BlueBubbles server URL must be reachable from the MadeForMeAI instance (running in a VPC). If user is on a home network without port forwarding:

- **Recommended path:** BlueBubbles + Cloudflare Tunnel (free) — gives a stable public HTTPS URL
- **Alternative:** BlueBubbles + ngrok — works but URL changes on restart unless paid plan

If user's URL is a local IP (`192.168.x.x` or `.local`): The VPC cannot reach it. Tell user:
> "Your BlueBubbles server needs a public URL so your AI can reach it. BlueBubbles has built-in support for Cloudflare Tunnel — it's free and takes about 5 minutes. In the BlueBubbles app, go to Settings → Server → Cloudflare Tunnel and enable it. That will give you a permanent public URL. Bring that URL back here."

### 2d — Write config and restart

Write BlueBubbles URL and password to OpenClaw config under the iMessage connector section. Restart gateway.

### 2e — Smoke test

Ask agent to:
> "Send a test iMessage to [user's own iPhone number] saying: 'iMessage test from your AI.'"

Ask user to check their iPhone for the message.

If received: iMessage is working.

### 2f — Tell user what's now possible

> "iMessage is connected. You can now text your AI from your iPhone just like texting a person. Reply back and it will respond. It works for both iMessage (blue bubble) and regular SMS (green bubble) as long as Messages is open on your Mac."

---

## No Mac path — Android SMS

For users without a Mac, or users who want SMS (Android), the option is an Android SMS gateway.

**Honest framing for user:**
> "iMessage requires a Mac and isn't possible without one. However, if you have an Android phone, we can connect regular text messages (SMS) instead. This requires an Android phone that can stay on and connected to WiFi. Would that work for you?"

The Android SMS path uses a self-hosted SMS gateway app (such as Android SMS Gateway or similar). This is more complex and less reliable than iMessage/BlueBubbles. Flag to Dustin if user wants this path — it may not be supported yet in MadeForMeAI's standard setup.

---

## Escalation triggers

Escalate to Dustin if:
- User has a Mac but BlueBubbles setup is failing for a non-obvious reason
- User wants Android SMS and it's not yet supported in their instance config
- BlueBubbles server is reachable but OpenClaw connector is returning errors (may be a connector version mismatch)

---

## Legacy imsg CLI path

Do not use this with non-technical users. The `imsg` CLI is fragile, breaks on macOS updates, and requires command-line access. Mention it only if user explicitly asks about it and flag it as "not recommended, not supported for MadeForMeAI users."

---

## Minimal agent prompt (for constrained models)

> Help user connect iMessage. First ask if they have a Mac they can leave on. If no Mac, explain the limitation honestly and offer Android SMS as alternative. If yes Mac, guide them through BlueBubbles installation at bluebubbles.app, collect server URL and password (do not echo), write to config, restart gateway, run smoke test by sending one test iMessage to user's own number. No CLI instructions to user.
