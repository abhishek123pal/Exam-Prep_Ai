// backend/src/services/retrieval.service.ts

import { prisma } from '../lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const retrieveRelevantContext = async (userQuery: string, subjectId: string, limit: number = 3) => {
  try {
    // 1. User के सवाल को Embedding (Vector) में बदलो
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(userQuery);
    const queryVector = result.embedding.values;

    // 2. Supabase (pgvector) में Cosine Distance (<=>) का इस्तेमाल करके सर्च करो
    // हम 1 - (distance) करके similarity score निकाल रहे हैं ताकि पता चले कितना % मैच हुआ है
    const matchedChunks = await prisma.$queryRaw<
      Array<{ id: string; content: string; similarity: number }>
    >`
      SELECT 
        id, 
        content, 
        1 - (embedding <=> ${queryVector}::vector) as similarity
      FROM "KnowledgeChunk"
      WHERE "subjectId" = ${subjectId}
      ORDER BY embedding <=> ${queryVector}::vector
      LIMIT ${limit};
    `;

    // 3. अगर कोई खास मैच न मिले (जैसे similarity 0.3 से कम हो), तो कचरा ना भेजें
    const highQualityChunks = matchedChunks.filter(chunk => chunk.similarity > 0.3);

    if (highQualityChunks.length === 0) {
      return "No relevant context found in the current syllabus material.";
    }

    // 4. सारे अच्छे चंक्स को जोड़कर एक बड़ा Context String बनाओ
    const combinedContext = highQualityChunks.map(c => c.content).join("\n\n---\n\n");
    
    return combinedContext;

  } catch (error) {
    console.error("❌ Retrieval Error:", error);
    throw new Error("Failed to retrieve context from vector database.");
  }
};