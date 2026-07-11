import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.BASE_URL || '';
const TOKEN = process.env.TOKEN || '';

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

interface SMSData {
  time: string;
  range: string;
  number: string;
  myPayout: string;
  agentPayout: string;
  client: string;
  cli: string;
  content: string;
}

async function tryEndpoints(): Promise<any> {
  if (!BASE_URL || !TOKEN) {
    console.warn('[SMS Monitor] Missing BASE_URL or TOKEN');
    return null;
  }

  for (const endpoint of ENDPOINTS) {
    try {
      const url = `${BASE_URL}${endpoint}?token=${TOKEN}&records=200`;
      console.log(`[SMS Monitor] Trying endpoint: ${endpoint}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Connection': 'keep-alive',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        console.log(`[SMS Monitor] Success with endpoint: ${endpoint}`);
        return { data, endpoint };
      }
    } catch (error) {
      console.log(`[SMS Monitor] Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }
  return null;
}

function transformData(data: any, endpoint: string = ''): { sms: SMSData[]; newCLIs: any[] } {
  if (!data) {
    return { sms: [], newCLIs: [] };
  }

  let records: any[] = [];

  // Parse different response formats based on endpoint
  if (Array.isArray(data)) {
    records = data;
  } else if (data.records) {
    records = data.records;
  } else if (data.data) {
    records = Array.isArray(data.data) ? data.data : [data.data];
  } else if (data.sms) {
    records = Array.isArray(data.sms) ? data.sms : [data.sms];
  } else if (data.messages) {
    records = Array.isArray(data.messages) ? data.messages : [data.messages];
  }

  const smsData: SMSData[] = records
    .filter((record: any) => record) // Filter out null/undefined
    .map((record: any) => ({
      time: record.time || record.timestamp || record.date || new Date().toISOString(),
      range: record.range || record.country || record.country_code || 'Unknown',
      number: String(record.number || record.phone || record.msisdn || ''),
      myPayout: String(parseFloat(String(record.myPayout || record.my_payout || record.payout || 0)).toFixed(4)),
      agentPayout: String(parseFloat(String(record.agentPayout || record.agent_payout || record.agent_revenue || 0)).toFixed(4)),
      client: record.client || record.sender || record.route_name || 'Unknown',
      cli: record.cli || record.route || record.sender_id || 'Unknown',
      content: String(record.content || record.message || record.text || record.body || ''),
    }));

  // Detect new CLIs
  const newCLIs = detectNewCLIs(smsData);

  return { sms: smsData, newCLIs };
}

function detectNewCLIs(smsData: SMSData[]): any[] {
  const cliMap = new Map<string, { count: number; firstTime: string }>();

  smsData.forEach((sms) => {
    if (!cliMap.has(sms.cli)) {
      cliMap.set(sms.cli, { count: 1, firstTime: sms.time });
    } else {
      const cli = cliMap.get(sms.cli)!;
      cli.count++;
    }
  });

  return Array.from(cliMap.entries()).map(([cli, data]) => ({
    cli,
    firstDetected: data.firstTime,
    count: data.count,
  }));
}



export async function GET(request: NextRequest) {
  try {
    const result = await tryEndpoints();
    
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          sms: [],
          newCLIs: [],
          error: 'No endpoint responded successfully',
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    }

    const { sms, newCLIs } = transformData(result.data, result.endpoint);

    return NextResponse.json(
      {
        success: true,
        sms,
        newCLIs,
        endpoint: result.endpoint,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[SMS Monitor] Error:', error);
    return NextResponse.json(
      {
        success: false,
        sms: [],
        newCLIs: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
