# Google Drive Setup Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)  
**User interaction required:** Yes — user must complete Google OAuth in their browser  
**CLI required:** No  
**Model requirements:** Works on small/slow models (GPT-4.1-nano, DeepSeek)

> **STATUS: UNVERIFIED — NOT TESTED IN PRODUCTION**
> This runbook was auto-generated and has not been validated against the current MadeForMeAI K8s environment.
> The "Gog skill" references and `openclaw connect gdrive` commands are unconfirmed.
> Before following this runbook, verify a Google Drive MCP connector is available on the user's instance.
> If commands fail or the skill doesn't exist, escalate to Dustin.

---

## What this runbook does

Connects the user's Google Drive to their OpenClaw instance via the Gog skill (Google OAuth). After setup, the agent can find, read, create, and organize files in the user's Drive.

**Important distinction:** Connecting Gmail and connecting Google Drive are two separate OAuth flows, even though both use a Google account. A user who has Gmail connected does NOT automatically have Drive connected, and vice versa.

---

## Prerequisites

- User has a Google account with Drive
- User's OpenClaw instance is running and responding in chat
- User is on a device with a browser to complete OAuth

---

## Step-by-step

### Step 1 — Set expectations

Tell user:
> "I'm going to connect your Google Drive. You'll click a link, sign in with Google, and grant permission to access your files. It takes about 2 minutes.
>
> After setup, I can find files for you, read documents, create new ones, and help you stay organized. I'll always confirm before changing or moving anything."

### Step 2 — Initiate the Gog skill OAuth flow

Trigger the Google Drive connector via the Gog skill:

```
openclaw connect gdrive
```

Or via the Gog skill in the agent tool interface — invoke the Google Drive connection flow. This generates a Google OAuth authorization URL.

Present the URL to user:
> "Click this link to connect Google Drive:
>
> [OAuth URL]
>
> Sign in with your Google account, then approve the permissions for Drive access. Come back when done."

**Critical:** The user must approve the Drive-specific scopes on Google's consent screen. If they dismiss any permission, file access will fail silently. Tell them: "On Google's screen, make sure to click 'Allow' on everything — especially any that mention files or Drive."

### Step 3 — Wait for user to complete OAuth

Wait for callback confirmation or user to say they've completed it. Do not test yet.

### Step 4 — Open a fresh chat session before testing

This is important. Stale session state from before the OAuth flow can cause the connector to appear unavailable even though it's connected. Tell user:
> "One quick thing — close this chat and open a new conversation with me. Then come back and say 'test Google Drive' and I'll verify everything is working."

After user returns in a new session, proceed to Step 5.

### Step 5 — Verify the connected account

Confirm which Google account is authorized. Tell user:
> "Drive is connected as: [account email]. Is this the right account?"

If wrong account: Disconnect and redo OAuth with correct account.

### Step 6 — Run a canary query

Run a minimal file listing:
> "List the 3 most recently modified files in the user's Google Drive. Return filename and last modified date only."

Expected: A list of 3 real file names from the user's Drive.

Show the result to the user and ask: "Do these look like your files?"

**If yes:** Drive is working. Proceed to Step 7.  
**If empty list or error:** See troubleshooting below.

### Step 7 — Tell user what's now possible

> "Google Drive is connected. Here's what I can do now:
>
> - Find files by name or description ('find my Q1 budget doc')
> - Read the contents of Google Docs
> - Create new Google Docs for you
> - Summarize or answer questions based on your documents
>
> Try asking: 'What files have I edited recently?' or 'Find my notes from last week.'"

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Canary returns empty list | Drive is empty, or scope didn't include file listing | Check user actually has files in Drive. If yes, reconnect with correct scopes |
| "File not found" for specific file | File is in Shared Drive, not My Drive | Clarify with user: is the file in 'Shared with me' or 'My Drive'? Shared Drive may need separate scope |
| Connector shows connected but canary fails | Stale session | Open fresh chat session and retest (Step 4) |
| Wrong account connected | User was signed into wrong Google account | Disconnect, sign out of all Google accounts in browser, redo OAuth |
| "Insufficient permission" error | Drive scopes were not fully approved | Disconnect, redo OAuth — user must click Allow on all permissions on Google's consent screen |
| Google Workspace org blocks access | Admin policy blocks third-party app access | User needs to contact their Google Workspace admin, or use a personal Google account |
| Works in dashboard chat, fails in other channels | Session/surface mismatch | Drive connector is session-aware — test in same surface as intended use |

**Reconnect flow:**
1. Run `openclaw disconnect gdrive`
2. Ask user to sign out of Google in their browser and close all Google tabs
3. Redo from Step 2 with clean browser state, ensuring all consent screens are approved

---

## Notes on scope

The Drive OAuth grants the agent access to:
- List and search files in My Drive
- Read file contents (Docs, Sheets, text files, PDFs)
- Create and edit Google Docs

It does NOT automatically include Shared Drives or files shared with the user unless the scope was expanded. If user needs access to Shared Drive files, flag this as a separate setup step.

---

## Minimal agent prompt (for constrained models)

> Connect Google Drive for this user using the Gog skill OAuth flow. Generate OAuth URL, present it clearly, wait for user to complete it. Then ask user to start a fresh chat session before testing. Verify connected account. Run canary: list 3 most recently modified files. Show results to user and confirm they look correct. Tell user what Drive can now do. No CLI instructions to user. Confirm before any file changes.
