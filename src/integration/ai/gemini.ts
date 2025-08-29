import { GoogleGenAI } from "@google/genai";
import { AIClient, PromptRequest } from "./ai-client.ts";

const models = {
  "gemini-2.0-flash-lite": {
    name: "gemini-2.0-flash-lite",
    requestsPerMinute: 30,
    requestsPerDay: 200,
    tokensPerMinute: 1e6,
  },
} as const;

const GEMINI_MODEL = models["gemini-2.0-flash-lite"];

export class GeminiAIClient implements AIClient {
  ai: GoogleGenAI;

  constructor() {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.ai = new GoogleGenAI({ apiKey: geminiApiKey });
  }

  getJsonContent(response: string) {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON response");
    }
    return JSON.parse(jsonMatch[0]);
  }

  async generateContent(prompt: string) {
    const response = await this.ai.models.generateContent({
      model: GEMINI_MODEL.name,
      contents: prompt,
    });
    return response.text ?? "";
  }

  async *streamContent(requests: PromptRequest[]) {
    for (const request of requests) {
      yield { response: this.generateContent(request.prompt), request };
    }
  }
}
