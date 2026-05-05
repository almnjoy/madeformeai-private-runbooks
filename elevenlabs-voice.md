# ElevenLabs Voice Setup Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)  
**User interaction required:** Yes — user must provide API key and select a voice  
**CLI required:** No  
**Model requirements:** Works on small/slow models (GPT-4.1-nano, DeepSeek)

---

## What this runbook does

Sets up ElevenLabs voice output for the user's OpenClaw instance. After setup, the agent can generate spoken audio replies and send them as audio files/messages via supported channels (Telegram, WhatsApp, dashboard).

**Important expectation to set with user:** ElevenLabs produces audio file output — not real-time live voice conversation. The agent generates a `.mp3` reply and sends it as an attachment or voice message.

---

## Prerequisites

- User has or will create an ElevenLabs account (free or paid)
- User's OpenClaw instance is running and responding in chat
- Telegram or WhatsApp connected (optional but most useful for voice)

---

## Step-by-step

### Step 1 — Tell the user what you need

Say:
> "To set up voice replies, I need two things from you:
> 1. Your ElevenLabs API key (from elevenlabs.io → Profile → API Keys)
> 2. A Voice ID — I'll help you pick one in a moment.
> 
> First, go to elevenlabs.io and log in (create a free account if you don't have one). Then go to your Profile page and copy your API key. Paste it here when you have it."

Wait for the API key.

### Step 2 — Receive and store the API key

When user pastes the key:
- Do NOT echo it back in full
- Do NOT log it or quote it in your reply
- Write it immediately to the OpenClaw config as `ELEVENLABS_API_KEY`

In OpenClaw config, this goes under the agent environment or tools section. The exact field depends on which ElevenLabs integration is active (built-in tool vs Gog skill). Check the current `openclaw.json` for an `elevenlabs` section. If present, set:

```json
"elevenlabs": {
  "apiKey": "<value from user>",
  "voiceId": ""
}
```

If there is no `elevenlabs` section, add it to the tools/integrations block.

Confirm to user: "Got it — API key saved securely. Now let's pick your voice."

### Step 3 — Help user pick a voice

Say:
> "Now you need a Voice ID. Here's how to get one:
> 
> 1. Go to elevenlabs.io → Voice Library
> 2. Browse and preview voices (there's a play button on each)
> 3. When you find one you like, click it and copy the Voice ID — it's a string like `21m00Tcm4TlvDq8ikWAM`
> 
> **Important:** If you're on the free plan, you can only use voices in your own 'My Voices' list. After finding a voice you like in the library, click 'Add to My Voices' first.
> 
> Paste the Voice ID here when ready."

Wait for the Voice ID.

**Free plan gotcha to warn about:** Many voices in the ElevenLabs library are not available on free tier without explicitly adding them to My Voices. If user says voice doesn't work later, this is almost always why.

### Step 4 — Store the Voice ID

Write the Voice ID to config:

```json
"elevenlabs": {
  "apiKey": "<already stored>",
  "voiceId": "<value from user>"
}
```

Do not print the full API key when confirming — just confirm the Voice ID was saved.

### Step 5 — Restart the gateway

Apply config changes:
```
openclaw gateway restart
```

Wait for healthy status before proceeding.

### Step 6 — Run smoke test

Tell user:
> "Let me run a quick test to make sure voice is working."

Ask your own agent to execute:
> "Generate a one-sentence audio reply saying: 'Your voice assistant is ready.' Use ElevenLabs. Send the audio file."

Expected result: An `.mp3` audio file is returned or sent.

**If it works:** Tell user — "Voice is set up. Your AI can now send audio replies. Just ask it to 'reply with audio' or 'use voice' in any message."

**If it fails:** See troubleshooting section below.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No audio returned, no error | API key missing or not applied | Restart gateway, recheck config, run smoke test again |
| "Invalid voice ID" or similar | Wrong voice ID format, or voice not added to My Voices | User needs to add voice to My Voices in ElevenLabs dashboard, re-copy ID |
| "Quota exceeded" or "credits" error | Free tier limit hit | User needs to upgrade or wait for monthly reset |
| Agent says it did it but no file appears | Output channel doesn't support file attachments | Test in dashboard chat first, then test on Telegram |
| Worked once, then stopped | Credits ran out | User checks ElevenLabs usage dashboard |
| "Permission denied" on API key | Key doesn't have TTS scope enabled | User goes to ElevenLabs API Keys page, regenerates key with full TTS access enabled |

**Key regeneration flow (if needed):**
1. User goes to elevenlabs.io → Profile → API Keys
2. Delete old key, create new one with TTS permissions checked
3. Paste new key to Setup Assistant
4. Update config, restart gateway, rerun smoke test

---

## What to tell user when done

> "Voice is set up. Your AI will now be able to send audio replies when you ask for them. Say something like 'reply with voice' or 'send this as audio' and it will generate a voice message.
>
> Note: On the free ElevenLabs plan you get a limited number of characters per month. If voice stops working, check your ElevenLabs usage at elevenlabs.io."

---

## Minimal agent prompt (for constrained models)

> Set up ElevenLabs voice for this user. Ask for API key, store it without echoing it back. Ask for Voice ID, explain free-tier My Voices requirement. Write both to openclaw.json under elevenlabs.apiKey and elevenlabs.voiceId. Restart gateway. Run 1-sentence audio smoke test. Report pass/fail. No CLI instructions to user.
