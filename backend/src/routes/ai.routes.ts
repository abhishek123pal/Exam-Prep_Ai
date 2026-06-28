

// // export default router;
// import { Router } from 'express';
// import { handleStreamingChat } from '../controllers/orchestrator.controller';
// import { scrubPIIMiddleware } from '../middlewares/pii.middleware';
// import { semanticCacheMiddleware } from '../middlewares/cache.middleware';

// const router = Router();

// // Pipeline: PII Scrub -> Check pgvector Cache -> Exec Multi-Provider Streaming
// router.post('/chat/stream', scrubPIIMiddleware, semanticCacheMiddleware, handleStreamingChat);

// export default router;
import { Router } from 'express';
import { handleStreamingChat } from '../controllers/orchestrator.controller';
import { scrubPIIMiddleware } from '../middlewares/pii.middleware';
import { semanticCacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

// Strict Serial Pipeline Chain 
router.post(
  '/chat/stream', 
  scrubPIIMiddleware,     // 1. Clean PII data
  semanticCacheMiddleware, // 2. Perform database lookup (0 tokens if match)
  handleStreamingChat     // 3. Orchestrate multi-provider fallback streaming
);

export default router;