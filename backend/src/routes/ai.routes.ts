
import { Router } from 'express';
import { handleStreamingChat } from '../controllers/orchestrator.controller';
import { getAllSubjects } from '../controllers/subject.controller'; // 👈 Import the new controller
import { scrubPIIMiddleware } from '../middlewares/pii.middleware';
import { semanticCacheMiddleware } from '../middlewares/cache.middleware';
import { chatRateLimit } from '../middlewares/rate-limit.middleware';

const router = Router();

// 🟢 PUBLIC READ ROUTE: Fetch subjects for UI state
router.get('/subjects', getAllSubjects);

// 🔴 STRICT SERIAL PIPELINE CHAIN 
router.post(
  '/chat/stream', 
  chatRateLimit,
  (req, res, next) => {
    const { prompt, subjectId, sessionId } = req.body || {};
    if (typeof subjectId !== 'string' || !subjectId.trim()) {
      return res.status(400).json({ error: 'subjectId is required.' });
    }
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A prompt is required.' });
    }
    if (typeof sessionId !== 'string' || sessionId.trim().length < 8 || sessionId.trim().length > 128) {
      return res.status(400).json({ error: 'A unique sessionId between 8 and 128 characters is required.' });
    }
    return next();
  },
  scrubPIIMiddleware,     // 1. Clean PII data
  semanticCacheMiddleware, // 2. Perform database lookup (0 tokens if match)
  handleStreamingChat     // 3. Orchestrate multi-provider fallback streaming
);

export default router;
// import { Router } from 'express';
// import { handleStreamingChat } from '../controllers/orchestrator.controller';
// import { scrubPIIMiddleware } from '../middlewares/pii.middleware';
// import { semanticCacheMiddleware } from '../middlewares/cache.middleware';

// const router = Router();

// // Strict Serial Pipeline Chain 
// router.post(
//   '/chat/stream', 
//   scrubPIIMiddleware,     // 1. Clean PII data
//   semanticCacheMiddleware, // 2. Perform database lookup (0 tokens if match)
//   handleStreamingChat     // 3. Orchestrate multi-provider fallback streaming
// );
// export default router;
