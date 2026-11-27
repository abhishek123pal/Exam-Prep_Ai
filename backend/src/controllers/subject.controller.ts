import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    // 🛡️ Senior Tip: Never use 'SELECT *' (findMany without select) on public endpoints.
    // Only send exactly what the frontend needs to render the dropdowns/tabs.
    const subjects = await prisma.subject.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        name: 'asc' // Keep the UI predictable
      }
    });

    return res.status(200).json(subjects);
  } catch (error) {
    console.error("❌ GET /subjects Error:", error);
    return res.status(500).json({ error: "Failed to retrieve subjects database." });
  }
};