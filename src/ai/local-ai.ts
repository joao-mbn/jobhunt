import type { AIClient } from "./types.ts";

const LOCAL_AI_CONFIG = {
  model: "gpt-4",
  baseUrl: "http://localhost:8080/v1",
  temperature: 0.2,
} as const;

export class LocalAIClient implements AIClient {
  name = "local-ai " + LOCAL_AI_CONFIG.model;

  getJsonContent(response: string): unknown {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON response");
    }
    return JSON.parse(jsonMatch[0]);
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const requestBody = {
        model: LOCAL_AI_CONFIG.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: LOCAL_AI_CONFIG.temperature,
      };

      const response = await fetch(`${LOCAL_AI_CONFIG.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local AI API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      };

      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response content received from Local AI");
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error("❌ Error generating content with Local AI:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate content: ${errorMessage}`);
    }
  }
}

export const localAIClient = new LocalAIClient();
