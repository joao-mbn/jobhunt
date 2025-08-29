export interface PromptResponse {
  response: Promise<string>;
  request: PromptRequest;
}

export interface PromptRequest {
  prompt: string;
  key: string;
  index: number;
}

export interface AIClient {
  getJsonContent: (response: string) => unknown;
  generateContent: (prompt: string) => Promise<string>;
  streamContent: (requests: PromptRequest[]) => AsyncGenerator<PromptResponse>;
}
