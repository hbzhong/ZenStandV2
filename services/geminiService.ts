
import { GoogleGenAI, Type } from "@google/genai";
import { ZenQuote, CompletionBlessing } from "../types";

// 增加安全检查，防止 process 未定义时报错
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const fetchZenWisdom = async (): Promise<ZenQuote> => {
  try {
    const key = getApiKey();
    if (!key) throw new Error("API Key is missing");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a short Zen quote in Chinese related to standing meditation (Zhan Zhuang), internal energy, or mindfulness. Also provide a one-sentence tip for posture or breathing during Zhan Zhuang.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING, description: "The Zen quote" },
            author: { type: Type.STRING, description: "Attributed author or '佚名'" },
            advice: { type: Type.STRING, description: "One-sentence posture/breathing tip" }
          },
          required: ["quote", "author", "advice"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error fetching Zen wisdom:", error);
    return {
      quote: "静心站立，感受天地的律动。",
      author: "古德",
      advice: "虚灵顶劲，沉肩坠肘，让气息自然流动。"
    };
  }
};

export const fetchCompletionBlessing = async (durationMinutes: number): Promise<CompletionBlessing> => {
  try {
    const key = getApiKey();
    if (!key) throw new Error("API Key is missing");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user just finished ${durationMinutes} minutes of Zhan Zhuang (standing meditation). Generate a 4-character poetic title (e.g. 功德圆满, 气定神闲) and a short, encouraging Zen-style blessing in Chinese (max 30 words).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            message: { type: Type.STRING }
          },
          required: ["title", "message"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return {
      title: "功德圆满",
      message: "每一次静立都是对灵魂的洗涤，愿您气血充盈，神清气爽。"
    };
  }
};
