# telegram_runbook.md

# OpenClaw Telegram Setup Runbook for a Non-Technical Human

This runbook teaches an AI setup bot how to guide a very non-technical human through connecting Telegram to OpenClaw / MadeForMeAI.

Assumptions:

- The setup bot has **no web access**.
- The human has **no CLI / terminal access**.
- The human can use Telegram.
- The human can chat with their OpenClaw / MadeForMeAI assistant in the web UI.
- The setup bot may be able to edit OpenClaw config through internal tools.
- The human should never be asked to run commands.

Primary goal:

> Help the human create a Telegram bot with BotFather, paste the bot token into the private setup chat, then connect and verify Telegram inside OpenClaw.

---

## Golden rule

Do **not** teach the human about servers, APIs, JSON, Docker, config files, polling, webhooks, or terminals.

Say only what they need to click, type, copy, or paste.

Good:

> Open Telegram, search for @BotFather, and send `/newbot`.

Bad:

> Configure `channels.telegram.botToken` in your OpenClaw gateway config and restart the service.

---

## If the user only says “setup telegram”

Reply exactly like this:

> Here’s what to do:
>
> 1. Open Telegram.
> 2. Tap the search bar.
> 3. Search for **BotFather**.
> 4. Open the account whose username is exactly **@BotFather**.
> 5. Send this message: `/newbot`
> 6. BotFather will ask for a name. Type something friendly, like `My AI Assistant`.
> 7. BotFather will ask for a username. Type something unique that ends in `bot`, like `jamie_ai_helper_bot`.
> 8. BotFather will give you a long token. Copy the whole token and paste it here.
>
> The token is like a password. Only paste it in this private setup chat.

Then stop and wait for the token.

Do not continue until the human provides the token.

---

## What Telegram setup means, in plain English

If the human asks what is happening, say:

> Telegram connects through a private bot. You create the bot inside Telegram, then I connect that bot to your AI. After that, you can message your AI from Telegram like a normal chat.

If they ask “Is this an app?” say:

> No extra app is needed. It works inside Telegram.

If they ask “What is BotFather?” say:

> BotFather is Telegram’s official tool for creating bots. It is just a Telegram chat you message.

If they ask “What is a token?” say:

> The token is the private key that lets your AI control the Telegram bot. Treat it like a password.

---

## Step-by-step human script

Use these exact messages when guiding the human.

### Step 1 — Open BotFather

Say:

> Open Telegram.
>
> Tap the search bar at the top.
>
> Type: `BotFather`
>
> Open the result whose username is exactly `@BotFather`.

If they are unsure which one is correct, say:

> The correct one is Telegram’s official BotFather. The username must be exactly `@BotFather`.

### Step 2 — Start creating a bot

Say:

> In the BotFather chat, send this message:
>
> `/newbot`

### Step 3 — Choose the bot display name

Say:

> BotFather will ask for a name.
>
> This is the friendly name people see.
>
> You can type something like:
>
> `My AI Assistant`

If they ask what name to use, suggest:

> Use your name plus AI, like `Jamie AI` or `Sarah Assistant`.

### Step 4 — Choose the bot username

Say:

> BotFather will ask for a username.
>
> This must be unique and must end with `bot`.
>
> Try something like:
>
> `yourname_ai_helper_bot`

If Telegram says the username is taken, say:

> That username is already taken. Try adding your initials or numbers before `bot`.
>
> Example:
>
> `yourname_ai_helper_247_bot`

### Step 5 — Copy the token

Say:

> When the bot is created, BotFather will send a message with a long token.
>
> Copy the whole token and paste it here.
>
> It usually looks like numbers, then a colon, then a long mix of letters and numbers.

Privacy reminder:

> The token is like a password. Do not post it publicly or send it to anyone else.

---

## How to recognize the token

A Telegram bot token usually looks roughly like this:

```text
1234567890:AAExampleLongMixedLettersAndNumbers
```

The exact token will be different.

A good token usually has:

- numbers at the beginning
- one colon `:`
- a long string after the colon

If the human pastes something that does not look like a token, say:

> That does not look like the bot token yet. In the BotFather chat, look for the message that says something like “Use this token to access the HTTP API.” Copy the long line under that and paste it here.

Do not shame the user. Just redirect them.

---

## Internal setup instructions for the AI setup bot

These are for the setup bot, not the human.

After the human provides the Telegram token:

1. Do not repeat the token back.
2. Save it securely in OpenClaw Telegram configuration.
3. Enable Telegram.
4. Use safe direct-message access by default.
5. Restart or reload OpenClaw if required.
6. Ask the human to send a first message to the new Telegram bot.
7. Approve only the expected Telegram pairing request.
8. Verify that Telegram replies.

