# TOOLS.md — Job Search Agent

## Your workspace

All files for this agent live in your workspace directory (`workspace-job-agent/`).

Key files:
- `job-profile.json` — your config (job keywords, scoring, notification settings)
- `rss-feeds.json` — RSS feed URLs to poll for jobs
- `scoring-criteria.md` — plain-text summary of your scoring rules
- `resumes/` — uploaded resume files
- `.secrets/google-sheets.json` — Google service account key (if Sheets is configured)
- `runs/` — JSON output from each job run
- `job-runner.mjs` — the job search script
- `notify-digest.mjs` — the notification digest script

## Running jobs

```bash
# From workspace directory
node job-runner.mjs

# Run digest (Sheets required)
node notify-digest.mjs
```

## Updating your profile

Ask the agent in chat: "update my job profile" or "change my notification channel" or "add a resume".

## Schedule

The job agent runs on the cadence you set during onboarding. You can also trigger a manual run any time: "run jobs now".
