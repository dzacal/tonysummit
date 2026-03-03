import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  const { emails, speakerName } = await request.json();

  if (!emails || emails.length === 0) {
    return Response.json({ summary: 'No emails to summarize.' });
  }

  const emailContent = emails.map((e, i) =>
    `Email ${i + 1} (${new Date(e.date).toLocaleDateString()})\nSubject: ${e.subject}\nFrom: ${e.from}\n\n${e.body || e.snippet}`
  ).join('\n\n---\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Summarize the following email correspondence with ${speakerName}, a speaker for an online summit. Focus only on:\n- Their summit participation (session topic, availability, requirements, preferences)\n- Podcast or Substack collaboration discussed\n- Recording or interview arrangements\n- Any commitments or important details they mentioned\n\nBe concise and organized. If a topic wasn't mentioned, skip it.\n\nEmails:\n\n${emailContent}`,
    }],
  });

  return Response.json({ summary: message.content[0].text });
}
