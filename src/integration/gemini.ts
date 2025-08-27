import { GoogleGenAI } from "@google/genai";
import { delay } from "../utils/promise.ts";

const models = {
  "gemini-2.0-flash-lite": {
    name: "gemini-2.0-flash-lite",
    requestsPerMinute: 30,
    requestsPerDay: 200,
    tokensPerMinute: 1e6,
  },
} as const;

const MODEL = models["gemini-2.0-flash-lite"];

export function createGenAIClient(): GoogleGenAI {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  return new GoogleGenAI({ apiKey: geminiApiKey });
}

export async function generateContent(ai: GoogleGenAI, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL.name,
    contents: prompt,
  });
  return response.text ?? "";
}

export function getJsonFromResponse(response: string): unknown {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse JSON response");
  }
  return JSON.parse(jsonMatch[0]);
}

export async function processWithRateLimit<T, A, R>(
  items: T[],
  fn: (item: T, args: A) => Promise<R>,
  args: A,
): Promise<R[]> {
  const results: R[] = [];

  const batches = [];
  for (let i = 0; i < items.length; i += MODEL.requestsPerMinute) {
    batches.push(items.slice(i, i + MODEL.requestsPerMinute));
  }

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) {
      const oneMinute = 1e3 * 60;
      await delay(oneMinute);
    }

    const batch = batches[i]!;
    const batchResults = await Promise.all(batch.map((item) => fn(item, args)));
    results.push(...batchResults);
  }

  return results;
}
