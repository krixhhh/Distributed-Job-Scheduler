import { GoogleGenAI } from "@google/genai";
import { logger } from "../logger/index.js";

export class GeminiService {
  /**
   * Contacts Gemini API to analyze a failed job exception
   */
  static async analyzeFailure(
    jobName: string,
    payload: string,
    errorMsg: string
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      logger.warn("GEMINI_API_KEY environment variable is not defined. Using mock analytics engine.");
      return this.generateFallbackSuggestion(jobName, errorMsg);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are a Staff Site Reliability Engineer and AI Troubleshooter.
        Analyze this background execution exception details and explain why it failed, and suggest specific steps to correct it.
        Keep it direct, actionable, and formatted in clean Markdown.

        Job Parameters:
        - Job Class Name: ${jobName}
        - Runtime Payload Args: ${payload}
        - Thrown Error Exception: ${errorMsg}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text || "Failed to parse API suggestion output.";
    } catch (err: any) {
      logger.error(`Gemini API execution error: ${err.message}`);
      return this.generateFallbackSuggestion(jobName, errorMsg);
    }
  }

  private static generateFallbackSuggestion(jobName: string, errorMsg: string): string {
    return `### AI Diagnostics Suggestion
- **Exception Summary**: Job execution triggered a runtime error: \`${errorMsg}\`.
- **Primary Diagnostics**:
  1. Check network routing and connection strings for external endpoints.
  2. Verify payload attributes match expected JSON schemas.
  3. Review execution permissions and roles.
  4. Ensure rate limits or concurrency capacities are not exceeded.`;
  }
}
