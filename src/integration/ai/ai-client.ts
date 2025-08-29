export interface PromptResponse {
  response: Promise<string>;
  request: PromptRequest;
}

export interface PromptRequest {
  prompt: string;
  key: string;
  options?: {
    asJson?: boolean;
    validateJson?: (json: unknown) => boolean;
  };
}

export interface AIClient {
  name: string;
  getJsonContent: (response: string) => unknown;
  generateContent: (prompt: string) => Promise<string>;
}

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
      console.error(
        `Error generating content for job ${request.key} with ${ai.name}: ${error}`,
      );
    }
  }

  throw new Error("No AI client was able to generate content");
}
