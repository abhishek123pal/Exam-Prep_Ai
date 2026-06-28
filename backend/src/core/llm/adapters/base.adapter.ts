export interface StreamChunk {
  text: string;
  provider: string;
}

export abstract class BaseAdapter {
  abstract stream(prompt: string, history: any[]): Promise<AsyncGenerator<StreamChunk, void, unknown>>;
}