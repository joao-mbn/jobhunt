import { delay } from "../utils/promise.ts";

export function randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
  const delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(delayMs);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempt: number = 1,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  try {
    return fn();
  } catch (error) {
    if (attempt === maxRetries) {
      throw error;
    }

    const delayMs = baseDelay * Math.pow(2, attempt - 1);
    console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
    await delay(delayMs);

    return retryWithBackoff(fn, attempt + 1, maxRetries, baseDelay);
  }
}

export function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\t+/g, " ");
}

export function extractTextFromElement(element: Element | null): string {
  if (!element) return "";
  return sanitizeText(element.textContent);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function buildAbsoluteUrl(baseUrl: string, relativeUrl: string): string {
  if (isValidUrl(relativeUrl)) {
    return relativeUrl;
  }

  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl.startsWith("/") ? `${baseUrl}${relativeUrl}` : `${baseUrl}/${relativeUrl}`;
  }
}

export function generateJobId(prefix: string, index: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${index}-${timestamp}-${random}`;
}
