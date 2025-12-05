import { GoogleGenAI } from "@google/genai";
import { DrowsinessStats } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found. Gemai features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTripCoaching = async (stats: DrowsinessStats): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Trip analysis unavailable (Missing API Key). Drive safely!";

  const durationMinutes = Math.round(stats.monitoringDurationMs / 1000 / 60);

  const prompt = `
    You are VigiLens, a friendly and professional driving safety coach.
    Analyze the following driving session statistics and provide a short, helpful summary 
    and specific safety advice for the driver. Be encouraging but firm about safety.
    
    Session Stats:
    - Duration: ${durationMinutes} minutes
    - Drowsiness Score (Peak): ${stats.score}/100
    - Microsleeps detected: ${stats.microsleepCount}
    - Long blinks: ${stats.longBlinkCount}
    - Yawns: ${stats.yawnCount}
    - Distraction events: ${stats.distractionEvents}
    
    Output format: Plain text, max 3 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Great job keeping your eyes on the road! Remember to take breaks on long trips.";
  }
};
