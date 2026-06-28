import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible.adapter';
import { BaseAdapter, StreamChunk } from './adapters/base.adapter';

// Strict interface matching our adapter layer contract
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LLMOrchestrator {
  // Cascading array execution path (Fallback Chain)
  private providers: BaseAdapter[] = [
    // 1. Primary Ultra-Low Latency Node (Cerebras Llama 3.1 8b - Instant)
    new OpenAICompatibleAdapter(
      'https://api.cerebras.ai/v1/chat/completions',
      process.env.CEREBRAS_API_KEY || '',
      'gpt-oss-120b',//'llama3.1-8b-instant', // FIX: Added missing '-instant' to clear the 404 error
      'CEREBRAS'
    ),
    // 2. Secondary High-Context Node (Gemini 1.5 Flash)
    new GeminiAdapter(),
    
    // 3. Final Resilient Fallback Node (Groq Llama 3.1 8b)
    new OpenAICompatibleAdapter(
      'https://api.groq.com/openai/v1/chat/completions',
      process.env.GROQ_API_KEY || '',
      'llama-3.1-8b-instant', // FIX: Updated to a live, non-deprecated Groq model identifier
      'GROQ'
    )
  ];

  async getActiveStream(prompt: string, history: ChatMessage[]): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    let lastError: unknown = null;

    for (const provider of this.providers) {
      try {
        // 1. Initialize generator (Creates object wrapper without triggering network request)
        const generator = await provider.stream(prompt, history);
        
        // 2. Evaluate first token to force immediate network handshake and validation
        const firstIteration = await generator.next();
        
        // Treat immediate edge-case stream closure as a structural failure
        if (firstIteration.done && firstIteration.value === undefined) {
          throw new Error("Empty initial stream layer or immediate closure.");
        }

        console.log(`[ORCHESTRATOR SUCCESS] Node active and emitting stream via provider.`);

        // 3. Re-yield the buffered initial token, then proxy the remaining stream dynamically
        return (async function* () {
          if (firstIteration.value) {
            yield firstIteration.value; 
          }
          for await (const chunk of generator) {
            yield chunk; 
          }
        })();

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown node error during execution.";
        console.warn(`[CIRCUIT BREAK] Node failed. Auto-routing to fallback. Core logs: ${errorMessage}`);
        lastError = error;
        continue; 
      }
    }

    const finalMessage = lastError instanceof Error ? lastError.message : "All endpoints exhausted.";
    throw new Error(`Orchestration Layer Panic: All free-tier runtimes exhausted. ${finalMessage}`);
  }
}