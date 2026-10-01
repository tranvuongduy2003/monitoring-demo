export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(url, { signal });
}

export async function postJson<T>(url: string): Promise<T> {
  return requestJson<T>(url, { method: 'POST' });
}

async function requestJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}
