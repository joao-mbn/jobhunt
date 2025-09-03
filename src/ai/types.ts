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
