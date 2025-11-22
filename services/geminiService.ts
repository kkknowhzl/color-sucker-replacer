import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

/**
 * Analyzes a specific point in an image to describe the color contextually.
 * @param imageBase64 - The base64 string of the FULL image (or a crop).
 * @param x - X coordinate of interest.
 * @param y - Y coordinate of interest.
 * @param hex - The hex color detected locally.
 */
export const analyzeColorContext = async (
  imageBase64: string,
  x: number,
  y: number,
  hex: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  try {
    // Remove data URL prefix if present for the API call
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      I have selected a specific point on this image at coordinates (${x}, ${y}).
      The exact color value I detected is ${hex}.
      
      Please analyze this location and tell me:
      1. A descriptive name for this specific shade of color.
      2. What object or material appears to be at this location.
      
      Keep the response concise (under 50 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG or JPEG, API handles standard types
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    return response.text || "No analysis available.";
  } catch (error: any) {
    console.error("Gemini analysis failed:", error);
    throw new Error(error.message || "Failed to analyze image.");
  }
};