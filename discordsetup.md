# Internal Agent Runbook

This file is for MadeForMeAI/OpenClaw setup agents. It is not customer-facing documentation.

---

# OpenClaw Discord Setup Runbook

Purpose: give a small model/agent (for example GPT-4.1-mini) an exact, repeatable process to help a user connect their own Discord server to an OpenClaw/MadeForMeAI instance.

This is for OpenClaw instances running in a container or server where the setup agent can run `openclaw` CLI commands and guide the user through the Discord Developer Portal.

---

## Goal

Set up a Discord bot account for OpenClaw so the user's assistant can receive and send Discord messages in the user's own Discord server, channel, thread, or DM.

Successful final state:

```text
Discord │ ON │ OK │ configured
```

A deeper status check may also show bot identity, supported actions, and intent coverage, for example:

```text
Discord default
Support: chatTypes=direct,channel,thread polls reactions threads media nativeCommands
Bot: @AssistantName (...)
Intents: messageContent=enabled guildMembers=enabled presence=enabled
```

---

## Quick Agent Instructions

If the user asks to set up Discord:

1. Confirm this is for the user's own Discord server/app, not a MadeForMeAI-owned Discord server.
2. Explain that Discord requires a bot token from the Discord Developer Portal.
3. Help the user create a Discord application and bot.
4. Tell the user to enable required privileged intents.
5. Ask whether they want basic chat permissions or admin/support permissions.
6. Generate or provide a bot invite URL with the right permissions.
7. Have the user invite the bot to their server.
8. Add the bot token to OpenClaw with `openclaw channels add --channel discord --bot-token ...`.
9. Restart/reload the gateway if needed.
10. Verify with `openclaw channels list`, `openclaw channels capabilities --channel discord`, and `openclaw status --deep`.
11. Send a test message or ask the user to mention the bot in Discord.
12. If the token was pasted in chat, tell the user to rotate it after setup.

---

## Security rules for the setup agent

- Treat the Discord bot token like a password.
- Do not save the token in documentation, memory, logs, screenshots, or chat summaries.
- Prefer env-backed credentials when the instance supports them.
- If the user pastes a token in chat, use it only for the setup step and tell them to rotate it afterward.
- Never publish a real bot token, application secret, client secret, OAuth secret, or webhook URL.
- Never ask for the user's Discord password.
- Do not connect the user to a MadeForMeAI-owned Discord application unless they explicitly ask for that. The normal setup is for the user's own Discord application and server.
- The user only needs to provide a bot token, not their Discord account login.

---

## What the user needs before starting

The user needs:

1. Access to the target Discord server with permission to add apps/bots, or an admin who can approve the invite.
2. A Discord account that can use the Discord Developer Portal.
3. The ability to copy a bot token once from the Developer Portal.
4. The OpenClaw instance URL or setup assistant chat where the setup agent is running.

Optional but useful:

- The server/guild name.
- The channel where the bot should be tested.
- Whether the bot should respond in public channels, threads, or DMs.

---

## Step 1 — Create a Discord application

Tell the user:

1. Open the Discord Developer Portal:
   `https://discord.com/developers/applications`
2. Click **New Application**.
3. Name it something recognizable, for example:
   `My AI Assistant`
4. Click **Create**.

If the user already has a Discord application for this assistant, they can reuse it.

---

## Step 2 — Create or configure the bot user

Tell the user:

1. In the application, open **Bot** in the left sidebar.
2. If there is no bot yet, click **Add Bot**.
3. Set the bot username and icon if desired.
4. Under **Token**, click **Reset Token** or **View Token**.
5. Copy the bot token.

Important user-facing warning:

```text
This token is like a password for your Discord bot. Only paste it into your setup assistant if you trust this OpenClaw instance. Do not post it in public Discord channels.
```

---

## Step 3 — Enable Discord intents

In the Discord Developer Portal, tell the user to open **Bot** and scroll to **Privileged Gateway Intents**.

Recommended intents:

1. **Message Content Intent** — required for the bot to read normal message text in many servers.
2. **Server Members Intent** — useful for member lookup, role/member info, and richer support actions.
3. **Presence Intent** — optional; only needed for presence/status-related behavior.

Minimum recommended setup:

```text
Message Content Intent: ON
Server Members Intent: ON
Presence Intent: optional
```

If the bot will only receive slash commands or interactions, Message Content may be less important. For an OpenClaw chat/support assistant that reads channel messages, keep Message Content enabled.

---

## Step 4 — Invite the bot to the server

Tell the user to open **OAuth2 → URL Generator** in the Discord Developer Portal.

Under **Scopes**, select:

```text
bot
applications.commands
```

