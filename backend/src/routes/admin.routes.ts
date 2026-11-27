import { Router } from "express";
import { addSubject, ingestKnowledge } from "../controllers/admin.controller";

const router = Router();

router.use((req, res, next) => {
    console.log("🔥 ADMIN REQUEST:", req.method, req.originalUrl);
    next();
});

router.post("/subjects", addSubject);

router.post("/syllabus", (req, res) => {
    req.body.type = "SYLLABUS";
    return ingestKnowledge(req, res);
});

router.post("/pyq", (req, res) => {
    req.body.type = "PYQ";
    return ingestKnowledge(req, res);
});

export default router;





// // backend/src/routes/admin.routes.ts

// import { Router } from 'express';
// import { addSubject, ingestKnowledge } from '../controllers/admin.controller';

// const router = Router();

// router.post('/subjects', addSubject);
// console.log("✅ Admin routes loaded");
// // 🚨 फिक्स: राउट हैंडलर को रैप (wrap) करो ताकि आर्गुमेंट्स मैच करें
// router.post('/syllabus', (req, res) => {
//   // यहाँ हम custom logic लगा सकते हैं या req.body में टाइप डाल सकते हैं
//   req.body.type = 'SYLLABUS';
//   return ingestKnowledge(req, res);
// });

// router.post('/pyq', (req, res) => {
//   req.body.type = 'PYQ';
//   return ingestKnowledge(req, res);
// });

// export default router;