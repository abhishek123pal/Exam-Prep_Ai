import prisma from '../config/db';

// 1. Existing Topic Chat Service
export const generateStudyMaterial = async (subjectId: string, topicQuery: string) => {
  try {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new Error("Target subject not found.");

    const syllabusNodes = await prisma.syllabus.findMany({ where: { subjectId } });
    const pyqNodes = await prisma.pYQ.findMany({ where: { subjectId } });

    const syllabusContext = syllabusNodes.map(s => `Unit ${s.unitNumber} (${s.title}): ${s.topics.join(', ')}`).join('\n');
    const pyqContext = pyqNodes.map(p => `Year ${p.year} (${p.examType}): ${p.content}`).join('\n');

    return `
      You are an expert university evaluator for "${subject.name}" (Code: ${subject.code}).
      The student is asking about: "${topicQuery}".
      Syllabus Context:\n${syllabusContext}
      PYQ Context:\n${pyqContext}
      Provide an exam-ready answer for "${topicQuery}". Do not output unrelated network concepts unless asked.
    `;
  } catch (error: any) {
    throw new Error(`Study Material Service Error: ${error.message}`);
  }
};

// 2. NEW: Enterprise-Grade Sample Paper Generator Service
export const generateSamplePaper = async (subjectId: string) => {
  try {
    // Fetch subject details
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new Error("Subject not found for Sample Paper generation.");

    // Fetch syllabus and historical questions
    const syllabusNodes = await prisma.syllabus.findMany({ where: { subjectId } });
    const pyqNodes = await prisma.pYQ.findMany({ where: { subjectId } });

    const syllabusContext = syllabusNodes.map(s => `Unit ${s.unitNumber} (${s.title}): ${s.topics.join(', ')}`).join('\n');
    const pyqContext = pyqNodes.map(p => `Year ${p.year} (${p.examType}): ${p.content}`).join('\n');

    // Build the Strict University Exam BluePrint Prompt
    const prompt = `
      You are the Head of the Examination Board for "${subject.branch}" Engineering. 
      Your task is to draft a highly realistic, highly expected **Sample Question Paper** for the upcoming semester exam of "${subject.name}" (Subject Code: ${subject.code}).

      --- UNIVERSITY OFFICIAL SYLLABUS CURRICULUM ---
      ${syllabusContext || "Standard university engineering syllabus for this domain."}

      --- HISTORICAL PYQ PATTERNS & WEIGHTAGE ---
      ${pyqContext || "No historical papers available. Build based on standard unit weightage."}

      --- EXAM STRUCTURE COMPLIANCE ---
      Generate the paper exactly in this standard university structure:
      - **SECTION A (Short Answer Type)**: 10 compulsory questions of 2 marks each (covering all syllabus units uniformly).
      - **SECTION B (Medium/Long Answer Type)**: 5 questions of 10 marks each (Student must attempt any 3).
      - **SECTION C (Deep/Numerical/Design Type)**: 5 long conceptual/numerical questions of 10 marks each with internal choice (Student must attempt any 3).

      Ensure the questions are high-probability questions derived strictly from the overlapping concepts between the Syllabus and high-frequency PYQs. Do NOT default to unrelated topics. Output inside a clean, beautiful Markdown template.
    `;

    return prompt;
  } catch (error: any) {
    console.error("Sample Paper Service Error:", error.message);
    throw error;
  }
};