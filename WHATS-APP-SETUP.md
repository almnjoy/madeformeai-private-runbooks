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
3. Write both plugin AND channel config: `echo '{plugins: {entries: {whatsapp: {enabled: true}}}, channels: {whatsapp: {}}}' | openclaw config patch --stdin`
4. Warn user: "Restarting gateway, ~30 seconds — send any message to continue."
5. Kill gateway: `kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true`
6. When user sends a message, verify WhatsApp appears as UNLINKED: `openclaw status --deep`
7. Capture QR via `script` background process (see Step 5 — direct exec won't work, TTY required)
8. Run PNG converter, attach: `MEDIA:/home/node/.openclaw/media/whatsapp-login-qr.png` + tell user to refresh if they don't see it
9. Tell user: WhatsApp → Settings → Linked Devices → Link a Device → scan QR
10. Kill background capture process
11. Ask user for their WhatsApp phone number including country code
12. Write allowFrom file with that number
13. Restart gateway for clean Baileys reconnect — warn user first
14. Verify: `openclaw status --deep` — expect `LINKED`
15. Ask user to send a test WhatsApp message to confirm end-to-end

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

## Step 2 — Write config (both plugin AND channel entries required)

Both entries are required. Missing `channels.whatsapp` means WhatsApp loads as a plugin but never connects as a channel — `openclaw status --deep` will show an empty channels table.

Use `openclaw config patch` — do NOT edit openclaw.json directly. The gateway owns that file and overwrites it on restart.

```bash
echo '{plugins: {entries: {whatsapp: {enabled: true}}}, channels: {whatsapp: {}}}' | openclaw config patch --stdin
```

Expected output: `Applied 1 config update(s). Restart the gateway to apply.`

---

## Step 3 — Restart gateway

**IMPORTANT — warn the user first.** Before killing the gateway, send this message in chat:
> "Restarting the gateway now to load the WhatsApp plugin — it will go offline for ~30 seconds. Send me any message after it comes back and I'll continue with the QR code step."

Then kill:

```bash
kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true
```

Wait 20–30 seconds. The gateway restarts automatically. Do NOT use `openclaw gateway restart` — in MadeForMeAI containers the gateway is managed externally and that command will error.

When the user sends a message after the restart, verify WhatsApp appears:

```bash
openclaw status --deep
```

Look for:

```text
WhatsApp │ UNLINKED
```

WhatsApp must appear as `UNLINKED` in the channel list. If it does not appear at all, the config patch in Step 2 failed — do not proceed to QR.

---

## Step 4 — Start WhatsApp QR login (TTY required)

**Critical:** `openclaw channels login --channel whatsapp` requires an interactive TTY. Running it directly in exec/tool context produces no output. Use the `script` capture method in Step 5. There is no `whatsapp_login` tool and no `--qr-output` flag.

---

## Step 5 — Capture terminal QR and convert to PNG

Start the login in the background via `script`:

```bash
rm -f /tmp/wa_login.typescript
script -q -f -c 'openclaw channels login --channel whatsapp' /tmp/wa_login.typescript &
```

Wait 8 seconds, then run the PNG converter:

```bash
python3 - <<'PY'
import re, zlib, struct, time
from pathlib import Path

capture = Path('/tmp/wa_login.typescript')
out = Path('/home/node/.openclaw/media/whatsapp-login-qr.png')
out.parent.mkdir(parents=True, exist_ok=True)

for _ in range(20):
    raw = capture.read_text(errors='ignore') if capture.exists() else ''
    lines = []
    for line in raw.splitlines():
        m = re.search('\x1b\\[47m\x1b\\[30m(.*?)\x1b\\[0m', line)
        if m:
            c = m.group(1)
            if len(c) > 20 and not set(c) <= {'▀'}:
                lines.append(c)
    if len(lines) >= 31:
        break
    time.sleep(1)

if len(lines) < 31:
    raise SystemExit(f'QR not ready — got {len(lines)} lines. Wait and retry.')

lines = lines[:31]
w = max(map(len, lines))
lines = [l.ljust(w) for l in lines]

modules = []
for l in lines:
    top, bot = [], []
    for ch in l:
        if ch == ' ':   top.append(0); bot.append(0)
        elif ch == '█': top.append(1); bot.append(1)
        elif ch == '▀': top.append(1); bot.append(0)
        elif ch == '▄': top.append(0); bot.append(1)
        else:           top.append(0); bot.append(0)
    modules.extend([top, bot])

scale = 8; border = 32
width  = w * scale + 2 * border
height = len(modules) * scale + 2 * border

rows = []
for y in range(height):
    row = bytearray([0])
    my = (y - border) // scale
    for x in range(width):
        mx = (x - border) // scale
        black = 0 <= my < len(modules) and 0 <= mx < w and modules[my][mx]
        row += b'\x00\x00\x00' if black else b'\xff\xff\xff'
    rows.append(bytes(row))

def chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)

png = (
    b'\x89PNG\r\n\x1a\n'
    + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    + chunk(b'IDAT', zlib.compress(b''.join(rows), 9))
    + chunk(b'IEND', b'')
)
out.write_bytes(png)
print('QR saved to', out)
PY
```

If the script prints `QR saved to ...`, send this message exactly:

```text
Your QR code is ready!

MEDIA:/home/node/.openclaw/media/whatsapp-login-qr.png

If you don't see the image, refresh the page — it will appear after reload.

Once you can see it: WhatsApp → Settings → Linked Devices → Link a Device → scan the QR.
```

If the script raises `QR not ready`, wait 5 more seconds and run the converter again. If QR expired, see "Common issues" below.

---

## Step 6 — User scans QR — kill capture and collect phone number

Once the user confirms they scanned it:

1. Kill the background capture process immediately — it competes with the plugin's Baileys connection:

```bash
pkill -f 'openclaw channels login' 2>/dev/null; pkill -f 'script.*wa_login' 2>/dev/null; true
```

2. Ask the user: "What is your WhatsApp phone number including country code? (e.g. +15551234567)"

---

## Step 7 — Write allowFrom file with user's number

Without this file, all inbound messages are silently dropped regardless of pairing status.

Replace `+1XXXXXXXXXX` with the number the user provided:

```bash
mkdir -p /home/node/.openclaw/credentials
echo '{"version":1,"allowFrom":["+1XXXXXXXXXX"]}' > /home/node/.openclaw/credentials/whatsapp-default-allowFrom.json
```

---

## Step 8 — Restart gateway for clean Baileys reconnect

The Baileys WebSocket goes stale after the QR pairing sequence. A restart is required before the gateway will receive inbound messages.

Warn the user first:
> "Restarting gateway one more time to activate message receiving — ~30 seconds, then send me a test WhatsApp message."

Then kill:

```bash
kill $(pgrep -f 'node.*dist/index.js') 2>/dev/null; true
```

---

## Step 9 — Verify WhatsApp is linked

After the gateway restarts, run:

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

Then ask the user to send a test WhatsApp message to the number. Setup is complete only when the user confirms they got a response from the main AI.

---

## Common issues

### QR expired or "QR not ready"

Kill the old capture and start fresh:

```bash
kill %1 2>/dev/null; true
rm -f /tmp/wa_login.typescript
script -q -f -c 'openclaw channels login --channel whatsapp' /tmp/wa_login.typescript &
```

Wait 8 seconds, then re-run the Python converter from Step 5.

### WhatsApp missing from status after restart

The `channels.whatsapp` key was not written. Re-run Step 2's `openclaw config patch` command, then restart the gateway again.

### WhatsApp shows LINKED but messages not received

Two common causes:
1. **allowFrom file missing or wrong number** — check `/home/node/.openclaw/credentials/whatsapp-default-allowFrom.json`. The number must include country code and match exactly.
2. **Baileys WebSocket stale** — run Step 8 (gateway restart) again.

### QR image not visible in chat

The MEDIA: tag sometimes requires a page refresh to render. This is a webchat display behavior — the file is present on disk. Tell the user to refresh the page.

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

### Unknown senders / pairing code flow

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

### Unlink/remove an approved sender

Approved WhatsApp senders are stored in:

```text
~/.openclaw/credentials/whatsapp-default-allowFrom.json
```

To remove a sender, edit the file and remove their number, then restart the gateway.

---

## If plugin install fails

Stop. Check version match. Do not try alternative install paths unless the runbook explicitly says to.

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
