# Internal Agent Runbook

This file is for MadeForMeAI/OpenClaw setup agents. It is not customer-facing documentation.

---

# Job Search Agent Setup Runbook

**Trigger phrases:** "job finder", "resume agent", "job search agent", "find me jobs", "set up job hunting", "help me find work", "job notifications"

**Purpose:** Provision a dedicated Job Search Agent on the user's OpenClaw instance. This agent monitors RSS job feeds, scores postings against the user's resume and preferences, and sends notifications only about strong matches.

This runbook does NOT assume any specific job type, location, or industry. The new agent collects all preferences from the user directly during its first conversation.

---

## What the setup agent does

1. Creates the agent workspace directory on the pod.
2. Fetches all template files from the private runbooks repo.
3. Adds the agent to `openclaw.json`.
4. Restarts the gateway.
5. Tells the user to switch to the new "Job Search Agent" in the agent switcher.

The Job Search Agent then handles all onboarding (job type, location, resume upload, scoring rules, notifications, Google Sheets, and schedule) by itself on first message.

---

## Prerequisites

- OpenClaw instance is running and healthy.
- User has access to the agent switcher in the top-left of the chat UI.
- No action needed from the user before running this setup — just their request to set it up.

---

## Step 1 — Create the workspace directory

```bash
mkdir -p /home/node/.openclaw/workspace-job-agent/resumes
mkdir -p /home/node/.openclaw/workspace-job-agent/runs
mkdir -p /home/node/.openclaw/workspace-job-agent/.secrets
```

---

## Step 2 — Fetch and write template files

Fetch each file from the private runbooks repo using the token in your environment. Write each to the workspace directory.

```bash
BASE="https://raw.githubusercontent.com/almnjoy/madeformeai-private-runbooks/main/job-agent-templates"
DEST="/home/node/.openclaw/workspace-job-agent"

for FILE in IDENTITY.md SOUL.md AGENTS.md HEARTBEAT.md TOOLS.md package.json job-runner.mjs notify-digest.mjs; do
  curl -sf -H "Authorization: Bearer $RUNBOOKS_READ_GITHUB_TOKEN" \
    "$BASE/$FILE" -o "$DEST/$FILE"
  echo "Written: $FILE"
done

# Fetch avatar asset
mkdir -p "$DEST/assets"
curl -sf -H "Authorization: Bearer $RUNBOOKS_READ_GITHUB_TOKEN" \
  "$BASE/assets/Call.png" -o "$DEST/assets/Call.png"
echo "Written: assets/Call.png"
```

Verify all 9 files exist:

```bash
ls /home/node/.openclaw/workspace-job-agent/
ls /home/node/.openclaw/workspace-job-agent/assets/
```

Expected output should include all 8 template files plus `assets/Call.png` and the `resumes/`, `runs/`, and `.secrets/` directories.

---

## Step 3 — Add the agent to openclaw.json

Use Python3 to write directly to the config file on disk. Do not use `openclaw config set` for this — it does not support adding new agents.

```bash
python3 - <<'PY'
import json, os

p = os.path.expanduser('~/.openclaw/openclaw.json')
data = json.load(open(p))

new_agent = {
    "id": "job-agent",
    "name": "Job Search Agent",
    "workspace": "/home/node/.openclaw/workspace-job-agent",
    "identity": {
        "name": "Job Search Agent",
        "avatar": "assets/Call.png"
    },
    "model": {
        "primary": "openrouter/google/gemini-2.5-flash"
    },
    "thinkingDefault": "off",
    "fastModeDefault": False
}

agents_list = data.get('agents', {}).get('list', [])
# Remove any existing job-agent entry to avoid duplicates
agents_list = [a for a in agents_list if a.get('id') != 'job-agent']
agents_list.append(new_agent)
data.setdefault('agents', {})['list'] = agents_list

with open(p, 'w') as f:
    json.dump(data, f, indent=2)

print('Agent added. Verifying...')
found = next((a for a in data['agents']['list'] if a['id'] == 'job-agent'), None)
print(json.dumps(found, indent=2))
PY
```

---

## Step 4 — Validate config and restart

```bash
openclaw doctor --fix --yes
openclaw config validate
```

Config must show valid before restarting. If validation fails, check the Python output from Step 3.

Full process restart (mandatory — do not use SIGUSR1):

```bash
kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true
```

Wait 20–30 seconds for K8s to bring the process back up, then verify:

```bash
openclaw status --deep
```

---

## Step 5 — Confirm the agent is visible

Check that the new agent appears in the agents list:

```bash
openclaw agents list 2>/dev/null || python3 -c "
import json, os
data = json.load(open(os.path.expanduser('~/.openclaw/openclaw.json')))
for a in data.get('agents', {}).get('list', []):
    print(a.get('id'), '-', a.get('name'))
"
```

`job-agent` and `Job Search Agent` should appear in the output.

---

## Step 6 — Hand off to the user

Tell the user:

```
Your Job Search Agent is ready.

To open it: look for the agent switcher in the top-left of your chat window
(it shows your current agent name). Tap or click it and select "Job Search Agent".

On your first message, it will walk you through setup — job type, location,
your resume, notification preferences, and how often to run. Takes about 5 minutes.
```

Do not attempt to collect job preferences yourself in the setup agent. The Job Search Agent handles all of that.

---

## Troubleshooting

### Agent does not appear in the switcher

The agent switcher updates after a gateway restart. If the agent is not visible:

1. Confirm it's in `openclaw.json` (`agents.list`).
2. Confirm the gateway restarted cleanly (`openclaw status --deep` shows healthy).
3. Try a second full process restart.
4. Tell the user to hard-refresh the chat page.

### Template file fetch failed

If `curl` returns a non-zero exit code:

1. Verify `$RUNBOOKS_READ_GITHUB_TOKEN` is set: `echo ${#RUNBOOKS_READ_GITHUB_TOKEN}` (should be > 0, do not print the value).
2. Test with a known-good file: `curl -sf -H "Authorization: Bearer $RUNBOOKS_READ_GITHUB_TOKEN" https://raw.githubusercontent.com/almnjoy/madeformeai-private-runbooks/main/discordsetup.md | head -5`
3. If the token is missing, it may need to be patched into the pod's K8s secret. Contact the platform admin.

### Config validation fails after Step 3

Doctor or validate may reject the config if the `agents.list` entry has a bad field. Common causes:

- `fastModeDefault` should be `false` (boolean), not `"false"` (string). The Python script handles this correctly — do not manually edit.
- `avatar` path must be a relative path the gateway can resolve. `assets/Call.png` is the correct value for the job agent.
