// job-runner.mjs — Generic Job Search Agent runner
// Config is read from job-profile.json — not hardcoded.
// Run: node job-runner.mjs

import fs from 'fs';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Load profile
// ---------------------------------------------------------------------------
const PROFILE_PATH = './job-profile.json';
if (!fs.existsSync(PROFILE_PATH)) {
  console.error('job-profile.json not found. Complete onboarding in chat first.');
  process.exit(1);
}
const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));

const SHEET_ID         = profile.sheetId || '';
const TAB              = profile.sheetTab || 'Sheet1'; // Google default tab name
const CREDS_PATH       = profile.credsPath || './.secrets/google-sheets.json';
const FEEDS_PATH       = profile.feedsPath || './rss-feeds.json';
const FALLBACK_PATH    = profile.fallbackPath || './fallback-jobs.json';
const NOTIFY_THRESHOLD = profile.notifyThreshold ?? 7;
const OWNER_NAME       = profile.ownerName || 'the job seeker';
const GREEN_FLAGS      = (profile.greenFlags || []).map(s => s.toLowerCase());
const YELLOW_FLAGS     = (profile.yellowFlags || []).map(s => s.toLowerCase());
const RED_FLAGS        = (profile.redFlags || []).map(s => s.toLowerCase());
const RESUME_FILES     = profile.resumeFiles || [];
const USE_SHEETS       = profile.useSheets && SHEET_ID && fs.existsSync(CREDS_PATH);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const nowIso = () => new Date().toISOString();
const sleep  = ms => new Promise(r => setTimeout(r, ms));
const decode = s => String(s ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ').trim();

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decode(m?.[1] || '');
}
function attr(block, tagName, attrName) {
  const m = block.match(new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["'][^>]*>`, 'i'));
  return decode(m?.[1] || '');
}
function parseFeed(xml, sourceName) {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(m => m[0]);
  return items.map(item => {
    const title       = tag(item, 'title');
    let   url         = tag(item, 'link') || attr(item, 'link', 'href') || tag(item, 'guid');
    url               = url.replace(/^\s+|\s+$/g, '');
    const description = tag(item, 'description') || tag(item, 'summary');
    const posted      = tag(item, 'pubDate') || tag(item, 'updated') || '';
    const company     = guessCompany(title, description);
    return { title, company, url, source: sourceName, posted, description };
  }).filter(j => j.title && j.url);
}
function guessCompany(title, desc) {
  const byDash = title.match(/\s[-–—]\s([^–—-]+)$/);
  if (byDash) return byDash[1].trim();
  const byAt = title.match(/\bat\s+([^|,]+)/i);
  if (byAt) return byAt[1].trim();
  const m = desc.match(/Company:\s*([^\n|]+)/i);
  return m?.[1]?.trim() || '';
}
function stableId(job) {
  return crypto.createHash('sha1')
    .update((job.url || `${job.title}|${job.company}`).toLowerCase())
    .digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Scoring — driven by profile flags
// ---------------------------------------------------------------------------
function scoreJob(job) {
  const text    = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  let   score   = 5;
  const reasons = [];
  const hits    = words => words.filter(w => text.includes(w));
  const add     = (pts, reason) => { score += pts; reasons.push(`+${reason}`); };
  const sub     = (pts, reason) => { score -= pts; reasons.push(`-${reason}`); };

  const greenHits = hits(GREEN_FLAGS);
  if (greenHits.length) add(Math.min(greenHits.length * 0.8, 3.0), `green signals: ${greenHits.slice(0,3).join(', ')}`);

  const yellowHits = hits(YELLOW_FLAGS);
  if (yellowHits.length) sub(Math.min(yellowHits.length * 0.5, 2.0), `yellow flags: ${yellowHits.slice(0,3).join(', ')}`);

  const redHits = hits(RED_FLAGS);
  if (redHits.length) sub(Math.min(redHits.length * 1.5, 4.0), `red flags: ${redHits.slice(0,3).join(', ')}`);

  if (/\$\d{2,3}[,k\d]*(\s*-\s*\$?\d{2,3}[,k\d]*)?/i.test(job.description)) add(0.3, 'compensation mentioned');

  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  const resume    = chooseResume(text);
  const coverText = makeCover(job, score, resume, reasons);
  return { score, reasoning: reasons.slice(0, 5).join('; ') || 'No strong fit signals', coverLetter: coverText, resume };
}

function chooseResume(text) {
  // Pick the resume whose label keywords best match the posting text
  if (!RESUME_FILES.length) return 'resume.docx';
  for (const r of RESUME_FILES) {
    const keywords = (r.keywords || []).map(k => k.toLowerCase());
    if (keywords.length && keywords.some(k => text.includes(k))) return r.filename;
  }
  return RESUME_FILES[0].filename;
}

function makeCover(job, score, resume, reasons) {
  const whyParts = reasons.filter(r => r.startsWith('+')).slice(0, 3).map(r => r.slice(1));
  return `I'm interested in ${job.title}${job.company ? ` at ${job.company}` : ''}. ` +
    `My background aligns with this role — specifically: ${whyParts.join(', ') || 'relevant experience'}. ` +
    `I would use the ${resume.replace(/_/g,' ').replace('.docx','')} version of my resume for this application. ` +
    `Fit score: ${score}/10.`;
}

// ---------------------------------------------------------------------------
// Google Sheets (optional)
// ---------------------------------------------------------------------------
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
// Build an A1-notation range string. Tab names with spaces/special chars get
// single-quoted per the Sheets API spec. Do NOT encodeURIComponent the result —
// the Sheets API expects literal ! and : in the URL path.
function sheetRange(tab, cells) {
  const name = /^[A-Za-z0-9_]+$/.test(tab) ? tab : `'${tab.replace(/'/g, "''")}'`;
  return `${name}!${cells}`;
}

async function getExistingKeys() {
  if (!USE_SHEETS) return { ids: new Set(), urls: new Set() };
  const data = await sheetsReq('GET',
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetRange(TAB,'A2:D')}`);
  const ids = new Set(), urls = new Set();
  for (const row of data.values || []) { if (row[0]) ids.add(row[0]); if (row[3]) urls.add(row[3]); }
  return { ids, urls };
}
async function ensureHeaderRow() {
  if (!USE_SHEETS) return;
  const data = await sheetsReq('GET',
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetRange(TAB,'A1:L1')}`);
  const first = (data.values || [])[0];
  if (!first || !first[0] || first[0].toLowerCase() !== 'id') {
    await sheetsReq('POST',
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetRange(TAB,'A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {values: [['ID','Title','Company','URL','Source','Posted','Score','Reasoning','CoverLetter','Status','DateAdded','Notified']]});
    console.log('SHEET_HEADER written');
  }
}
async function appendRows(rows) {
  if (!rows.length || !USE_SHEETS) return null;
  return sheetsReq('POST',
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetRange(TAB,'A:L')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {values: rows});
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const feeds    = fs.existsSync(FEEDS_PATH) ? JSON.parse(fs.readFileSync(FEEDS_PATH, 'utf8')) : [];
  await ensureHeaderRow();
  const existing = await getExistingKeys();
  const seenThisRun = new Set();
  const all = [];

  // Try RSS feeds (nice-to-have — many job sites block bots)
  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {headers:{'user-agent':'Mozilla/5.0 (compatible; JobAgent/1.0)'}});
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const xml = await res.text();
      all.push(...parseFeed(xml, feed.name));
      await sleep(500);
    } catch (e) {
      console.error(`FEED_ERROR ${feed.name}: ${e.message}`);
    }
  }

  // Always merge fallback-jobs.json — agent populates this via web_search before each run.
  // This is the primary source for non-tech / non-remote jobs and when RSS is blocked.
  if (fs.existsSync(FALLBACK_PATH)) {
    try {
      const fallbacks = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'));
      if (Array.isArray(fallbacks) && fallbacks.length) {
        console.log(`FALLBACK_MERGE: adding ${fallbacks.length} entries from ${FALLBACK_PATH}`);
        for (const job of fallbacks) {
          all.push({
            title:       job.title       || '',
            company:     job.company     || '',
            url:         job.url         || '',
            source:      job.source      || 'web-search',
            posted:      job.posted      || '',
            description: job.description || ''
          });
        }
      }
    } catch (e) {
      console.error(`FALLBACK_PARSE_ERROR: ${e.message}`);
    }
  }

  const rows = [], strong = [];
  for (const job of all) {
    const id  = stableId(job);
    const key = `${job.title}|${job.company}`.toLowerCase();
    if (existing.ids.has(id) || existing.urls.has(job.url) || seenThisRun.has(id) || seenThisRun.has(key)) continue;
    seenThisRun.add(id); seenThisRun.add(key);
    const scored = scoreJob(job);
    const row    = [id, job.title, job.company, job.url, job.source, job.posted, scored.score, scored.reasoning, scored.coverLetter, 'New', nowIso(), scored.score >= NOTIFY_THRESHOLD ? 'FALSE' : 'N/A'];
    rows.push(row);
    if (scored.score >= NOTIFY_THRESHOLD) strong.push({...job, id, ...scored});
  }

  await appendRows(rows);

  const summary = {
    runAt: nowIso(),
    fetched: all.length,
    appended: rows.length,
    strong: strong.length,
    strongMatches: strong.slice(0,10).map(j => ({title:j.title, company:j.company, score:j.score, url:j.url, reasoning:j.reasoning, resume:j.resume}))
  };
  fs.mkdirSync('./runs', {recursive:true});
  fs.writeFileSync(`./runs/job-run-${summary.runAt.replace(/[:.]/g,'-')}.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
