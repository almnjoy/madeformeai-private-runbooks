# MadeForMeAI Private Runbooks

Private source of truth for MadeForMeAI/OpenClaw setup agents.

This repo is intentionally private. It contains agent-facing setup procedures and default setup-agent workspace files that should not be published on the public docs site.

## Contents

```text
WHATS-APP-SETUP.md          # WhatsApp setup (QR code pairing)
discordsetup.md             # Discord bot setup (Developer Portal flow)
telegram-setup.md           # Telegram setup (BotFather token flow)
gmail-setup.md              # Gmail setup (Gog skill OAuth)
google-drive-setup.md       # Google Drive setup (Gog skill OAuth)
elevenlabs-voice.md         # ElevenLabs voice output setup
browser-extension-setup.md  # Chrome extension + remote gateway config
tailscale-boot-fix.md       # Tailscale boot persistence fix
imessage-setup.md           # iMessage (BlueBubbles) + Android SMS
setup-agent-defaults/       # default Setup Assistant workspace files
```

### Runbook conventions

- All runbooks are **agent-facing only** — no CLI commands should be given to users
- Every runbook includes a smoke test / canary to verify success before declaring done
- Designed to work on small/slow models (GPT-4.1-nano, DeepSeek)
- Each runbook ends with a minimal agent prompt for constrained contexts

## Access model

Setup agents should use read-only access.

Recommended runtime secret:

```text
RUNBOOKS_READ_GITHUB_TOKEN
```

Maintainers/document agents may use a separate read/write token.

Never store tokens, API keys, bot tokens, passwords, or customer credentials in this repo.

## Sanitizing rule

Even though this repo is private, write runbooks as if an advanced user may eventually read them. Keep them free of real secrets, customer data, sensitive usernames, and unnecessary internal infrastructure details.