Under **Bot Permissions**, select the permissions the assistant needs.

Recommended basic permissions:

```text
View Channels
Send Messages
Send Messages in Threads
Create Public Threads
Create Private Threads
Read Message History
Add Reactions
Attach Files
Embed Links
Use External Emojis
Use Slash Commands
```

Recommended support/admin-style permissions if the user wants the assistant to manage Discord structures:

```text
Manage Messages
Manage Threads
Manage Channels
Manage Roles
Manage Events
Create Events
```

Use the smallest permission set that matches the user's goal. The setup supports both basic chat permissions and admin/support permissions. If unsure, ask which mode they want; default to basic and add admin permissions only when the user wants channel, role, event, moderation, or server-management features.

Then tell the user:

1. Copy the generated URL.
2. Open it in the browser.
3. Choose the target Discord server.
4. Approve the requested permissions.

If Discord says the user cannot add the bot, they need a server admin to approve the invite.

---

## Step 5 — Add Discord to OpenClaw

Canonical CLI command:

```bash
openclaw channels add --channel discord --bot-token <DISCORD_BOT_TOKEN>
```

For a named account:

```bash
openclaw channels add --channel discord --account default --name "Discord" --bot-token <DISCORD_BOT_TOKEN>
```

If the environment supports env-backed credentials, prefer:

```bash
openclaw channels add --channel discord --use-env
```

Expected success may look like:

```text
Discord default: configured, enabled
```

If the token is provided in a file instead of pasted directly:

```bash
openclaw channels add --channel discord --token-file /path/to/token-file
```

Do not leave token files lying around unless the instance intentionally stores secrets that way.

---

## Step 6 — Restart or reload the gateway

After adding Discord, restart or reload the gateway so the channel connects.

```bash
openclaw gateway restart
```

If the service is disabled or externally managed, check status anyway:

```bash
openclaw status --deep
```

In container-managed setups, the gateway may reconnect automatically.

---

## Step 7 — Verify the channel is configured

Run:

```bash
openclaw channels list
```

Look for:

```text
Discord default: configured, enabled
```

Then run:

```bash
openclaw channels capabilities --channel discord
```

A healthy Discord setup should show supported actions such as:

```text
send
read
react
thread-create
thread-reply
channel-info
channel-list
member-info
role-info
```

It may also show intent status:

```text
Intents: messageContent=enabled guildMembers=enabled presence=enabled
```

If an intent says `limited`, the bot may still work, but some features may not. Re-check the Developer Portal intent toggles.

---

## Step 8 — Run a deep health check

Run:

```bash
openclaw status --deep
```

Success looks like:

```text
Discord │ ON │ OK │ configured
```

If the status is not OK, inspect logs:

```bash
openclaw channels logs --channel discord --lines 200
```

Common problems are listed below.

---

## Step 9 — Test Discord from OpenClaw

First resolve or identify the target channel.

If the setup agent already knows the Discord channel ID, use it directly.

To inspect channels and IDs, use:

```bash
openclaw channels resolve --channel discord --kind group <channel-or-server-name>
```

If name resolution is unreliable, ask the user to copy the Discord channel ID:

1. Discord → **User Settings → Advanced**
2. Turn on **Developer Mode**
3. Right-click the target channel
4. Click **Copy Channel ID**

Then send a test message:

```bash
openclaw message send --channel discord --target <CHANNEL_ID> --message "Discord is connected."
```

If the message appears in Discord, outbound sending works.

---

## Step 10 — Test inbound messages from Discord

Tell the user:

1. Open the Discord server where the bot was invited.
2. Go to a channel the bot can see.
3. Mention the bot or send a message according to the instance's routing rules.

Suggested test message:

```text
@AssistantName hello, can you see this?
```

If the assistant replies, inbound Discord routing works.

If the bot sees messages but does not reply, check:

- whether the message was sent in an allowed channel
- whether the sender is approved/allowed by the instance policy
- whether the bot has Message Content Intent enabled
- whether the gateway is running
- whether another agent/channel routing rule is required

---

## Discord permission checklist

For basic chat support, the bot usually needs:

```text
View Channels
Send Messages
Read Message History
Send Messages in Threads
Add Reactions
Attach Files
Embed Links
Use Slash Commands
```

For thread support:

```text
Create Public Threads
Create Private Threads
Send Messages in Threads
Manage Threads
```

For moderation or support workflows:

```text
Manage Messages
Manage Channels
Manage Roles
View Audit Log
```

The Discord setup can support both basic and admin permission modes. Only request moderation/admin permissions if the user explicitly wants channel, role, event, moderation, or server-management features.

---

## Discord intent checklist

