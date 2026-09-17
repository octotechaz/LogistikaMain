type FetchJsonOptions = {
  retries?: number;
  retryDelayMs?: number;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJsonWithRetry<T>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T | null> {
  const retries = options.retries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 400;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (attempt === retries - 1) {
        console.warn(`fetchJsonWithRetry failed for ${url}:`, error);
        return null;
      }
      await wait(retryDelayMs * (attempt + 1));
    }
  }

  return null;
}
