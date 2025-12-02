import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI with API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFoodDescription = async (
  base64Image: string, 
  userComment: string,
  restaurantName: string
): Promise<string> => {
  try {
    const prompt = `I am at a restaurant called "${restaurantName}".
    Here is a photo of what I'm eating.
    My initial thought is: "${userComment}".
    
    Please write a short, fun, 1-sentence social media style caption for this food. 
    Mention the visual appeal if possible.`;

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || "Delicious!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate description.";
  }
};
