export const getEmbedding = async (text: string): Promise<number[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("CRITICAL: GEMINI_API_KEY is MISSING inside Embedding Service");
  }

  // 🛑 FAIL-FAST: अगर टेक्स्ट खाली है, तो API कॉल ही मत करो!
  if (!text || text.trim() === '') {
    throw new Error("Embedding API Error: Input text is empty.");
  }

  // ⚡ STABLE V1 ENDPOINT (Best Practice for text-embedding-004)
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
  console.log(`🔍 Embedding API Call initiated to: ${baseUrl}`); 

  try {
    const response = await fetch(`${baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // 🛡️ CRITICAL FIX: Google require करता है कि मॉडल का नाम बॉडी में भी हो
        model: "models/text-embedding-004",
        content: { 
          parts: [{ text: text }] 
        } 
      })
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(`Embedding API Error [${response.status}]: ${errorPayload}`);
    }
    
    const result = await response.json();
    
    // 🛡️ CRITICAL FIX: Gemini API का एक्चुअल रिस्पॉन्स स्ट्रक्चर result.embedding.values होता है
    if (!result?.embedding?.values) {
      throw new Error("Invalid response structure received from Gemini Embedding API");
    }

    return result.embedding.values;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during embedding fetch.";
    console.error("❌ Embedding Generation Failed:", errorMessage);
    throw error;
  }
};









// export const getEmbedding = async (text: string): Promise<number[]> => {
//   const apiKey = process.env.GEMINI_API_KEY;
//   if (!apiKey) {
//     throw new Error("CRITICAL: GEMINI_API_KEY is MISSING inside Embedding Service");
//   }

//   // 🛑 FAIL-FAST: अगर टेक्स्ट खाली है, तो API कॉल ही मत करो!
//   if (!text || text.trim() === '') {
//     throw new Error("Embedding API Error: Input text is empty.");
//   }

//   const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
//   console.log(`🔍 Embedding API Call initiated to: ${baseUrl}`); 

//   try {
//     const response = await fetch(`${baseUrl}?key=${apiKey}`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         // ❌ YAHAN SE 'model' KEY HATA DI GAYI HAI
//         content: { parts: [{ text: text }] } 
//       })
//     });

//     if (!response.ok) {
//       const errorPayload = await response.text();
//       throw new Error(`Embedding API Error [${response.status}]: ${errorPayload}`);
//     }
    
//     const result = await response.json();
    
//     if (!result?.embedding?.values) {
//       throw new Error("Invalid response structure received from Gemini Embedding API");
//     }

//     return result.embedding.values;
    
//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during embedding fetch.";
//     console.error("❌ Embedding Generation Failed:", errorMessage);
//     throw error;
//   }
// };