Recommended:

```text
Message Content Intent: ON
Server Members Intent: ON
Presence Intent: optional
```

Symptoms of missing Message Content Intent:

- bot appears online but ignores normal messages
- messages arrive without text content
- mentions work inconsistently

Symptoms of missing Server Members Intent:

- member lookup fails
- role/member info actions are limited
- user resolution is weaker

---

## Common issues

### Bot token rejected

Symptoms:

```text
invalid token
unauthorized
401
```

Fix:

1. Ask the user to reset the token in Discord Developer Portal → Bot.
2. Copy the new token exactly.
3. Run `openclaw channels add --channel discord --bot-token <NEW_TOKEN>` again.
4. Restart/reload the gateway.

Tell the user to rotate the old token if it was posted anywhere unsafe.

---

### Bot is not in the server

Symptoms:

- Discord status looks configured, but no server/channel can be reached.
- Sending to a channel ID fails with missing access or unknown channel.

Fix:

1. Re-open OAuth2 → URL Generator.
2. Select `bot` and `applications.commands`.
3. Invite the bot to the correct server.
4. Make sure the user chooses the right server during authorization.

---

### Missing permissions

Symptoms:

```text
Missing Permissions
403 Forbidden
Cannot send messages to this user/channel
```

Fix:

1. In Discord, check the bot role permissions.
2. Check channel-specific overrides.
3. Make sure the bot can view the channel and send messages.
4. For threads, make sure it can send messages in threads.

---

### Missing Message Content Intent

Symptoms:

- bot is online
- bot can send messages
- bot does not understand or respond to channel messages

Fix:

1. Discord Developer Portal → Application → Bot.
2. Enable **Message Content Intent**.
3. Save changes.
4. Restart/reload OpenClaw gateway.

---

### Bot responds in the wrong place

Fix:

1. Confirm the inbound Discord channel ID.
2. Confirm the OpenClaw routing/session target for Discord.
3. Use `openclaw channels resolve --channel discord <name-or-id>` to check target resolution.
4. Use `openclaw status` to see recent session recipients.

---

### Bot appears offline

Fix:

1. Check the gateway is running:

```bash
openclaw gateway status
```

2. Check Discord status:

```bash
openclaw status --deep
```

3. Check Discord logs:

```bash
openclaw channels logs --channel discord --lines 200
```

4. Confirm the bot token is valid.

---

### Gateway restart says service disabled

In containers, the gateway may be managed by an external supervisor. If `openclaw gateway restart` reports service disabled, check status anyway:

```bash
openclaw status --deep
```

If Discord shows `ON` and `OK`, the setup worked.

---

## What to tell the user after setup succeeds

Use a short message like:

```text
Discord is connected.

Your assistant can now receive and send Discord messages in the server where you invited the bot. Try mentioning the bot in the channel you want to use.
```

If the user pasted their token in chat, add:

```text
Since the bot token was pasted into chat during setup, rotate it in the Discord Developer Portal when you have a moment.
```

---

## Minimal GPT-4.1-mini prompt

Use this when delegating the task to a smaller agent:

```text
Set up Discord for OpenClaw. This is for the user's own Discord server and Discord application, not a MadeForMeAI-owned Discord server.

Guide the user through Discord Developer Portal:
1. Create an application.
2. Add a bot.
3. Enable Message Content Intent and Server Members Intent.
4. Use OAuth2 URL Generator with scopes: bot, applications.commands.
5. Ask whether the user wants basic chat permissions or admin/support permissions. For basic, invite the bot with: View Channels, Send Messages, Read Message History, Send Messages in Threads, Attach Files, Add Reactions, Embed Links, Use Slash Commands. For admin/support, add only the extra permissions the user wants, such as Manage Messages, Manage Threads, Manage Channels, Manage Roles, or Manage Events.
6. Ask the user for the bot token only when ready. Treat it as a password.

Then run:
openclaw channels add --channel discord --bot-token <DISCORD_BOT_TOKEN>
openclaw gateway restart
openclaw channels list
openclaw channels capabilities --channel discord
openclaw status --deep

Test outbound with:
openclaw message send --channel discord --target <CHANNEL_ID> --message "Discord is connected."

If the user pasted the token in chat, tell them to rotate it afterward.
Report success only if Discord shows configured/enabled and the test message works.
```

---

## Recommended future simplification

Best product improvement: make Setup Assistant gather the bot token through a secure secret input instead of normal chat, then automatically run the channel add and verification steps.

Possible UX:

```text
Setup Assistant: Open this Discord Developer Portal link, create your bot, then paste the token into this secure field.
```

Then the agent can run the setup without exposing the token in conversation history.
