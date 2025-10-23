import { gemini2_0FlashLiteAIClient } from "./gemini.ts";
import { localAIClient } from "./local-ai.ts";
import {
  ErrorThrowingAIClient,
  HappyAIClient,
  RateLimitExceededAIClient,
} from "./mock.ts";
import type { PromptRequest } from "./types.ts";
import { attemptPromptSequentially, getJsonContent } from "./utils.ts";

describe("attemptPromptSequentially", () => {
  it("should return the response from the first AI client that succeeds", async () => {
    const ais = [new HappyAIClient(), new ErrorThrowingAIClient()];
    const expectedResponse = '{"name": "John"}';
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
    };

    const result = await attemptPromptSequentially(ais, promptRequest);

    expect(result.response).toEqual(expectedResponse);
    expect(result.request).toEqual(promptRequest);
  });

  it("parses the response as json if the asJson option is true", async () => {
    const ais = [new HappyAIClient(), new ErrorThrowingAIClient()];
    const expectedResponse = '{"name": "John"}';
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
      options: { asJson: true },
    };

    const result = await attemptPromptSequentially(ais, promptRequest);

    expect(result.response).toEqual(JSON.parse(expectedResponse));
    expect(result.request).toEqual(promptRequest);
  });

  it("fails if the response does not have a extractable json object and asJson is true", async () => {
    const ais = [new HappyAIClient()];
    const expectedResponse = "not a json";
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
      options: { asJson: true },
    };

    const result = attemptPromptSequentially(ais, promptRequest);
    await expect(result).rejects.toThrow();
  });

  it("fails if the if a valid json fails a custom validation function", async () => {
    const ais = [new HappyAIClient()];
    const expectedResponse = '{"name": "John"}';
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
      options: {
        asJson: true,
        validateJson: (json: unknown) =>
          typeof json === "object" && "age" in json,
      },
    };

    const result = attemptPromptSequentially(ais, promptRequest);
    await expect(result).rejects.toThrow();
  });

  it("does not validate the json if a validation function is provided, but asJson is false", async () => {
    const ais = [new HappyAIClient()];
    const expectedResponse = '{"name": "John"}';
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
      options: {
        asJson: false,
        validateJson: (json: unknown) =>
          typeof json === "object" && "age" in json,
      },
    };

    const result = await attemptPromptSequentially(ais, promptRequest);
    expect(result.response).toEqual(expectedResponse);
    expect(result.request).toEqual(promptRequest);
  });

  it("should return the response from the first AI client that succeeds, even if the first one fails", async () => {
    const ais = [new ErrorThrowingAIClient(), new HappyAIClient()];
    const expectedResponse = '{"name": "John"}';
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
    };

    const result = await attemptPromptSequentially(ais, promptRequest);

    expect(result.response).toEqual(expectedResponse);
  });

  it("should throw an error if no AI client succeeds", async () => {
    const ais = [new ErrorThrowingAIClient(), new ErrorThrowingAIClient()];
    const expectedResponse = '{"name": "John"}';
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
    };

    const result = attemptPromptSequentially(ais, promptRequest);

    await expect(result).rejects.toThrow();
  });

  it("should log rate limit exceeded error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    const ais = [new RateLimitExceededAIClient()];
    const expectedResponse = '{"name": "John"}';
    const promptRequest: PromptRequest = {
      prompt: expectedResponse,
      key: "test",
    };

    const result = attemptPromptSequentially(ais, promptRequest);

    await expect(result).rejects.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(
      `Rate limit exceeded on ${new RateLimitExceededAIClient().name}`,
    );
  });
});

describe("getJsonContent", () => {
  it("should return the json content", () => {
    const response = '{"name": "John", "age": 30}';

    const jsonContent = getJsonContent(response);
    const geminiJsonContent =
      gemini2_0FlashLiteAIClient.getJsonContent(response);
    const localAiJsonContent = localAIClient.getJsonContent(response);

    const expectedJsonContent = { name: "John", age: 30 };

    expect(jsonContent).toEqual(expectedJsonContent);
    expect(geminiJsonContent).toEqual(expectedJsonContent);
    expect(localAiJsonContent).toEqual(expectedJsonContent);
  });

  it("should return the json content if it's convoluted in a larger response that does not affect the json structure", () => {
    const response = 'Of course, here is the json: {"name": "John", "age": 30}';

    const jsonContent = getJsonContent(response);
    const geminiJsonContent =
      gemini2_0FlashLiteAIClient.getJsonContent(response);
    const localAiJsonContent = localAIClient.getJsonContent(response);

    const expectedJsonContent = { name: "John", age: 30 };

    expect(jsonContent).toEqual(expectedJsonContent);
    expect(geminiJsonContent).toEqual(expectedJsonContent);
    expect(localAiJsonContent).toEqual(expectedJsonContent);
  });

  it("it should throw when the largest matching pair of curly braces is not a valid json object", () => {
    const response = '{"name": "John", "age": 30}{"name": "Jane", "age": 25}';
    expect(() => getJsonContent(response)).toThrow();
    expect(() => gemini2_0FlashLiteAIClient.getJsonContent(response)).toThrow();
    expect(() => localAIClient.getJsonContent(response)).toThrow();
  });

  it("should throw an error if response is not an object", () => {
    const response = "not a json";
    expect(() => getJsonContent(response)).toThrow();
    expect(() => gemini2_0FlashLiteAIClient.getJsonContent(response)).toThrow();
    expect(() => localAIClient.getJsonContent(response)).toThrow();
  });

  it("should throw an error if response is empty", () => {
    const response = "";
    expect(() => getJsonContent(response)).toThrow();
    expect(() => gemini2_0FlashLiteAIClient.getJsonContent(response)).toThrow();
    expect(() => localAIClient.getJsonContent(response)).toThrow();
  });

  it("should throw an error if object is not valid json", () => {
    const response = '{name: "John"}';
    expect(() => getJsonContent(response)).toThrow();
    expect(() => gemini2_0FlashLiteAIClient.getJsonContent(response)).toThrow();
    expect(() => localAIClient.getJsonContent(response)).toThrow();
  });

  it("should throw an error if the json content is an array", () => {
    const response =
      '[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]';
    expect(() => getJsonContent(response)).toThrow();
    expect(() => gemini2_0FlashLiteAIClient.getJsonContent(response)).toThrow();
    expect(() => localAIClient.getJsonContent(response)).toThrow();
  });
});
