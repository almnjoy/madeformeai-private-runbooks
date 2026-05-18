// notify-digest.mjs — Generic Job Agent notification digest
// Reads unnotified 7+ jobs from Google Sheets and prints a summary for the agent to send.
// Config is read from job-profile.json — not hardcoded.

import fs from 'fs';
import crypto from 'crypto';

const PROFILE_PATH = './job-profile.json';
if (!fs.existsSync(PROFILE_PATH)) {
  console.error('job-profile.json not found. Complete onboarding in chat first.');
  process.exit(1);
}
const profile   = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
const SHEET_ID  = profile.sheetId || '';
const TAB       = profile.sheetTab || 'Jobs';
const CREDS_PATH = profile.credsPath || './.secrets/google-sheets.json';
const THRESHOLD  = profile.notifyThreshold ?? 7;

if (!profile.useSheets || !SHEET_ID || !fs.existsSync(CREDS_PATH)) {
  console.log('Google Sheets not configured. Skipping digest — check last run JSON in ./runs/ instead.');
  process.exit(0);
}

const b64url = input => Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function getToken() {
  const creds   = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  const now     = Math.floor(Date.now()/1000);
  const unsigned = `${b64url(JSON.stringify({alg:'RS256',typ:'JWT'}))}.${b64url(JSON.stringify({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:creds.token_uri,exp:now+3600,iat:now}))}`;
  const signer  = crypto.createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
  const jwt     = `${unsigned}.${signer.sign(creds.private_key,'base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}`;
  const res     = await fetch(creds.token_uri,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
  if (!res.ok) throw new Error(`Google token failed ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}
async function sheetsReq(method, url, body) {
  const token = await getToken();
  const res   = await fetch(url,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  const text  = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = {raw:text}; }
  if (!res.ok) throw new Error(`Sheets ${method} ${res.status}: ${JSON.stringify(json).slice(0,800)}`);
  return json;
}

function briefCover(s) { return String(s || '').replace(/\s+/g,' ').slice(0, 450); }

const data    = await sheetsReq('GET',`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(TAB)}!A2:L`);
const matches = [];
(data.values || []).forEach((r, i) => {
  const score    = Number(r[6] || 0);
  const notified = String(r[11] || '').toUpperCase();
  if (score >= THRESHOLD && notified === 'FALSE') {
    matches.push({ rowNum: i+2, id:r[0], title:r[1], company:r[2], url:r[3], source:r[4], posted:r[5], score, reasoning:r[7], cover:r[8] });
  }
});
matches.sort((a,b) => b.score - a.score);

if (!matches.length) {
  console.log(`Job Agent digest: no new ${THRESHOLD}+ matches since the last digest.`);
  process.exit(0);
}

const top = matches.slice(0, 8);
let msg = `Job Agent digest: ${matches.length} new strong match${matches.length === 1 ? '' : 'es'} found.\n`;
top.forEach((j, idx) => {
  msg += `\n${idx+1}. ${j.title}${j.company ? ` — ${j.company}` : ''} — ${j.score}/10\nWhy: ${j.reasoning}\nURL: ${j.url}\nCover blurb: ${briefCover(j.cover)}\n`;
});
if (matches.length > top.length) msg += `\n${matches.length - top.length} more strong matches are in the Google Sheet.`;

// Mark as notified
await sheetsReq('POST',`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,{
  valueInputOption: 'RAW',
  data: matches.map(j => ({ range: `${TAB}!L${j.rowNum}`, values: [['TRUE']] }))
});

console.log(msg);
