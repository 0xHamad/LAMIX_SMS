import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.BASE_URL || 'http://51.77.216.195';
const TOKEN = process.env.TOKEN || '';

const ENDPOINTS = [
  '/crapi/lamix/viewstats',
  '/crapi/lamix/stats',
  '/crapi/lamix/dashboard',
  '/crapi/lamix/sms',
  '/crapi/lamix/reports'
];

interface SMSMessage {
  time: string;
  country: string;
  phone: string;
  cli: string;
  message: string;
  payout: number;
}

interface APIResponse {
  data?: SMSMessage[];
  records?: SMSMessage[];
  result?: SMSMessage[];
  sms?: SMSMessage[];
  messages?: SMSMessage[];
  [key: string]: any;
}

async function fetchFromEndpoint(endpoint: string): Promise<APIResponse | null> {
  try {
    const url = `${BASE_URL}${endpoint}?token=${TOKEN}&records=100`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SMS-Dashboard/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    return null;
  }
}

function extractMessagesFromResponse(data: APIResponse): SMSMessage[] {
  if (!data) return [];

  let messages: SMSMessage[] = [];

  // Try different possible response formats
  if (Array.isArray(data)) {
    messages = data;
  } else if (data.data && Array.isArray(data.data)) {
    messages = data.data;
  } else if (data.records && Array.isArray(data.records)) {
    messages = data.records;
  } else if (data.result && Array.isArray(data.result)) {
    messages = data.result;
  } else if (data.sms && Array.isArray(data.sms)) {
    messages = data.sms;
  } else if (data.messages && Array.isArray(data.messages)) {
    messages = data.messages;
  }

  return messages.filter(m => m.time && m.country && m.phone);
}

function processMessages(messages: SMSMessage[]) {
  // Identify new CLIs (appearing for first time recently)
  const cliMap = new Map<string, { count: number; country: string; first_time: string }>();
  const countryMap = new Map<string, { count: number; revenue: number }>();
  const numberMap = new Map<string, { count: number; country: string }>();

  messages.forEach(msg => {
    // CLIs tracking
    if (!cliMap.has(msg.cli)) {
      cliMap.set(msg.cli, { count: 0, country: msg.country, first_time: msg.time });
    }
    const cli = cliMap.get(msg.cli)!;
    cli.count++;

    // Countries tracking
    if (!countryMap.has(msg.country)) {
      countryMap.set(msg.country, { count: 0, revenue: 0 });
    }
    const country = countryMap.get(msg.country)!;
    country.count++;
    country.revenue += msg.payout || 0;

    // Numbers tracking
    if (!numberMap.has(msg.phone)) {
      numberMap.set(msg.phone, { count: 0, country: msg.country });
    }
    numberMap.get(msg.phone)!.count++;
  });

  // Find new CLIs (less than 5 messages = newly detected)
  const newClis = Array.from(cliMap.entries())
    .filter(([_, data]) => data.count < 5)
    .map(([cli, data]) => ({
      cli,
      count: data.count,
      country: data.country,
      first_seen: data.first_time,
    }))
    .sort((a, b) => new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime());

  return {
    new_clis: newClis,
    countries: Array.from(countryMap.entries())
      .map(([country, data]) => ({ country, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.count - a.count),
    numbers: Array.from(numberMap.entries())
      .map(([number, data]) => ({ number, ...data }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function GET(request: NextRequest) {
  try {
    let allMessages: SMSMessage[] = [];
    let successfulEndpoint = null;

    // Try each endpoint
    for (const endpoint of ENDPOINTS) {
      const data = await fetchFromEndpoint(endpoint);
      if (data) {
        const messages = extractMessagesFromResponse(data);
        if (messages.length > 0) {
          allMessages = messages;
          successfulEndpoint = endpoint;
          break;
        }
      }
    }

    // Sort by time (newest first)
    allMessages.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const { new_clis, countries, numbers } = processMessages(allMessages);

    const totalPayout = allMessages.reduce((sum, msg) => sum + (msg.payout || 0), 0);
    const uniqueCountries = new Set(allMessages.map(m => m.country)).size;
    const uniqueClis = new Set(allMessages.map(m => m.cli)).size;

    return NextResponse.json({
      stats: {
        total_sms: allMessages.length,
        unique_countries: uniqueCountries,
        active_clis: uniqueClis,
        total_payout: totalPayout,
      },
      data: allMessages.slice(0, 100),
      new_clis: new_clis.slice(0, 10),
      countries: countries.slice(0, 20),
      numbers: numbers.slice(0, 20),
      endpoint: successfulEndpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        stats: { total_sms: 0, unique_countries: 0, active_clis: 0, total_payout: 0 },
        data: [],
        new_clis: [],
        countries: [],
        numbers: [],
        error: 'Unable to fetch data',
      },
      { status: 200 }
    );
  }
}
