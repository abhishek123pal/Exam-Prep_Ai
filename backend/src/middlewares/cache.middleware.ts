
import { Request, Response, NextFunction } from 'express';
import { getEmbedding } from '../services/embedding.service';
import prisma from '../config/db';

export const semanticCacheMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const { prompt } = req.body;
  if (!prompt) return next();

  try {
    const queryVector = await getEmbedding(prompt);
    
    // Postgres pgvector के लिए एरे को स्ट्रिंग फॉर्मेट में कन्वर्ट करना ज़रूरी है
    const vectorString = `[${queryVector.join(',')}]`;

    // Execute raw vector match function
    const matches: any = await prisma.$queryRawUnsafe(`
      SELECT query, response, similarity 
      FROM match_semantic_cache($1::vector, $2, $3)
    `, vectorString, 0.85, 1);

    if (matches && matches.length > 0) {
      const cachedMatch = matches[0];
      console.log(`⚡ [SEMANTIC CACHE HIT] Confidence: ${(cachedMatch.similarity * 100).toFixed(2)}%`);

      // Mock SSE interface
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      res.write(`data: ${JSON.stringify({ text: cachedMatch.response, provider: 'CACHE_HIT' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Embed for pipeline down-streaming
    req.body.embedding = vectorString;
    next();
  } catch (error) {
    console.error("❌ Cache Middleware bypassed due to error:", error);
    next(); // Fault-tolerance: database डाउन होने पर भी LLM चलता रहेगा
  }
};