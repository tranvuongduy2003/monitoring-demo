export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(url, { signal });
}

export async function postJson<T>(
  url: string,
  options: Omit<RequestInit, 'method'> = {},
): Promise<T> {
  return requestJson<T>(url, { ...options, method: 'POST' });
}

export async function post(url: string, options: Omit<RequestInit, 'method'> = {}): Promise<void> {
  const response = await fetch(url, { ...options, method: 'POST' });
  ensureSuccessful(response);
}

async function requestJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  ensureSuccessful(response);
  return response.json() as Promise<T>;
}

function ensureSuccessful(response: Response): void {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
}
