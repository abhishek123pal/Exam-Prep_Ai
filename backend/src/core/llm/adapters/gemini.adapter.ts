import { BaseAdapter, StreamChunk } from './base.adapter';

export class GeminiAdapter extends BaseAdapter {
  private apiKey = process.env.GEMINI_API_KEY;

  async stream(prompt: string, history: any[]): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    // History handling to match Gemini structure
    const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } })
      }
    );

    if (!response.ok) throw new Error(`Gemini Error: ${response.statusText} (${response.status})`);
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Gemini stream reader initiation failed.");

    return this.parseStream(reader);
  }

  private async *parseStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<StreamChunk, void, unknown> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // Clean up the JSON array formatting emitted by Gemini stream api
      let match;
      while ((match = buffer.match(/\"text\":\s*\"((?:[^\"\\]|\\.)*)\"/)) !== null) {
        const text = JSON.parse(`"${match[1]}"`); // Safely unescape string
        yield { text, provider: 'GEMINI' };
        buffer = buffer.substring(match.index! + match[0].length);
      }
    }
  }
}