import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { TableData } from "../types";

// Schema for the expected response - kept for fixTableJson
const tableSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, descriptive title for the table"
    },
    summary: {
      type: Type.STRING,
      description: "A 2-sentence captivating summary of the data, suitable for reading aloud as an intro."
    },
    columns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of column headers"
    },
    data: {
      type: Type.ARRAY,
      items: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      description: "2D array of strings representing rows matching the columns"
    }
  },
  required: ["title", "columns", "data"]
};

export const generateTableFromPrompt = async (prompt: string): Promise<TableData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a data visualization expert.
        Goal: Generate a structured data table based on this topic: "${prompt}". 
        
        Tools: You have access to Google Search. Use it to find the most recent, accurate, and up-to-date information. Verify your facts.

        Output Format:
        Return ONLY valid JSON.
        The JSON must strictly follow this structure:
        {
          "title": "A short, descriptive title",
          "summary": "A 1-2 sentence interesting fact or summary about this data that would sound good spoken aloud.",
          "columns": ["Header 1", "Header 2", ...],
          "data": [
            ["Row 1 Col 1", "Row 1 Col 2", ...],
            ...
          ]
        }

        Requirements:
        1. Ensure the data is formatted correctly for a presentation.
        2. If the user asks for a specific language (like Nepali, Spanish), use that language.
      `,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: string[] = [];
    if (Array.isArray(groundingChunks)) {
        groundingChunks.forEach((chunk: any) => {
            const uri = chunk.web?.uri;
            if (typeof uri === 'string') {
                sources.push(uri);
            }
        });
    }

    let parsedData: TableData;
    try {
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : cleanedText;
        
        parsedData = JSON.parse(jsonString) as TableData;
    } catch (e) {
        console.error("JSON Parse Error, attempting fix", e);
        return await fixTableJson(text);
    }
    
    if (sources.length > 0) {
        parsedData.sources = [...new Set(sources)];
    }

    return parsedData;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const fixTableJson = async (brokenJson: string): Promise<TableData> => {
   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

   try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Fix this malformed JSON or raw text into a valid table structure: ${brokenJson}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: tableSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");
    
    return JSON.parse(text) as TableData;
  } catch (error) {
    console.error("Gemini Fix Error:", error);
    throw error;
  }
}

export const generateBackgroundImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `A cinematic, high-quality, abstract background image suitable for a data presentation about: ${prompt}. Dark mode, subtle details, 4k resolution, no text.` }
        ]
      },
      config: {
        // No responseMimeType for image generation models
      }
    });

    let base64Image = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) throw new Error("No image generated");
    
    return `data:image/png;base64,${base64Image}`;

  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

export const generateVoiceover = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");

    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};