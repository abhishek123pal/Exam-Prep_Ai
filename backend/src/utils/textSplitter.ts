/**
 * Splits raw text into semantic chunks without breaking sentences midway.
 * Interviewer Check: Does this handle edge cases like empty strings or massive paragraphs?
 */
export const splitTextIntoChunks = (text: string, maxChunkSize: number = 800): string[] => {
  if (!text || text.trim().length === 0 || maxChunkSize < 1) return [];

  const sentences = text.trim().replace(/([.!?])\s+/g, '$1|').split('|');
  const chunks: string[] = [];
  let currentChunk = "";

  const flush = () => {
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    currentChunk = '';
  };

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length > maxChunkSize) {
      flush();
      let piece = '';
      for (const word of sentence.split(/\s+/)) {
        if (word.length > maxChunkSize) {
          if (piece) chunks.push(piece);
          piece = '';
          for (let i = 0; i < word.length; i += maxChunkSize) {
            chunks.push(word.slice(i, i + maxChunkSize));
          }
        } else if ((piece ? piece.length + 1 : 0) + word.length > maxChunkSize) {
          if (piece) chunks.push(piece);
          piece = word;
        } else {
          piece += `${piece ? ' ' : ''}${word}`;
        }
      }
      if (piece) chunks.push(piece);
      continue;
    }

    if (currentChunk && currentChunk.length + sentence.length + 1 > maxChunkSize) flush();
    currentChunk += `${currentChunk ? ' ' : ''}${sentence}`;
  }

  flush();
  return chunks;
};
