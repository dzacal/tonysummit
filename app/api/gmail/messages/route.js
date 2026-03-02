import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getValidToken(supabase) {
  const { data: tokenRow } = await supabase.from('gmail_tokens').select('*').eq('id', 1).single();
  if (!tokenRow) throw new Error('Gmail not connected');

  const expiresAt = new Date(tokenRow.expires_at);
  if (expiresAt - new Date() > 5 * 60 * 1000) return tokenRow.access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokenRow.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = await res.json();
  if (!tokens.access_token) throw new Error('Token refresh failed');

  await supabase.from('gmail_tokens').update({
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq('id', 1);

  return tokens.access_token;
}

function decodeBody(part) {
  if (!part) return '';
  if (part.body?.data) return Buffer.from(part.body.data, 'base64').toString('utf-8');
  if (part.parts) {
    for (const p of part.parts) {
      const text = decodeBody(p);
      if (text) return text;
    }
  }
  return '';
}

export async function GET(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  try {
    const accessToken = await getValidToken(supabase);

    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`from:${email} OR to:${email}`)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();
    const messageIds = searchData.messages || [];

    const messages = await Promise.all(
      messageIds.slice(0, 10).map(async ({ id }) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const msg = await msgRes.json();
        const headers = msg.payload?.headers || [];
        const get = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        return {
          id,
          subject: get('Subject') || '(no subject)',
          from: get('From'),
          to: get('To'),
          date: get('Date'),
          snippet: msg.snippet || '',
          body: decodeBody(msg.payload),
        };
      })
    );

    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
