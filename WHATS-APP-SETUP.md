# Internal Agent Runbook

This file is for MadeForMeAI/OpenClaw setup agents. It is not customer-facing documentation.

---

# OpenClaw WhatsApp Setup Runbook

Purpose: give a small model/agent (for example GPT-4.1-mini) an exact, repeatable process to install the WhatsApp plugin, start the QR login flow, and provide the QR code inside chat.

This is for OpenClaw instances running in a container or server where the agent can run `openclaw` CLI commands.

---

## Goal

Set up WhatsApp Web/Baileys for OpenClaw and deliver the login QR code to the user as an attached image in chat.

Successful final state:

```text
WhatsApp │ ON │ OK
WhatsApp │ LINKED │ linked
```

---

## Quick Agent Instructions

If the user asks to set up WhatsApp:

1. Get openclaw version: `openclaw --version`
2. Install matching plugin: `openclaw plugins install @openclaw/whatsapp@<VERSION> --force`
3. Warn user: "Restarting gateway, ~30 seconds — send any message to continue."
4. Kill gateway: `kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true`
5. When user sends a message, verify plugin loaded: `openclaw status --deep`
6. Capture QR via `script` (see Step 5 — direct exec won't work, TTY required)
7. Run PNG converter, attach: `MEDIA:/home/node/.openclaw/media/whatsapp-login-qr.png`
8. Tell user: WhatsApp → Settings → Linked Devices → Link a Device → scan QR.
9. Verify: `openclaw status --deep` — expect `LINKED`.

---

## Step 1 — Install WhatsApp plugin (version-matched)

Version mismatch causes `text-utility-runtime` crashes. Always match the installed openclaw version:

```bash
openclaw --version
# Use that exact version in the install command below
openclaw plugins install @openclaw/whatsapp@<VERSION> --force
```

Example if `openclaw --version` returns `1.4.2`:
```bash
openclaw plugins install @openclaw/whatsapp@1.4.2 --force
```

Expected success:

```text
Installed plugin: whatsapp
Restart the gateway to load plugins.
```

---

## Step 2 — Restart gateway

**IMPORTANT — warn the user first.** Before killing the gateway, send this message in chat:
> "Restarting the gateway now to load the WhatsApp plugin — it will go offline for ~30 seconds. Send me any message after it comes back and I'll continue with the QR code step."

Then kill and restart:

```bash
kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true
```

Wait 20–30 seconds. The gateway restarts automatically. Do NOT use `openclaw gateway restart` — in MadeForMeAI containers the gateway is managed externally and that command will error.

Verify the plugin appears:

```bash
openclaw status --deep
```

Look for:

```text
WhatsApp │ ON │ OK │ configured
```

---

## Step 3 — Start WhatsApp QR login (TTY required)

**Critical:** `openclaw channels login --channel whatsapp` requires an interactive TTY. Running it directly in exec/tool context produces no output. Agents must use the `script` capture method in Step 5. There is no `whatsapp_login` tool and no `--qr-output` flag.

Raw command (reference only — agents skip to Step 5):

```bash
openclaw channels login --channel whatsapp
```

---

## Step 4 — Best case: attach QR directly if OpenClaw provides media

If a future OpenClaw version supports `--qr-output`, attach directly:

```text
MEDIA:/path/to/whatsapp-login-qr.png
```

As of current versions, this flag does not exist. Use Step 5.

---

## Step 5 — Capture terminal QR and convert to PNG

Some OpenClaw versions print the QR as ANSI/block characters only. In that case, capture the terminal output and convert it to PNG.

Start capture:

```bash
rm -f /tmp/wa_login.typescript
script -q -f -c 'openclaw channels login --channel whatsapp' /tmp/wa_login.typescript
```

Keep that process running. In another command, wait until the QR appears and convert it:

```bash
python3 - <<'PY'
import re, zlib, struct, time
from pathlib import Path

capture = Path('/tmp/wa_login.typescript')
out = Path('/home/node/.openclaw/media/whatsapp-login-qr.png')
out.parent.mkdir(parents=True, exist_ok=True)

# Wait for QR lines to be written.
for _ in range(20):
    raw = capture.read_text(errors='ignore') if capture.exists() else ''
    lines = []
    for line in raw.splitlines():
        m = re.search('\x1b\\[47m\x1b\\[30m(.*?)\x1b\\[0m', line)
        if m:
            c = m.group(1)
            # Ignore the final border/artifact line.
            if len(c) > 20 and not set(c) <= {'▀'}:
                lines.append(c)
    if len(lines) >= 31:
        break
    time.sleep(1)

if len(lines) < 31:
    raise SystemExit(f'QR not ready or incomplete; got {len(lines)} QR lines')

# WhatsApp QR usually renders as 31 terminal rows using half-block chars.
lines = lines[:31]
w = max(map(len, lines))
lines = [l.ljust(w) for l in lines]

modules = []
for l in lines:
    top, bot = [], []
    for ch in l:
        if ch == ' ':
            top.append(0); bot.append(0)
        elif ch == '█':
            top.append(1); bot.append(1)
        elif ch == '▀':
            top.append(1); bot.append(0)
        elif ch == '▄':
            top.append(0); bot.append(1)
        else:
            top.append(0); bot.append(0)
    modules.extend([top, bot])

scale = 8
border = 32
width = w * scale + 2 * border
height = len(modules) * scale + 2 * border

rows = []
for y in range(height):
    row = bytearray([0])  # PNG filter byte
    my = (y - border) // scale
    for x in range(width):
        mx = (x - border) // scale
        black = 0 <= my < len(modules) and 0 <= mx < w and modules[my][mx]
        row += b'\x00\x00\x00' if black else b'\xff\xff\xff'
    rows.append(bytes(row))

def chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

png = (
    b'\x89PNG\r\n\x1a\n'
    + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    + chunk(b'IDAT', zlib.compress(b''.join(rows), 9))
    + chunk(b'IEND', b'')
)

out.write_bytes(png)
print(out)
PY
```

Then attach the QR in chat:

```text
MEDIA:/home/node/.openclaw/media/whatsapp-login-qr.png
```

Suggested user-facing message:

```text
Scan this QR in WhatsApp:

MEDIA:/home/node/.openclaw/media/whatsapp-login-qr.png

On your phone: WhatsApp → Settings → Linked Devices → Link a Device.
```

---

## Step 6 — User scans QR

Tell the user to do this on their phone:

1. Open WhatsApp.
2. Go to **Settings**.
3. Tap **Linked Devices**.
4. Tap **Link a Device**.
5. Scan the QR code attached in chat.

When pairing succeeds, the login command should print something like:

```text
✅ Linked! Credentials saved for future sends.
```

System logs may show:

```text
WhatsApp gateway connected as +1XXXXXXXXXX.
```

---

## Step 7 — Verify WhatsApp is linked

Run:

```bash
openclaw status --deep
```

Success looks like:

```text
Channels
WhatsApp │ ON │ OK │ configured · accounts 1/1

Health
WhatsApp │ LINKED │ linked
```

If it says `WhatsApp: not linked`, start the login command again and provide a fresh QR.

---

## Step 8 — Default DM access behavior

Unknown WhatsApp senders may receive an access message like:

```text
OpenClaw: access not configured.
Your WhatsApp phone number: +15551234567
Pairing code: ABC123XY
Ask the bot owner to approve with:
openclaw pairing approve whatsapp ABC123XY
```

To approve that sender:

```bash
openclaw pairing approve whatsapp ABC123XY
```

To view pending pairing requests:

```bash
openclaw pairing list whatsapp
```

---

## Step 9 — Unlink/remove an approved sender

Approved WhatsApp senders may be stored in:

```text
~/.openclaw/credentials/whatsapp-default-allowFrom.json
```

Example file:

```json
{
  "version": 1,
  "allowFrom": [
    "+15551234567"
  ]
}
```

To remove a sender, edit the file and remove their number:

```json
{
  "version": 1,
  "allowFrom": []
}
```

Then restart/reload the gateway:

```bash
openclaw gateway restart
```

Verify the number is gone:

```bash
grep -R "+15551234567" -n ~/.openclaw/openclaw.json ~/.openclaw/credentials/whatsapp-default-allowFrom.json 2>/dev/null || true
```

---

## Common issues

### QR expired or failed

Run login again and provide a fresh QR:

```bash
openclaw channels login --channel whatsapp
```

### QR image is incomplete

When using the `script` fallback, make sure:

- the login command is still running
- `/tmp/wa_login.typescript` contains the full QR
- the converter found at least 31 QR lines

### Gateway scope approval error

You may see:

```text
gateway closed (1008): pairing required: device is asking for more scopes than currently approved
```

This is an OpenClaw device/operator scope issue, not a WhatsApp QR issue. Check:

```bash
openclaw devices list
```

Approve only if you trust the requesting device/session.

### Gateway restart says service disabled

In containers, the gateway may be managed by an external supervisor. If `openclaw gateway restart` reports service disabled, check status anyway:

```bash
openclaw status --deep
```

If WhatsApp shows `LINKED`, the setup worked.

---

## Minimal GPT-4.1-mini prompt

Use this when delegating the task to a smaller agent:

```text
Install and pair WhatsApp for OpenClaw.

Run:
1. openclaw plugins install @openclaw/whatsapp
2. openclaw gateway restart
3. openclaw channels login --channel whatsapp

When the command prints the terminal QR, capture it as an image. If no QR image is returned, use `script -q -f -c 'openclaw channels login --channel whatsapp' /tmp/wa_login.typescript` and convert the ANSI/block QR to `/home/node/.openclaw/media/whatsapp-login-qr.png`.

Send the user:
MEDIA:/home/node/.openclaw/media/whatsapp-login-qr.png

Tell them: WhatsApp → Settings → Linked Devices → Link a Device.

After they scan, verify with:
openclaw status --deep

Report success only if WhatsApp shows LINKED.
```

---

## Recommended future simplification

Best product improvement: make the login command produce a QR media file directly.

Possible UX:

```bash
openclaw channels login --channel whatsapp --qr-output /home/node/.openclaw/media/whatsapp-login-qr.png
```

Then the agent can simply attach:

```text
MEDIA:/home/node/.openclaw/media/whatsapp-login-qr.png
```

This avoids fragile terminal QR parsing.