import { redis } from '../config/redis';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
const localHistory = new Map<string, ChatMessage[]>();

export const memoryService = {
  // 1. Fetch chat history from Redis
  getHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    if (!redis) return localHistory.get(sessionId) || [];
    try {
      const data = await redis.get(`chat:${sessionId}`);
      return data ? JSON.parse(data) : [];
    } catch (error: any) {
      console.error(`⚠️ [REDIS FETCH ERROR] for session ${sessionId}:`, error.message);
      return localHistory.get(sessionId) || [];
    }
  },

  // 2. Append message and save back with 24-hour expiration
  addMessage: async (sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> => {
    try {
      const key = `chat:${sessionId}`;
      const history = await memoryService.getHistory(sessionId);
      
      history.push({ role, content });

      // 🛡️ Context Window Protection: अगर 10 से ज्यादा मैसेज हैं, तो पुराना हटाओ (Token Limit Fix)
      const boundedHistory = history.slice(-10);

      // Redis में JSON स्ट्रिंग स्टोर करो और 24 घंटे (86400 सेकंड) का TTL सेट करो
      if (redis) await redis.set(key, JSON.stringify(boundedHistory), 'EX', 86400);
      else localHistory.set(sessionId, boundedHistory);
    } catch (error: any) {
      console.error(`⚠️ [REDIS SAVE ERROR] for session ${sessionId}:`, error.message);
      const fallback = [...(localHistory.get(sessionId) || []), { role, content }].slice(-10);
      localHistory.set(sessionId, fallback);
    }
  },

  // 3. Optional: Clear history if user resets chat
  clearHistory: async (sessionId: string): Promise<void> => {
    try {
      if (redis) await redis.del(`chat:${sessionId}`);
      else localHistory.delete(sessionId);
    } catch (error: any) {
      console.error(`⚠️ [REDIS DELETE ERROR]:`, error.message);
      localHistory.delete(sessionId);
    }
  }
};







// export interface ChatMessage {
//   role: 'user' | 'assistant' | 'system';
//   content: string;
// }

// class MemoryService {
//   // 🚀 In-memory store (MVP के लिए बेस्ट है। प्रोडक्शन में इसे Redis से रिप्लेस करना)
//   private store: Map<string, ChatMessage[]> = new Map();
  
//   // 🛑 AI का कॉन्टेक्स्ट विंडो फटने से बचाने के लिए लिमिट
//   private readonly MAX_HISTORY_LENGTH = 10; 

//   /**
//    * सेशन का पिछला कॉन्टेक्स्ट निकालता है
//    */
//   getHistory(sessionId: string): ChatMessage[] {
//     return this.store.get(sessionId) || [];
//   }

//   /**
//    * नई बातचीत को मेमोरी में डालता है और पुरानी डिलीट करता है (Sliding Window)
//    */
//   addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): void {
//     if (!this.store.has(sessionId)) {
//       this.store.set(sessionId, []);
//     }
    
//     const history = this.store.get(sessionId)!;
//     history.push({ role, content });

//     // अगर हिस्ट्री लिमिट से ज्यादा हो गई, तो सबसे पुराने मैसेज उड़ा दो (Scalability!)
//     if (history.length > this.MAX_HISTORY_LENGTH) {
//       this.store.set(sessionId, history.slice(history.length - this.MAX_HISTORY_LENGTH));
//     }
//   }

//   /**
//    * जब स्टूडेंट "Clear Chat" दबाए
//    */
//   clearMemory(sessionId: string): void {
//     this.store.delete(sessionId);
//     console.log(`🧹 Memory cleared for session: ${sessionId}`);
//   }
// }

// // Export as Singleton
// export const memoryService = new MemoryService();