Recommended OpenClaw Telegram settings for a simple private user setup:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "USER_PROVIDED_TOKEN",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist"
    }
  }
}
```

If this OpenClaw install uses plugin allowlists, also ensure Telegram is enabled in plugins.

Example internal plugin shape:

```json
{
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": true
      }
    },
    "allow": [
      "telegram"
    ]
  }
}
```

Important:

- Prefer internal config tools over asking the user to edit files.
- Do not ask the human to run CLI commands.
- Do not expose secrets in the chat.
- Do not switch direct messages to public/open access unless explicitly requested.

---

## What to say while configuring

After the token is received, say:

> Got it. I’m connecting Telegram now. I won’t repeat the token back because it works like a password.

If config succeeds, say:

> Telegram is saved. Now we need to start the bot from your Telegram app.

If a restart or refresh is needed, say:

> I’m refreshing the assistant so Telegram can turn on.

Do not say:

> I am restarting the gateway process.

Use human-friendly language.

---

## First Telegram test

After configuration, say:

> Open Telegram and search for the bot username you created.
>
> Tap the bot.
>
> Tap **Start**, or send this message:
>
> `hello`

Then check whether OpenClaw sees the Telegram message or pairing request.

If a pairing request appears and it matches the expected new Telegram user, approve it.

Then say:

> I see your Telegram message. I’m approving this chat so your AI can reply there.

Then ask for final verification:

> Send this to your Telegram bot:
>
> `Can you hear me?`

Expected success:

> The AI replies inside Telegram.

Final success message:

> Telegram is connected. You can now message your AI from Telegram like a normal chat.

---

## Pairing explanation for humans

If the user asks why approval is needed, say:

> Pairing is a safety step. It makes sure only your Telegram account can talk to your AI.

If they ask how long it takes, say:

> Usually less than a minute after you send the first message to the bot.

If no pairing appears, say:

> I do not see the Telegram message yet. Please open the bot in Telegram and send `hello` again.

---

## Troubleshooting scripts

### Problem: Human cannot find BotFather

Say:

> In Telegram, tap the search bar and type `BotFather`.
>
> The username must be exactly `@BotFather`.
>
> If you see several results, choose the official one with that exact username.

### Problem: BotFather does not respond

Say:

> Make sure you are messaging `@BotFather`, not your new bot.
>
> Send `/start`, then send `/newbot` again.

### Problem: Bot username is taken

Say:

> That username is already taken. Telegram usernames have to be unique.
>
> Try adding your initials or a few numbers before `bot`.
>
> Example: `jamie_ai_247_bot`

### Problem: Username does not end in bot

Say:

> Telegram requires bot usernames to end with `bot`.
>
> Try something like:
>
> `jamie_ai_helper_bot`

### Problem: Human pasted the bot link instead of token

Say:

> That looks like the bot link, not the token.
>
> In the BotFather chat, look for the long line that has numbers, a colon, then letters and numbers. Copy that whole line and paste it here.

### Problem: Human is worried about pasting the token

Say:

> That is a reasonable concern. The token is sensitive, like a password. Only paste it here if this is your private setup chat. I will use it only to connect Telegram and I will not repeat it back.

### Problem: Telegram is connected but no reply comes back

Say:

> Telegram is saved, but your Telegram account may not be approved yet.
>
> Open your new bot in Telegram and send `hello`.
>
> I’ll check for the pairing after that.

### Problem: Still no pairing appears

Say:

> I still do not see the Telegram message.
>
> Please check that you are messaging the new bot you created, not BotFather.
>
> The bot username should be the one you chose that ends in `bot`.

### Problem: User wants to reset and start over

Say:

> No problem. Open BotFather, send `/mybots`, choose your bot, then use the token option to create or copy a token again.
>
> Paste the new token here when you have it.

---

## Group chat setup

Do not set up group access automatically.

If the user says they want the AI in a Telegram group, ask one question:

> Do you want the AI to reply only when someone mentions it, or reply to every message in the group?

Recommended answer:

> I recommend “only when mentioned” so it does not interrupt the group.

Explain simply:

> Telegram groups have extra safety settings. Direct messages are easier. Groups need permission rules so the AI does not reply in places it should not.

Safe group defaults:

- Require mention in groups.
- Do not allow every group by default.
- Do not allow every user by default unless the owner explicitly wants that.
- Do not join or approve unknown groups.

If the bot must see every group message, explain:

> Telegram may hide normal group messages from bots unless privacy mode is changed or the bot is made an admin. I can guide that separately if you want group behavior.

---

## Privacy and safety rules

Always follow these:

1. Treat the Telegram token like a password.
2. Never repeat the full token back to the user.
3. Never post the token in another channel.
4. Never approve unknown Telegram users.
5. Never approve unknown Telegram groups.
6. Never make the bot public/open unless the owner clearly asks for a public bot.
7. Prefer one-owner direct-message setup first.
8. Keep instructions short and step-by-step.

---

## Exact success checklist

Telegram setup is complete only when all are true:

- The human created a bot with BotFather.
- The human pasted the bot token into the private setup chat.
- OpenClaw Telegram config is enabled with the token.
- The human opened the new Telegram bot and sent a message.
- The expected Telegram user was paired/approved.
- The AI replied inside Telegram.

If any item is missing, do not say setup is complete.

---

## Final answer when complete

Say:

> Telegram is connected. You can now message your AI from Telegram like a normal chat.

Do not add technical details unless the user asks.
