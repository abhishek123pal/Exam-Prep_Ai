
import { BaseAdapter, StreamChunk } from './base.adapter';

// Strict interface for chat history instead of 'any'
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OpenAICompatibleAdapter extends BaseAdapter {
  constructor(
    private apiUrl: string,
    private apiKey: string,
    private modelName: string,
    private providerName: string
  ) {
    super();
  }

  async stream(prompt: string, history: ChatMessage[]): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    if (!this.apiKey) {
      throw new Error(`CRITICAL: Missing API Key for provider: ${this.providerName}`);
    }
    if (!prompt || prompt.trim() === '') {
      throw new Error("Validation Error: Prompt cannot be empty!");
    }

    // Construct the structured conversation cleanly
    const messages: ChatMessage[] = [...history, { role: 'user', content: prompt }];

    // Safe logging: Never log raw payloads that could leak sensitive prompt data or tokens
    console.log(`🚀 [${this.providerName}] Initializing stream request. Total messages in context: ${messages.length}`);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`[${this.providerName}] API Stream Error [${response.status}]: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error(`[${this.providerName}] Stream reader initialization failed.`);
    }

    return this.parseStream(reader);
  }

  private async *parseStream(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const decoder = new TextDecoder();
    let remainingData = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = (remainingData + decoder.decode(value, { stream: true })).split('\n');
        remainingData = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || cleanLine === 'data: [DONE]') continue;
          
          if (cleanLine.startsWith('data: ')) {
            try {
              // Extract payload avoiding slice magic strings where possible
              const rawJson = cleanLine.substring(6); 
              const parsed = JSON.parse(rawJson);
              const text = parsed.choices?.[0]?.delta?.content || '';
              
              if (text) {
                yield { text, provider: this.providerName };
              }
            } catch (e) {
              // Silent drop for incomplete/malformed SSE frames only
            }
          }
        }
      }
    } finally {
      // Ensure the stream lock is released when the consumer breaks or finishes
      reader.releaseLock();
    }
  }
}