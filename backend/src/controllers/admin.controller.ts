// backend/src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { splitTextIntoChunks } from '../utils/textSplitter';
import { getEmbedding, toPgVector } from '../services/embedding.service';

export const ingestKnowledge = async (req: Request, res: Response) => {
  try {
    // 1. Validate Input
    const { subjectId, type, content, metadata } = req.body;
    if (typeof subjectId !== 'string' || !subjectId || typeof content !== 'string' || content.trim().length < 50) {
      return res.status(400).json({ success: false, error: "A subjectId and at least 50 characters of content are required." });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found.' });

    const chunks = splitTextIntoChunks(content, 800);

    // Complete network requests before opening a transaction so a slow provider
    // cannot hold a database connection and transaction open.
    const vectors: string[] = [];
    for (const chunk of chunks) {
      vectors.push(toPgVector(await getEmbedding(chunk, 'RETRIEVAL_DOCUMENT')));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Insert all vectors atomically.
    await prisma.$transaction(async (tx) => {
      for (const [index, chunk] of chunks.entries()) {
        await tx.$executeRaw`
          INSERT INTO "KnowledgeChunk" ("id", "subjectId", "sourceType", "metadata", "content", "embedding", "createdAt")
          VALUES (
            gen_random_uuid()::text,
            ${subjectId}, 
            ${type || 'GENERAL'}, 
            ${metadata ? JSON.stringify(metadata) : '{}'}::jsonb, 
            ${chunk}, 
            ${vectors[index]}::vector,
            NOW()
          )
        `;

      }
    });

    return res.status(200).json({ 
      success: true, 
      message: `Successfully vectorized and stored ${chunks.length} chunks.` 
    });

  } catch (error: any) {
    console.error("❌ Ingestion Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to ingest data",
    });
  }
};
export const addSubject = async (req: Request, res: Response) => {
  try {
    const { code, name, semester, branch } = req.body;
    const semesterNumber = Number(semester);
    if (typeof code !== 'string' || !code.trim() || typeof name !== 'string' || !name.trim() ||
        !Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 12 ||
        typeof branch !== 'string' || !branch.trim()) {
      return res.status(400).json({ success: false, error: 'code, name, semester (1–12), and branch are required.' });
    }
    const newSubject = await prisma.subject.create({
      data: { code: code.trim(), name: name.trim(), semester: semesterNumber, branch: branch.trim() }
    });
    return res.status(201).json({ success: true, data: newSubject });
  } catch (error) {
    console.error("❌ Add Subject Error:", error);
    return res.status(500).json({ success: false, error: "Failed to create subject" });
  }
};











// // backend/src/controllers/admin.controller.ts
// import { Request, Response } from 'express';
// import { prisma } from '../lib/prisma';
// import { splitTextIntoChunks } from '../utils/textSplitter';
// import { GoogleGenerativeAI } from '@google/generative-ai';

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// export const ingestKnowledge = async (req: Request, res: Response) => {
//   try {
//     // 1. Validate Input
//     const { subjectId, type, content, metadata } = req.body;
//     if (!subjectId || !content || content.length < 50) {
//       return res.status(400).json({ success: false, error: "Invalid input: subjectId and content required." });
//     }

//     const chunks = splitTextIntoChunks(content, 800);
//     const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

//     // 2. Use a Transaction to ensure all chunks are saved or none are
//     await prisma.$transaction(async (tx) => {
//       for (const chunk of chunks) {
//         // Generate Embedding
//         const result = await embeddingModel.embedContent(chunk);
//         const embeddingArray = result.embedding.values;

//         // Save to DB via Transaction
//         await tx.$executeRaw`
//           INSERT INTO "KnowledgeChunk" ("id", "subjectId", "sourceType", "metadata", "content", "embedding", "createdAt")
//           VALUES (
//             gen_random_uuid(), 
//             ${subjectId}, 
//             ${type || 'GENERAL'}, 
//             ${metadata ? JSON.stringify(metadata) : '{}'}::jsonb, 
//             ${chunk}, 
//             ${embeddingArray}::vector, 
//             NOW()
//           )
//         `;

//         // 3. Rate Limit Protection: 100ms pause to avoid Gemini API Rate Limits
//         await new Promise((resolve) => setTimeout(resolve, 100));
//       }
//     });

//     return res.status(200).json({ 
//       success: true, 
//       message: `Successfully vectorized and stored ${chunks.length} chunks.` 
//     });

//   } catch (error: any) {
//     console.error("❌ Ingestion Error:", error);
//     return res.status(500).json({ 
//       success: false, 
//       error: "Failed to ingest data",
//       details: error.message 
//     });
//   }
// };
















// // import { Request, Response } from 'express';
// // import { prisma } from '../lib/prisma'; // तुम्हारा प्रिस्मा क्लाइंट पाथ
// // import { splitTextIntoChunks } from '../utils/textSplitter';
// // import { GoogleGenerativeAI } from '@google/generative-ai';

// // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// // export const ingestKnowledge = async (req: Request, res: Response) => {
// //   try {
// //     const { subjectId, type, content, metadata } = req.body;

// //     if (!content || content.length < 50) {
// //       return res.status(400).json({ success: false, error: "Content too short." });
// //     }

// //     // 1. Text Chunking
// //     const chunks = splitTextIntoChunks(content, 800);
// //     const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// //     // 2. Process each chunk
// //     for (const chunk of chunks) {
// //       // Generate Embedding via Gemini
// //       const result = await embeddingModel.embedContent(chunk);
// //       const embeddingArray = result.embedding.values;

// //       // 3. Save to Supabase using Raw SQL (Prisma doesn't natively support vector inserts well yet)
// //       await prisma.$executeRaw`
// //         INSERT INTO "KnowledgeChunk" ("id", "subjectId", "sourceType", "metadata", "content", "embedding", "createdAt")
// //         VALUES (
// //           gen_random_uuid(), 
// //           ${subjectId}, 
// //           ${type}, 
// //           ${metadata ? JSON.stringify(metadata) : null}::jsonb, 
// //           ${chunk}, 
// //           ${embeddingArray}::vector, 
// //           NOW()
// //         )
// //       `;
// //     }

// //     return res.status(200).json({ 
// //       success: true, 
// //       message: `Processed and stored ${chunks.length} vectorized chunks.` 
// //     });

// //   } catch (error) {
// //     console.error("❌ Ingestion Error:", error);
// //     return res.status(500).json({ success: false, error: "Failed to ingest data" });
// //   }
// // };











// // // import { Request, Response } from 'express';
// // // import prisma from '../config/db';

// // // // 1. Add a New Subject (e.g., Computer Networks - KIT601)
// // // export const addSubject = async (req: Request, res: Response) => {
// // //   try {
// // //     const { code, name, semester, branch } = req.body;

// // //     if (!code || !name || !semester || !branch) {
// // //       return res.status(400).json({ success: false, error: "All fields are required" });
// // //     }

// // //     const newSubject = await prisma.subject.create({
// // //       data: { code, name, semester: Number(semester), branch }
// // //     });

// // //     res.status(201).json({ success: true, data: newSubject });
// // //   } catch (error: any) {
// // //     res.status(500).json({ success: false, error: error.message });
// // //   }
// // // };

// // // // 2. Add Syllabus Units & Topics
// // // export const addSyllabus = async (req: Request, res: Response) => {
// // //   try {
// // //     const { subjectId, unitNumber, title, topics } = req.body;

// // //     if (!subjectId || !unitNumber || !title || !topics) {
// // //       return res.status(400).json({ success: false, error: "All fields are required" });
// // //     }

// // //     const newSyllabus = await prisma.syllabus.create({
// // //       data: {
// // //         subjectId,
// // //         unitNumber: Number(unitNumber),
// // //         title,
// // //         topics: Array.isArray(topics) ? topics : topics.split(',').map((t: string) => t.trim())
// // //       }
// // //     });

// // //     res.status(201).json({ success: true, data: newSyllabus });
// // //   } catch (error: any) {
// // //     res.status(500).json({ success: false, error: error.message });
// // //   }
// // // };

// // // // 3. Upload/Add PYQ Paper
// // // export const addPYQ = async (req: Request, res: Response) => {
// // //   try {
// // //     const { subjectId, year, examType, fileUrl, content } = req.body;

// // //     if (!subjectId || !year || !examType || !fileUrl) {
// // //       return res.status(400).json({ success: false, error: "Missing required fields" });
// // //     }

// // //     const newPYQ = await prisma.pYQ.create({
// // //       data: {
// // //         subjectId,
// // //         year: Number(year),
// // //         examType,
// // //         fileUrl,
// // //         content: content || "" // Full paper text context for AI processing
// // //       }
// // //     });

// // //     res.status(201).json({ success: true, data: newPYQ });
// // //   } catch (error: any) {
// // //     res.status(500).json({ success: false, error: error.message });
// // //   }
// // // };
