/**
 * Splits raw text into semantic chunks without breaking sentences midway.
 * Interviewer Check: Does this handle edge cases like empty strings or massive paragraphs?
 */
export const splitTextIntoChunks = (text: string, maxChunkSize: number = 800): string[] => {
  if (!text || text.trim().length === 0) return [];

  // वाक्यों (sentences) के आधार पर तोड़ना ताकि कॉन्टेक्स्ट न बिगड़े
  const sentences = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};