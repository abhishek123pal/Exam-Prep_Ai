import { Router } from 'express';
import { addSubject, addSyllabus, addPYQ } from '../controllers/admin.controller';

const router = Router();

// Admin Write Operations
router.post('/subjects', addSubject);
router.post('/syllabus', addSyllabus);
router.post('/pyq', addPYQ);

export default router;