# Internal Agent Runbook

This file is for MadeForMeAI/OpenClaw setup agents. It is not customer-facing documentation.

---

# OpenClaw Telegram Setup Runbook

Purpose: guide the setup agent through connecting a user-created Telegram bot to their OpenClaw instance. The agent does all technical steps. The user only creates the bot in Telegram and pastes the token.

**Environment:** K8s pod, no CLI access for user, agent has elevated bash tools.

---

## Goal

The user can message their AI from Telegram like a normal chat.

Successful final state:

```text
Telegram │ ON │ OK │ configured
```

User sends a message to their Telegram bot and the AI replies.

---

## Golden rule

Do not teach the user about servers, JSON, Docker, config files, or terminals.

Good: "Open Telegram, search @BotFather, send `/newbot`."  
Bad: "Configure `channels.telegram.botToken` in openclaw.json."

---

## Step 0 — Install the Telegram plugin

Before anything else, verify the plugin is globally installed:

```bash
openclaw plugins list
```

If `telegram` is not in the output or shows as not installed, install it:

```bash
openclaw plugins install telegram
```

Expected output:

```text
Installed plugin: telegram
Restart the gateway to load plugins.
```

Then restart the gateway (see Step 4 for restart pattern). Confirm Telegram appears in the plugin list after restart before proceeding.

---

## Step 1 — User creates a Telegram bot

Say to the user:

> Here's what to do:
>
> 1. Open Telegram.
> 2. Tap the search bar and search for **BotFather**.
> 3. Open the account whose username is exactly **@BotFather**.
> 4. Send: `/newbot`
> 5. BotFather asks for a name — something friendly like `My AI Assistant`.
> 6. BotFather asks for a username — must be unique and end in `bot`, like `yourname_ai_helper_bot`.
> 7. BotFather gives you a long token. Copy the whole token and paste it here.
>
> The token is like a password. Only paste it in this private setup chat.

Wait for the token. Do not continue until the user provides it.

---

## How to recognize a valid token

A Telegram bot token looks like:

```text
1234567890:AAExampleLongMixedLettersAndNumbers
```

- Numbers at the start
- One colon `:`
- Long alphanumeric string after the colon

If the user pastes something that doesn't match this pattern, redirect:

> That doesn't look like the bot token yet. In the BotFather chat, look for the message that says "Use this token to access the HTTP API." Copy the long line under that and paste it here.

---

## Step 2 — Write Telegram config to openclaw.json

After receiving the token, do NOT echo it back. Write it directly to config.

Use bash to merge Telegram config into openclaw.json:

```bash
node -e "
const fs = require('fs');
const path = '/home/node/.openclaw/openclaw.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
config.channels = config.channels || {};
config.channels.telegram = {
  ...(config.channels.telegram || {}),
  enabled: true,
  botToken: 'REPLACE_WITH_TOKEN',
  dmPolicy: 'pairing',
  groupPolicy: 'allowlist'
};
config.plugins = config.plugins || {};
config.plugins.entries = config.plugins.entries || {};
config.plugins.entries.telegram = { enabled: true };
fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Config written.');
"
```

Replace `REPLACE_WITH_TOKEN` with the actual token value.

Do not print the token in any output or confirmation message.

Tell the user:

> Got it — I'm connecting Telegram now. I won't repeat the token back because it works like a password.

---

## Step 3 — Verify config was written correctly

Check the Telegram section is present (without printing the token):

```bash
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('/home/node/.openclaw/openclaw.json', 'utf8'));
const t = config.channels && config.channels.telegram;
console.log('enabled:', t && t.enabled);
console.log('botToken set:', !!(t && t.botToken));
console.log('dmPolicy:', t && t.dmPolicy);
"
```

Expected:

```text
enabled: true
botToken set: true
dmPolicy: pairing
```

---

## Step 4 — Restart the gateway

After writing config, restart the gateway so Telegram loads:

```bash
openclaw gateway restart
```

**K8s note:** In the containerized K8s environment, `openclaw gateway restart` may report "service disabled" because the process is managed externally. This is expected. Check status anyway:

