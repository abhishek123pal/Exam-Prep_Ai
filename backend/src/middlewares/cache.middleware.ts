// backend/src/middlewares/cache.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { getEmbedding } from '../services/embedding.service';
import prisma from '../config/db';

// 🚨 Strict typing (No 'any' allowed in my code reviews)
interface CacheMatch {
  query: string;
  response: string;
  similarity: number;
}

export const semanticCacheMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Extract subjectId alongside prompt
  const { prompt, subjectId } = req.body;
  
  if (!prompt || !subjectId) return next();

  try {
    const queryVector = await getEmbedding(prompt);
    const vectorString = `[${queryVector.join(',')}]`;

    // 2. Pass subjectId as the 4th parameter to ensure isolated caching
    const matches = await prisma.$queryRawUnsafe<CacheMatch[]>(`
      SELECT query, response, similarity 
      FROM match_semantic_cache($1::vector, $2, $3, $4) 
    `, vectorString, 0.85, 1, subjectId); 

    if (matches && matches.length > 0) {
      const cachedMatch = matches[0];
      console.log(`⚡ [SEMANTIC CACHE HIT] Subject: ${subjectId} | Confidence: ${(cachedMatch.similarity * 100).toFixed(2)}%`);

      // Mock SSE interface
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Good job adding this for Nginx!

      res.write(`data: ${JSON.stringify({ text: cachedMatch.response, provider: 'CACHE_HIT' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Embed for pipeline down-streaming
    req.body.embedding = vectorString;
    next();
  } catch (error) {
    console.error("❌ Cache Middleware bypassed due to error:", error);
    next(); // Fault-tolerance triggered
  }
};











// import { Request, Response, NextFunction } from 'express';
// import { getEmbedding } from '../services/embedding.service';
// import prisma from '../config/db';

// export const semanticCacheMiddleware = async (req: Request, res: Response, next: NextFunction) => {
//   const { prompt } = req.body;
//   if (!prompt) return next();

//   try {
//     const queryVector = await getEmbedding(prompt);
    
//     // Postgres pgvector के लिए एरे को स्ट्रिंग फॉर्मेट में कन्वर्ट करना ज़रूरी है
//     const vectorString = `[${queryVector.join(',')}]`;

//     // Execute raw vector match function
//     const matches: any = await prisma.$queryRawUnsafe(`
//       SELECT query, response, similarity 
//       FROM match_semantic_cache($1::vector, $2, $3)
//     `, vectorString, 0.85, 1);

//     if (matches && matches.length > 0) {
//       const cachedMatch = matches[0];
//       console.log(`⚡ [SEMANTIC CACHE HIT] Confidence: ${(cachedMatch.similarity * 100).toFixed(2)}%`);

//       // Mock SSE interface
//       res.setHeader('Content-Type', 'text/event-stream');
//       res.setHeader('Cache-Control', 'no-cache');
//       res.setHeader('Connection', 'keep-alive');
//       res.setHeader('X-Accel-Buffering', 'no');

//       res.write(`data: ${JSON.stringify({ text: cachedMatch.response, provider: 'CACHE_HIT' })}\n\n`);
//       res.write('data: [DONE]\n\n');
//       return res.end();
//     }

//     // Embed for pipeline down-streaming
//     req.body.embedding = vectorString;
//     next();
//   } catch (error) {
//     console.error("❌ Cache Middleware bypassed due to error:", error);
//     next(); // Fault-tolerance: database डाउन होने पर भी LLM चलता रहेगा
//   }
// };