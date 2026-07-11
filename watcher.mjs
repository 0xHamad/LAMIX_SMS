#!/usr/bin/env node
/**
 * LAMIX SMS — Standalone CLI Watcher
 * Runs independently on VPS, completely separate from Next.js.
 * - Polls the SMS API every 30 seconds
 * - Detects brand-new CLIs
 * - Sends Telegram notification on every new CLI
 * - Persists known CLIs to known_clis.json so restarts don't re-alert
 *
 * Usage:  node watcher.mjs
 * PM2:    pm2 start watcher.mjs --name "lamix-watcher" --interpreter node
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Config — reads from .env.local if present, else process.env ──────────────
const __dir = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dir, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const BASE_URL   = (process.env.VIEWSTATS_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const API_TOKEN  = process.env.API_TOKEN || process.env.TOKEN || '';
const BOT_TOKEN  = process.env.BOT_TOKEN || '';
const CHANNEL_ID = process.env.CHANNEL_ID || '';
const INTERVAL   = parseInt(process.env.WATCH_INTERVAL_MS || '30000', 10); // 30s default
const RECORDS    = 500;

const KNOWN_CLI_FILE = path.join(__dir, 'known_clis.json');

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

const FETCH_HEADERS = {
  'Accept': '*/*',
  'Accept-Language': 'en,en-US;q=0.9,ur;q=0.8',
  'Connection': 'keep-alive',
  'DNT': '1',
  'User-Agent': 'Mozilla/5.0',
};

// ── Persist known CLIs to disk ───────────────────────────────────────────────
function loadKnownCLIs() {
  try {
    if (fs.existsSync(KNOWN_CLI_FILE)) {
      const data = JSON.parse(fs.readFileSync(KNOWN_CLI_FILE, 'utf8'));
      return new Set(Array.isArray(data) ? data : []);
    }
  } catch {}
  return new Set();
}

function saveKnownCLIs(set) {
  try {
    fs.writeFileSync(KNOWN_CLI_FILE, JSON.stringify([...set], null, 2));
  } catch (e) {
    console.error('[watcher] Failed to save known_clis.json:', e.message);
  }
}

// ── Fetch SMS records from API ───────────────────────────────────────────────
async function fetchRecords() {
  if (!BASE_URL || !API_TOKEN) {
    console.warn('[watcher] Missing BASE_URL or API_TOKEN — check .env.local');
    return null;
  }

  for (const endpoint of ENDPOINTS) {
    try {
      const url = `${BASE_URL}${endpoint}?token=${API_TOKEN}&records=${RECORDS}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;

      const json = await res.json();

      let records = [];
      if (json?.status === 'success' && Array.isArray(json?.data)) {
        records = json.data;
      } else if (Array.isArray(json)) {
        records = json;
      } else if (Array.isArray(json?.records)) {
        records = json.records;
      } else if (Array.isArray(json?.data)) {
        records = json.data;
      }

      if (records.length > 0) {
        console.log(`[watcher] Got ${records.length} records from ${endpoint}`);
        return records;
      }
    } catch (e) {
      // Try next endpoint
      continue;
    }
  }

  console.warn('[watcher] All endpoints failed or returned empty data');
  return null;
}

// ── Extract unique CLIs from records ────────────────────────────────────────
function extractCLIs(records) {
  const map = new Map(); // cli -> { cli, firstDetected, count }
  for (const rec of records) {
    const cli = rec.cli || rec.route || rec.sender_id || '—';
    if (cli === '—') continue;
    const time = rec.dt || rec.time || rec.timestamp || new Date().toISOString();
    if (!map.has(cli)) {
      map.set(cli, { cli, firstDetected: time, count: 0 });
    }
    map.get(cli).count++;
  }
  return map;
}

// ── Send Telegram message ────────────────────────────────────────────────────
async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHANNEL_ID) {
    console.warn('[watcher] Telegram not configured (BOT_TOKEN / CHANNEL_ID missing)');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const json = await res.json();
    if (!json.ok) console.error('[watcher] Telegram error:', json.description);
    else console.log('[watcher] Telegram sent:', text.slice(0, 60));
  } catch (e) {
    console.error('[watcher] Telegram fetch failed:', e.message);
  }
}

function formatAlert(cli, firstDetected, count) {
  return (
    `🆕 <b>New CLI Detected</b>\n\n` +
    `<b>CLI:</b> <code>${cli}</code>\n` +
    `<b>First Detected:</b> ${firstDetected}\n` +
    `<b>SMS Count:</b> ${count}\n` +
    `<b>Time:</b> ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`
  );
}

// ── Main watch loop ──────────────────────────────────────────────────────────
let knownCLIs = loadKnownCLIs();
let isFirstRun = knownCLIs.size === 0;

console.log(`[watcher] Started. Known CLIs loaded: ${knownCLIs.size}`);
console.log(`[watcher] Polling every ${INTERVAL / 1000}s`);
console.log(`[watcher] BASE_URL: ${BASE_URL || '(not set)'}`);
console.log(`[watcher] Telegram: ${BOT_TOKEN ? 'configured' : 'NOT configured'}`);

async function tick() {
  const records = await fetchRecords();
  if (!records) return;

  const cliMap = extractCLIs(records);

  if (isFirstRun) {
    // First run — just seed known CLIs, don't alert
    cliMap.forEach((_, cli) => knownCLIs.add(cli));
    saveKnownCLIs(knownCLIs);
    isFirstRun = false;
    console.log(`[watcher] First run seeded ${knownCLIs.size} CLIs — no alerts sent`);
    return;
  }

  // Detect genuinely new CLIs
  const newOnes = [];
  cliMap.forEach((info, cli) => {
    if (!knownCLIs.has(cli)) {
      newOnes.push(info);
      knownCLIs.add(cli);
    }
  });

  if (newOnes.length > 0) {
    saveKnownCLIs(knownCLIs);
    console.log(`[watcher] ${newOnes.length} new CLI(s) detected:`, newOnes.map(n => n.cli));
    for (const nc of newOnes) {
      await sendTelegram(formatAlert(nc.cli, nc.firstDetected, nc.count));
    }
  } else {
    console.log(`[watcher] Tick — no new CLIs (total known: ${knownCLIs.size})`);
  }
}

// Run immediately then on interval
tick();
setInterval(tick, INTERVAL);
