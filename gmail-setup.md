# Gmail Setup Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)  
**User interaction required:** Yes — user must complete Google OAuth in their browser  
**CLI required:** No  
**Model requirements:** Works on small/slow models (GPT-4.1-nano, DeepSeek)

> **STATUS: UNVERIFIED — NOT TESTED IN PRODUCTION**
> This runbook was auto-generated and has not been validated against the current MadeForMeAI K8s environment.
> The "Gog skill" references and `openclaw connect gmail` commands are unconfirmed.
> Before following this runbook, verify a Gmail/Google MCP connector is available on the user's instance.
> If commands fail or the skill doesn't exist, escalate to Dustin.

---

## What this runbook does

Connects the user's Gmail account to their OpenClaw instance via the Gog skill (Google OAuth). After setup, the agent can read emails, draft replies, and send emails on the user's behalf (with confirmation before sending).

---

## Prerequisites

- User has a Google/Gmail account
- User's OpenClaw instance is running and responding in chat
- User is on a device with a browser to complete OAuth

---

## Step-by-step

### Step 1 — Set expectations

Tell user:
> "I'm going to connect your Gmail account. This uses Google's official login — you'll click a link, sign in with Google, and grant permission. It takes about 2 minutes.
>
> After setup, I'll be able to read your emails and help you write and send replies. I'll always ask you to confirm before sending anything."

### Step 2 — Initiate the Gog skill OAuth flow

Trigger the Google/Gmail connector via the Gog skill. In the dashboard or via OpenClaw's tool interface, this is typically:

```
openclaw connect gmail
```

Or via the Gog skill in the agent tool interface — invoke the Gmail connection flow. This generates a Google OAuth authorization URL.

Present the URL to the user clearly:
> "Click this link to connect Gmail. It will open Google's sign-in page:
>
> [OAuth URL]
>
> Sign in with the Gmail account you want to use, then approve the permissions. Come back here when done — the page will say something like 'You can close this window.'"

### Step 3 — Wait for user to complete OAuth

Do not proceed until user confirms they completed the OAuth flow. Watch for the callback or a confirmation token in the tool response.

**Common issue:** User may close the browser before fully completing all Google consent screens. If this happens, the connection will appear to succeed but will fail on first use. If user comes back and says Gmail isn't working, restart from Step 2.

### Step 4 — Verify the connected account

After OAuth completes, confirm which Google account was actually connected:

Ask agent tool to return the authorized Gmail address. Tell user:
> "Gmail is connected as: [address]. Is this the right account?"

If wrong account: User needs to disconnect and redo OAuth with the correct account.

### Step 5 — Run a canary send

Send a test email to verify everything works end to end:
> "Send a plain-text test email to [user's own email address] with:
> Subject: 'AI connection test'
> Body: 'This is a test from your AI assistant.'
> Return the message ID and confirm it sent."

Expected: Message ID returned, email appears in user's Sent folder and Inbox.

Tell user to check their inbox and confirm it arrived.

**If canary succeeds:** Proceed to Step 6.  
**If canary fails:** See troubleshooting below before continuing.

### Step 6 — Tell user what's now possible

> "Gmail is set up. Here's what I can do now:
>
> - Read your recent emails and summarize them
> - Help you draft replies
> - Send emails for you (I'll always confirm the recipient and content before sending)
> - Search your inbox for specific emails
>
> Try asking: 'What are my last 5 unread emails?' or 'Help me reply to the email from [person].'"

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| OAuth URL never loads | Gateway not running or Gog skill not loaded | Check gateway status, restart if needed |
| "Connected" but canary fails | OAuth was partially completed | Disconnect Gmail, redo OAuth in one clean browser session, disable popup blockers |
| Wrong account connected | User was signed into a different Google account | Disconnect, have user sign out of all Google accounts in browser, redo OAuth |
| Canary sends but recipient never receives | Anti-spam filtering or alias issue | Check Sent folder first. If in Sent but not received, likely spam filtering on recipient side |
| Agent drafts but won't send | Confirmation loop not clearing | Explicitly confirm: "Yes, send it" in the same chat thread |
| Gmail works in dashboard but not Telegram/WhatsApp | Session/surface mismatch | Email tools are session-aware — test in the same surface where user will use them |
| "Insufficient scopes" error | User didn't grant send permission during OAuth | Disconnect and redo OAuth, make sure to approve all requested permissions on Google's screen |

**Reconnect flow:**
1. Tell user: "I'm going to disconnect and reconnect Gmail to fix this."
2. Run `openclaw disconnect gmail` (or equivalent Gog skill disconnect)
3. Ask user to close all Google tabs and sign out of Google in their browser
4. Redo from Step 2 with a clean browser state

---

## Security note

OpenClaw stores a refresh token locally in the agent's config/secrets. This token allows the agent to access Gmail on the user's behalf without re-authenticating. It is scoped only to the permissions the user approved. The user can revoke access at any time from their Google Account → Security → Third-party apps.

---

## Minimal agent prompt (for constrained models)

> Connect Gmail for this user using the Gog skill OAuth flow. Generate OAuth URL, present it clearly, wait for user to complete it. Verify which account was connected and confirm with user. Run canary: send plain-text test email to user's own address. Confirm message ID and delivery. Tell user what they can now do. No CLI instructions to user. Always confirm before sending any real emails.
