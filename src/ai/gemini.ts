import { GoogleGenAI } from "@google/genai";
import type { AIClient } from "./ai-client.ts";

const models = {
  "gemini-2.0-flash-lite": {
    name: "gemini-2.0-flash-lite",
    requestsPerMinute: 30,
    requestsPerDay: 200,
    tokensPerMinute: 1e6,
  },
  "gemini-2.5-pro": {
    name: "gemini-2.5-pro",
    requestsPerMinute: 5,
    requestsPerDay: 100,
    tokensPerMinute: 2.5e5,
  },
  "gemini-2.5-flash-lite": {
    name: "gemini-2.5-flash-lite",
    requestsPerMinute: 15,
    requestsPerDay: 1000,
    tokensPerMinute: 1e6,
  },
} as const;

export class GeminiAIClient implements AIClient {
  ai: GoogleGenAI;
  name = "gemini";
  model: keyof typeof models;

  constructor(model: keyof typeof models) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.model = model;
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
      model: this.model,
      contents: prompt,
    });
    return response.text ?? "";
  }
}
