import { Request, Response, NextFunction } from 'express';

const PII_REGEX = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
};

export const scrubPIIMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && req.body.prompt) {
    let cleanPrompt = req.body.prompt;
    
    cleanPrompt = cleanPrompt.replace(PII_REGEX.email, '[REDACTED_EMAIL]');
    cleanPrompt = cleanPrompt.replace(PII_REGEX.phone, '[REDACTED_PHONE]');
    cleanPrompt = cleanPrompt.replace(PII_REGEX.ip, '[REDACTED_IP]');
    
    req.body.prompt = cleanPrompt;
  }
  next();
};