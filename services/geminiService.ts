
import { GoogleGenAI } from "@google/genai";

// We initialize the SDK inside the function to prevent the app from crashing 
// on startup if the API_KEY is missing or invalid in the environment.

export const generateFoodDescription = async (
  base64Image: string, 
  userComment: string,
  restaurantName: string
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API Key is missing");
      return "Error: API Key missing.";
    }

    const ai = new GoogleGenAI({ apiKey });

    let cleanBase64 = '';
    let mimeType = 'image/jpeg'; // Default fallback

    // Fix: Handle blob URLs and extract correct MIME type
    if (base64Image.startsWith('blob:')) {
      const response = await fetch(base64Image);
      const blob = await response.blob();
      mimeType = blob.type; // Extract actual type (e.g. image/png)
      
      cleanBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Extract base64 part
          resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else if (base64Image.startsWith('data:')) {
      // Extract MIME type from Data URL
      const matches = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      if (matches && matches[1]) {
        mimeType = matches[1];
      }
      // Remove Data URL prefix
      cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    } else {
      // Assume raw base64 is jpeg if unknown
      cleanBase64 = base64Image;
    }

    const prompt = `I am at a restaurant called "${restaurantName}".
    Here is a photo of what I'm eating.
    My initial thought is: "${userComment}".
    
    Please write a short, fun, 1-sentence social media style caption for this food. 
    Mention the visual appeal if possible.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType, // Pass the correct dynamic mime type
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
