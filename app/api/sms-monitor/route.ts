import { NextRequest, NextResponse } from 'next/server';

// ── Credentials from env (set in .env.local or VPS environment) ──
const BASE_URL      = (process.env.VIEWSTATS_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const API_TOKEN     = process.env.API_TOKEN || process.env.TOKEN || '';
const FETCH_RECORDS = 200;   // fetch up to 200 from API
const MAX_RECORDS   = 200;   // hard cap shown on dashboard

// ── Server-side persistent CLI registry (survives between requests on same process) ──
const SERVER_KNOWN_CLIS = new Set<string>();
let   SERVER_INIT_DONE  = false;

// Exact same headers as Python bot
const FETCH_HEADERS: Record<string, string> = {
  'Accept': '*/*',
  'Accept-Language': 'en,en-US;q=0.9,ur;q=0.8',
  'Connection': 'keep-alive',
  'DNT': '1',
  'User-Agent': 'Mozilla/5.0',
  'Referer': `${BASE_URL}/crapi/lamix/viewstats?token=${API_TOKEN}&records=${FETCH_RECORDS}`,
};

// All endpoints to try (same list as Python bot config)
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

// Country prefix map — same as Python bot
const PREFIX_TO_COUNTRY: Record<string, string> = {
  '60': 'Malaysia', '62': 'Indonesia', '91': 'India', '92': 'Pakistan',
  '93': 'Afghanistan', '1': 'USA/Canada', '44': 'United Kingdom',
  '33': 'France', '49': 'Germany', '216': 'Tunisia', '222': 'Mauritania',
  '254': 'Kenya', '234': 'Nigeria', '20': 'Egypt', '27': 'South Africa',
  '55': 'Brazil', '52': 'Mexico', '7': 'Russia/Kazakhstan', '86': 'China',
  '970': 'Palestine', '63': 'Philippines', '880': 'Bangladesh',
  '84': 'Vietnam', '90': 'Turkey', '66': 'Thailand', '57': 'Colombia',
  '54': 'Argentina', '51': 'Peru', '56': 'Chile', '966': 'Saudi Arabia',
  '971': 'UAE', '974': 'Qatar', '965': 'Kuwait', '968': 'Oman',
  '962': 'Jordan', '961': 'Lebanon', '212': 'Morocco', '213': 'Algeria',
  '964': 'Iraq', '967': 'Yemen', '963': 'Syria', '218': 'Libya',
  '249': 'Sudan', '251': 'Ethiopia', '252': 'Somalia', '233': 'Ghana',
  '256': 'Uganda', '255': 'Tanzania', '258': 'Mozambique', '244': 'Angola',
  '242': 'Congo', '237': 'Cameroon', '225': 'Ivory Coast', '221': 'Senegal',
  '223': 'Mali', '226': 'Burkina Faso', '227': 'Niger', '235': 'Chad',
  '224': 'Guinea', '250': 'Rwanda', '257': 'Burundi', '260': 'Zambia',
  '265': 'Malawi', '263': 'Zimbabwe', '267': 'Botswana', '264': 'Namibia',
  '211': 'South Sudan', '232': 'Sierra Leone', '231': 'Liberia',
  '228': 'Togo', '229': 'Benin', '241': 'Gabon', '240': 'Equatorial Guinea',
  '236': 'Central African Republic', '253': 'Djibouti', '291': 'Eritrea',
  '248': 'Seychelles', '230': 'Mauritius', '269': 'Comoros',
  '261': 'Madagascar', '268': 'Eswatini', '266': 'Lesotho',
  '220': 'Gambia', '245': 'Guinea Bissau', '238': 'Cape Verde',
  '239': 'Sao Tome', '82': 'South Korea', '81': 'Japan', '39': 'Italy',
  '34': 'Spain', '31': 'Netherlands', '32': 'Belgium', '46': 'Sweden',
  '47': 'Norway', '45': 'Denmark', '358': 'Finland', '48': 'Poland',
  '43': 'Austria', '41': 'Switzerland', '351': 'Portugal', '30': 'Greece',
  '420': 'Czech Republic', '36': 'Hungary', '40': 'Romania',
  '359': 'Bulgaria', '421': 'Slovakia', '386': 'Slovenia',
  '385': 'Croatia', '381': 'Serbia', '380': 'Ukraine', '375': 'Belarus',
  '998': 'Uzbekistan', '994': 'Azerbaijan', '995': 'Georgia',
  '374': 'Armenia', '976': 'Mongolia', '977': 'Nepal', '94': 'Sri Lanka',
  '95': 'Myanmar', '855': 'Cambodia', '856': 'Laos', '65': 'Singapore',
  '852': 'Hong Kong', '886': 'Taiwan', '61': 'Australia', '64': 'New Zealand',
};

function getCountryName(fullNumber: string): string {
  const digits = fullNumber.replace(/\D/g, '');
  for (const prefix of Object.keys(PREFIX_TO_COUNTRY).sort((a, b) => b.length - a.length)) {
    if (digits.startsWith(prefix)) return PREFIX_TO_COUNTRY[prefix];
  }
  return `Unknown (+${digits.slice(0, 3)})`;
}

export interface SMSRecord {
  id: string;
  time: string;
  range: string;
  number: string;
  myPayout: string;
  agentPayout: string;
  client: string;
  cli: string;
  content: string;
}

export interface NewCLIRecord {
  cli: string;
  firstDetected: string;
  count: number;
  todayCount: number;
}

// ── Try every endpoint, return first successful response ──
async function fetchFromAPI(): Promise<{ records: any[]; endpoint: string } | null> {
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

      // Python bot checks: data.status === 'success' → data.data
      let records: any[] = [];
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
        return { records, endpoint };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Map raw API record → SMSRecord (using Python bot field names: dt, cli, num, message, payout) ──
function mapRecord(rec: any): SMSRecord {
  const rawNum = String(rec.num || rec.number || rec.phone || rec.msisdn || '');
  return {
    id: String(rec.id || rec.uid || `${rec.dt || Date.now()}-${rawNum}`),
    time: rec.dt || rec.time || rec.timestamp || '',
    range: rec.range || rec.country || getCountryName(rawNum),
    number: rawNum,
    myPayout: `€${parseFloat(String(rec.payout || rec.myPayout || rec.my_payout || 0)).toFixed(4)}`,
    agentPayout: `€${parseFloat(String(rec.agent_payout || rec.agentPayout || 0)).toFixed(4)}`,
    client: rec.client || rec.sender || rec.username || '—',
    cli: rec.cli || rec.route || rec.sender_id || '—',
    content: String(rec.message || rec.content || rec.text || rec.body || ''),
  };
}

// ── Build CLI stats and detect brand-new CLIs (server-side persistent tracking) ──
function buildCLIStats(records: SMSRecord[]): { cliStats: NewCLIRecord[]; newCLIs: NewCLIRecord[] } {
  const map = new Map<string, NewCLIRecord>();
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const rec of records) {
    const cli = rec.cli;
    if (!map.has(cli)) {
      map.set(cli, { cli, firstDetected: rec.time, count: 0, todayCount: 0 });
    }
    const entry = map.get(cli)!;
    entry.count++;
    if (rec.time.startsWith(todayStr)) entry.todayCount++;
  }

  const cliStats = Array.from(map.values()).sort((a, b) => b.count - a.count);

  // On very first request, populate known CLIs without marking them "new"
  const newCLIs: NewCLIRecord[] = [];
  if (!SERVER_INIT_DONE) {
    cliStats.forEach(c => SERVER_KNOWN_CLIS.add(c.cli));
    SERVER_INIT_DONE = true;
  } else {
    // Any CLI not in the known set is genuinely new
    for (const c of cliStats) {
      if (!SERVER_KNOWN_CLIS.has(c.cli)) {
        newCLIs.push(c);
        SERVER_KNOWN_CLIS.add(c.cli);
      }
    }
  }

  return { cliStats, newCLIs };
}

export async function GET(_req: NextRequest) {
  const result = await fetchFromAPI();

  if (!result) {
    return NextResponse.json(
      { success: false, sms: [], cliStats: [], newCLIs: [], error: 'No data — check BASE_URL / TOKEN in .env.local' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Enforce hard cap of 500 records
  const rawSms = result.records.slice(0, MAX_RECORDS).map(mapRecord);
  const { cliStats, newCLIs } = buildCLIStats(rawSms);

  return NextResponse.json(
    { success: true, sms: rawSms, cliStats, newCLIs, endpoint: result.endpoint, total: rawSms.length },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