```bash
openclaw status --deep
```

If status doesn't show Telegram yet and the gateway CLI says service disabled, do a full process restart:

```bash
kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true
```

Kubernetes will automatically restart the pod. Wait 15–30 seconds, then check:

```bash
openclaw status --deep
```

---

## Step 5 — Verify Telegram is configured

```bash
openclaw status --deep
```

Look for:

```text
Telegram │ ON │ OK │ configured
```

Also check plugin count in the startup log — Telegram should now appear in the "N plugins" line.

If Telegram shows errors, check that the bot token is valid by looking at gateway logs:

```bash
openclaw logs --lines 50
```

Common error: "Unauthorized" — means the token is invalid. Ask user to go back to BotFather, use `/mybots`, and reset the token.

---

## Step 6 — User sends first message to the bot

Tell the user:

> Open Telegram and search for the bot username you created.
>
> Tap the bot, then tap **Start** — or just send:
>
> `hello`

Wait for the pairing request to appear. Because `dmPolicy` is set to `pairing`, the bot will reply to the user with a pairing code like `ABC123XY`.

The user will see something like:

> OpenClaw: pairing required. Your code: ABC123XY. Ask the bot owner to approve it.

---

## Step 7 — Approve the Telegram pairing request

List pending pairing requests:

```bash
openclaw pairing list telegram
```

You should see the user's Telegram number and their pairing code.

Approve it:

```bash
openclaw pairing approve telegram <CODE>
```

Replace `<CODE>` with the code shown in the pairing list.

Tell the user:

> I see your Telegram message. I'm approving your chat so your AI can reply there.

---

## Step 8 — Verify Telegram replies

Ask user:

> Send this to your Telegram bot:
>
> `Can you hear me?`

Expected: The AI replies inside Telegram.

Final message to user:

> Telegram is connected. You can now message your AI from Telegram like a normal chat.

---

## Telegram config reference

Minimal working config:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "TOKEN_HERE",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist"
    }
  }
}
```

`dmPolicy` options:
- `pairing` (default, recommended) — unknown senders get a pairing code, owner approves
- `allowlist` — only numbers in `allowFrom` can message the bot
- `open` — anyone can message (not recommended for personal bots)

---

## Troubleshooting

### BotFather doesn't respond

> Make sure you're messaging @BotFather, not your new bot. Send `/start`, then `/newbot` again.

### Bot username taken

> That username is already taken. Try adding your initials or numbers before `bot`. Example: `jamie_ai_247_bot`

### User pasted bot link instead of token

> That looks like the bot link, not the token. In the BotFather chat, look for the long line with numbers, a colon, then letters and numbers. Copy that whole line.

### Telegram shows error after restart

Check logs for "Unauthorized" — invalid token. Reset the token in BotFather:

1. User goes to BotFather → `/mybots` → selects their bot → API Token → Generate New Token
2. User pastes new token to setup chat
3. Rewrite config with new token, restart gateway

### No pairing request appears

> I don't see your Telegram message yet. Please open the bot you created in Telegram and send `hello`.

If still nothing: confirm the gateway is running and Telegram shows `OK` in status. Also confirm the user is messaging the correct bot (the one they just created, not BotFather).

### User wants to reset the approved sender list

Pairing approvals are stored in:

```text
~/.openclaw/credentials/telegram-default-allowFrom.json
```

To remove a sender, edit the file and remove their entry, then restart the gateway.

---

## Group chat setup

Do not set up group access automatically.

If user asks for the AI in a Telegram group:

> Do you want the AI to reply only when mentioned, or reply to every message?

Recommended answer: mention-only (`requireMention: true` in group config).

Safe group defaults:
- Require mention
- Do not allow all groups by default
- Do not allow all senders by default

---

## Success checklist

Setup is complete only when ALL are true:

- Plugin is globally installed and appears in openclaw status
- Telegram config is written with valid bot token
- Gateway is running and Telegram shows `ON │ OK`
- User sent a first message to the bot
- Pairing request was approved
- AI replied inside Telegram

If any item is missing, do not say setup is complete.
