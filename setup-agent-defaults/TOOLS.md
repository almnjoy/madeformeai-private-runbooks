# TOOLS.md - Setup Environment

## Source of Truth Order

Use sources in this order:

1. **Private runbooks** for app/channel/connector setup.
2. **MadeForMeAI public docs** for customer-facing product behavior.
3. **OpenClaw official docs** for deeper OpenClaw-specific behavior.
4. Runtime status/config/tools for the current instance.

---

## Private Runbooks Repository

Private source of truth for setup procedures:

```text
https://github.com/almnjoy/madeformeai-private-runbooks
```

Important runbooks:

```text
WHATS-APP-SETUP.md
discordsetup.md
```

These runbooks are written for setup agents. Use them when configuring apps, connectors, channels, and integrations.

### Access

Production setup assistants may receive a read-only GitHub token through an environment variable, for example:

```text
RUNBOOKS_READ_GITHUB_TOKEN
```

Rules:
- Use read-only access only.
- Never print the token.
- Never save the token into files, memory, chat, screenshots, or logs.
- If the token is unavailable, fall back to cached/local runbooks if present.
- If no runbook is available, use public docs and say what source you used.

---

## Public Documentation

Primary customer-facing docs:

```text
https://docs.madeformeai.com
```

Public docs source repo:

```text
https://github.com/almnjoy/docs
```

Use public docs for:
- user-facing wording
- expected product behavior
- plan/account/troubleshooting guidance

---

## OpenClaw Official Docs

Fallback technical docs:

```text
https://docs.openclaw.ai/
```

Use when:
- MadeForMeAI docs are missing details
- a runbook references OpenClaw-specific behavior
- you need current CLI/config/channel behavior

---

## User Environment Reality

Users usually:
- do not have CLI access
- use the web UI first
- may not understand terminals, Docker, JSON, GitHub, or server terms
- want the setup to work, not a lecture

Therefore:
- do not give terminal commands to the user
- use your own tools/agent capabilities where available
- ask the user to do browser/device/account approval steps only when required

---

## Chat/Connector Target Rule

For single-chat or chat-scoped connectors, always ask which chat/channel/account the user wants to configure before finalizing setup.

Examples:
- “Which Discord server and channel should this assistant use?”
- “Which WhatsApp number/account are you linking?”
- “Should this connector respond in DMs, a specific channel, or both?”

If the runbook already defines a default and the user has only one obvious choice, use the default and mention it briefly.

---

## Permission Rule

Do not ask the user whether you may perform routine setup actions already described in the relevant runbook.

The user's setup request is enough permission to proceed with non-destructive setup steps.

Ask only when:
- the runbook requires a user choice
- the action is destructive or irreversible
- a credential/token/account approval is required
- the user must choose between basic and admin permissions
- multiple target chats/accounts are possible

---

## Goal

Bridge:

Runbooks → Tools → Working Setup
