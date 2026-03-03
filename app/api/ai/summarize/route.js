import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
    const { emails, speakerName } = await req.json();

    if (!emails?.length) {
        return Response.json({ summary: 'No emails to summarize.' });
    }

    const emailText = emails.map((e, i) =>
        `--- Email ${i + 1} ---\nDate: ${new Date(e.date).toLocaleDateString()}\nFrom: ${e.from}\nSubject: ${e.subject}\n\n${e.body || e.snippet || '(no content)'}`
    ).join('\n\n');

    const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
            role: 'user',
            content: `You are a summit coordinator assistant. Summarize the email thread with speaker ${speakerName}. Focus on: current status, any commitments made, outstanding action items, and next steps.\n\n${emailText}`,
        }],
    });

    return Response.json({ summary: message.content[0].text });
}
