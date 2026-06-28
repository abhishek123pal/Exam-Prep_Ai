import { Request, Response } from 'express';
import { LLMOrchestrator } from '../core/llm/llm.factory';
import { generateStudyMaterial, generateSamplePaper } from '../services/ai.services';
import { memoryService } from '../services/memory.services';
import prisma from '../config/db';

const orchestrator = new LLMOrchestrator();

export const handleStreamingChat = async (req: Request, res: Response) => {
  const { prompt, subjectId, type, embedding } = req.body;
  const sessionId = req.body.sessionId || `session_${subjectId}`;

  // SSE Protocol Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    let activePrompt = '';

    // 1. Prompt Generation Logic
    if (type === 'sample_paper') {
      activePrompt = await generateSamplePaper(subjectId);
    } else {
      if (!prompt) {
        res.write(`data: ${JSON.stringify({ error: "Prompt context is required." })}\n\n`);
        return res.end();
      }
      activePrompt = await generateStudyMaterial(subjectId, prompt);
      
      // Critical Guard: Empty DB response prevention
      if (!activePrompt || activePrompt.trim() === '') {
        console.error("❌ CRITICAL: generateStudyMaterial returned EMPTY string!");
        res.write(`data: ${JSON.stringify({ error: "Failed to generate context." })}\n\n`);
        return res.end();
      }
    }

    // 2. Memory Retrieval (Get history BEFORE orchestrating)
    const history= await memoryService.getHistory(sessionId);

    // 3. Orchestration (Pass history correctly to LLM)
    const generator = await orchestrator.getActiveStream(activePrompt, history);
    let fullResponseText = '';

    for await (const chunk of generator) {
      fullResponseText += chunk.text || '';
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    // 4. Memory Update (Atomic Push after successful stream)
    if (fullResponseText && type !== 'sample_paper') {
     await memoryService.addMessage(sessionId, 'user', prompt);
     await memoryService.addMessage(sessionId, 'assistant', fullResponseText);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // 5. Async Cache Worker
    if (type !== 'sample_paper' && embedding && fullResponseText) {
      const formattedEmbedding = Array.isArray(embedding) ? `[${embedding.join(',')}]` : embedding;
      prisma.$executeRaw`
        INSERT INTO "SemanticCache" (query, response, embedding)
        VALUES (${prompt}, ${fullResponseText}, ${formattedEmbedding}::vector)
        ON CONFLICT (query) DO NOTHING;
      `.catch(e => console.error("⚠️ [CACHE WORKER ERROR]:", e.message));
    }

  } catch (err: any) {
    console.error("💥 [ORCHESTRATOR CRITICAL FAILURE]:", err.message);
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Academic backend infrastructure failed." })}\n\n`);
    }
    res.end();
  }
};