// backend/src/controllers/chat.controller.ts

import { Request, Response } from 'express';
import { retrieveRelevantContext } from '../services/retrieval.service';
import OpenAI from 'openai'; 

// 1. दोनों क्लाइंट्स को अलग-अलग इनिशियलाइज़ करो
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const cerebrasClient = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: "https://api.cerebras.ai/v1",
});

// Prompt Factory
const PROMPT_FACTORY = {
  chat: "You are a strict and highly knowledgeable AKTU university professor. Answer the student's query based ONLY on the provided context.",
  pyq_analysis: "You are an AKTU exam paper setter. Analyze the provided context and list the most highly repeated questions and patterns.",
  sample_paper: "Act as an external examiner. Generate a strict 70-mark question paper based strictly on the provided syllabus context.",
  prediction: "Analyze the provided syllabus and PYQ context to predict high-probability topics for the upcoming semester exams.",
};

export const streamAIChat = async (req: Request, res: Response) => {
  // SSE Headers Setup (सबसे पहले कनेक्शन एस्टेब्लिश करो)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { prompt, subjectId, type = "chat" } = req.body;

    if (!prompt || !subjectId) {
      res.write(`data: ${JSON.stringify({ error: "Missing prompt or subjectId" })}\n\n`);
      return res.end();
    }

    // 1. Retrieval (Gemini + DB)
    const context = await retrieveRelevantContext(prompt, subjectId);

    // 2. Build Prompt
    const baseSystemPrompt = PROMPT_FACTORY[type as keyof typeof PROMPT_FACTORY] || PROMPT_FACTORY.chat;
    const finalSystemPrompt = `${baseSystemPrompt}\n\n[CONTEXT FROM DATABASE]:\n${context}`;
    const messages = [
      { role: 'system' as const, content: finalSystemPrompt },
      { role: 'user' as const, content: prompt }
    ];

    let stream;
    let currentProvider = "GROQ";

    // 3. THE FALLBACK MECHANISM 🚀
    try {
      // पहली कोशिश: Groq (Primary)
      stream = await groqClient.chat.completions.create({
        model: "llama3-8b-8192",
        messages,
        stream: true,
        temperature: 0.3,
      });
    } catch (groqError: any) {
      console.warn(`⚠️ GROQ Engine Failed: ${groqError.message}. Switching to CEREBRAS Fallback...`);
      
      // दूसरी कोशिश: Cerebras (Fallback)
      currentProvider = "CEREBRAS";
      stream = await cerebrasClient.chat.completions.create({
        model: "gpt-oss-120b", 
        messages,
        stream: true,
        temperature: 0.3,
      });
    }

    // 4. स्ट्रीम को फ्रंटएंड पर भेजना
    for await (const chunk of stream) {
      const textChunk = chunk.choices[0]?.delta?.content || "";
      if (textChunk) {
        res.write(`data: ${JSON.stringify({ text: textChunk, provider: currentProvider })}\n\n`);
      }
    }

    // जब स्ट्रीम सफलता से खत्म हो जाए
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (criticalError: any) {
    // अगर Groq और Cerebras दोनों क्रैश हो जाएं (System Outage)
    console.error("❌ CRITICAL: Both LLM Engines Failed!", criticalError);
    res.write(`data: ${JSON.stringify({ error: "All AI engines are currently down. Please try again later." })}\n\n`);
    res.end();
  }
};