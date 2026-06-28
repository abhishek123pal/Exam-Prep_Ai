import { BaseAdapter, StreamChunk } from './base.adapter';

export class GroqAdapter extends BaseAdapter {
  private apiKey = process.env.GROQ_API_KEY;

  async stream(prompt: string, history: any[]): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    const messages = [...history, { role: 'user', content: prompt }];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`Groq Error: ${response.statusText} (${response.status})`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Groq stream reader failed.");

    return this.parseStream(reader);
  }

  private async *parseStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<StreamChunk, void, unknown> {
    const decoder = new TextDecoder();
    let remainingData = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = (remainingData + decoder.decode(value)).split('\n');
      remainingData = lines.pop() || '';

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine === 'data: [DONE]') continue;
        if (cleanLine.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(cleanLine.slice(6));
            const text = parsed.choices[0]?.delta?.content || '';
            if (text) yield { text, provider: 'GROQ' };
          } catch (e) {
            // Ignore incomplete chunks during raw parsing
          }
        }
      }
    }
  }
}