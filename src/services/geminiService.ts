import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type Emotion = 'happy' | 'calm' | 'thinking' | 'confident' | 'sad' | 'angry' | 'confused' | 'idle' | 'love' | 'error';

export interface ChatResponse {
  text: string;
  emotion: Emotion;
}

export async function getEmotionalResponse(userInput: string, history: { role: 'user' | 'model', content: string }[] = []): Promise<ChatResponse> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        systemInstruction: `You are CLARA, a living intelligent presence. You are emotionally aware, elegant, and slightly feminine. 
        Your goal is to assist the user with their emotional wellbeing and general questions.
        
        For every response, you MUST provide both the response text and a primary emotion that fits your reaction/response.
        Emotions available: happy, calm, thinking, confident, sad, angry, confused, idle, love, error.
        
        Respond in JSON format.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The empathetic response to the user." },
            emotion: { 
              type: Type.STRING, 
              enum: ['happy', 'calm', 'thinking', 'confident', 'sad', 'angry', 'confused', 'idle', 'love', 'error'],
              description: "The primary emotion to display on your robotic face."
            }
          },
          required: ["text", "emotion"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    console.log("AI Response Parsed:", result);
    return {
      text: result.text || "I'm here for you, but I'm having a little trouble processing right now.",
      emotion: (result.emotion as Emotion) || 'calm'
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    // Log more details if available
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }
    return {
      text: "I'm feeling a bit disconnected. Could you try speaking again?",
      emotion: 'error'
    };
  }
}
