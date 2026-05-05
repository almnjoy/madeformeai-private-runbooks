# Setup Agent Defaults

These files are default workspace instructions for the MadeForMeAI Setup Assistant.

They are designed to be deployed into each new user instance so the Setup Assistant can configure features using the latest public docs and private runbooks.

## Files

```text
AGENTS.md
IDENTITY.md
SOUL.md
TOOLS.md
USER.md
```

No `BOOTSTRAP.md` is required.

## Runtime secret recommendation

Deploy setup agents with a read-only token for the private runbooks repo, for example:

```text
RUNBOOKS_READ_GITHUB_TOKEN
```

The token should be:
- read-only
- scoped only to the private runbooks repo
- safe to rotate
- never written into memory, docs, logs, or summaries

## Source of truth

Private runbooks repo:

```text
https://github.com/almnjoy/madeformeai-private-runbooks
```

Public docs:

```text
https://docs.madeformeai.com
```
