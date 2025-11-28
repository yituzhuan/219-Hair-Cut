import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to strip data URL prefix if present
const cleanBase64 = (base64Str: string) => {
  return base64Str.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

/**
 * Analyzes the hairstyle in an image and returns a descriptive prompt.
 */
export const analyzeHairStyle = async (imageBase64: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is fast and good at describing images
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(imageBase64),
            },
          },
          {
            text: "请作为一名专业发型师，详细分析这张图片中的发型。描述其长度、卷度、刘海样式、发色、质感以及整体风格。输出一段简洁、精准的中文描述，用于作为AI生图的提示词。直接输出描述，不要加‘这张图片...’等废话。",
          },
        ],
      },
    });

    return response.text || "无法识别发型，请重试。";
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error("分析失败，请稍后重试");
  }
};

export const generateHairstyle = async (
  userImageBase64: string,
  prompt: string,
  referenceImageBase64?: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  try {
    const parts: any[] = [];

    // 1. Add User Image (The image to be edited) - INDEX 0
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64(userImageBase64),
      },
    });

    let instructions = "";

    // 2. Add Reference Image if exists (Only used for Smart Transfer if explicitly requested, but mostly we rely on text now)
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64(referenceImageBase64),
        },
      });
      
      // Strict Visual Transfer Instructions
      instructions = `
      ROLE: Professional Digital Retoucher.
      
      TASK: VISUAL COMPOSITING (HAIR TRANSPLANT).
      
      INPUTS:
      - IMAGE 1 (Face Source): The client. Identity MUST be preserved 100%.
      - IMAGE 2 (Hair Source): The target hairstyle.
      
      EXECUTION:
      - Replace the hair in IMAGE 1 with the hair from IMAGE 2.
      - Keep the visible parts of the face in IMAGE 1 exactly the same.
      - ALLOW HAIR TO COVER THE FACE: If the hairstyle in IMAGE 2 covers the forehead, cheeks, or eyes, recreate that covering on IMAGE 1. Do not force the full face to be visible.
      - Ignore any previous hair in IMAGE 1.
      `;
    } else {
      // Instructions for Text-only generation (The preferred method for better face preservation)
      instructions = `
      INPUTS:
      - IMAGE 1: This is the "TARGET CLIENT".

      YOUR TASK:
      Edit IMAGE 1 to give the client a new hairstyle based on the text description.

      STRICT EXECUTION RULES:
      1. **FACIAL PRESERVATION**: Keep the identity of the person 100% consistent. 
         - **EXCEPTION**: IF the requested hairstyle (e.g., bangs, long side locks, heavy layering) naturally covers parts of the face (forehead, cheeks, jawline, or even eyes), THIS IS PERMITTED. 
         - **DO NOT** artificially expose the face if the style requires coverage.
         - Only the *visible* parts of the face (skin texture, features not covered by hair) must remain identical.
      2. **HAIR REPLACEMENT**: Completely replace the original hair with the described style.
      3. **REALISM**: The generated hair must look photorealistic and naturally blended.
      `;
    }

    // 3. Add System Prompt with User Request
    const systemPrompt = `
    ${instructions}

    USER REQUEST DESCRIPTION:
    ${prompt}
    `;
    
    parts.push({ text: systemPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
    });

    // Parse response for image
    let textResponse = "";
    
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
            if (part.text) {
                textResponse += part.text;
            }
        }
    }

    // If we reached here, no image was found.
    console.error("Gemini Text Response:", textResponse);
    if (textResponse) {
        throw new Error(`生成失败 (模型反馈): ${textResponse.slice(0, 100)}...`);
    }

    throw new Error("未生成图片，请尝试更换照片或描述重试。");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "生成失败，请稍后重试");
  }
};