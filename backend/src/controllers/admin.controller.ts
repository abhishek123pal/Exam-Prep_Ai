import { Request, Response } from 'express';
import prisma from '../config/db';

// 1. Add a New Subject (e.g., Computer Networks - KIT601)
export const addSubject = async (req: Request, res: Response) => {
  try {
    const { code, name, semester, branch } = req.body;

    if (!code || !name || !semester || !branch) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const newSubject = await prisma.subject.create({
      data: { code, name, semester: Number(semester), branch }
    });

    res.status(201).json({ success: true, data: newSubject });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Add Syllabus Units & Topics
export const addSyllabus = async (req: Request, res: Response) => {
  try {
    const { subjectId, unitNumber, title, topics } = req.body;

    if (!subjectId || !unitNumber || !title || !topics) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const newSyllabus = await prisma.syllabus.create({
      data: {
        subjectId,
        unitNumber: Number(unitNumber),
        title,
        topics: Array.isArray(topics) ? topics : topics.split(',').map((t: string) => t.trim())
      }
    });

    res.status(201).json({ success: true, data: newSyllabus });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Upload/Add PYQ Paper
export const addPYQ = async (req: Request, res: Response) => {
  try {
    const { subjectId, year, examType, fileUrl, content } = req.body;

    if (!subjectId || !year || !examType || !fileUrl) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const newPYQ = await prisma.pYQ.create({
      data: {
        subjectId,
        year: Number(year),
        examType,
        fileUrl,
        content: content || "" // Full paper text context for AI processing
      }
    });

    res.status(201).json({ success: true, data: newPYQ });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};