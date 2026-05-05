# Internal Agent Runbook

This file is for MadeForMeAI/OpenClaw setup agents. It is not customer-facing documentation.

---

# OpenClaw Telegram Setup Runbook

Purpose: give a small model/agent (e.g. GPT-4.1-mini) an exact, repeatable process to connect a Telegram bot to the user's OpenClaw instance — with no CLI access for the user.

---

## Goal

Set up a Telegram bot for the user's OpenClaw instance so they can chat with their AI through Telegram.

Successful final state:

```text
Telegram │ ON │ OK │ configured
```

---

## Quick Agent Instructions

If the user asks to set up Telegram:

1. Explain what BotFather is (Telegram's official bot creator — just a chat).
2. Walk the user through creating a bot via @BotFather in Telegram.
3. Collect the bot token from the user.
4. Configure the token in openclaw.json via the config tool.
5. Restart the gateway.
6. Guide the user to find and message their bot in Telegram.
7. Approve the first DM pairing.
8. Verify with openclaw channels status.

---

## Step 1 — Explain BotFather to the user

Tell the user:

```
To connect Telegram, we need to create a Telegram bot. This is simpler than it sounds —
you just chat with an official Telegram account called @BotFather that creates bots for you.

Open Telegram and search for: @BotFather
Make sure the account has a blue checkmark (verified). Tap it and tap Start.
```

---

## Step 2 — Guide the user through BotFather

Tell the user to send the following to @BotFather, one message at a time:

1. `/newbot`
2. When prompted: enter a **display name** (e.g. "My AI Assistant")
3. When prompted: enter a **username** ending in `bot` (e.g. `myaiassistant_bot`)

BotFather will reply with a token that looks like:
```
1234567890:ABCdef-ghijklmnopqrstuvwxyz123456
```

Tell the user:
```
Copy that entire token — the long string starting with numbers and a colon.
Don't share it with anyone else. Paste it back here when you have it.
```

---

## Step 3 — Receive and validate the token

When the user pastes the token:

- Confirm it looks like: `digits:alphanumeric-string`
- Do NOT log it, save it in memory, or repeat it back in full
- Proceed immediately to configuration

---

## Step 4 — Write the token to openclaw config

Use the config tool to update `channels.telegram.botToken`:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "<TOKEN_FROM_USER>",
      "dmPolicy": "pairing"
    }
  }
}
```

Expected: config updated successfully.

If the config tool is unavailable, instruct the agent operator (not the user) to update openclaw.json directly.

---

## Step 5 — Restart the gateway

```bash
openclaw gateway restart
```

If the service is managed externally (e.g. in Kubernetes), check status instead:

```bash
openclaw status --deep
```

Look for:
```text
Telegram │ ON │ OK │ configured
```

---

## Step 6 — Guide the user to start their bot

Tell the user:

```
Now open Telegram and search for the username you gave your bot (e.g. @myaiassistant_bot).
Tap on it, then tap Start or send any message — even just "hello".
```

---

## Step 7 — Approve the first pairing

When the user messages the bot, a pairing request is created. Run:

```bash
openclaw pairing list telegram
```

This shows pending pairing codes. Approve the user's pairing:

```bash
openclaw pairing approve telegram <CODE>
```

Tell the user they're approved and to try sending a message.

---

## Step 8 — Verify

```bash
openclaw channels status
```

Look for Telegram showing ON and OK.

Tell the user:

```
Telegram is connected! Send your bot a message and your AI will reply.
You can use it the same way you use the browser chat — just through Telegram.
```

---

## Common issues

### getMe returned 401 / token rejected

Token is invalid or was copied incorrectly. Ask the user to go back to @BotFather, send `/mybots`, select their bot, and use **API Token** → **Regenerate** to get a fresh token. Repeat Step 3.

### Bot doesn't respond after pairing

Check:
```bash
openclaw logs --follow
```
Look for skip reasons. Confirm the gateway is running and the bot token is correct in config.

### User can't find bot in Telegram

Confirm the username they gave ends in `bot` — Telegram requires this. If the username doesn't exist, have them repeat the BotFather flow.

---

## Minimal GPT-4.1-mini prompt

Use this when delegating to a smaller agent:

```
Set up Telegram for OpenClaw. No CLI access for the user.

1. Tell the user to open Telegram and chat with @BotFather (verified checkmark).
2. Guide them: /newbot → display name → username ending in "bot".
3. Ask them to paste the token BotFather gives them. Treat it like a password.
4. Write the token to channels.telegram.botToken in openclaw config with enabled: true and dmPolicy: "pairing".
5. Restart the gateway: openclaw gateway restart
6. Tell the user to find their bot in Telegram by username and send it a message.
7. Run: openclaw pairing list telegram → openclaw pairing approve telegram <CODE>
8. Verify: openclaw channels status

Report success only when Telegram shows ON and OK and the user can send/receive messages.
```
