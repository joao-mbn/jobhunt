export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(
  minMs: number = 1000,
  maxMs: number = 3000,
): Promise<void> {
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
