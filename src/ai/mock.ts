import type { AIClient } from "./types.ts";
import { getJsonContent } from "./utils.ts";

export class HappyAIClient implements AIClient {
  name = "happy-ai";

  getJsonContent(response: string): unknown {
    return getJsonContent(response);
  }

  generateContent(prompt: string): Promise<string> {
    return Promise.resolve(prompt);
  }
}

export class ErrorThrowingAIClient implements AIClient {
  name = "error-throwing-ai";

  getJsonContent(response: string): unknown {
    return getJsonContent(response);
  }

  generateContent(): Promise<string> {
    return Promise.reject("Error throwing AI client");
  }
}

export class RateLimitExceededAIClient implements AIClient {
  name = "rate-limit-exceeded-ai";

  getJsonContent(response: string): unknown {
    return getJsonContent(response);
  }

  generateContent(): Promise<string> {
    return Promise.reject({ status: 429 });
  }
}
