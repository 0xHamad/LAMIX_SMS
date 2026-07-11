import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.BASE_URL || '';
const TOKEN = process.env.TOKEN || '';
const ENDPOINTS = [
  '/crapi/lamix/viewstats',
  '/crapi/lamix/stats',
  '/crapi/lamix/dashboard',
  '/crapi/lamix/sms',
  '/crapi/lamix/reports',
];

interface SMSRecord {
  time?: string;
  country?: string;
  phone?: string;
  cli?: string;
  message?: string;
  payout?: number;
  [key: string]: any;
}

async function tryEndpoints(): Promise<any> {
  for (const endpoint of ENDPOINTS) {
    try {
      const url = `${BASE_URL}${endpoint}?token=${TOKEN}&records=100`;
      console.log(`[SMS Monitor] Trying endpoint: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[SMS Monitor] Successfully fetched from ${endpoint}`);
        return data;
      }
    } catch (error) {
      console.log(`[SMS Monitor] Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : String(error));
      continue;
    }
  }
  return null;
}

function parseData(rawData: any) {
  if (!rawData) {
    return {
      totalSms: 0,
      countries: {},
      clis: {},
      numbers: {},
      messages: [],
    };
  }

  const messages: SMSRecord[] = Array.isArray(rawData) ? rawData : rawData.records || rawData.data || [];
  
  const countries: Record<string, number> = {};
  const clis: Record<string, number> = {};
  const numbers: Record<string, number> = {};
  const parsedMessages: any[] = [];

  messages.forEach((msg: SMSRecord) => {
    const country = msg.country || msg.country_code || 'Unknown';
    const cli = msg.cli || msg.sender || 'Unknown';
    const phone = msg.phone || msg.number || 'Unknown';
    const text = msg.message || msg.text || '';
    const payout = parseFloat(String(msg.payout || msg.revenue || 0));
    const time = msg.time || msg.timestamp || new Date().toISOString();

    countries[country] = (countries[country] || 0) + 1;
    clis[cli] = (clis[cli] || 0) + 1;
    numbers[phone] = (numbers[phone] || 0) + 1;

    parsedMessages.push({
      time: new Date(time).toLocaleString(),
      country,
      phone,
      cli,
      message: text,
      payout,
    });
  });

  return {
    totalSms: messages.length,
    countries,
    clis,
    numbers,
    messages: parsedMessages,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!BASE_URL || !TOKEN) {
      return NextResponse.json(
        {
          error: 'Missing API credentials',
          totalSms: 0,
          countries: {},
          clis: {},
          numbers: {},
          messages: [],
        },
        { status: 200 }
      );
    }

    const data = await tryEndpoints();
    const parsed = parseData(data);

    return NextResponse.json(parsed, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[SMS Monitor] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalSms: 0,
        countries: {},
        clis: {},
        numbers: {},
        messages: [],
      },
      { status: 200 }
    );
  }
}
