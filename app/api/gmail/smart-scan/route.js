import { createClient } from '@supabase/supabase-js';

const SPEAKER_KEYWORDS = ['generation regeneration', 'online summit', 'summit speaker', 'summit interview', 'summit panel', 'substack'];
const PODCAST_KEYWORDS = ['podcast'];
const ALL_KEYWORDS = [...SPEAKER_KEYWORDS, ...PODCAST_KEYWORDS];

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

function extractEmail(str) {
    const match = str?.match(/<([^>]+)>/) || str?.match(/([^\s,<>]+@[^\s,<>]+)/);
    return match ? match[1].toLowerCase().trim() : (str || '').toLowerCase().trim();
}

function extractName(str) {
    if (!str) return '';
    const nameMatch = str.match(/^([^<]+)</);
    return nameMatch ? nameMatch[1].trim() : str.split('@')[0];
}

function categorize(subject, body) {
    const text = `${subject} ${body}`.toLowerCase();
    const foundPodcast = PODCAST_KEYWORDS.some(k => text.includes(k));
    const foundSpeaker = SPEAKER_KEYWORDS.some(k => text.includes(k));
    const matchedKeywords = ALL_KEYWORDS.filter(k => text.includes(k));

    if (foundPodcast) return { category: 'podcast', keywords: matchedKeywords };
    if (foundSpeaker) return { category: 'speaker', keywords: matchedKeywords };
    return null;
}

async function fetchAllMessageIds(accessToken, query) {
    const ids = [];
    let pageToken = null;

    do {
        const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
        url.searchParams.set('q', query);
        url.searchParams.set('maxResults', '500');
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (data.messages) ids.push(...data.messages);
        pageToken = data.nextPageToken || null;
    } while (pageToken);

    return ids;
}

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const accessToken = await getValidToken(supabase);

        const keywordQuery = ALL_KEYWORDS.map(k => `"${k}"`).join(' OR ');
        const query = `(${keywordQuery}) after:2025/01/01`;

        const messageIds = await fetchAllMessageIds(accessToken, query);

        const { data: speakers } = await supabase.from('speakers').select('id, full_name, contact_email, poc_email');
        const speakerEmailMap = new Map();
        (speakers || []).forEach(s => {
            if (s.contact_email) speakerEmailMap.set(s.contact_email.toLowerCase(), s);
            if (s.poc_email) speakerEmailMap.set(s.poc_email.toLowerCase(), s);
        });

        const results = [];

        for (const { id } of messageIds) {
            const msgRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const msg = await msgRes.json();
            const headers = msg.payload?.headers || [];
            const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

            const subject = get('Subject') || '(no subject)';
            const from = get('From');
            const date = get('Date');
            const body = decodeBody(msg.payload);
            const snippet = msg.snippet || '';

            const cat = categorize(subject, body || snippet);
            if (!cat) continue;

            const senderEmail = extractEmail(from);
            const senderName = extractName(from);
            const matchedSpeaker = speakerEmailMap.get(senderEmail) || null;

            results.push({
                id,
                subject,
                from,
                senderEmail,
                senderName,
                date,
                snippet,
                category: cat.category,
                keywords: cat.keywords,
                matchedSpeaker,
            });
        }

        return Response.json({ results, total: messageIds.length });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
