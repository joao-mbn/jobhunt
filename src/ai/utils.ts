import { gemini2_0FlashLiteAIClient, gemini2_5FlashLiteAIClient, gemini2_5ProAIClient } from "./gemini.ts";
import { localAIClient } from "./local-ai.ts";
import type { AIClient, PromptRequest } from "./types.ts";

/**
 * Attempts to generate content using each AI client in sequence, until one succeeds.
 * If all fail, throws an error.
 */
export async function attemptPromptSequentially(ais: AIClient[], request: PromptRequest) {
  for (const ai of ais) {
    try {
      const rawResponse = await ai.generateContent(request.prompt);
      if (!request.options?.asJson) {
        return { response: rawResponse, request };
      }

      const json = ai.getJsonContent(rawResponse);
      if (!request.options?.validateJson) {
        return { response: json, request };
      }

      if (!request.options.validateJson(json)) {
        throw new Error("Invalid JSON response");
      }
      return { response: json, request };
    } catch (error) {
      console.error(`Error generating content for job ${request.key} with ${ai.name}: ${error}`);
    }
  }

  throw new Error("No AI client was able to generate content");
}

export const ais = [gemini2_5ProAIClient, gemini2_5FlashLiteAIClient, gemini2_0FlashLiteAIClient, localAIClient];
