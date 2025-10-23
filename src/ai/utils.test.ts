import { gemini2_0FlashLiteAIClient } from "./gemini.ts";
import { localAIClient } from "./local-ai.ts";
import { getJsonContent } from "./utils.ts";

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
