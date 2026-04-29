# MadeForMeAI Private Runbooks

Private source of truth for MadeForMeAI/OpenClaw setup agents.

This repo is intentionally private. It contains agent-facing setup procedures and default setup-agent workspace files that should not be published on the public docs site.

## Contents

```text
WHATS-APP-SETUP.md       # internal WhatsApp setup runbook
discordsetup.md          # internal Discord setup runbook
setup-agent-defaults/    # default Setup Assistant workspace files
```

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
