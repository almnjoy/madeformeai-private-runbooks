# ElevenLabs Voice Setup Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)
**User interaction required:** Yes — user must provide API key and select a voice
**CLI required:** No (agent uses bash tools internally)
**Model requirements:** Works on small/slow models

---

## What this runbook does

Sets up ElevenLabs voice output for the user's OpenClaw instance. After setup, the agent can generate spoken audio replies and send them as audio messages via supported channels (Telegram, WhatsApp, webchat).

**Important expectation to set with user:** ElevenLabs produces audio file output — not real-time live voice conversation. The agent generates an audio reply and sends it as a voice message or attachment.

---

## Prerequisites

- User has or will create an ElevenLabs account (free or paid)
- User's OpenClaw instance is running and responding in chat
- Telegram or WhatsApp connected (most useful for voice)

---

## Step 0 — Install the ElevenLabs plugin

Before anything else, verify the plugin is installed:

```bash
openclaw plugins list
```

If `elevenlabs` is not present:

```bash
openclaw plugins install elevenlabs
```

Restart the gateway after install (see K8s restart pattern in Step 4).

---

## Step 1 — Tell the user what you need

Say:

> To set up voice replies, I need two things from you:
> 1. Your ElevenLabs API key — from elevenlabs.io → Profile → API Keys
> 2. A Voice ID — I'll help you pick one in a moment.
>
> First, go to elevenlabs.io and log in (create a free account if you don't have one). Go to your Profile page and copy your API key. Paste it here when you have it.

Wait for the API key.

---

## Step 2 — Receive and store the API key

When user pastes the key:
- Do NOT echo it back in full
- Do NOT log or quote it in your reply
- Write it immediately to OpenClaw config

**Config path:** `plugins.entries.elevenlabs.config.apiKey`

Use bash to write:

```bash
node -e "
const fs = require('fs');
const path = '/home/node/.openclaw/openclaw.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
config.plugins = config.plugins || {};
config.plugins.entries = config.plugins.entries || {};
config.plugins.entries.elevenlabs = config.plugins.entries.elevenlabs || {};
config.plugins.entries.elevenlabs.enabled = true;
config.plugins.entries.elevenlabs.config = {
  ...(config.plugins.entries.elevenlabs.config || {}),
  apiKey: 'REPLACE_WITH_API_KEY'
};
fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('API key written.');
"
```

Replace `REPLACE_WITH_API_KEY` with the actual key value.

Confirm to user:

> Got it — API key saved securely. Now let's pick your voice.

---

## Step 3 — Help user pick a voice

Say:

> Now you need a Voice ID. Here's how to get one:
>
> 1. Go to elevenlabs.io → Voice Library
> 2. Browse and preview voices (there's a play button on each)
> 3. When you find one you like, click it and copy the Voice ID — it looks like `21m00Tcm4TlvDq8ikWAM`
>
> **Important:** If you're on the free plan, you can only use voices you've added to your My Voices list. After finding a voice you like in the library, click "Add to My Voices" first.
>
> Paste the Voice ID here when ready.

Wait for the Voice ID.

**Free plan gotcha to warn about:** Many voices in the ElevenLabs library are not available on the free tier without explicitly adding them to My Voices. If voice doesn't work later, this is almost always why.

---

## Step 4 — Store the Voice ID and restart

Write the Voice ID to config:

```bash
node -e "
const fs = require('fs');
const path = '/home/node/.openclaw/openclaw.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
config.plugins.entries.elevenlabs.config.voiceId = 'REPLACE_WITH_VOICE_ID';
fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Voice ID written.');
"
```

Do not print the full API key when confirming — just confirm the Voice ID was saved.

Then restart the gateway:

```bash
openclaw gateway restart
```

**K8s restart pattern:** If `openclaw gateway restart` says "service disabled", do a full process restart:

```bash
kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true
```

Wait 15–30 seconds for K8s to bring the pod back up, then verify with `openclaw status --deep`.

---

## Step 5 — Run smoke test

Tell user:

> Let me run a quick test to make sure voice is working.

Use the agent's TTS tools or ask the agent to generate a one-sentence voice reply. Send the audio to the current chat surface.

Expected result: An audio file or voice message is returned or sent.

**If it works:** Tell user:

> Voice is set up. Your AI can now send audio replies. Just ask it to "reply with audio" or "use voice" in any message.

**If it fails:** See troubleshooting below.

---

## Correct config structure

After setup, the relevant section in openclaw.json should look like:

```json
{
  "plugins": {
    "entries": {
      "elevenlabs": {
        "enabled": true,
        "config": {
          "apiKey": "...",
          "voiceId": "21m00Tcm4TlvDq8ikWAM"
        }
      }
    }
  }
}
```

Do NOT write `elevenlabs` as a top-level key in openclaw.json — it belongs under `plugins.entries.elevenlabs.config`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No audio returned, no error | Plugin not loaded or API key not applied | Verify plugin is installed, restart gateway, recheck config |
| "Invalid voice ID" | Wrong voice ID or not added to My Voices | User needs to add voice to My Voices in ElevenLabs dashboard, re-copy ID |
| "Quota exceeded" / "credits" error | Free tier limit hit | User upgrades or waits for monthly reset |
| Agent says it worked but no file appears | Output channel doesn't support file attachments | Test in webchat first, then test on Telegram |
| Worked once then stopped | Credits ran out | User checks ElevenLabs usage dashboard |
| "Permission denied" on API key | Key missing TTS scope | User regenerates key at elevenlabs.io with TTS permissions enabled |

**Key regeneration flow:**
1. User goes to elevenlabs.io → Profile → API Keys
2. Delete old key, create new one with TTS permissions checked
3. Paste new key to Setup Assistant
4. Update config (Step 2), restart gateway, rerun smoke test

---

## What to tell user when done

> Voice is set up. Your AI can now send audio replies when you ask for them. Say something like "reply with voice" or "send this as audio" and it will generate a voice message.
>
> Note: On the free ElevenLabs plan you get a limited number of characters per month. If voice stops working, check your usage at elevenlabs.io.

---

## Minimal agent prompt (for constrained models)

> Set up ElevenLabs voice for this user. First run `openclaw plugins install elevenlabs` if not already installed. Ask for API key, store it without echoing it back to `plugins.entries.elevenlabs.config.apiKey` in openclaw.json. Ask for Voice ID, explain free-tier My Voices requirement. Write both to openclaw.json under the plugin config path. Restart gateway. Run smoke test with a one-sentence audio reply. Report pass/fail. No CLI instructions to user.
