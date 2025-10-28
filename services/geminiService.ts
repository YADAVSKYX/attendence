import { GoogleGenAI, Type } from "@google/genai";
import type { TimeTableEntry } from '../types';

// Type for the AI response, omitting 'id' which we'll add on the client-side.
type ScannedTimeTableEntry = Omit<TimeTableEntry, 'id'>;


export const getStudyTip = async (subjects: string[]): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `I am a university student studying the following subjects: ${subjects.join(', ')}. Please provide me with one concise, actionable, and encouraging study tip that is highly relevant to these subjects. Format it nicely as a short paragraph. Think deeply to provide the best possible advice.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error fetching study tip from Gemini API:", error);
        return "Sorry, I couldn't fetch a study tip right now. Make sure your connection and API key are correct.";
    }
};

export const scanTimetable = async (fileData: { mimeType: string; data: string }): Promise<ScannedTimeTableEntry[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const textPart = {
        text: "You are an expert timetable parser. Analyze the provided image of a student's class schedule. Extract all class entries from Monday to Saturday. For each class, identify the subject name, the day of the week, the start time, and the end time. Convert all times to 24-hour format (HH:MM). Return the result as a JSON array that adheres to the provided schema. Ignore any classes on Sunday. If the image is unclear or not a timetable, return an empty array."
    };

    const imagePart = {
        inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.data
        }
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, textPart] },
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            subject: { type: Type.STRING, description: "The name of the class or subject." },
                            day: { type: Type.STRING, description: "The day of the week (e.g., 'Monday')." },
                            startTime: { type: Type.STRING, description: "The start time in HH:MM format." },
                            endTime: { type: Type.STRING, description: "The end time in HH:MM format." }
                        },
                        required: ["subject", "day", "startTime", "endTime"]
                    }
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse as ScannedTimeTableEntry[];

    } catch (error) {
        console.error("Error scanning timetable from Gemini API:", error);
        throw new Error("Failed to scan the timetable. The image might be unclear or in an unsupported format. Please try again or enter the details manually.");
    }
};

export const getUniversityCoordinates = async (universityName: string): Promise<{ lat: number; lng: number } | null> => {
    if (!universityName) return null;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `What are the geographic coordinates (latitude and longitude) for "${universityName}"?`,
            config: {
                tools: [{ googleMaps: {} }],
            },
        });

        // Attempt to extract coordinates from grounding chunks first for higher accuracy
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
            for (const chunk of chunks) {
                if (chunk.maps && chunk.maps.placeDetails && chunk.maps.placeDetails.coordinate) {
                    const { latitude, longitude } = chunk.maps.placeDetails.coordinate;
                    if (latitude && longitude) {
                        return { lat: latitude, lng: longitude };
                    }
                }
            }
        }

        // Fallback to parsing the text response if no grounding metadata is found
        const text = response.text;
        const latMatch = text.match(/latitude:?\s*(-?\d+\.\d+)/i);
        const lngMatch = text.match(/longitude:?\s*(-?\d+\.\d+)/i);

        if (latMatch && lngMatch) {
            return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) };
        }

        return null;
    } catch (error) {
        console.error("Error fetching university coordinates:", error);
        return null;
    }
};