/**
 * Background Watcher API
 * ─────────────────────
 * This endpoint is called by a cron job / pm2 timer on VPS every 30s.
 * It does NOT depend on the browser being open.
 *
 * Call it like:
 *   curl http://localhost:3000/api/background-watch?secret=WATCH_SECRET
 *
 * Set WATCH_SECRET in .env.local to protect it from outside access.
 * Telegram credentials are read from env vars (BOT_TOKEN, CHANNEL_ID).
 */

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL      = (process.env.VIEWSTATS_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const API_TOKEN     = process.env.API_TOKEN  || process.env.TOKEN        || '';
const BOT_TOKEN     = process.env.BOT_TOKEN  || process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID    = process.env.CHANNEL_ID || process.env.TELEGRAM_CHAT_ID   || '';
const WATCH_SECRET  = process.env.WATCH_SECRET || '';
const FETCH_RECORDS = 500;

const FETCH_HEADERS = {
  'Accept': '*/*',
  'User-Agent': 'Mozilla/5.0',
  'Connection': 'keep-alive',
};

const ENDPOINTS = [
  '/crapi/lamix/viewstats',
  '/crapi/lamix/stats',
  '/crapi/lamix/user',
  '/crapi/lamix/numbers',
  '/crapi/lamix/ranges',
  '/crapi/lamix/balance',
  '/crapi/lamix/dashboard',
  '/crapi/lamix/sms',
  '/crapi/lamix/reports',
  '/crapi/lamix/info',
];

// ── In-process persistent CLI store (same process as /api/sms-monitor) ──
// We use a module-level set so it persists between requests on the same Node process
const BG_KNOWN_CLIS  = new Set<string>();
let   BG_INIT_DONE   = false;

// ── Telegram sender ──────────────────────────────────────────────────────────
async function sendTelegram(text: string, botToken: string, chatId: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const json = await res.json();
    return json.ok;
  } catch {
    return false;
  }
}

function formatNewCLIMessage(cli: string, firstTime: string, count: number): string {
  return (
    `🚨 <b>New CLI Detected!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏷 <b>CLI :</b>  <code>${cli}</code>\n` +
    `🕒 <b>First Seen :</b>  ${firstTime}\n` +
    `📊 <b>SMS Count :</b>  ${count}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// ── Fetch from API ───────────────────────────────────────────────────────────
async function fetchRecords(): Promise<any[] | null> {
  if (!BASE_URL || !API_TOKEN) return null;

  for (const endpoint of ENDPOINTS) {
    try {
      const url = `${BASE_URL}${endpoint}?token=${API_TOKEN}&records=${FETCH_RECORDS}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;

      const json = await res.json();

      let records: any[] = [];
      if (json?.status === 'success' && Array.isArray(json?.data)) records = json.data;
      else if (Array.isArray(json))              records = json;
      else if (Array.isArray(json?.records))     records = json.records;
      else if (Array.isArray(json?.data))        records = json.data;

      if (records.length > 0) return records.slice(0, 500);
    } catch {
      continue;
    }
  }
  return null;
}

// ── Extract CLI names from raw records ───────────────────────────────────────
function extractCLIMap(records: any[]): Map<string, { firstTime: string; count: number }> {
  const map = new Map<string, { firstTime: string; count: number }>();
  for (const rec of records) {
    const cli = String(rec.cli || rec.route || rec.sender_id || '—');
    const dt  = String(rec.dt  || rec.time  || rec.timestamp || '');
    if (!map.has(cli)) {
      map.set(cli, { firstTime: dt, count: 0 });
    }
    map.get(cli)!.count++;
  }
  return map;
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Optional secret check — skip if WATCH_SECRET is not set
  if (WATCH_SECRET) {
    const provided = req.nextUrl.searchParams.get('secret') || '';
    if (provided !== WATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!BASE_URL || !API_TOKEN) {
    return NextResponse.json({ error: 'Missing BASE_URL / API_TOKEN' });
  }

  const records = await fetchRecords();
  if (!records) {
    return NextResponse.json({ ok: false, error: 'API fetch failed' });
  }

  const cliMap  = extractCLIMap(records);
  const notified: string[] = [];

  if (!BG_INIT_DONE) {
    // First run — seed known CLIs, do NOT send notifications
    cliMap.forEach((_, cli) => BG_KNOWN_CLIS.add(cli));
    BG_INIT_DONE = true;
    return NextResponse.json({
      ok: true,
      action: 'init',
      knownCLIs: BG_KNOWN_CLIS.size,
      totalRecords: records.length,
    });
  }

  // Subsequent runs — detect NEW CLIs and notify Telegram
  for (const [cli, info] of cliMap.entries()) {
    if (!BG_KNOWN_CLIS.has(cli)) {
      BG_KNOWN_CLIS.add(cli);

      if (BOT_TOKEN && CHANNEL_ID) {
        const msg = formatNewCLIMessage(cli, info.firstTime, info.count);
        await sendTelegram(msg, BOT_TOKEN, CHANNEL_ID);
        notified.push(cli);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    action: 'watch',
    totalRecords: records.length,
    totalCLIs: cliMap.size,
    newCLIsDetected: notified.length,
    newCLIs: notified,
    telegramConfigured: !!(BOT_TOKEN && CHANNEL_ID),
  });
}
