export type EmbeddingTask = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT';

export const getEmbedding = async (
  text: string,
  taskType: EmbeddingTask = 'RETRIEVAL_QUERY',
): Promise<number[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  if (!text || text.trim() === '') throw new Error('Embedding input cannot be empty.');

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: 768,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => response.statusText);
    throw new Error(`Gemini embedding failed (${response.status}): ${details}`);
  }

  const result = await response.json() as { embedding?: { values?: number[] } };
  const values = result.embedding?.values;
  if (!values || values.length !== 768 || values.some((value) => !Number.isFinite(value))) {
    throw new Error('Gemini returned an invalid embedding vector; expected 768 finite values.');
  }

  // Gemini Embedding 001 requires explicit normalization when using reduced dimensions.
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) throw new Error('Gemini returned a zero-length embedding vector.');
  return values.map((value) => value / magnitude);
};

export const toPgVector = (values: number[]) => `[${values.join(',')}]`;
