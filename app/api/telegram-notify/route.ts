import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(request: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('[Telegram] Missing credentials');
      return NextResponse.json(
        { message: 'Telegram not configured' },
        { status: 200 }
      );
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text' },
        { status: 400 }
      );
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    if (response.ok) {
      console.log('[Telegram] Message sent successfully');
      return NextResponse.json({ success: true });
    } else {
      const error = await response.text();
      console.error('[Telegram] Error:', error);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[Telegram] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }
    );
  }
}
