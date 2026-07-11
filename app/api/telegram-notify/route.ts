import { NextRequest, NextResponse } from 'next/server';

// Supports both server-env tokens AND client-supplied tokens (from UI settings panel)
async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept bot token/chat_id from request body (UI panel) OR env vars
    const botToken = body.botToken || process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId   = body.chatId   || process.env.CHANNEL_ID || process.env.TELEGRAM_CHAT_ID || '';
    const text     = body.text || '';

    if (!botToken || !chatId) {
      return NextResponse.json({ success: false, error: 'Missing botToken or chatId' });
    }
    if (!text) {
      return NextResponse.json({ success: false, error: 'Missing text' });
    }

    const result = await sendTelegramMessage(botToken, chatId, text);

    if (result.ok) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.description });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
