# Tailscale Boot Persistence Fix Runbook

**Audience:** Setup Assistant (agent-facing, not user-facing)  
**User interaction required:** Minimal — may need user to re-authenticate once  
**CLI required:** No (agent-side config only)  
**Model requirements:** Works on small/slow models

---

## What this runbook does

Fixes Tailscale dropping out and requiring manual reconnection every time the user's OpenClaw container or VPC node restarts. After this fix, Tailscale should reconnect automatically on boot without user intervention.

**Context:** MadeForMeAI instances run in Docker containers on Kubernetes. Tailscale is used as a secure tunnel between the user's instance and external resources (or for the browser extension remote access path). Without persistence, Tailscale loses auth state on every container restart.

---

## Root cause

Tailscale auth state is stored in `/var/lib/tailscale/` inside the container. If this path is not on a persistent volume, it is wiped on every container restart and Tailscale must re-authenticate from scratch.

There are two separate issues that can both cause this:
1. **Auth state not persisted** — the `/var/lib/tailscale` directory is ephemeral
2. **Auto-connect not enabled** — Tailscale is installed but doesn't start automatically on boot

---

## Fix path A — Persistent state directory (most common fix)

This is handled at the infrastructure level (Dustin's deployment config), not by the agent. If a user reports Tailscale dropping on restart, escalate to Dustin with:

> "User [name/subdomain] reports Tailscale requires manual reconnection after every container restart. Likely needs `/var/lib/tailscale` mapped to a persistent PVC in the pod spec."

The fix in the pod spec is:
```yaml
volumes:
  - name: tailscale-state
    persistentVolumeClaim:
      claimName: <user-pvc>
volumeMounts:
  - name: tailscale-state
    mountPath: /var/lib/tailscale
    subPath: tailscale
```

**Agent cannot apply this fix directly** — it requires pod spec changes. Escalate.

---

## Fix path B — Tailscale auth key (userspace / re-auth without manual login)

If the container CAN write to a persistent volume but Tailscale still re-prompts on restart, the fix is to use an auth key instead of interactive login. This allows Tailscale to re-authenticate automatically using a pre-stored key.

### Step 1 — Ask user to generate a Tailscale auth key

Tell user:
> "I need a one-time setup from you. Go to your Tailscale admin console at tailscale.com/admin/settings/keys and generate an auth key with these settings:
>
> - Reusable: ON
> - Expiration: 90 days (or longer)
> - Ephemeral: OFF (important — leave this off)
>
> Copy the key and paste it here."

Wait for key. Do NOT echo it back or log it.

### Step 2 — Store and apply the auth key

Write the auth key to the OpenClaw instance environment or Tailscale config. The exact path depends on how Tailscale is invoked in this deployment. If Tailscale is started via a startup script:

```bash
tailscale up --authkey=tskey-auth-XXXX --accept-routes
```

Store the key in the instance's secrets/env and update the startup command to include `--authkey`.

### Step 3 — Enable Tailscale to auto-start

Check if Tailscale is set to start on boot in the container. If using a supervisor or init system:

```
# supervisord config or equivalent
[program:tailscaled]
command=/usr/sbin/tailscaled --state=/var/lib/tailscale
autostart=true
autorestart=true
```

If using a startup script (`entrypoint.sh` or similar), make sure `tailscaled` is started before `tailscale up`.

### Step 4 — Test persistence

Ask user to:
1. Confirm Tailscale is currently connected (they should see their device in tailscale.com/admin/machines)
2. Trigger a container restart (or wait for next natural restart)
3. After restart, check if Tailscale reconnected automatically without any action from them

Tell user:
> "After your instance restarts next time, Tailscale should reconnect automatically. You can verify by going to tailscale.com/admin/machines — your AI's machine should show as 'Connected' within about 60 seconds of startup."

---

## Escalation triggers

Escalate to Dustin if:
- The `/var/lib/tailscale` path is not on a persistent volume (infrastructure fix required)
- Tailscale auth key expired and user has lost access to Tailscale admin panel
- Tailscale is in a crash loop (`tailscaled` restarting repeatedly)
- User reports Tailscale connects but traffic doesn't route (routing issue, not auth issue)

---

## What to tell user if escalating

> "The Tailscale reconnection issue requires a configuration change on the server side. I've flagged this for Dustin to fix — it's a quick infrastructure update. In the meantime, you can manually reconnect Tailscale by [describe whatever the manual step is for this deployment]. Dustin will push the persistent fix soon."

---

## Minimal agent prompt (for constrained models)

> User reports Tailscale disconnects on container restart and requires manual reconnection. Determine if this is a missing persistent state volume (escalate to Dustin) or a missing auth key (fix by asking user for a reusable Tailscale auth key and applying it to startup config). Do not use CLI commands with the user. If infrastructure change is needed, escalate clearly.
