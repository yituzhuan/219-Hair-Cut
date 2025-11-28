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
    throw new Error("API Key 未配置。请在 Vercel 项目设置中添加名为 'API_KEY' 的环境变量，并重新部署。");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(imageBase64),
            },
          },
          {
            text: `请作为一名资深发型设计总监及AI提示词专家，对这张参考图中的发型进行深度视觉解构。
            请从以下维度进行精准描述：
            1. 【剪裁结构】：(如：层次感碎发、一刀切Bob、狼尾鲻鱼头、高层次长发等)
            2. 【刘海细节】：(如：法式八字刘海、眉上狗啃刘海、轻盈空气刘海、S型侧分等)
            3. 【卷度与纹理】：(如：羊毛卷、慵懒法式烫、大波浪、丝滑直发、湿发感造型)
            4. 【发色分析】：(请给出具体的颜色描述，如：冷调黑茶色、浅金亚麻色、脏橘色挑染)
            
            输出要求：
            - 输出一段连贯、画面感极强的中文提示词（Prompt）。
            - 去除“这张照片展示了”、“图中人物”等赘述，直接描述发型本身。
            - 重点描述头发的动势和质感，以便生成模型能完美复刻。`,
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
    throw new Error("API Key 未配置。请在 Vercel 项目设置中添加名为 'API_KEY' 的环境变量，并重新部署。");
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

    // 2. Add Reference Image if exists
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64(referenceImageBase64),
        },
      });
      
      // Hybrid Mode: Visual Reference + Text Guidance
      instructions = `
      ROLE: Professional AI Hair Stylist & Digital Compositor.
      
      TASK: HAIRSTYLE TRANSFER & ADAPTATION.
      
      INPUTS:
      - IMAGE 1 (Target Face): The user. Identity MUST be preserved 100%.
      - IMAGE 2 (Reference Hair): The visual source for the hairstyle.
      - PROMPT: User's specific requirements or analysis of the style.
      
      EXECUTION GUIDELINES:
      1. **VISUAL PRIORITY**: Use IMAGE 2 as the primary blueprint for the hairstyle's Structure, Length, and Texture. The goal is to make IMAGE 1 look like they went to the salon and asked for "The style in IMAGE 2".
      2. **TEXT MODULATION**: Use the PROMPT to understand specific nuances (e.g., color, specific curl tightness). If the PROMPT requests a change (e.g., "Like the photo but shorter"), prioritize the text instruction for that specific attribute while keeping the rest of the visual vibe from IMAGE 2.
      3. **FACE PRESERVATION (STRICT)**: 
         - **NO BEAUTIFICATION**: Do NOT smooth skin, do NOT change eye size, do NOT apply makeup filters. Keep the raw reality of IMAGE 1's face.
         - **IDENTITY LOCK**: The person in the result MUST look exactly like the person in IMAGE 1.
      4. **OCCLUSION PERMITTED**: If the hairstyle in IMAGE 2 features bangs, layers, or strands that cover the forehead, cheeks, or eyes, you MUST reproduce this occlusion on IMAGE 1. Do not artificially expose the face if the style dictates coverage.
      `;
    } else {
      // Text-only Mode
      instructions = `
      INPUTS:
      - IMAGE 1: This is the "TARGET CLIENT".

      YOUR TASK:
      Edit IMAGE 1 to give the client a new hairstyle based strictly on the text description.

      STRICT EXECUTION RULES:
      1. **FACIAL PRESERVATION (CRITICAL)**: 
         - The identity of the person must remain 100% consistent.
         - **PROHIBITED**: Do NOT perform any "beautification", skin smoothing, face slimming, or makeup enhancement. Preserve the original skin texture and facial features exactly.
         - **EXCEPTION**: Hair occlusion is allowed. If the requested hairstyle (e.g., bangs, long side locks) naturally covers parts of the face (forehead, cheeks, jawline, or even eyes), THIS IS PERMITTED.
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